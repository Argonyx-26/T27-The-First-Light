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


client = TestClient(app)


def test_quiz_history_lifecycle():
    student_id = "test_history_student_001"

    # 1. Create a session for Kinematics
    res1 = client.post("/session", json={
        "topic": "Kinematics",
        "student_id": student_id,
        "session_length": 10,
    })
    assert res1.status_code == 201
    s1_id = res1.json()["session_id"]

    # End session 1
    end_res1 = client.post(f"/session/{s1_id}/end")
    assert end_res1.status_code == 200

    # 2. Create another session for Kinematics
    res2 = client.post("/session", json={
        "topic": "Kinematics",
        "student_id": student_id,
        "session_length": 20,
    })
    assert res2.status_code == 201
    s2_id = res2.json()["session_id"]

    # End session 2
    end_res2 = client.post(f"/session/{s2_id}/end")
    assert end_res2.status_code == 200

    # 3. Create a session for Newton's Laws
    res3 = client.post("/session", json={
        "topic": "Newton's Laws",
        "student_id": student_id,
        "session_length": None,
    })
    assert res3.status_code == 201
    s3_id = res3.json()["session_id"]

    # End session 3
    end_res3 = client.post(f"/session/{s3_id}/end")
    assert end_res3.status_code == 200

    # 4. Query GET /history/{student_id}
    hist_res = client.get(f"/history/{student_id}")
    assert hist_res.status_code == 200
    data = hist_res.json()

    assert data["student_id"] == student_id
    assert data["total_completed"] == 3
    assert len(data["history"]) == 3

    # Check topic groupings
    topics = {t["topic"]: t for t in data["topics"]}
    assert "Kinematics" in topics
    assert "Newton's Laws" in topics

    kinematics = topics["Kinematics"]
    assert kinematics["attempt_count"] == 2
    assert len(kinematics["attempts"]) == 2
    # Verify attempts contain required fields: topic, question_count, score, date
    for att in kinematics["attempts"]:
        assert att["topic"] == "Kinematics"
        assert "question_count" in att
        assert "score" in att
        assert "date" in att

    newtons = topics["Newton's Laws"]
    assert newtons["attempt_count"] == 1
    assert len(newtons["attempts"]) == 1
