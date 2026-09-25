"""
Unit and integration tests for Learning Path prescriptive ranking and Calibration Trend.
"""

from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.db.models import AttemptModel, MisconceptionStateModel, QuestionModel, SessionModel
from app.db.seed import seed_database
from app.engine.learning_path_engine import (
    compute_calibration_trend,
    compute_learning_path,
    count_dependent_concepts_blocked,
)
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


def test_count_dependent_concepts_blocked():
    with TestingSessionLocal() as db:
        blocked = count_dependent_concepts_blocked(
            db,
            misconception_id="force_acceleration_confusion",
            concept_name="Newton's First Law",
        )
        assert blocked >= 4


def test_compute_learning_path_ranking():
    with TestingSessionLocal() as db:
        session_id = "sess_learning_path_test"
        sess = SessionModel(
            id=session_id,
            student_id="student_lp_test",
            topic="Newton's Laws",
            mastery_score=0.45,
        )
        db.add(sess)

        # Misconception 1: high blocked dependencies (4)
        m1 = MisconceptionStateModel(
            session_id=session_id,
            misconception_id="force_acceleration_confusion",
            label="Force Acceleration Confusion",
            probability=0.85,
            status="persistent",
            evidence_count=3,
            revision_priority=2.5,
        )
        # Misconception 2: fewer blocked dependencies (2)
        m2 = MisconceptionStateModel(
            session_id=session_id,
            misconception_id="action_reaction_cancellation",
            label="Action Reaction Cancellation",
            probability=0.70,
            status="developing",
            evidence_count=1,
            revision_priority=1.2,
        )
        # Misconception 3: resolved (should not be recommended next)
        m3 = MisconceptionStateModel(
            session_id=session_id,
            misconception_id="gravitational_mass_fallacy",
            label="Gravitational Mass Fallacy",
            probability=0.10,
            status="resolved",
            evidence_count=1,
            revision_priority=0.0,
        )
        db.add_all([m1, m2, m3])
        db.commit()

        path = compute_learning_path(db, session_id)
        assert path["topic"] == "Newton's Laws"
        assert len(path["nodes"]) == 4  # 1 root concept + 3 misconceptions

        misc_nodes = [n for n in path["nodes"] if n["type"] == "misconception"]
        m1_node = next(n for n in misc_nodes if n["id"] == "node_force_acceleration_confusion")
        m2_node = next(n for n in misc_nodes if n["id"] == "node_action_reaction_cancellation")
        m3_node = next(n for n in misc_nodes if n["id"] == "node_gravitational_mass_fallacy")

        # m1 must be ranked #1 and recommended_next
        assert m1_node["next_recommended_rank"] == 1
        assert m1_node["recommended_next"] is True
        assert m1_node["dependent_concepts_blocked"] >= m2_node["dependent_concepts_blocked"]

        # m2 must be ranked #2
        assert m2_node["next_recommended_rank"] == 2
        assert m2_node["recommended_next"] is False

        # m3 resolved -> not recommended
        assert m3_node["recommended_next"] is False
        assert m3_node["next_recommended_rank"] is None


def test_compute_calibration_trend():
    with TestingSessionLocal() as db:
        student_id = "student_trend_test"
        sess1 = SessionModel(id="s_trend_1", student_id=student_id, topic="Newton's Laws")
        sess2 = SessionModel(id="s_trend_2", student_id=student_id, topic="Kinematics")
        db.add_all([sess1, sess2])

        q = db.query(QuestionModel).first()

        # Session 1: perfect confidence and correctness
        att1 = AttemptModel(session_id=sess1.id, question_id=q.id, selected_option=q.correct_option, confidence=5, is_correct=True)
        # Session 2: mismatched confidence
        att2 = AttemptModel(session_id=sess2.id, question_id=q.id, selected_option="W", confidence=5, is_correct=False)
        db.add_all([att1, att2])
        db.commit()

        trend = compute_calibration_trend(db, student_id)
        assert trend["student_id"] == student_id
        assert len(trend["points"]) == 2
        p1 = trend["points"][0]
        p2 = trend["points"][1]
        assert p1["calibration_index"] == 1.0
        assert p2["calibration_index"] < 1.0


def test_api_learning_path_and_calibration_trend_endpoints():
    client = TestClient(app)

    # 1. Test learning path endpoint
    sess_res = client.post("/session", json={"topic": "Newton's Laws", "mode": "adaptive_diagnosis"})
    assert sess_res.status_code in (200, 201)
    session_id = sess_res.json()["session_id"]

    res_lp = client.get(f"/learning-path/{session_id}")
    assert res_lp.status_code == 200
    lp_data = res_lp.json()
    assert "nodes" in lp_data
    assert "edges" in lp_data

    # 2. Test calibration trend endpoint
    res_cal = client.get("/analytics/calibration-trend/student_priya")
    assert res_cal.status_code == 200
    cal_data = res_cal.json()
    assert "points" in cal_data
    assert cal_data["student_id"] == "student_priya"
