# HireSense AI - Project Status

## ✅ Current Status: FULLY FUNCTIONAL

Both frontend and backend are working correctly with all dependencies installed and configured.

---

## Frontend

**Status:** ✅ Working

### Setup
```bash
npm install
npm run dev      # Development server on port 8443
npm run build    # Production build
```

### Features
- React 19 + TypeScript + Tailwind CSS
- Vite build tool with hot reload
- Connects to backend API at `http://localhost:8000`
- Can upload resumes and job descriptions for analysis

### Recent Fixes
- Updated Vite config to use modern ES module imports (`import.meta.dirname`, JSON import attributes)
- Reinstalled npm dependencies

---

## Backend

**Status:** ✅ Working

### Setup
```bash
cd backend
chmod +x run.sh
./run.sh              # Automatic setup and start

# Or manual:
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

### Components
- **Framework:** FastAPI with Uvicorn
- **Database:** SQLite (local) / PostgreSQL (production)
- **NLP:** Spacy, Sentence Transformers, Ollama integration
- **OCR:** PyMuPDF + Pytesseract for PDF processing
- **APIs:** REST API for analysis, status polling, report generation

### Key Endpoints
- `POST /api/v1/analyses` - Create analysis
- `GET /api/v1/analyses/{id}` - Get status
- `GET /api/v1/analyses/{id}/report` - Download Excel
- `GET /health` - Health check
- `GET /docs` - Interactive API docs

### Recent Fixes
- Created `.env.example` with all configuration options
- Fixed malformed `DATABASE_URL` in `.env`
- Downloaded Spacy NLP model (`en_core_web_sm`)
- Created startup script (`run.sh`)
- Created setup guide (`SETUP.md`)

### Environment (.env)
```
DATABASE_URL=sqlite:///./recruitai.db
UPLOAD_DIR=./data/uploads
CORS_ORIGINS=http://localhost:5173,http://localhost:8443
TESSERACT_CMD=                    # Optional: path to tesseract
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

---

## Database

**SQLite** (`backend/recruitai.db`)
- Auto-initialized on startup
- Stores analyses, candidates, and extraction results
- Ready for production migration to PostgreSQL

---

## Project Structure

```
.
├── frontend/
│   ├── src/              # React components
│   ├── package.json      # npm dependencies
│   ├── vite.config.ts    # Build config
│   └── tsconfig.json     # TypeScript config
│
├── backend/
│   ├── app/
│   │   ├── main.py       # FastAPI entry point
│   │   ├── config.py     # Settings
│   │   ├── database.py   # SQLAlchemy
│   │   ├── models.py     # DB models
│   │   ├── schemas.py    # API schemas
│   │   ├── services.py   # Business logic
│   │   ├── nlp.py        # NLP/extraction
│   │   └── ...
│   ├── requirements.txt   # Python dependencies
│   ├── .env.example       # Config template
│   ├── run.sh            # Startup script
│   ├── SETUP.md          # Setup guide
│   └── README.md         # Original docs
│
└── docker-compose.yml     # Optional: Docker setup
```

---

## How to Run

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
./run.sh
# Runs on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Opens on http://localhost:8443
```

### Testing

**API Health Check:**
```bash
curl http://localhost:8000/health
```

**API Docs:**
- Visit `http://localhost:8000/docs` for interactive Swagger UI
- Test endpoints directly in the browser

**Frontend:**
- Upload a resume and job description
- Click "Analyze" to start processing
- Watch progress in real-time
- Download results as Excel report

---

## Troubleshooting

See `backend/SETUP.md` for detailed troubleshooting guide covering:
- Virtual environment issues
- Dependency problems
- Port conflicts
- Database errors
- OCR configuration
- NLP model setup

---

## Next Steps

1. **Local Development:** Run both servers and test the full workflow
2. **Docker Deployment:** Use `docker-compose.yml` to run in containers
3. **Production Setup:** 
   - Configure PostgreSQL in `.env`
   - Set up proper CORS origins
   - Configure Tesseract path if using OCR
4. **Optional:** Set up Ollama for local LLM integration
5. **Testing:** Create test suite for resume parsing and NLP

---

## Verification

All systems checked and verified:
- ✅ Frontend builds without errors
- ✅ Backend app loads with all services
- ✅ Database initialized and ready
- ✅ NLP models downloaded
- ✅ Configuration working
- ✅ API endpoints ready
- ✅ Dependencies installed

**Backend is production-ready for local development!**
