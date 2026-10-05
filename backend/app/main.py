import shutil
import sys
import uuid
from pathlib import Path

if __package__ in (None, ""):
    backend_root = Path(__file__).resolve().parent.parent
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))
    from app.config import settings
    from app.database import Base, engine, get_db
    from app.models import Analysis, Candidate
    from app.nlp import extract_education, extract_entities
    from app.schemas import AnalysisOut, CandidateOut, AnalysisStatusOut, CompletedResumeOut, CurrentResumeState, JobDescriptionExtractOut, ShortlistUpdateIn, SendEmailIn, EmailResponseOut, ShortlistedCandidateOut, CallProcedureIn, FilterCriteriaIn
    from app.services import analyse_job
    from app.email_service import EmailService
else:
    from .config import settings
    from .database import Base, engine, get_db
    from .models import Analysis, Candidate
    from .nlp import extract_education, extract_entities
    from .schemas import AnalysisOut, CandidateOut, AnalysisStatusOut, CompletedResumeOut, CurrentResumeState, JobDescriptionExtractOut, ShortlistUpdateIn, SendEmailIn, EmailResponseOut, ShortlistedCandidateOut, CallProcedureIn, FilterCriteriaIn
    from .services import analyse_job
    from .email_service import EmailService

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from openpyxl import Workbook
from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload
from datetime import datetime

app = FastAPI(title="RecruitAI API", version="1.0.0", docs_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8443", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:8443"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def custom_openapi():
    """Ensure Swagger UI renders the repeated multipart field as file inputs."""
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title=app.title, version=app.version, routes=app.routes)
    content = schema["paths"]["/api/v1/analyses"]["post"]["requestBody"]["content"]["multipart/form-data"]
    body_schema = content["schema"]
    if "$ref" in body_schema:
        reference = body_schema["$ref"].rsplit("/", 1)[-1]
        body_schema = schema["components"]["schemas"][reference]
    body_schema["properties"]["resumes"] = {
        "type": "array",
        "items": {"type": "string", "format": "binary"},
        "description": "Select 1–60 PDF resumes; each file must be 5 MB or smaller.",
    }
    content["encoding"] = {"resumes": {"contentType": "application/pdf"}}
    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/docs", include_in_schema=False)
def swagger_docs():
    """Swagger UI needs a small enhancement for one-picker multi-file selection."""
    response = get_swagger_ui_html(openapi_url=app.openapi_url, title=f"{app.title} - Swagger UI")
    enhancement = """
<script>
  const enableBulkResumePicker = () => {
    document.querySelectorAll('input[type="file"]').forEach((input) => {
      input.multiple = true;
      input.setAttribute('accept', '.pdf,application/pdf');
    });
  };
  new MutationObserver(enableBulkResumePicker).observe(document.body, { childList: true, subtree: true });
  enableBulkResumePicker();
</script>
"""
    return HTMLResponse(response.body.decode("utf-8").replace("</body>", enhancement + "</body>"))


