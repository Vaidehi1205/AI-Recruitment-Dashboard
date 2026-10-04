from datetime import datetime
from pydantic import BaseModel, Field


class CandidateOut(BaseModel):
    id: str
    analysis_id: str
    filename: str
    name: str
    email: str | None
    skills: list[str]
    missing_skills: list[str]
    entities: dict
    projects: list[str]
    education: str | None
    experience_details: list[dict]
    semantic_score: int
    keyword_score: int
    experience_score: int
    overall_score: int
    recommendation: str
    insight: str
    requires_manual_name_entry: bool = False
    is_shortlisted: bool = False
    email_sent: bool = False
    email_sent_at: datetime | None = None
    call_scheduled: bool = False
    call_scheduled_at: datetime | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}


class AnalysisOut(BaseModel):
    id: str
    job_title: str | None
    requirements: dict
    status: str
    error: str | None
    created_at: datetime
    completed_at: datetime | None
    candidate_count: int = 0
    candidates: list[CandidateOut] = Field(default_factory=list)


class CompletedResumeOut(BaseModel):
    id: str
    filename: str
    candidate_name: str
    ats_score: int


class CurrentResumeState(BaseModel):
    filename: str | None
    candidate_name: str | None


class AnalysisStatusOut(BaseModel):
    analysis_id: str
    status: str
    phase: str | None
    current_stage: str
    total: int
    completed: int
    phase_completed: int
    phase_total: int
    current_resume: CurrentResumeState | None
    completed_resumes: list[CompletedResumeOut] = Field(default_factory=list)
    started_at: datetime
    current_resume_started_at: datetime | None
    completed_at: datetime | None

class JobDescriptionExtractOut(BaseModel):
    text: str
    filename: str
    pages: int


class ShortlistUpdateIn(BaseModel):
    """Update candidate shortlist status."""
    is_shortlisted: bool
    notes: str | None = None


class EmailTemplateIn(BaseModel):
    """Email template for sending to candidates."""
    subject: str
    body: str
    html_body: str | None = None


class SendEmailIn(BaseModel):
    """Request to send email to candidate(s)."""
    recipient_ids: list[str] | None = None  # Specific candidate IDs, or None for all shortlisted
    template_type: str = "procedure"  # procedure, rejection, custom
    custom_subject: str | None = None
    custom_body: str | None = None
    custom_html_body: str | None = None


class EmailResponseOut(BaseModel):
    """Response from email sending."""
    success: bool
    message: str
    sent_count: int = 0
    failed_count: int = 0
    errors: list[dict] = Field(default_factory=list)


class ShortlistedCandidateOut(BaseModel):
    """Candidate in shortlist with additional status info."""
    id: str
    name: str
    email: str | None
    overall_score: int
    recommendation: str
    skills: list[str]
    education: str | None
    is_shortlisted: bool
    email_sent: bool
    email_sent_at: datetime | None
    call_scheduled: bool
    call_scheduled_at: datetime | None
    notes: str | None

    model_config = {"from_attributes": True}


class CallProcedureIn(BaseModel):
    """Schedule a call/procedure for candidate."""
    candidate_id: str
    scheduled_at: datetime | None = None
    notes: str | None = None


class FilterCriteriaIn(BaseModel):
    """Filter criteria for candidates."""
    min_score: int | None = None
    max_score: int | None = None
    recommendation: str | None = None  # "Strong Match", "Good Match", etc.
    skills_filter: list[str] | None = None
    is_shortlisted: bool | None = None
    email_sent: bool | None = None

