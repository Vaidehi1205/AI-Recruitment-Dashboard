import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    job_description: Mapped[str] = mapped_column(Text)
    requirements: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    # Real-time processing state
    total_resumes: Mapped[int] = mapped_column(Integer, default=0)
    current_phase: Mapped[str | None] = mapped_column(String(50), nullable=True)
    current_stage: Mapped[str] = mapped_column(String(50), default="preparing")
    current_resume_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_resume_candidate_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_resume_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    phase_completed: Mapped[int] = mapped_column(Integer, default=0)
    phase_total: Mapped[int] = mapped_column(Integer, default=0)
    
    candidates: Mapped[list["Candidate"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    stored_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    missing_skills: Mapped[list] = mapped_column(JSON, default=list)
    entities: Mapped[dict] = mapped_column(JSON, default=dict)
    projects: Mapped[list] = mapped_column(JSON, default=list)
    education: Mapped[str | None] = mapped_column(Text, nullable=True)
    experience_details: Mapped[list] = mapped_column(JSON, default=list)
    semantic_score: Mapped[int] = mapped_column(Integer)
    keyword_score: Mapped[int] = mapped_column(Integer)
    experience_score: Mapped[int] = mapped_column(Integer)
    overall_score: Mapped[int] = mapped_column(Integer, index=True)
    recommendation: Mapped[str] = mapped_column(String(32))
    insight: Mapped[str] = mapped_column(Text)
    requires_manual_name_entry: Mapped[bool] = mapped_column(Boolean, default=False)  # Boolean flag for manual name correction UI
    is_shortlisted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)  # Track shortlist status
    email_sent: Mapped[bool] = mapped_column(Boolean, default=False)  # Track if email was sent
    email_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # Timestamp of email send
    call_scheduled: Mapped[bool] = mapped_column(Boolean, default=False)  # Track if call is scheduled
    call_scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # Timestamp of call scheduling
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)  # Internal notes about candidate
    analysis: Mapped[Analysis] = relationship(back_populates="candidates")
