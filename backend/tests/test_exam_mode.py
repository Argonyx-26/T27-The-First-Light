"""
Integration and diagnostic verification tests for Exam Mode.
Tests exam generation (topic and comprehensive science sampling),
server-authoritative timer, answering and reviewing questions,
submission scoring, principled error taxonomy classification,
misconception aggregation without overclaiming careless errors,
and teacher cohort monitoring.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.database import Base, get_db
from app.db.seed import seed_database
from app.main import app


TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
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


@pytest.fixture(scope="function", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    with TestingSessionLocal() as db:
        seed_database(db)

    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_create_exam_standard_topic(client):
    """Verifies creating an exam for a single topic with standard 12 questions."""
    payload = {
        "topic": "Newton's Laws",
        "question_count": 12,
        "time_limit_minutes": 20,
        "student_id": "stud_exam_01",
    }
    res = client.post("/exam", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["exam_id"].startswith("exam_")
    assert data["student_id"] == "stud_exam_01"
    assert data["topic"] == "Newton's Laws"
    assert data["total_questions"] == 12
    assert data["time_limit_minutes"] == 20
    assert data["remaining_seconds"] == 1200
    assert data["status"] == "in_progress"
    assert len(data["questions"]) == 12
    assert len(data["attempts"]) == 12

    # Verify answers and distractor misconceptions are NOT leaked in questions view
    first_q = data["questions"][0]
    assert "id" in first_q
    assert "concept" in first_q
    assert "question_text" in first_q
    assert "options" in first_q
    assert "correct_option" not in first_q
    assert "distractor_misconceptions" not in first_q


def test_create_exam_comprehensive_science_sampling(client):
    """Verifies Comprehensive Science samples evenly across the 3 pool topics."""
    # 12 questions: 4 from Newton's Laws, 4 from Kinematics, 4 from Chemical Bonding
    payload = {
        "topic": "Comprehensive Science",
        "question_count": 12,
        "time_limit_minutes": 25,
        "student_id": "stud_comp_01",
    }
    res = client.post("/exam", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_questions"] == 12
    assert len(data["questions"]) == 12

    topic_counts = {}
    for q in data["questions"]:
        t = q["topic"]
        topic_counts[t] = topic_counts.get(t, 0) + 1

    assert topic_counts.get("Newton's Laws") == 4
    assert topic_counts.get("Kinematics") == 4
    assert topic_counts.get("Chemical Bonding") == 4

    # 10 questions: 4, 3, 3
    res10 = client.post("/exam", json={"topic": "Comprehensive Science", "question_count": 10, "time_limit_minutes": 15})
    assert res10.status_code == 200
    d10 = res10.json()
    t10 = {}
    for q in d10["questions"]:
        t10[q["topic"]] = t10.get(q["topic"], 0) + 1
    assert t10.get("Newton's Laws") == 4
    assert t10.get("Kinematics") == 3
    assert t10.get("Chemical Bonding") == 3

    # 15 questions: 5, 5, 5
    res15 = client.post("/exam", json={"topic": "Comprehensive Science", "question_count": 15, "time_limit_minutes": 30})
    assert res15.status_code == 200
    d15 = res15.json()
    t15 = {}
    for q in d15["questions"]:
        t15[q["topic"]] = t15.get(q["topic"], 0) + 1
    assert t15.get("Newton's Laws") == 5
    assert t15.get("Kinematics") == 5
    assert t15.get("Chemical Bonding") == 5


def test_create_exam_invalid_inputs(client):
    """Verifies validation errors on invalid topic or question count."""
    res_topic = client.post("/exam", json={"topic": "Quantum Computing", "question_count": 12, "time_limit_minutes": 20})
    assert res_topic.status_code in (400, 422)

    res_count = client.post("/exam", json={"topic": "Newton's Laws", "question_count": 7, "time_limit_minutes": 20})
    assert res_count.status_code in (400, 422)


def test_get_exam_and_timer(client):
    """Verifies GET /exam/{exam_id} returns session state and non-negative server remaining time."""
    exam_res = client.post("/exam", json={"topic": "Newton's Laws", "question_count": 10, "time_limit_minutes": 15})
    exam_id = exam_res.json()["exam_id"]

    get_res = client.get(f"/exam/{exam_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["exam_id"] == exam_id
    assert 0 < data["remaining_seconds"] <= 900
    assert len(data["questions"]) == 10

    # Non-existent exam returns 404
    assert client.get("/exam/non_existent_exam_id").status_code == 404


def test_save_exam_answer_and_review(client):
    """Verifies answering questions, updating confidence, and setting marked for review."""
    exam_res = client.post("/exam", json={"topic": "Newton's Laws", "question_count": 10, "time_limit_minutes": 15})
    exam_id = exam_res.json()["exam_id"]
    q1 = exam_res.json()["questions"][0]

    # Save option and confidence
    ans_res = client.post(
        f"/exam/{exam_id}/answer",
        json={
            "question_id": q1["id"],
            "selected_option": "B",
            "confidence": 4,
            "is_marked_for_review": True,
            "time_spent_seconds": 25,
        },
    )
    assert ans_res.status_code == 200
    assert ans_res.json()["status"] == "saved"

    # Verify attempt updated via GET
    get_res = client.get(f"/exam/{exam_id}")
    attempt1 = next(a for a in get_res.json()["attempts"] if a["question_id"] == q1["id"])
    assert attempt1["selected_option"] == "B"
    assert attempt1["confidence"] == 4
    assert attempt1["is_marked_for_review"] is True
    assert attempt1["time_spent_seconds"] == 25


def test_exam_submission_and_diagnostic_post_mortem(client):
    """Verifies exam submission, scoring, and post-mortem diagnostic report generation."""
    # Create exam
    exam_res = client.post("/exam", json={"topic": "Newton's Laws", "question_count": 10, "time_limit_minutes": 15})
    exam_id = exam_res.json()["exam_id"]
    questions = exam_res.json()["questions"]

    # In Newton's Laws:
    # q01: correct=B (impetus fallacy is A)
    # q02: correct=B (gravity depends on mass is A)
    # q03: correct=B (action-reaction cancel is A)
    # Answer q01 with distractor A (impetus fallacy), confidence 5
    client.post(
        f"/exam/{exam_id}/answer",
        json={"question_id": questions[0]["id"], "selected_option": "A", "confidence": 5, "time_spent_seconds": 40},
    )
    # Answer q02 with distractor A (gravity depends on mass), confidence 4
    client.post(
        f"/exam/{exam_id}/answer",
        json={"question_id": questions[1]["id"], "selected_option": "A", "confidence": 4, "time_spent_seconds": 35},
    )
    # Answer q03 with correct option B, confidence 5
    client.post(
        f"/exam/{exam_id}/answer",
        json={"question_id": questions[2]["id"], "selected_option": "B", "confidence": 5, "time_spent_seconds": 20},
    )

    # Submit exam
    sub_res = client.post(f"/exam/{exam_id}/submit")
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["exam_id"] == exam_id
    assert sub_data["status"] == "submitted"
    assert sub_data["score"] >= 1
    assert sub_data["total"] == 10

    # Fetch post-mortem report
    rep_res = client.get(f"/exam/{exam_id}/report")
    assert rep_res.status_code == 200
    report = rep_res.json()

    assert report["exam_id"] == exam_id
    assert report["total_questions"] == 10
    assert report["correct_count"] >= 1
    assert report["incorrect_count"] >= 2
    assert "why_you_lost_marks" in report
    assert "identified_misconceptions" in report
    assert len(report["question_details"]) == 10

    # Verify that overconfidence errors are detected (since confidence was 5 and 4 on wrong answers)
    assert report["why_you_lost_marks"].get("overconfidence_errors", 0) >= 2
    assert report["why_you_lost_marks"].get("conceptual", 0) >= 2

    # Attempting to answer again after submission must be rejected
    cant_ans = client.post(
        f"/exam/{exam_id}/answer",
        json={"question_id": questions[0]["id"], "selected_option": "C", "confidence": 3},
    )
    assert cant_ans.status_code == 400


def test_teacher_exams_list(client):
    """Verifies that submitted exams appear in teacher cohort exam monitoring."""
    exam_res = client.post("/exam", json={"topic": "Kinematics", "question_count": 10, "time_limit_minutes": 15, "student_id": "stud_cohort_1"})
    exam_id = exam_res.json()["exam_id"]

    # Submit exam
    client.post(f"/exam/{exam_id}/submit")

    teacher_res = client.get("/teacher/exams")
    assert teacher_res.status_code == 200
    t_data = teacher_res.json()
    assert t_data["total_exams"] >= 1
    assert any(e["exam_id"] == exam_id for e in t_data["exams"])
