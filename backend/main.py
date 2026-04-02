"""
Table Extractor AI — FastAPI Backend
Scrapes HTML tables from any URL using requests + BeautifulSoup + pandas.
"""

import io
import re
import time
import logging
from typing import Any, Optional
from urllib.parse import urlparse

import pandas as pd
import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ──────────────────────────── Logging ────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ──────────────────────────── Rate Limiter ────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ──────────────────────────── App ────────────────────────────
app = FastAPI(
    title="Table Extractor AI",
    description="Extract HTML tables from any webpage and download as CSV/Excel.",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────── Constants ────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
REQUEST_TIMEOUT = 15  # seconds
MAX_PREVIEW_ROWS = 10

# In-memory cache: { url → { "data": [...], "expires": float } }
_cache: dict[str, dict] = {}
CACHE_TTL = 300  # 5 minutes


# ──────────────────────────── Schemas ────────────────────────────
class ExtractRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        parsed = urlparse(v)
        if not parsed.netloc:
            raise ValueError("Invalid URL — no domain found.")
        # Block localhost / private ranges (basic)
        blocked = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}
        if parsed.hostname in blocked:
            raise ValueError("Local/private URLs are not allowed.")
        return v


class ColumnInfo(BaseModel):
    name: str
    index: int


class TableData(BaseModel):
    table_index: int
    title: str
    row_count: int
    col_count: int
    columns: list[str]
    preview: list[dict[str, Any]]  # first MAX_PREVIEW_ROWS rows


class ExtractResponse(BaseModel):
    url: str
    table_count: int
    tables: list[TableData]
    warning: Optional[str] = None


# ──────────────────────────── Helpers ────────────────────────────
def _clean_text(text: str) -> str:
    """Strip extra whitespace, newlines, and non-printable chars."""
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _parse_tables(html: str) -> list[pd.DataFrame]:
    """Parse all <table> elements; clean and deduplicate rows."""
    soup = BeautifulSoup(html, "lxml")
    raw_tables = soup.find_all("table")
    dfs: list[pd.DataFrame] = []

    for tbl in raw_tables:
        rows_data: list[list[str]] = []
        for row in tbl.find_all("tr"):
            cells = row.find_all(["th", "td"])
            row_text = [_clean_text(c.get_text()) for c in cells]
            if any(row_text):  # skip fully empty rows
                rows_data.append(row_text)

        if not rows_data:
            continue

        # Determine header — use first row if it contains <th> elements
        first_row_elem = tbl.find("tr")
        has_th = bool(first_row_elem and first_row_elem.find("th"))

        if has_th and len(rows_data) > 1:
            headers = rows_data[0]
            data_rows = rows_data[1:]
        else:
            headers = [f"Column {i + 1}" for i in range(len(rows_data[0]))]
            data_rows = rows_data

        # Pad / truncate rows to match header length
        n_cols = len(headers)
        padded_rows = []
        for r in data_rows:
            r = r[:n_cols]          # trim extra cols
            r += [""] * (n_cols - len(r))  # pad missing cols
            padded_rows.append(r)

        df = pd.DataFrame(padded_rows, columns=headers)

        # Drop rows where ALL values are empty
        df = df[~df.apply(lambda row: row.astype(str).str.strip().eq("").all(), axis=1)]
        # Drop fully duplicate rows
        df = df.drop_duplicates()
        # Deduplicate column names
        seen: dict[str, int] = {}
        new_cols: list[str] = []
        for col in df.columns:
            if col in seen:
                seen[col] += 1
                new_cols.append(f"{col}_{seen[col]}")
            else:
                seen[col] = 0
                new_cols.append(col)
        df.columns = new_cols  # type: ignore[assignment]

        if not df.empty:
            dfs.append(df)

    return dfs


def _fetch_html(url: str) -> tuple[str, Optional[str]]:
    """Fetch page HTML; return (html, warning_or_None)."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        html = resp.text
        warning = None

        # Heuristic: very little table HTML → probably JS-rendered
        if html.count("<table") == 0 and html.count("data-") > 20:
            warning = (
                "This page appears to be JavaScript-rendered. "
                "Static scraping may not capture all tables."
            )
        return html, warning

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=408, detail="Request timed out. The website took too long to respond.")
    except requests.exceptions.TooManyRedirects:
        raise HTTPException(status_code=400, detail="Too many redirects. Check the URL.")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=502, detail="Could not connect to the URL. Check your internet or the URL.")
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"HTTP error: {e}")


# ──────────────────────────── Endpoints ────────────────────────────
@app.get("/")
async def root():
    return {"message": "Table Extractor AI API is running 🚀", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": time.time()}


@app.post("/extract", response_model=ExtractResponse)
@limiter.limit("15/minute")
async def extract_tables(request: Request, body: ExtractRequest):
    """Extract all HTML tables from the given URL."""
    url = body.url

    # Check cache
    cached = _cache.get(url)
    if cached and cached["expires"] > time.time():
        logger.info("Cache hit for %s", url)
        return cached["data"]

    logger.info("Fetching %s", url)
    html, warning = _fetch_html(url)
    dfs = _parse_tables(html)

    tables: list[TableData] = []
    for idx, df in enumerate(dfs):
        preview = df.head(MAX_PREVIEW_ROWS).fillna("").to_dict(orient="records")
        tables.append(
            TableData(
                table_index=idx,
                title=f"Table {idx + 1}",
                row_count=len(df),
                col_count=len(df.columns),
                columns=list(df.columns),
                preview=preview,
            )
        )

    response = ExtractResponse(
        url=url,
        table_count=len(tables),
        tables=tables,
        warning=warning,
    )

    # Cache result
    _cache[url] = {"data": response, "expires": time.time() + CACHE_TTL}
    # Evict old entries (keep cache small)
    if len(_cache) > 200:
        oldest = min(_cache, key=lambda k: _cache[k]["expires"])
        del _cache[oldest]

    return response


@app.get("/download")
@limiter.limit("10/minute")
async def download_table(
    request: Request,
    url: str = Query(..., description="Webpage URL"),
    table_index: int = Query(0, ge=0, description="Zero-based table index"),
    format: str = Query("csv", description="Export format: csv or excel"),
):
    """Download a specific table as CSV or Excel."""
    parsed_url = ExtractRequest(url=url)
    html, _ = _fetch_html(parsed_url.url)
    dfs = _parse_tables(html)

    if not dfs:
        raise HTTPException(status_code=404, detail="No tables found on this page.")
    if table_index >= len(dfs):
        raise HTTPException(
            status_code=400,
            detail=f"Table index {table_index} out of range. Found {len(dfs)} table(s).",
        )

    df = dfs[table_index]
    safe_domain = re.sub(r"[^\w]", "_", urlparse(parsed_url.url).netloc)
    filename_base = f"{safe_domain}_table_{table_index + 1}"

    if format.lower() == "excel":
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Table")
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.xlsx"'},
        )
    else:
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            io.BytesIO(buf.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.csv"'},
        )
