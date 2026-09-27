from datetime import datetime
from pathlib import Path
from typing import Optional, Dict
from .database import SessionLocal
from .models import Analysis, Candidate
from .nlp import (
    extract_entities, extract_pdf_text, extract_skills, infer_name,
    recommendation, semantic_similarities, extract_jd_requirements,
    calculate_composite_score, extract_projects, extract_education, extract_experience_details,
    extract_candidate_name_tiered, extract_candidate_name_production, extract_resume_data_ollama,
    normalize_skill_term
)


def merge_resume_contact_data(entities: dict | None, *, email: str | None = None, phone: str | None = None) -> dict:
    """Merge structured resume contact fields into the entity payload used for storage and export."""
    merged = dict(entities or {})
    if email:
        merged["emails"] = [email]
    elif "emails" not in merged or not merged["emails"]:
        merged["emails"] = []

    if phone:
        merged["phones"] = [phone]
    elif "phones" not in merged or not merged["phones"]:
        merged["phones"] = []

    for key in ("organizations", "locations"):
        if key not in merged:
            merged[key] = []
    return merged


def analyse_job(analysis_id: str, upload_paths: list[tuple[str, str]]) -> None:
    """Run in FastAPI's background worker; results are persisted for polling."""
    db = SessionLocal()
    try:
        analysis = db.get(Analysis, analysis_id)
        if not analysis:
            return
        analysis.status = "processing"
        analysis.current_phase = "text_extraction"
        analysis.phase_total = len(upload_paths)
        analysis.phase_completed = 0
        db.commit()

        parsed: list[tuple[str, str, str]] = []
        skipped: list[str] = []
        for filename, path in upload_paths:
            analysis.current_resume_filename = filename
            analysis.current_resume_candidate_name = None
            analysis.current_resume_started_at = datetime.utcnow()
            analysis.current_stage = "extracting_text"
            db.commit()
            
            try:
                text = extract_pdf_text(path)
                if len(text) < 40:
                    raise ValueError("no extractable text after OCR")
                parsed.append((filename, text, path))
            except Exception as exc:
                skipped.append(f"{filename}: {exc}")
                
            analysis.phase_completed += 1
            db.commit()

        if not parsed:
            details = "; ".join(skipped[:5])
            raise ValueError(f"No resumes could be processed. {details}")

        # Extract JD requirements with REQ vs PREF distinction
        required_skills, preferred_skills = extract_jd_requirements(analysis.job_description)
        job_skills = set(required_skills + preferred_skills)
        
        # Store both required and preferred skills for analysis
        analysis.requirements = {
            "required": required_skills,
            "preferred": preferred_skills,
            "all": sorted(job_skills)
        }
        
        # Calculate semantic similarities with normalization
        analysis.current_phase = "calculating_similarities"
        analysis.current_stage = "calculating_similarities"
        analysis.current_resume_filename = None
        analysis.current_resume_candidate_name = None
        analysis.phase_total = len(parsed)
        analysis.phase_completed = 0
        db.commit()
        
        similarities = semantic_similarities(analysis.job_description, [text for _, text, _ in parsed])
        
        analysis.phase_completed = len(parsed)
        db.commit()
        
        analysis.current_phase = "ai_analysis"
        analysis.phase_total = len(parsed)
        analysis.phase_completed = 0
        db.commit()

        for (filename, text, path), similarity in zip(parsed, similarities):
            analysis.current_resume_filename = filename
            analysis.current_resume_candidate_name = None
            analysis.current_resume_started_at = datetime.utcnow()
            analysis.current_stage = "analyzing_skills"
            db.commit()
            
            # Use Ollama-based structured extraction for all metadata
            try:
                ollama_data = extract_resume_data_ollama(text, path)
                candidate_name = ollama_data["name"]
                requires_manual_entry = ollama_data["requires_manual_entry"]
                experience_years = ollama_data["experience_years"]
                education = ollama_data["education"]
                skills = set(ollama_data["skills"])
                # Use Ollama-extracted work experience and projects if available
                projects = ollama_data.get("notable_projects", [])
                experience_details = ollama_data.get("work_experience", [])
            except Exception as e:
                print(f"Ollama extraction failed for {filename}, falling back to rule-based: {e}")
                # Fallback to existing rule-based extraction
                skills = set(extract_skills(text))
                entities = extract_entities(text)
                candidate_name, requires_manual_entry = extract_candidate_name_production(text, filename, path)
                experience_years = float(entities.get("experience_years", 0))
                education = extract_education(text)
                # Fallback to rule-based extraction for projects and experience
                projects = extract_projects(text)
                experience_details = extract_experience_details(text)
            
            # Extract entities for other information and preserve contact metadata from the resume itself.
            entities = extract_entities(text)
            extracted_email = None
            extracted_phone = None
            if isinstance(ollama_data, dict):
                extracted_email = ollama_data.get("email")
                extracted_phone = ollama_data.get("phone")
            entities = merge_resume_contact_data(entities, email=extracted_email, phone=extracted_phone)
            
            # Ensure experience_details is in the right format for database
            if not isinstance(experience_details, list):
                experience_details = []
            
            analysis.current_resume_candidate_name = candidate_name
            analysis.current_stage = "calculating_score"
            db.commit()
            
            # Ensure projects is a list
            if not isinstance(projects, list):
                projects = []
            
            # Calculate skill metrics using canonical skill normalization for a cleaner match.
            normalized_skills = {normalize_skill_term(skill) for skill in skills}
            normalized_required = {normalize_skill_term(skill) for skill in required_skills}
            normalized_preferred = {normalize_skill_term(skill) for skill in preferred_skills}
            matching_required = sorted(normalized_skills & normalized_required)
            matching_preferred = sorted(normalized_skills & normalized_preferred)
            matching_all = sorted(normalized_skills & (normalized_required | normalized_preferred))
            missing_required = sorted(normalized_required - normalized_skills)
            missing_preferred = sorted(normalized_preferred - normalized_skills)
            
            # Skill coverage score (weighted more heavily for required skills)
            if normalized_required:
                required_coverage = (len(matching_required) / len(normalized_required)) * 100
            else:
                required_coverage = 100
            
            if normalized_preferred:
                preferred_coverage = (len(matching_preferred) / len(normalized_preferred)) * 50
            else:
                preferred_coverage = 0
            
            skill_coverage = min(100, required_coverage + preferred_coverage)
            
            # Semantic fit score (normalized + JD skill-alignment boost)
            semantic_fit_raw = similarity * 100
            if normalized_required:
                skill_alignment_boost = (len(matching_required) / len(normalized_required)) * 20
            else:
                skill_alignment_boost = 0
            semantic_fit = min(100, round(semantic_fit_raw * 0.8 + skill_alignment_boost))
            
            # Experience match score (using Ollama-extracted years)
            years = int(experience_years)
            if years > 0:
                # Cap at 15 years for scoring purposes
                normalized_years = min(years, 15)
                experience_match = min(100, 50 + (normalized_years / 15) * 50)
            else:
                # Fallback heuristic based on work history mentions
                work_history_keywords = ['experience', 'work', 'company', 'role', 'position', 'job']
                has_work_history = any(keyword in text.lower() for keyword in work_history_keywords)
                experience_match = 60 if has_work_history else 40
            
            # Education/role alignment (using Ollama-extracted education)
            education_keywords = ['bachelor', 'master', 'phd', 'degree', 'university', 'college']
            has_education = any(keyword in education.lower() for keyword in education_keywords) if education else False
            education_alignment = 70 if has_education else 50
            
            # Calculate composite score using calibrated weights
            overall = calculate_composite_score(
                skill_coverage=skill_coverage,
                semantic_fit=semantic_fit,
                experience_match=experience_match,
                education_role_alignment=education_alignment
            )
            
            score_label = recommendation(overall)
            
            # Generate structured, detailed insight
            analysis.current_stage = "generating_insights"
            db.commit()
            
            insight_parts = []
            
            # Overall assessment
            insight_parts.append(f"**Overall Assessment:** {score_label}")
            
            # Key strengths
            if matching_required:
                strength_list = sorted(matching_required)[:4]
                insight_parts.append(f"**Key Strengths:** {', '.join(strength_list)}")
            elif matching_preferred:
                strength_list = sorted(matching_preferred)[:3]
                insight_parts.append(f"**Key Strengths:** {', '.join(strength_list)}")
            else:
                insight_parts.append("**Key Strengths:** Transferable experience and relevant background")
            
            # Skill coverage analysis
            coverage_percent = int(skill_coverage)
            insight_parts.append(f"**Skill Coverage:** {coverage_percent}% of job requirements met")
            
            # Skill gaps
            if missing_required:
                gap_list = sorted(missing_required)[:3]
                insight_parts.append(f"**Critical Gaps:** {', '.join(gap_list)}")
            elif missing_preferred:
                gap_list = sorted(missing_preferred)[:2]
                insight_parts.append(f"**Missing Preferred:** {', '.join(gap_list)}")
            else:
                insight_parts.append("**Skill Gaps:** None detected")
            
            # Experience alignment
            if years > 0:
                if years >= 5:
                    exp_assessment = "Strong experience alignment with role requirements"
                elif years >= 3:
                    exp_assessment = "Good experience level for this position"
                else:
                    exp_assessment = "Developing experience with growth potential"
                insight_parts.append(f"**Experience:** {exp_assessment} ({years} years)")
            else:
                insight_parts.append("**Experience:** Experience level not clearly specified")
            
            # Recommendation
            if overall >= 85:
                recommendation_text = "Highly recommended for immediate consideration"
            elif overall >= 70:
                recommendation_text = "Good fit worth interviewing"
            elif overall >= 60:
                recommendation_text = "Potential candidate with some skill development needed"
            else:
                recommendation_text = "May require significant skill development for this role"
            insight_parts.append(f"**Recommendation:** {recommendation_text}")
            
            insight = " | ".join(insight_parts)
            
            db.add(Candidate(
                analysis_id=analysis.id, filename=filename, stored_filename=Path(path).name, name=candidate_name,
                email=(entities.get("emails") or [None])[0], text=text, skills=sorted(skills),
                missing_skills=missing_required + missing_preferred, entities=entities,
                projects=projects, education=education, experience_details=experience_details,
                semantic_score=semantic_fit,
                keyword_score=int(skill_coverage), experience_score=int(experience_match), 
                overall_score=overall,
                recommendation=score_label, insight=insight,
                requires_manual_name_entry=requires_manual_entry,
            ))
            
            analysis.phase_completed += 1
            db.commit()
            
        analysis.status = "completed"
        analysis.current_phase = "completed"
        analysis.current_stage = "completed"
        analysis.current_resume_filename = None
        analysis.current_resume_candidate_name = None
        # An analysis can be useful even if individual documents were unreadable.
        analysis.error = f"Skipped {len(skipped)} file(s): " + "; ".join(skipped[:5]) if skipped else None
        analysis.completed_at = datetime.utcnow()
        db.commit()
    except Exception as exc:
        db.rollback()
        analysis = db.get(Analysis, analysis_id)
        if analysis:
            analysis.status = "failed"
            analysis.current_phase = "failed"
            analysis.current_stage = "failed"
            analysis.error = str(exc)
            db.commit()
    finally:
        db.close()
