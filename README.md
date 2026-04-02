# Table Extractor AI 🚀

A premium full-stack web application that allows users to extract tabular data from any website and download it as a CSV or Excel file.

🎯 **Core Functionality**
- **Smart Detection**: Automatically finds all `<table>` elements on any webpage.
- **Data Cleaning**: Removes empty rows, handles messy headers, and deduplicates data.
- **Preview First**: Preview the first 10 rows before committing to a download.
- **Multiple Formats**: Download as **CSV** or **Excel** (bonus feature).
- **Modern UI**: Crafted with a royal blue dark theme, glassmorphism, and smooth animations.

---
## Process Mapping

<img width="751" height="521" alt="pm bot drawio" src="https://github.com/user-attachments/assets/ded20296-31d1-41a5-8500-8df41a623f88" />


## 🛠️ Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Scraping**: `requests` + `BeautifulSoup4` + `lxml`
- **Data Processing**: `pandas`
- **Security**: CORS handling + Rate limiting (SlowAPI)

### Frontend
- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The app will be available at: `http://localhost:3000`

---

## 🌐 Deployment

### Backend (Render / Railway)
- Create a new Web Service.
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel)
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- **Note**: Ensure the API URL in `App.tsx` or Vite proxy points to your deployed backend.

---

## 🧠 Smart Features
- **Auto-detection**: Smartly identifies headers vs data rows.
- **Deduplication**: Automatically cleans redundant rows and column names.
- **Rate Limiting**: Protected against automated scraping abuse.
- **Mobile First**: Fully responsive layout that works on all devices.

---


