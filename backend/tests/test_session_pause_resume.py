"""
Tests for session setup (session_length), pause, resume, and active session listing.
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


def test_create_session_with_length(client):
    res = client.post(
        "/session",
        json={
            "topic": "Newton's Laws",
            "session_length": 10,
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["session_id"].startswith("sess_")
    assert data["topic"] == "Newton's Laws"
    assert data["session_length"] == 10
    assert data["status"] == "in_progress"


def test_create_unlimited_session(client):
    res = client.post(
        "/session",
        json={
            "topic": "Kinematics",
            "session_length": None,
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["session_length"] is None


def test_session_pause_resume_flow(client):
    # 1. Create session
    create_res = client.post(
        "/session",
        json={
            "topic": "Newton's Laws",
            "student_id": "test_pause_student",
            "session_length": 20,
        },
    )
    session_id = create_res.json()["session_id"]

    # 2. Generate quiz to attach initial question
    quiz_res = client.post(
        "/generate-quiz",
        json={
            "topic": "Newton's Laws",
            "session_id": session_id,
            "count": 3,
        },
    )
    assert quiz_res.status_code == 200

    # 3. Submit one wrong answer to record an attempt and hypotheses
    sub_res = client.post(
        "/submit-answer",
        json={
            "session_id": session_id,
            "question_id": quiz_res.json()["questions"][0]["id"],
            "selected_option": "A",
            "confidence": 3,
        },
    )
    assert sub_res.status_code == 200

    # 4. Check active sessions list
    active_res = client.get("/sessions/active", params={"student_id": "test_pause_student"})
    assert active_res.status_code == 200
    active_sessions = active_res.json()["sessions"]
    matching = [s for s in active_sessions if s["session_id"] == session_id]
    assert len(matching) == 1
    assert matching[0]["current_question_index"] == 2
    assert matching[0]["evidence_count"] >= 1
    assert matching[0]["session_length"] == 20

    # 5. Pause session
    pause_res = client.post(f"/session/{session_id}/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "paused"

    # 6. Resume session
    resume_res = client.post(f"/session/{session_id}/resume")
    assert resume_res.status_code == 200
    resumed = resume_res.json()
    assert resumed["status"] == "in_progress"
    assert resumed["session_length"] == 20
    assert resumed["evidence_count"] >= 1
    assert len(resumed["active_hypotheses"]) >= 1

    # 7. End session
    end_res = client.post(f"/session/{session_id}/end")
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "completed"

    # 8. Completed session no longer in active list
    active_res2 = client.get("/sessions/active", params={"student_id": "test_pause_student"})
    matching2 = [s for s in active_res2.json()["sessions"] if s["session_id"] == session_id]
    assert len(matching2) == 0
