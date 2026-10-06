# HireSense AI API

FastAPI service for bulk PDF resume analysis. It accepts one job description plus **1–60 PDF resumes**, with a **5 MB limit per file**. Results are asynchronous: create an analysis, poll it until `completed`, then read ranked candidates or download an Excel report.

## Run locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m spacy download en_core_web_sm
uvicorn app.main:app --reload --port 8000
```

`en_core_web_sm` improves organization/location extraction. The API still works without it. The first semantic-analysis request downloads and caches `all-MiniLM-L6-v2` through Sentence Transformers.

### OCR for scanned PDFs

The API first extracts an embedded PDF text layer, then falls back to Tesseract OCR for scanned/image-only resumes. Install Tesseract separately:

```bash
brew install tesseract
```

If it is not on your PATH, set `TESSERACT_CMD` in `.env` (on Apple Silicon Homebrew this is commonly `/opt/homebrew/bin/tesseract`). If OCR is unavailable, text-based PDFs continue to work and unreadable PDFs are reported as skipped without failing an otherwise valid batch.

For production, set `DATABASE_URL` to a PostgreSQL SQLAlchemy URL, such as `postgresql+psycopg://user:password@host:5432/recruitai`, and place the service behind a process manager. SQLite is intended only for local development.

## Docker/PostgreSQL development

From the repository root, run `docker compose up --build`. This starts PostgreSQL and the API at `http://localhost:8000`; interactive documentation is available at `/docs`.

## API

- `GET /health` — service and upload-limit information
- `POST /api/v1/analyses` — multipart request with `job_description`, optional `job_title`, and repeated `resumes` PDF fields; returns `202` and an analysis ID
- `GET /api/v1/analyses/{id}` — status plus ranked, explainable candidates when complete
- `GET /api/v1/analyses/{id}/report.xlsx` — recruiter-ready report after completion

The score is deliberately explainable: 55% semantic similarity, 35% required-skill coverage, and 10% detected experience. The API preserves the source PDF only in its configured temporary upload directory; add a scheduled retention/cleanup policy before production use.
