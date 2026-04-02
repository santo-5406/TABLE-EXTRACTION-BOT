# Table Extractor AI — Project Architecture & Flow Analysis

This document provides a technical walkthrough of the **Table Extractor AI** system, including its core components, data flow, and design logic.

## 🏗️ High-Level Architecture
The project follows a **decoupled client-server pattern** optimized for rapid extraction and high-end aesthetics.

```mermaid
graph TD
    A[User (Frontend)] -- "1. Enters URL" --> B[Post to /extract]
    B -- "2. Scraping Engine" --> C[BeautifulSoup Cleaner]
    C -- "3. Data Frame" --> D[Pandas Formatter]
    D -- "4. Returns JSON" --> A
    A -- "5. Selects Table" --> E[Preview Selected Data]
    A -- "6. Request CSV/Excel" --> F[Get /download]
    F -- "7. Stream File" --> G[Browser Downloads File]
    
    subgraph "Backend (FastAPI)"
    B
    C
    D
    F
    end
    
    subgraph "Client (React Standalone)"
    A
    E
    G
    end
```

---

## 🛠️ Component Breakdown

### 1. Frontend (Client-Side)
- **Technology**: React 18 (Standalone via CDN)
- **Styling**: Tailwind CSS with Glassmorphism
- **Key Logic**:
  - **State Management**: Uses `useState` for handling URLs, extracted table lists, and active table previews.
  - **API Orchestration**: Utilizes `Axios` to communicate with the FastAPI backend.
  - **Micro-Animations**: Leverages `Framer Motion` (or equivalent CDN setups) for smooth UI transitions and glowing interactions.
  - **Direct Download**: Triggers standard browser download streams for both CSV and Excel formats.

### 2. Backend (Server-Side)
- **Technology**: Python 3.10+, FastAPI, Uvicorn
- **Engines**: 
  - **Scraper**: `requests` for fetching HTML; `BeautifulSoup4` with `lxml` for DOM parsing.
  - **Cleaning Logic**: Heuristic detection of `<th>` headers; automatic deduction of row lengths; removal of empty strings/duplicates.
  - **Persistence**: Temporary in-memory caching to avoid redundant scraping of the same URL within a 5-minute window.
  - **Formatters**: `pandas` handles the heavy lifting of converting raw HTML rows into structured DataFrames, then exports to CSV (built-in) or Excel (`openpyxl`).

### 3. Security & Reliability
- **Rate Limiting**: `SlowAPI` (Redis-free local version) prevents automated scraping abuse (e.g., 15 extractions per minute).
- **CORS Handling**: Cross-Origin Resource Sharing is enabled to allow the standalone frontend to communicate safely with the backend.
- **Validation**: URL-level validation ensures only valid `http`/`https` links are processed.

---

## 🔄 Core User Flow

1.  **Input Verification**: User provides a URL. The system validates the format and ensures it's not a restricted domain.
2.  **Smart Extraction**: The backend fetches the raw HTML. It looks for `<table>` elements and ignores non-tabular content.
3.  **Data De-noising**: Messy HTML (like nested tables or mixed content) is cleaned into basic text. Column names are deduplicated to prevent pandas indexing errors.
4.  **Preview Generation**: Only the first 10 rows are sent initially to ensure fast response times and low memory usage.
5.  **Export on Demand**: When the user clicks "Download", the backend re-processes the specific table requested and streams the full data directly to the user's browser.

---

Built with ❤️ by Antigravity 🛸
