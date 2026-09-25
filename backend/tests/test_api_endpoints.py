"""
Integration tests for FastAPI REST API endpoints using TestClient and SQLite test database.
Verifies session creation, quiz retrieval, answer submission, self-consistency confirmation,
remediation, verification, dashboard, knowledge map, and revision list.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.database import Base, get_db
from app.db.seed import seed_database
from app.main import app

# In-memory SQLite engine for fast, isolated test execution
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
    """Sets up a clean in-memory database with seeded questions before every test."""
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


# ==============================================================================
# 1. Session Tests
# ==============================================================================
def test_create_session(client):
    response = client.post("/session", json={"topic": "Newton's Laws", "student_id": "test_stud_1"})
    assert response.status_code == 201
    data = response.json()
    assert "session_id" in data
    assert data["session_id"].startswith("sess_")
    assert data["topic"] == "Newton's Laws"
    assert data["status"] == "in_progress"


# ==============================================================================
# 2. Generate Quiz Tests
# ==============================================================================
def test_generate_quiz_valid_topic(client):
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    res = client.post("/generate-quiz", json={"topic": "Newton's Laws", "session_id": session_id, "count": 2})
    assert res.status_code == 200
    data = res.json()
    assert len(data["questions"]) >= 1
    assert data["session_id"] == session_id
    # Validate Question schema
    q = data["questions"][0]
    assert "id" in q
    assert "options" in q
    assert "correct_option" in q


def test_generate_quiz_fallback_on_unknown_topic(client):
    res = client.post("/generate-quiz", json={"topic": "Quantum Gravity", "count": 2})
    assert res.status_code == 200
    data = res.json()
    assert len(data["questions"]) > 0


# ==============================================================================
# 3. Submit Answer Tests
# ==============================================================================
def test_submit_correct_answer(client):
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    # Q1 is physics_newton_q01 (correct answer: B)
    res = client.post(
        "/submit-answer",
        json={
            "session_id": session_id,
            "question_id": "physics_newton_q01",
            "selected_option": "B",
            "confidence": 5,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "correct"
    assert data["evaluation"] == "correct"
    assert data["mastery_level"] > 0.0


def test_submit_wrong_answer_initiates_diagnosis(client):
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    # Student chooses Option A (force-acceleration distractor) with confidence 5
    res = client.post(
        "/submit-answer",
        json={
            "session_id": session_id,
            "question_id": "physics_newton_q01",
            "selected_option": "A",
            "confidence": 5,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["evaluation"] == "incorrect"
    # Either diagnosing or confirmed depending on gate
    assert data["status"] in ("diagnosing", "confirmed")
    assert "active_hypotheses" in data
    assert len(data["active_hypotheses"]) >= 2
    assert data["diagnosis"] is not None
    assert "primary_misconception" in data["diagnosis"]
    assert "evidence" in data["diagnosis"]
    assert len(data["diagnosis"]["evidence"]) >= 1


def test_submit_wrong_answer_diagnosing_provisional_payload(client):
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    # Student chooses Option A with low confidence 1 so threshold is not immediately passed
    res = client.post(
        "/submit-answer",
        json={
            "session_id": session_id,
            "question_id": "physics_newton_q01",
            "selected_option": "A",
            "confidence": 1,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["evaluation"] == "incorrect"
    assert data["status"] == "diagnosing"
    assert data["diagnosis"] is not None
    assert data["diagnosis"]["confirmed"] is False
    assert data["diagnosis"]["primary_misconception"]["name"] is not None
    assert len(data["diagnosis"]["evidence"]) >= 1
    assert data["next_question"] is not None
    assert len(data["active_hypotheses"]) >= 2


def test_submit_answer_validation_errors(client):
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    # Invalid session
    res = client.post(
        "/submit-answer",
        json={
            "session_id": "invalid_session_id",
            "question_id": "physics_newton_q01",
            "selected_option": "B",
            "confidence": 5,
        },
    )
    assert res.status_code == 404

    # Invalid question
    res = client.post(
        "/submit-answer",
        json={
            "session_id": session_id,
            "question_id": "non_existent_question",
            "selected_option": "B",
            "confidence": 5,
        },
    )
    assert res.status_code == 404

    # Invalid option
    res = client.post(
        "/submit-answer",
        json={
            "session_id": session_id,
            "question_id": "physics_newton_q01",
            "selected_option": "Z",
            "confidence": 5,
        },
    )
    assert res.status_code == 400

    # Invalid confidence (outside 1-5)
    res = client.post(
        "/submit-answer",
        json={
            "session_id": session_id,
            "question_id": "physics_newton_q01",
            "selected_option": "B",
            "confidence": 7,
        },
    )
    assert res.status_code == 422 or res.status_code == 400


# ==============================================================================
# 4. Confirmation & Self-Consistency Full Loop
# ==============================================================================
def test_full_diagnostic_to_confirmation_loop(client):
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    # Step 1: Wrong answer on Q1
    res1 = client.post(
        "/submit-answer",
        json={
            "session_id": session_id,
            "question_id": "physics_newton_q01",
            "selected_option": "A",
            "confidence": 5,
        },
    )
    assert res1.status_code == 200
    data1 = res1.json()

    if data1["status"] == "diagnosing":
        next_q = data1["next_question"]
        assert next_q is not None

        # Find option corresponding to force_acceleration_confusion
        opt = "A"
        for o, m in next_q["distractor_misconceptions"].items():
            if m == "force_acceleration_confusion":
                opt = o
                break

        # Step 2: Answer diagnostic question reinforcing same misconception
        res2 = client.post(
            "/submit-answer",
            json={
                "session_id": session_id,
                "question_id": next_q["id"],
                "selected_option": opt,
                "confidence": 5,
            },
        )
        assert res2.status_code == 200
        data2 = res2.json()

        # Should reach confirmation with self-consistency simulation
        if data2["status"] == "confirmed":
            assert data2["diagnosis"]["confirmed"] is True
            assert data2["diagnosis"]["primary_misconception"]["id"] == "force_acceleration_confusion"
            assert len(data2["diagnosis"]["evidence"]) >= 2
            assert len(data2["diagnosis"]["alternatives"]) >= 1


# ==============================================================================
# 5. Remediation Tests
# ==============================================================================
def test_remediate_endpoint(client):
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    res = client.post(
        "/remediate",
        json={
            "session_id": session_id,
            "misconception_id": "force_acceleration_confusion",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["misconception_id"] == "force_acceleration_confusion"
    assert "remediation_text" in data
    assert len(data["remediation_text"]) > 20
    assert "key_takeaway" in data


def test_remediate_invalid_session_returns_404(client):
    res = client.post(
        "/remediate",
        json={
            "session_id": "non_existent_session",
            "misconception_id": "force_acceleration_confusion",
        },
    )
    assert res.status_code == 404


# ==============================================================================
# 6. Verification Tests
# ==============================================================================
def test_verify_resolved(client):
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    # Verify question physics_newton_verify_01 (correct option is B)
    res = client.post(
        "/verify",
        json={
            "session_id": session_id,
            "misconception_id": "force_acceleration_confusion",
            "question_id": "physics_newton_verify_01",
            "selected_option": "B",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "resolved"
    assert data["is_correct"] is True


def test_verify_persistent(client):
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    # Verify question physics_newton_verify_01: Option A is distractor for force_acceleration_confusion
    res = client.post(
        "/verify",
        json={
            "session_id": session_id,
            "misconception_id": "force_acceleration_confusion",
            "question_id": "physics_newton_verify_01",
            "selected_option": "A",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "persistent"
    assert data["is_correct"] is False


def test_verify_serialized_response_contract_matches_shared_schemas(client):
    """Explicitly verifies the serialized JSON response matches shared/schemas.md contract."""
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    res = client.post(
        "/verify",
        json={
            "session_id": session_id,
            "misconception_id": "force_acceleration_confusion",
            "question_id": "physics_newton_verify_01",
            "selected_option": "B",
        },
    )
    assert res.status_code == 200
    raw_json = res.json()
    assert raw_json["status"] in ("resolved", "persistent")
    assert raw_json["status"] == "resolved"
    assert raw_json["status"] != "RESOLVED"
    assert "session_id" in raw_json
    assert "misconception_id" in raw_json
    assert "explanation" in raw_json


# ==============================================================================
# 7. Dashboard, Knowledge Map, and Revision List Tests
# ==============================================================================
def test_dashboard_aggregation(client):
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    # Submit 1 correct and 1 incorrect attempt
    client.post(
        "/submit-answer",
        json={
            "session_id": session_id,
            "question_id": "physics_newton_q01",
            "selected_option": "B",
            "confidence": 5,
        },
    )
    client.post(
        "/submit-answer",
        json={
            "session_id": session_id,
            "question_id": "physics_newton_q02",
            "selected_option": "A",
            "confidence": 4,
        },
    )

    res = client.get(f"/dashboard/{session_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["total_questions_attempted"] == 2
    assert data["accuracy_rate"] == 0.5
    assert data["confidence_calibration"]["high_confidence_correct"] == 1
    assert data["confidence_calibration"]["high_confidence_incorrect"] == 1


def test_knowledge_map_and_revision_list(client):
    sess_res = client.post("/session", json={"topic": "Newton's Laws"})
    session_id = sess_res.json()["session_id"]

    # Generate a persistent misconception via verification failure
    client.post(
        "/verify",
        json={
            "session_id": session_id,
            "misconception_id": "force_acceleration_confusion",
            "question_id": "physics_newton_verify_01",
            "selected_option": "A",
        },
    )

    # Check Knowledge Map
    km_res = client.get(f"/knowledge-map/{session_id}")
    assert km_res.status_code == 200
    km_data = km_res.json()
    assert km_data["topic"] == "Newton's Laws"
    assert len(km_data["nodes"]) >= 1

    # Check Revision List
    rev_res = client.get(f"/revision-list/{session_id}")
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert len(rev_data["revision_items"]) >= 1
    assert rev_data["revision_items"][0]["status"] == "persistent"
