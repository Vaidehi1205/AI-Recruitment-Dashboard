"""
Test script to validate refactored backend components.
This script tests the key improvements made to the processing pipeline.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import build_report_workbook
from app.nlp import (
    sanitize_pdf_text, extract_skills, extract_jd_requirements,
    extract_work_dates, calculate_total_experience, normalize_cosine_similarity,
    calculate_composite_score, infer_name
)

def test_pdf_sanitization():
    """Test PDF text sanitization removes template noise."""
    print("Testing PDF Sanitization...")
    
    # Test case with template noise
    noisy_text = """
    John Doe
    Senior Software Engineer
    Website: www.qwikresume.com
    Email: john.doe@email.com
    Phone: +1-555-0123
    Address: 123 Tech Street, CA
    
    Experience
    5+ years of experience in software development...
    """
    
    cleaned = sanitize_pdf_text(noisy_text)
    
    # Check that template noise is removed
    assert "qwikresume.com" not in cleaned.lower(), "Template URL not removed"
    assert "email:" not in cleaned.lower(), "Email header not removed"
    assert "phone:" not in cleaned.lower(), "Phone header not removed"
    assert "address:" not in cleaned.lower(), "Address header not removed"
    
    # Check that meaningful content is preserved
    assert "John Doe" in cleaned, "Name removed incorrectly"
    assert "Senior Software Engineer" in cleaned, "Title removed incorrectly"
    assert "Experience" in cleaned, "Section header removed incorrectly"
    
    print("✓ PDF sanitization working correctly")


def test_jd_skill_extraction():
    """Test JD-specific skill extraction with REQ vs PREF distinction."""
    print("Testing JD Skill Extraction...")
    
    java_jd = """
    We are looking for a Senior Java Developer.
    
    Required Skills:
    - Java, Spring Boot, Hibernate
    - Experience with REST APIs
    - Database knowledge (SQL, PostgreSQL)
    
    Preferred Skills:
    - AWS cloud experience
    - Docker and Kubernetes
    - Microservices architecture
    """
    
    required, preferred = extract_jd_requirements(java_jd)
    
    # Check that Java-specific skills are extracted
    assert "Java" in required, "Java not found in required skills"
    assert "Spring Boot" in required, "Spring Boot not found in required skills"
    assert "SQL" in required, "SQL not found in required skills"
    
    # Check that cloud/devops are preferred
    assert "AWS" in preferred, "AWS not found in preferred skills"
    assert "Docker" in preferred, "Docker not found in preferred skills"
    
    # Check that Python/global skills are NOT extracted (since not in JD)
    assert "Python" not in required and "Python" not in preferred, "Python incorrectly extracted from Java JD"
    
    print("✓ JD skill extraction working correctly")


def test_date_extraction():
    """Test work experience date extraction and calculation."""
    print("Testing Date Extraction...")
    
    resume_text = """
    Work Experience
    
    Senior Developer - Tech Corp
    Jan 2018 - Present
    
    Junior Developer - Startup Inc  
    2015 - 2017
    
    Intern - University Lab
    06/2014 - 12/2014
    """
    
    date_ranges = extract_work_dates(resume_text)
    
    # Should extract at least 2 date ranges
    assert len(date_ranges) >= 2, f"Expected at least 2 date ranges, got {len(date_ranges)}"
    
    # Calculate total experience
    total_years = calculate_total_experience(date_ranges)
    
    from datetime import datetime
    expected_max = (datetime.now().year - 2018) + 4.0
    assert total_years <= expected_max, f"Experience calculation too high: {total_years} (max expected: {expected_max})"
    
    print(f"✓ Date extraction working correctly (calculated {total_years} years)")


def test_semantic_normalization():
    """Test semantic similarity normalization."""
    print("Testing Semantic Normalization...")
    
    # Simulate raw cosine similarities (typically 0.4-0.6 range)
    raw_similarities = [0.45, 0.52, 0.58, 0.41, 0.55]
    
    normalized = normalize_cosine_similarity(raw_similarities)
    
    # Check that normalization improves the range
    assert max(normalized) > 0.7, "Normalization not improving high scores"
    assert min(normalized) < 0.3, "Normalization not improving low scores"
    
    # Check that relative ordering is preserved
    assert normalized[2] > normalized[1] > normalized[0], "Ordering not preserved"
    
    print(f"✓ Semantic normalization working correctly (raw: {raw_similarities} -> normalized: {[round(x, 2) for x in normalized]})")


def test_composite_scoring():
    """Test composite scoring with calibrated weights."""
    print("Testing Composite Scoring...")
    
    # Test case: High skill coverage candidate
    high_skill_score = calculate_composite_score(
        skill_coverage=95,      # 95% skill coverage
        semantic_fit=80,        # Good semantic fit
        experience_match=85,    # Strong experience
        education_role_alignment=80
    )
    
    # Should achieve 85%+ "Strong Match" status with 95% skill coverage
    assert high_skill_score >= 85, f"High skill candidate should get 85%+, got {high_skill_score}"
    
    # Test case: Low skill coverage candidate
    low_skill_score = calculate_composite_score(
        skill_coverage=40,      # Poor skill coverage
        semantic_fit=60,       # Moderate semantic fit
        experience_match=70,    # Good experience
        education_role_alignment=60
    )
    
    # Should not achieve strong match status
    assert low_skill_score < 70, f"Low skill candidate should not get 70%+, got {low_skill_score}"
    
    print(f"✓ Composite scoring working correctly (high skill: {high_skill_score}%, low skill: {low_skill_score}%)")


def test_name_inference():
    """Test improved name inference."""
    print("Testing Name Inference...")
    
    # Test case with clean name
    clean_text = """
    Sarah Johnson
    Senior Data Scientist
    
    Experience...
    """
    
    name = infer_name(clean_text, "resume.pdf")
    assert "Sarah Johnson" in name, f"Name inference failed, got: {name}"
    
    # Test case with template noise
    noisy_text = """
    Website: www.resumeworded.com
    Email: sarah@test.com
    Michael Chen
    Software Engineer
    
    Skills...
    """
    
    name = infer_name(noisy_text, "michael_chen_resume.pdf")
    assert "Michael Chen" in name, f"Name inference failed with noise, got: {name}"
    assert "Website" not in name, "Template noise not filtered from name"
    
    print("✓ Name inference working correctly")


def test_report_workbook_includes_candidate_details():
    """Candidate data must be exported into the Excel report."""
    print("Testing Excel report export details...")

    from types import SimpleNamespace

    candidate = SimpleNamespace(
        name="Alice Johnson",
        email="alice@example.com",
        overall_score=88,
        semantic_score=90,
        keyword_score=85,
        experience_score=80,
        recommendation="Strong Match",
        skills=["Python", "FastAPI", "SQL"],
        missing_skills=["AWS"],
        insight="Strong backend fit with a gap in cloud deployment.",
        education="BSc Computer Science",
        projects=["Internal API Gateway"],
        experience_details=[{"title": "Backend Engineer", "organization": "Acme"}],
        entities={
            "phones": ["+1-555-0101"],
            "organizations": ["Acme Corp"],
            "locations": ["Boston, MA"],
            "experience_years": 6,
        },
    )
    analysis = SimpleNamespace(
        job_title="Senior Python Engineer",
        requirements={
            "required": ["Python", "FastAPI", "SQL"],
            "preferred": ["AWS"],
        },
        candidates=[candidate],
    )

    workbook = build_report_workbook(analysis)
    sheet_names = workbook.sheetnames
    assert "Candidate ranking" in sheet_names, "Ranking sheet missing"
    assert "Candidate details" in sheet_names, "Candidate detail sheet missing"

    details = workbook["Candidate details"]
    rows = list(details.iter_rows(values_only=True))
    assert any("Alice Johnson" in str(value) for row in rows for value in row), "Candidate name missing from detail sheet"
    assert any("FastAPI" in str(value) for row in rows for value in row), "Matched skills missing from detail sheet"
    assert any("AWS" in str(value) for row in rows for value in row), "Missing skills missing from detail sheet"
    assert any("+1-555-0101" in str(value) for row in rows for value in row), "Phone number missing from detail sheet"
    assert any("Boston, MA" in str(value) for row in rows for value in row), "Location missing from detail sheet"
    assert any("Acme Corp" in str(value) for row in rows for value in row), "Organization missing from detail sheet"

    print("✓ Excel report includes candidate details")


def run_all_tests():
    """Run all validation tests."""
    print("=" * 50)
    print("Running Refactored Component Tests")
    print("=" * 50)
    
    try:
        test_pdf_sanitization()
        test_jd_skill_extraction()
        test_date_extraction()
        test_semantic_normalization()
        test_composite_scoring()
        test_name_inference()
        test_report_workbook_includes_candidate_details()
        
        print("=" * 50)
        print("✓ All tests passed successfully!")
        print("=" * 50)
        return True
        
    except AssertionError as e:
        print(f"✗ Test failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)