@app.on_event("startup")
def startup() -> None:
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    # Ensure stored_filename column exists on SQLite database if table pre-existed
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE candidates ADD COLUMN stored_filename VARCHAR(255)"))
        except Exception:
            pass
        
        for column, type_ in [
            ("total_resumes", "INTEGER DEFAULT 0"),
            ("current_phase", "VARCHAR(50)"),
            ("current_stage", "VARCHAR(50) DEFAULT 'preparing'"),
            ("current_resume_filename", "VARCHAR(255)"),
            ("current_resume_candidate_name", "VARCHAR(255)"),
            ("current_resume_started_at", "DATETIME"),
            ("phase_completed", "INTEGER DEFAULT 0"),
            ("phase_total", "INTEGER DEFAULT 0"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE analyses ADD COLUMN {column} {type_}"))
            except Exception:
                pass
        
        # Add candidate columns for shortlisting and email features
        for column, type_ in [
            ("is_shortlisted", "BOOLEAN DEFAULT 0"),
            ("email_sent", "BOOLEAN DEFAULT 0"),
            ("email_sent_at", "DATETIME"),
            ("call_scheduled", "BOOLEAN DEFAULT 0"),
            ("call_scheduled_at", "DATETIME"),
            ("notes", "TEXT"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE candidates ADD COLUMN {column} {type_}"))
            except Exception:
                pass


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "max_resumes": settings.max_resumes_per_analysis,
        "max_file_size_bytes": settings.max_file_size_bytes,
        "ocr_available": bool(settings.tesseract_cmd or shutil.which("tesseract")),
    }


@app.post("/api/v1/analyses", response_model=AnalysisOut, status_code=status.HTTP_202_ACCEPTED)
async def create_analysis(
    background_tasks: BackgroundTasks,
    job_description: str = Form(..., min_length=20),
    job_title: str | None = Form(None),
    resumes: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    if not resumes:
        raise HTTPException(422, "Upload at least one resume PDF.")
    if len(resumes) > settings.max_resumes_per_analysis:
        raise HTTPException(422, f"Upload at most {settings.max_resumes_per_analysis} resumes per analysis.")
    if invalid := [upload.filename or "unnamed" for upload in resumes if not (upload.filename or "").lower().endswith(".pdf")]:
        raise HTTPException(422, f"Only PDF resumes are accepted: {', '.join(invalid)}")

    analysis = Analysis(
        job_title=job_title, 
        job_description=job_description, 
        status="queued",
        total_resumes=len(resumes)
    )
    db.add(analysis)
    db.commit(); db.refresh(analysis)
    batch_dir = settings.upload_dir / analysis.id
    batch_dir.mkdir(parents=True, exist_ok=False)
    paths: list[tuple[str, str]] = []
    try:
        for upload in resumes:
            filename = Path(upload.filename or "resume.pdf").name
            destination = batch_dir / f"{uuid.uuid4()}-{filename}"
            written = 0
            signature = bytearray()
            with destination.open("wb") as output:
                while chunk := await upload.read(1024 * 1024):
                    written += len(chunk)
                    if len(signature) < 5:
                        signature.extend(chunk[: 5 - len(signature)])
                    if written > settings.max_file_size_bytes:
                        output.close(); destination.unlink(missing_ok=True)
                        raise HTTPException(413, f"{filename} exceeds the 5 MB per-file limit.")
                    output.write(chunk)
            if not bytes(signature).startswith(b"%PDF-"):
                destination.unlink(missing_ok=True)
                raise HTTPException(422, f"{filename} is not a valid PDF file.")
            paths.append((filename, str(destination)))
    except Exception:
        shutil.rmtree(batch_dir, ignore_errors=True)
        db.delete(analysis); db.commit()
        raise
    background_tasks.add_task(analyse_job, analysis.id, paths)
    return to_analysis_out(analysis, include_candidates=False)


def to_analysis_out(analysis: Analysis, include_candidates: bool = True) -> AnalysisOut:
    candidates = sorted(analysis.candidates, key=lambda item: item.overall_score, reverse=True) if include_candidates else []
    # Handle both old list format and new dict format for backward compatibility
    requirements = analysis.requirements if isinstance(analysis.requirements, dict) else {"all": analysis.requirements or [], "required": [], "preferred": []}
    return AnalysisOut(id=analysis.id, job_title=analysis.job_title, requirements=requirements, status=analysis.status,
                       error=analysis.error, created_at=analysis.created_at, completed_at=analysis.completed_at,
                       candidate_count=len(analysis.candidates), candidates=[CandidateOut.model_validate(item) for item in candidates])


def _to_export_string(value) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple, set)):
        return ", ".join(str(item) for item in value if item)
    if isinstance(value, dict):
        return ", ".join(f"{key}: {val}" for key, val in value.items())
    return str(value)


def _export_candidate_fields(candidate) -> dict:
    """Recover resume metadata from stored JSON or raw text when earlier stages dropped it."""
    entities = getattr(candidate, "entities", {}) or {}
    fallback_entities = extract_entities(getattr(candidate, "text", "") or "")

    email = candidate.email or _to_export_string(entities.get("emails") or fallback_entities.get("emails") or [])
    phone = _to_export_string(entities.get("phones") or fallback_entities.get("phones") or [])
    location = _to_export_string(entities.get("locations") or fallback_entities.get("locations") or [])
    education = candidate.education or extract_education(getattr(candidate, "text", "") or "") or "Not specified"

    return {
        "email": email,
        "phone": phone,
        "location": location,
        "education": education,
    }


def build_report_workbook(analysis: Analysis) -> Workbook:
    workbook = Workbook()
    summary = workbook.active
    summary.title = "Summary"
    summary.append(["Job title", analysis.job_title or "Untitled role"])
    summary.append(["Candidates", len(analysis.candidates)])

    if isinstance(analysis.requirements, dict):
        required = analysis.requirements.get("required", [])
        preferred = analysis.requirements.get("preferred", [])
        req_text = f"Required: {', '.join(required)} | Preferred: {', '.join(preferred)}"
    else:
        req_text = ", ".join(analysis.requirements or [])
    summary.append(["Requirements", req_text])
    summary.append([])
    summary.append(["Candidate", "Email", "Phone", "Location", "Education", "Top Skills"])
    for candidate in sorted(analysis.candidates, key=lambda item: item.overall_score, reverse=True):
        contact_fields = _export_candidate_fields(candidate)
        summary.append([
            candidate.name,
            contact_fields["email"],
            contact_fields["phone"],
            contact_fields["location"],
            contact_fields["education"],
            ", ".join(candidate.skills[:8]),
        ])

    ranking = workbook.create_sheet("Candidate ranking")
    ranking.append([
        "Rank", "Candidate", "Email", "Overall", "Semantic", "Keyword", "Experience",
        "Recommendation", "Skills", "Missing skills", "Insight"
    ])

    for rank, candidate in enumerate(sorted(analysis.candidates, key=lambda item: item.overall_score, reverse=True), 1):
        contact_fields = _export_candidate_fields(candidate)
        ranking.append([
            rank,
            candidate.name,
            contact_fields["email"],
            candidate.overall_score,
            candidate.semantic_score,
            candidate.keyword_score,
            candidate.experience_score,
            candidate.recommendation,
            ", ".join(candidate.skills),
            ", ".join(candidate.missing_skills),
            candidate.insight,
        ])

    details = workbook.create_sheet("Candidate details")
    details.append([
        "Rank", "Candidate", "Email", "Phone", "Overall", "Semantic", "Keyword", "Experience",
        "Recommendation", "Experience years", "Education", "Skills", "Missing skills",
        "Projects", "Experience details", "Organizations", "Locations", "Insight"
    ])
    for rank, candidate in enumerate(sorted(analysis.candidates, key=lambda item: item.overall_score, reverse=True), 1):
        entities = getattr(candidate, "entities", {}) or {}
        contact_fields = _export_candidate_fields(candidate)
        details.append([
            rank,
            candidate.name,
            contact_fields["email"],
            contact_fields["phone"],
            candidate.overall_score,
            candidate.semantic_score,
            candidate.keyword_score,
            candidate.experience_score,
            candidate.recommendation,
            entities.get("experience_years") if isinstance(entities.get("experience_years"), (int, float)) else 0,
            contact_fields["education"],
            ", ".join(candidate.skills),
            ", ".join(candidate.missing_skills),
            _to_export_string(getattr(candidate, "projects", []) or []),
            _to_export_string(getattr(candidate, "experience_details", []) or []),
            _to_export_string(entities.get("organizations") or []),
            contact_fields["location"],
            getattr(candidate, "insight", ""),
        ])

    for sheet in workbook.worksheets:
        sheet.freeze_panes = "A2"
        sheet.auto_filter.ref = sheet.dimensions
        for column in sheet.columns:
            width = min(max(len(str(cell.value or "")) for cell in column) + 2, 60)
            sheet.column_dimensions[column[0].column_letter].width = width

    return workbook


@app.get("/api/v1/analyses", response_model=list[AnalysisOut])
def list_analyses(db: Session = Depends(get_db)):
    analyses = db.scalars(select(Analysis).order_by(Analysis.created_at.desc())).all()
    return [to_analysis_out(analysis, include_candidates=False) for analysis in analyses]


@app.get("/api/v1/analyses/{analysis_id}", response_model=AnalysisOut)
def get_analysis(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.scalar(select(Analysis).options(selectinload(Analysis.candidates)).where(Analysis.id == analysis_id))
    if not analysis: raise HTTPException(404, "Analysis not found.")
    return to_analysis_out(analysis)


@app.get("/api/v1/analyses/{analysis_id}/status", response_model=AnalysisStatusOut)
def get_analysis_status(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.scalar(select(Analysis).options(selectinload(Analysis.candidates)).where(Analysis.id == analysis_id))
    if not analysis: raise HTTPException(404, "Analysis not found.")
    
    completed = len(analysis.candidates)
    
    completed_resumes = [
        CompletedResumeOut(
            id=c.id,
            filename=c.filename,
            candidate_name=c.name,
            ats_score=c.overall_score
        )
        for c in analysis.candidates
    ]
    
    current_resume = None
    if analysis.current_resume_filename:
        current_resume = CurrentResumeState(
            filename=analysis.current_resume_filename,
            candidate_name=analysis.current_resume_candidate_name
        )
        
    return AnalysisStatusOut(
        analysis_id=analysis.id,
        status=analysis.status,
        phase=analysis.current_phase,
        current_stage=analysis.current_stage,
        total=analysis.total_resumes,
        completed=completed,
        phase_completed=analysis.phase_completed,
        phase_total=analysis.phase_total,
        current_resume=current_resume,
        completed_resumes=completed_resumes,
        started_at=analysis.created_at,
        current_resume_started_at=analysis.current_resume_started_at,
        completed_at=analysis.completed_at
    )


@app.get("/api/v1/analyses/{analysis_id}/report.xlsx")
def download_report(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.scalar(select(Analysis).options(selectinload(Analysis.candidates)).where(Analysis.id == analysis_id))
    if not analysis: raise HTTPException(404, "Analysis not found.")
    if analysis.status != "completed": raise HTTPException(409, "Analysis is not complete.")

    workbook = build_report_workbook(analysis)
    from io import BytesIO
    buffer = BytesIO(); workbook.save(buffer); buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f'attachment; filename="recruitai-{analysis_id}.xlsx"'})


@app.get("/api/v1/candidates/{candidate_id}/resume")
def download_candidate_resume(candidate_id: str, db: Session = Depends(get_db)):
    """Download the original resume PDF for a specific candidate."""
    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate: raise HTTPException(404, "Candidate not found.")
    
    # Find the resume file in the upload directory
    batch_dir = settings.upload_dir / candidate.analysis_id
    if not batch_dir.exists(): raise HTTPException(404, "Analysis files not found.")
    
    matching_file = None
    if candidate.stored_filename:
        exact_file = batch_dir / candidate.stored_filename
        if exact_file.exists():
            matching_file = exact_file

    if not matching_file:
        # Fallback for legacy database records without stored_filename
        resume_files = list(batch_dir.glob("*.pdf"))
        for file_path in resume_files:
            stored_filename = file_path.name
            if stored_filename.endswith(f"-{candidate.filename}") or stored_filename == candidate.filename:
                matching_file = file_path
                break
            if candidate.filename in stored_filename:
                matching_file = file_path
                break
    
    if not matching_file: raise HTTPException(404, "Resume file not found.")
    
    return FileResponse(
        path=str(matching_file),
        media_type="application/pdf",
        filename=candidate.filename,
        headers={"Content-Disposition": f'inline; filename="{candidate.filename}"'}
    )


@app.post("/api/v1/job-descriptions/extract", response_model=JobDescriptionExtractOut)
async def extract_job_description(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(422, "Only PDF files are supported.")
    
    # Save to a temporary file
    temp_dir = settings.upload_dir / "temp_jd"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"{uuid.uuid4()}-{file.filename}"
    
    try:
        written = 0
        signature = bytearray()
        with temp_path.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if len(signature) < 5:
                    signature.extend(chunk[: 5 - len(signature)])
                if written > settings.max_file_size_bytes:
                    raise HTTPException(413, "File exceeds the size limit.")
                output.write(chunk)
        if not bytes(signature).startswith(b"%PDF-"):
            raise HTTPException(422, "Unable to read the PDF.")
        
        # We need pages to return in schema.
        import fitz
        pages = 0
        with fitz.open(temp_path) as doc:
            pages = len(doc)

        from app.nlp import extract_jd_pdf_text
        text = extract_jd_pdf_text(str(temp_path))
        
        # Validation
        if not text or len(text) < 50 or not any(c.isalpha() for c in text):
            raise HTTPException(422, "No readable job description text was found in this PDF.")
            
        return JobDescriptionExtractOut(text=text, filename=file.filename or "jd.pdf", pages=pages)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(422, "Unable to read the PDF.")
    finally:
        temp_path.unlink(missing_ok=True)


# ============================================================================
# SHORTLISTING AND EMAIL ENDPOINTS
# ============================================================================

@app.post("/api/v1/candidates/{candidate_id}/shortlist", response_model=CandidateOut)
def update_shortlist(candidate_id: str, update: ShortlistUpdateIn, db: Session = Depends(get_db)):
    """Update shortlist status for a candidate."""
    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate:
        raise HTTPException(404, "Candidate not found.")
    
    candidate.is_shortlisted = update.is_shortlisted
    if update.notes is not None:
        candidate.notes = update.notes
    
    db.commit()
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


@app.get("/api/v1/analyses/{analysis_id}/shortlisted", response_model=list[ShortlistedCandidateOut])
def get_shortlisted_candidates(analysis_id: str, db: Session = Depends(get_db)):
    """Get all shortlisted candidates for an analysis."""
    candidates = db.scalars(
        select(Candidate)
        .where(Candidate.analysis_id == analysis_id)
        .where(Candidate.is_shortlisted == True)
        .order_by(Candidate.overall_score.desc())
    ).all()
    
    return [ShortlistedCandidateOut.model_validate(c) for c in candidates]


@app.post("/api/v1/analyses/{analysis_id}/filtered-candidates", response_model=list[CandidateOut])
def get_filtered_candidates(analysis_id: str, filters: FilterCriteriaIn, db: Session = Depends(get_db)):
    """Get candidates with applied filters."""
    query = select(Candidate).where(Candidate.analysis_id == analysis_id)
    
    if filters.min_score is not None:
        query = query.where(Candidate.overall_score >= filters.min_score)
    
    if filters.max_score is not None:
        query = query.where(Candidate.overall_score <= filters.max_score)
    
    if filters.recommendation:
        query = query.where(Candidate.recommendation == filters.recommendation)
    
    if filters.is_shortlisted is not None:
        query = query.where(Candidate.is_shortlisted == filters.is_shortlisted)
    
    if filters.email_sent is not None:
        query = query.where(Candidate.email_sent == filters.email_sent)
    
    query = query.order_by(Candidate.overall_score.desc())
    candidates = db.scalars(query).all()
    
    # Filter by skills if provided
    if filters.skills_filter:
        filtered_list = []
        for candidate in candidates:
            candidate_skills = set(s.lower() for s in (candidate.skills or []))
            search_skills = set(s.lower() for s in filters.skills_filter)
            if search_skills.issubset(candidate_skills):
                filtered_list.append(candidate)
        candidates = filtered_list
    
    return [CandidateOut.model_validate(c) for c in candidates]


@app.post("/api/v1/candidates/send-email", response_model=EmailResponseOut)
def send_email_to_candidates(email_request: SendEmailIn, db: Session = Depends(get_db)):
    """Send email to selected candidates."""
    
    # Get candidates
    if email_request.recipient_ids:
        candidates = db.scalars(
            select(Candidate).where(Candidate.id.in_(email_request.recipient_ids))
        ).all()
    else:
        # Send to all shortlisted
        candidates = db.scalars(
            select(Candidate).where(Candidate.is_shortlisted == True)
        ).all()
    
    if not candidates:
        return EmailResponseOut(
            success=False,
            message="No candidates found to send emails to.",
            sent_count=0,
            failed_count=0
        )
    
    email_payloads = []
    seen_emails = set()
    for candidate in candidates:
        if not candidate.email:
            continue

        normalized_email = candidate.email.strip().lower()
        if normalized_email in seen_emails:
            continue
        seen_emails.add(normalized_email)

        if email_request.template_type == "procedure":
            template = EmailService.get_procedure_email_template(candidate.name)
        elif email_request.template_type == "rejection":
            template = EmailService.get_rejection_email_template(candidate.name)
        elif email_request.template_type == "custom":
            template = {
                "subject": email_request.custom_subject or "Message from RecruitAI",
                "body": email_request.custom_body or "",
                "html_body": email_request.custom_html_body
            }
        else:
            continue

        email_payloads.append({
            "candidate_id": candidate.id,
            "candidate_name": candidate.name,
            "recipient_email": candidate.email,
            "subject": template["subject"],
            "body": template["body"],
            "html_body": template.get("html_body"),
        })

    result = EmailService.send_emails(email_payloads)
    sent_count = 0
    failed_count = 0
    errors = []

    for item in email_payloads:
        candidate = db.scalar(select(Candidate).where(Candidate.id == item["candidate_id"]))
        if not candidate:
            continue

        if item["recipient_email"] in [error.get("candidate_email") for error in result.get("errors", [])]:
            failed_count += 1
            errors.append({
                "candidate_id": candidate.id,
                "candidate_name": candidate.name,
                "error": next(
                    error["error"] for error in result.get("errors", []) if error.get("candidate_email") == item["recipient_email"]
                )
            })
            continue

        candidate.email_sent = True
        candidate.email_sent_at = datetime.utcnow()
        sent_count += 1

    if email_request.recipient_ids is None:
        for candidate in candidates:
            if candidate.email and candidate.email_sent:
                candidate.email_sent = True

    db.commit()

    if not email_payloads:
        return EmailResponseOut(
            success=False,
            message="No valid recipient emails found to send emails to.",
            sent_count=0,
            failed_count=len(candidates) - len(email_payloads),
            errors=[]
        )

    return EmailResponseOut(
        success=sent_count > 0,
        message=f"Sent {sent_count} emails successfully" + (f"; {failed_count} failed" if failed_count > 0 else ""),
        sent_count=sent_count,
        failed_count=failed_count,
        errors=errors
    )


@app.post("/api/v1/candidates/{candidate_id}/schedule-call", response_model=CandidateOut)
def schedule_call(candidate_id: str, call_request: CallProcedureIn, db: Session = Depends(get_db)):
    """Schedule a call/procedure for a candidate."""
    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate:
        raise HTTPException(404, "Candidate not found.")
    
    candidate.call_scheduled = True
    candidate.call_scheduled_at = call_request.scheduled_at or datetime.utcnow()
    if call_request.notes:
        candidate.notes = call_request.notes
    
    db.commit()
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


@app.get("/api/v1/analyses/{analysis_id}/shortlisted-report.xlsx")
def download_shortlisted_report(analysis_id: str, db: Session = Depends(get_db)):
    """Download Excel report of only shortlisted candidates."""
    analysis = db.scalar(select(Analysis).options(selectinload(Analysis.candidates)).where(Analysis.id == analysis_id))
    if not analysis:
        raise HTTPException(404, "Analysis not found.")
    
    # Filter only shortlisted candidates
    shortlisted = [c for c in analysis.candidates if c.is_shortlisted]
    if not shortlisted:
        raise HTTPException(404, "No shortlisted candidates found.")
    
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Shortlisted Candidates"
    
    # Headers
    sheet.append([
        "Rank", "Candidate", "Email", "Phone", "Overall Score", "Semantic", "Keyword", "Experience",
        "Recommendation", "Education", "Skills", "Missing Skills", "Experience Years",
        "Organizations", "Location", "Notes", "Email Sent", "Call Scheduled"
    ])
    
    # Data rows
    for rank, candidate in enumerate(sorted(shortlisted, key=lambda c: c.overall_score, reverse=True), 1):
        contact_fields = _export_candidate_fields(candidate)
        entities = getattr(candidate, "entities", {}) or {}
        
        sheet.append([
            rank,
            candidate.name,
            contact_fields["email"],
            contact_fields["phone"],
            candidate.overall_score,
            candidate.semantic_score,
            candidate.keyword_score,
            candidate.experience_score,
            candidate.recommendation,
            contact_fields["education"],
            ", ".join(candidate.skills),
            ", ".join(candidate.missing_skills),
            entities.get("experience_years", ""),
            _to_export_string(entities.get("organizations", [])),
            contact_fields["location"],
            candidate.notes or "",
            "Yes" if candidate.email_sent else "No",
            "Yes" if candidate.call_scheduled else "No",
        ])
    
    # Format sheet
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    for column in sheet.columns:
        width = min(max(len(str(cell.value or "")) for cell in column) + 2, 60)
        sheet.column_dimensions[column[0].column_letter].width = width
    
    from io import BytesIO
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="recruitai-shortlisted-{analysis_id}.xlsx"'}
    )


@app.get("/api/v1/candidates/strong-matches")
def get_strong_matches(analysis_id: str = None, db: Session = Depends(get_db)):
    """Get all 'Strong Match' candidates for outreach."""
    if analysis_id:
        candidates = db.scalars(
            select(Candidate)
            .where(Candidate.analysis_id == analysis_id)
            .where(Candidate.recommendation == "Strong Match")
            .order_by(Candidate.overall_score.desc())
        ).all()
    else:
        # Get strong matches from latest analyses
        candidates = db.scalars(
            select(Candidate)
            .where(Candidate.recommendation == "Strong Match")
            .order_by(Candidate.overall_score.desc())
        ).all()
    
    return [CandidateOut.model_validate(c) for c in candidates]
