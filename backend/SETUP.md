# Backend Setup & Troubleshooting Guide

## Quick Start

### Option 1: Using the Startup Script (Recommended)
```bash
cd backend
./run.sh
```

This handles venv setup, dependency installation, spacy model download, and starts the server.

### Option 2: Manual Setup
```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download NLP model
python -m spacy download en_core_web_sm

# Setup environment
cp .env.example .env  # Customize if needed

# Start server
python -m uvicorn app.main:app --reload --port 8000
```

## Common Issues & Fixes

### 1. "ModuleNotFoundError: No module named 'uvicorn'"
**Cause:** Virtual environment not activated or dependencies not installed
**Fix:**
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. "OSError: Can't find model 'en_core_web_sm'"
**Cause:** Spacy NLP model not downloaded
**Fix:**
```bash
source .venv/bin/activate
python -m spacy download en_core_web_sm
```

### 3. "Could not parse SQLAlchemy URL from given URL string"
**Cause:** Invalid DATABASE_URL in `.env`
**Fix:** Ensure `.env` has a valid URL. For SQLite:
```
DATABASE_URL=sqlite:///./recruitai.db
```

### 4. "Address already in use" error
**Cause:** Port 8000 already in use
**Fix:** Use a different port:
```bash
python -m uvicorn app.main:app --port 8001
```

### 5. Tesseract OCR not found
**Cause:** Tesseract not installed or not in PATH
**Fix (macOS with Homebrew):**
```bash
brew install tesseract
```
Then set in `.env`:
```
TESSERACT_CMD=/opt/homebrew/bin/tesseract
```

## Verification Checklist

After startup, verify everything works:

1. **Health Check:** `curl http://localhost:8000/health`
2. **API Docs:** Visit `http://localhost:8000/docs` in browser
3. **Database:** Check `recruitai.db` exists in `backend/` directory
4. **Upload Dir:** Check `backend/data/uploads/` directory exists

## Environment Variables

All configurable via `.env`:
- `DATABASE_URL` - Database connection string
- `UPLOAD_DIR` - Where to store uploaded resumes
- `CORS_ORIGINS` - Allowed frontend origins
- `TESSERACT_CMD` - Path to Tesseract binary (if custom)
- `OLLAMA_BASE_URL` - Ollama LLM server URL
- `EMBEDDING_MODEL` - Sentence transformer model
- More options in `.env.example`

## Development Tips

- **Hot Reload:** `--reload` flag automatically restarts on code changes
- **Debug Logs:** Add `--log-level debug` to see detailed logs
- **Different Host:** Use `--host 0.0.0.0` to expose to network
- **Custom Port:** `--port XXXX` to use a different port

## API Endpoints

- `POST /api/v1/analyses` - Create new analysis
- `GET /api/v1/analyses/{id}` - Get analysis status
- `GET /api/v1/analyses/{id}/status` - Detailed status with progress
- `GET /api/v1/analyses/{id}/report` - Download Excel report
- `GET /docs` - Interactive API documentation
- `GET /health` - Health check

## Database

By default uses **SQLite** (`recruitai.db`) for local development. 

For production, set `DATABASE_URL` to PostgreSQL:
```
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/recruitai
```

## Help & Support

If issues persist:
1. Check that Python 3.10+ is installed: `python --version`
2. Verify venv is activated (should see `(.venv)` in terminal prompt)
3. Try reinstalling: `pip install --force-reinstall -r requirements.txt`
4. Check logs for error messages
5. Review `.env` configuration
