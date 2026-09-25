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


def test_teacher_overview_endpoint(client):
    resp = client.get("/teacher/overview")
    assert resp.status_code == 200
    data = resp.json()

    assert "total_students" in data
    assert data["total_students"] >= 10
    assert "average_mastery" in data
    assert "active_knowledge_gaps" in data
    assert "persistent_misconceptions" in data
    assert "class_accuracy" in data
    assert "confidence_calibration" in data
    assert "students_requiring_attention" in data
    assert len(data["students_requiring_attention"]) > 0
    assert "recent_activity" in data
    assert len(data["recent_activity"]) > 0


def test_teacher_students_list_endpoint(client):
    resp = client.get("/teacher/students")
    assert resp.status_code == 200
    data = resp.json()

    assert "total_students" in data
    assert "students" in data
    assert len(data["students"]) >= 10

    first_student = data["students"][0]
    assert "student_id" in first_student
    assert "name" in first_student
    assert "topic" in first_student
    assert "mastery_score" in first_student
    assert "accuracy_rate" in first_student
    assert "active_gaps" in first_student
    assert "persistent_misconceptions" in first_student
    assert "calibration_status" in first_student


def test_teacher_student_detail_endpoint(client):
    resp = client.get("/teacher/students/student_demo_01")
    assert resp.status_code == 200
    data = resp.json()

    assert data["student_id"] == "student_demo_01"
    assert data["name"] == "Alex Rivera"
    assert data["topic"] == "Newton's Laws"
    assert "concept_breakdown" in data
    assert len(data["concept_breakdown"]) > 0
    assert "misconceptions" in data
    assert len(data["misconceptions"]) > 0
    assert "attempts_timeline" in data
    assert len(data["attempts_timeline"]) > 0
    assert "confidence_calibration" in data


def test_teacher_student_detail_404_for_unknown(client):
    resp = client.get("/teacher/students/non_existent_student_999")
    assert resp.status_code == 404


def test_teacher_misconceptions_endpoint(client):
    resp = client.get("/teacher/misconceptions")
    assert resp.status_code == 200
    data = resp.json()

    assert "concepts" in data
    assert len(data["concepts"]) >= 3
    assert "heatmap" in data
    assert len(data["heatmap"]["concepts"]) >= 3
    assert len(data["heatmap"]["misconception_categories"]) >= 3
    assert len(data["heatmap"]["cells"]) > 0
    assert "misconceptions" in data
    assert len(data["misconceptions"]) > 0


def test_teacher_analytics_endpoint(client):
    resp = client.get("/teacher/analytics")
    assert resp.status_code == 200
    data = resp.json()

    assert "total_students" in data
    assert "overall_mastery" in data
    assert "overall_accuracy" in data
    assert "confidence_calibration" in data
    assert "error_breakdown" in data
    assert "concept_analytics" in data


def test_same_score_demo_endpoint(client):
    resp = client.get("/demo/same-score")
    assert resp.status_code == 200
    data = resp.json()

    assert "title" in data
    assert "initial_question" in data
    assert data["initial_question"]["id"] == "physics_newton_q01"
    assert "shared_result" in data

    # Verify Student A
    student_a = data["student_a"]
    assert student_a["name"] == "Student A (Alex)"
    assert student_a["initial_attempt"]["selected_option"] == "A"
    assert student_a["diagnosis"]["misconception_id"] == "force_acceleration_confusion"
    assert student_a["verification"]["status"] == "resolved"

    # Verify Student B
    student_b = data["student_b"]
    assert student_b["name"] == "Student B (Beth)"
    assert student_b["initial_attempt"]["selected_option"] == "C"
    assert student_b["diagnosis"]["misconception_id"] == "mass_inertia_resistance"
    assert student_b["verification"]["status"] == "persistent"

    # Core differentiator assertion
    assert student_a["initial_attempt"]["is_correct"] is False
    assert student_b["initial_attempt"]["is_correct"] is False
    assert student_a["diagnosis"]["misconception_id"] != student_b["diagnosis"]["misconception_id"]
    assert student_a["verification"]["status"] != student_b["verification"]["status"]
