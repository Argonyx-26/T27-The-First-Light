"""
Unit and integration tests for Stage 8:
- Longitudinal 'Why You're Losing Marks' (Error loss attribution across all history)
- Per-misconception 5-stage Progress Journey (Diagnosed -> Learned -> Practiced -> Verified -> Mastered)
"""

from datetime import datetime
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.db.models import (
    AttemptModel,
    ExamAttemptModel,
    ExamSessionModel,
    MisconceptionStateModel,
    QuestionModel,
    RemediationRecordModel,
    SessionModel,
)
from app.db.seed import seed_database
from app.engine.exam_diagnostic import (
    classify_attempt_error,
    compute_longitudinal_loss_attribution,
)
from app.engine.journey_engine import compute_misconception_journey
from app.main import app

TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    with TestingSessionLocal() as db:
        seed_database(db)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


def test_classify_attempt_error():
    distractors = {
        "A": "calculation_error",
        "B": "formula_confusion",
        "C": "impetus_fallacy",
    }
    # Correct -> None
    cat, overconf, matched = classify_attempt_error("C", 4, is_correct=True, distractor_misconceptions=distractors)
    assert cat is None
    assert overconf is False

    # Calculation slip
    cat, overconf, matched = classify_attempt_error("A", 3, is_correct=False, distractor_misconceptions=distractors)
    assert cat == "calculation_slips"
    assert overconf is False
    assert matched == "calculation_error"

    # Formula confusion with high confidence (overconfident trap)
    cat, overconf, matched = classify_attempt_error("B", 5, is_correct=False, distractor_misconceptions=distractors)
    assert cat == "formula_confusion"
    assert overconf is True
    assert matched == "formula_confusion"

    # Cognitive misconception
    cat, overconf, matched = classify_attempt_error("C", 4, is_correct=False, distractor_misconceptions=distractors)
    assert cat == "conceptual"
    assert overconf is True
    assert matched == "impetus_fallacy"

    # Blind guess confidence=1 with unmapped distractor
    cat, overconf, matched = classify_attempt_error("D", 1, is_correct=False, distractor_misconceptions=distractors)
    assert cat == "calculation_slips"
    assert overconf is False


def test_compute_longitudinal_loss_attribution():
    with TestingSessionLocal() as db:
        student_id = "test_student_longitudinal"
        sess = SessionModel(
            id="sess_long_1",
            student_id=student_id,
            topic="Newton's Laws",
        )
        db.add(sess)

        # Get questions
        q_list = db.query(QuestionModel).all()
        q1 = q_list[0]
        q2 = q_list[1]
        q3 = q_list[2]

        # Add practice attempts
        # Attempt 1: Conceptual error with confidence 5
        att1 = AttemptModel(
            session_id=sess.id,
            question_id=q1.id,
            selected_option="A",
            confidence=5,
            is_correct=False,
            matched_misconception_id="impetus_fallacy",
        )
        # Attempt 2: Correct
        att2 = AttemptModel(
            session_id=sess.id,
            question_id=q2.id,
            selected_option=q2.correct_option,
            confidence=4,
            is_correct=True,
        )
        db.add_all([att1, att2])

        # Add exam session with attempts
        exam = ExamSessionModel(
            id="exam_long_1",
            session_id=sess.id,
            topic="Newton's Laws",
            question_count=2,
            score=1,
            total_questions=2,
        )
        db.add(exam)

        exam_att1 = ExamAttemptModel(
            exam_id=exam.id,
            question_id=q3.id,
            attempt_order=1,
            selected_option="B",
            confidence=4,
            is_correct=False,
        )
        db.add(exam_att1)
        db.commit()

        # Compute longitudinal attribution
        result = compute_longitudinal_loss_attribution(db, student_id)
        assert result["student_id"] == student_id
        assert result["total_losses"] == 2
        assert result["why_you_lost_marks"]["overconfidence_errors"] == 2
        assert result["percentages"]["overconfidence_errors"] == 100.0


def test_compute_misconception_journey_progression():
    with TestingSessionLocal() as db:
        session_id = "sess_journey_1"
        misc_id = "force_motion_proportionality"
        sess = SessionModel(id=session_id, student_id="student_journey", topic="Newton's Laws")
        db.add(sess)

        # 1. Initially unobserved
        j0 = compute_misconception_journey(db, session_id, misc_id)
        assert j0["current_stage"] == "Diagnosed"
        assert j0["stages"][0]["status"] == "current"
        assert j0["stages"][1]["status"] == "upcoming"

        # 2. Diagnosed
        state = MisconceptionStateModel(
            session_id=session_id,
            misconception_id=misc_id,
            label="Force Motion Proportionality",
            probability=0.88,
            status="confirmed",
            evidence_count=2,
        )
        db.add(state)
        db.commit()

        j1 = compute_misconception_journey(db, session_id, misc_id)
        assert j1["current_stage"] == "Diagnosed"
        assert j1["stages"][0]["status"] == "completed"
        assert j1["stages"][1]["status"] == "current"

        # 3. Learned (Remediation reviewed)
        rem = RemediationRecordModel(
            session_id=session_id,
            misconception_id=misc_id,
            title="Newton's Second Law & Velocity",
            remediation_text="Force causes acceleration, not velocity.",
            grounded=True,
        )
        db.add(rem)
        db.commit()

        j2 = compute_misconception_journey(db, session_id, misc_id)
        assert j2["current_stage"] == "Learned"
        assert j2["stages"][1]["status"] == "completed"
        assert j2["stages"][2]["status"] == "current"

        # 4. Practiced (Practice attempts completed)
        q = db.query(QuestionModel).first()
        att = AttemptModel(
            session_id=session_id,
            question_id=q.id,
            selected_option=q.correct_option,
            confidence=4,
            is_correct=True,
        )
        db.add(att)
        db.commit()

        j3 = compute_misconception_journey(db, session_id, misc_id)
        assert j3["current_stage"] == "Practiced"
        assert j3["stages"][2]["status"] == "completed"
        assert j3["stages"][3]["status"] == "current"

        # 5. Verified & Mastered
        state.status = "resolved"
        db.commit()

        j4 = compute_misconception_journey(db, session_id, misc_id)
        assert j4["current_stage"] in ["Verified", "Mastered"]
        assert j4["stages"][3]["status"] == "completed"


def test_api_loss_attribution_and_journey_endpoints():
    client = TestClient(app)

    # 1. Test loss-attribution endpoint for student_priya (from cohort seed)
    res = client.get("/analytics/loss-attribution/student_priya")
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == "student_priya"
    assert "why_you_lost_marks" in data
    assert "percentages" in data
    assert "conceptual" in data["why_you_lost_marks"]
    assert "overconfidence_errors" in data["why_you_lost_marks"]
    assert "formula_confusion" in data["why_you_lost_marks"]
    assert "calculation_slips" in data["why_you_lost_marks"]

    # 2. Test journey endpoint
    sess_res = client.post("/session", json={"topic": "Newton's Laws", "mode": "adaptive_diagnosis"})
    assert sess_res.status_code in (200, 201)
    session_id = sess_res.json()["session_id"]

    j_res = client.get(f"/journey/{session_id}/impetus_fallacy")
    assert j_res.status_code == 200
    j_data = j_res.json()
    assert j_data["session_id"] == session_id
    assert j_data["misconception_id"] == "impetus_fallacy"
    assert len(j_data["stages"]) == 5
    stage_titles = [s["title"] for s in j_data["stages"]]
    assert stage_titles == ["Diagnosed", "Learned", "Practiced", "Verified", "Mastered"]
