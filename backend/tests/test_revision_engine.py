"""
Unit and integration tests for Priority Revision Engine and Daily 10-Minute Revision endpoint.
"""

from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.db.models import AttemptModel, MisconceptionStateModel, SessionModel
from app.db.repositories import (
    attempt_repository as attempt_repo,
    misconception_repository as misc_repo,
    question_repository as question_repo,
    session_repository as session_repo,
)
from app.db.seed import seed_database
from app.engine.models import Hypothesis, Question, QuestionType
from app.engine.revision_engine import (
    compute_revision_priorities,
    compose_daily_revision_set,
    get_prioritized_revision_list,
)
from app.main import app

# In-memory SQLite engine for tests
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
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def seeded_revision_session(db_session: Session):
    """Sets up a rich session with persistent gaps, resolved gaps, and calibration mismatches."""
    # 1. Create session
    session = session_repo.create_session(
        db=db_session,
        topic="Newton's Laws",
        student_id="student_rev_test",
    )


    # 2. Add misconception states
    # Top persistent: force_acceleration_confusion
    misc1 = MisconceptionStateModel(
        session_id=session.id,
        misconception_id="force_acceleration_confusion",
        label="Force-Acceleration Conflation",
        probability=0.92,
        status="persistent",
        evidence_count=3,
    )
    # Second persistent: mass_inertia_resistance
    misc2 = MisconceptionStateModel(
        session_id=session.id,
        misconception_id="mass_inertia_resistance",
        label="Inertia as Active Resistance",
        probability=0.85,
        status="persistent",
        evidence_count=2,
    )
    # Resolved gap within 7 days: action_reaction_same_body
    misc3 = MisconceptionStateModel(
        session_id=session.id,
        misconception_id="action_reaction_same_body",
        label="Action-Reaction on Same Body",
        probability=0.15,
        status="resolved",
        evidence_count=1,
        updated_at=datetime.utcnow() - timedelta(days=2),
    )
    db_session.add_all([misc1, misc2, misc3])
    db_session.commit()

    # 3. Add attempts:
    # 2 attempts affecting misc1
    attempt_repo.record_attempt(
        db=db_session,
        session_id=session.id,
        question_id="phys_newton_diag_01",
        selected_option="A",
        confidence=5,  # Overconfidence mismatch!
        is_correct=False,
        matched_misconception_id="force_acceleration_confusion",
    )
    attempt_repo.record_attempt(
        db=db_session,
        session_id=session.id,
        question_id="phys_newton_diag_02",
        selected_option="C",
        confidence=4,
        is_correct=False,
        matched_misconception_id="force_acceleration_confusion",
    )
    # 1 attempt affecting misc2
    attempt_repo.record_attempt(
        db=db_session,
        session_id=session.id,
        question_id="phys_newton_diag_03",
        selected_option="D",
        confidence=3,
        is_correct=False,
        matched_misconception_id="mass_inertia_resistance",
    )
    # 1 attempt resolved (correct)
    attempt_repo.record_attempt(
        db=db_session,
        session_id=session.id,
        question_id="phys_newton_verif_01",
        selected_option="B",
        confidence=4,
        is_correct=True,
    )

    return session


def test_compute_revision_priorities(db_session: Session, seeded_revision_session):
    records = compute_revision_priorities(db_session, seeded_revision_session.id)
    assert len(records) >= 3

    # Force-acceleration confusion affected 2 questions + persistent status
    top_record = records[0]
    assert top_record.misconception_id == "force_acceleration_confusion"
    assert top_record.revision_priority > 20.0

    # Second is mass_inertia_resistance (1 question affected)
    second_record = records[1]
    assert second_record.misconception_id == "mass_inertia_resistance"
    assert second_record.revision_priority < top_record.revision_priority

    # Resolved misconception should have lowest priority
    resolved_record = [r for r in records if r.misconception_id == "action_reaction_same_body"][0]
    assert resolved_record.revision_priority < 1.0


def test_get_prioritized_revision_list(db_session: Session, seeded_revision_session):
    res = get_prioritized_revision_list(db_session, seeded_revision_session.id)
    assert res.session_id == seeded_revision_session.id
    assert len(res.revision_items) >= 2

    # Verify items are sorted by revision_priority descending
    priorities = [it.revision_priority for it in res.revision_items]
    assert priorities == sorted(priorities, reverse=True)
    assert res.revision_items[0].questions_affected >= 2


def test_compose_daily_revision_set(db_session: Session, seeded_revision_session):
    daily_res = compose_daily_revision_set(db_session, seeded_revision_session.id)

    assert daily_res.session_id == seeded_revision_session.id
    assert daily_res.total_questions == 5
    assert len(daily_res.questions) == 5

    # Check 5 distinct question IDs
    q_ids = [item.question.id for item in daily_res.questions]
    assert len(set(q_ids)) == 5

    # Verify distribution
    types = [item.revision_type for item in daily_res.questions]
    persistent_count = sum(1 for t in types if t == "persistent_misconception")
    spaced_count = sum(1 for t in types if t == "spaced_recheck")
    calib_count = sum(1 for t in types if t == "confidence_calibration")

    assert persistent_count == 2
    assert spaced_count == 2
    assert calib_count == 1

    # Check calibration question caught the high-confidence mismatch
    calib_item = [item for item in daily_res.questions if item.revision_type == "confidence_calibration"][0]
    assert "high confidence" in calib_item.reason_description or "calibration" in calib_item.reason_description.lower()


def test_daily_revision_api_endpoint(client: TestClient, seeded_revision_session):
    # Valid session
    response = client.get(f"/revision/daily/{seeded_revision_session.id}")
    assert response.status_code == 200
    data = response.json()

    assert data["session_id"] == seeded_revision_session.id
    assert data["total_questions"] == 5
    assert len(data["questions"]) == 5
    assert "estimated_minutes" in data

    # Invalid session
    response_404 = client.get("/revision/daily/non_existent_session_id")
    assert response_404.status_code == 404
