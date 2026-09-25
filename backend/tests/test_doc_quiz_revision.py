"""
Integration test for uploaded-doc quizzes feeding the same misconception_states table
and revision_priority scoring as topic-based quizzes (one code path, not two).
"""

import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.database import Base, get_db
from app.db.seed import seed_database
from app.main import app
from app.db.models import MisconceptionStateModel

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


client = TestClient(app)


def test_uploaded_doc_quiz_feeds_same_revision_scoring():
    # 1. Ingest a study document via /rag/upload
    doc_content = b"""
    # Physics Notes: Newton's Laws of Motion
    An object at rest stays at rest, and an object in constant motion stays in motion with the same speed
    and in the same direction unless acted upon by a net external force.
    Force causes acceleration (change in velocity), not velocity itself.
    Action and reaction pairs act on different interacting bodies and never cancel each other out.
    """
    upload_res = client.post(
        "/rag/upload",
        files={"file": ("newtons_laws_notes.txt", io.BytesIO(doc_content), "text/plain")},
        data={"topic": "Newton's Laws"},
    )
    assert upload_res.status_code == 200, upload_res.text
    doc_data = upload_res.json()
    doc_id = doc_data["document_id"]
    assert doc_id is not None

    # Verify preview endpoint returns first-page excerpt
    prev_res = client.get(f"/rag/documents/{doc_id}/preview")
    assert prev_res.status_code == 200
    assert "Physics Notes" in prev_res.json()["preview_excerpt"]

    # 2. Generate a quiz from the uploaded document
    quiz_res = client.post(
        "/rag/generate-quiz",
        json={
            "document_id": doc_id,
            "scope": "all",
            "count": 3,
        },
    )
    assert quiz_res.status_code == 200, quiz_res.text
    quiz_data = quiz_res.json()
    session_id = quiz_data["session_id"]
    questions = quiz_data["questions"]
    assert len(questions) > 0
    assert session_id is not None

    # Verify the question has distractor misconceptions
    first_q = questions[0]
    assert "distractor_misconceptions" in first_q
    # Distractor 'A' maps to 'force_acceleration_confusion'
    assert first_q["distractor_misconceptions"]["A"] == "force_acceleration_confusion"

    # 3. Answer question 1 WRONG with Option A (confidence 4)
    submit_res = client.post(
        "/submit-answer",
        json={
            "session_id": session_id,
            "question_id": first_q["id"],
            "selected_option": "A",
            "confidence": 4,
        },
    )
    assert submit_res.status_code == 200
    sub_data = submit_res.json()
    assert sub_data["evaluation"] == "incorrect"

    # 4. Confirm misconception_states table was updated (same table, same code path)
    with TestingSessionLocal() as db:
        m_states = db.query(MisconceptionStateModel).filter(
            MisconceptionStateModel.session_id == session_id
        ).all()
        assert len(m_states) > 0
        state_ids = [m.misconception_id for m in m_states]
        assert "force_acceleration_confusion" in state_ids

    # 5. Call GET /revision/daily/{session_id} and confirm it appears in the daily revision set
    daily_res = client.get(f"/revision/daily/{session_id}")
    assert daily_res.status_code == 200, daily_res.text
    daily_data = daily_res.json()
    assert daily_data["total_questions"] == 5

    # Check that force_acceleration_confusion is ranked and included
    target_misc_ids = [
        item["target_misconception_id"]
        for item in daily_data["questions"]
        if item.get("target_misconception_id")
    ]
    assert "force_acceleration_confusion" in target_misc_ids

    # 6. Check GET /revision-list/{session_id} to verify revision_priority score is positive
    rev_list_res = client.get(f"/revision-list/{session_id}")
    assert rev_list_res.status_code == 200
    rev_list = rev_list_res.json()["revision_items"]
    fac_item = next((item for item in rev_list if item["misconception_id"] == "force_acceleration_confusion"), None)
    assert fac_item is not None
    assert fac_item["revision_priority"] > 0
    assert fac_item["questions_affected"] >= 1
