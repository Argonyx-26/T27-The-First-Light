"""
Tests for seed question dataset integrity and pedagogical schema validity.
Verifies all questions conform to strict requirements without any runtime errors.
"""

from app.engine.models import Question
from app.engine.seed_loader import (
    get_seed_data_path,
    get_seed_questions_by_topic,
    load_seed_questions,
)


def test_seed_file_exists():
    path = get_seed_data_path()
    assert path.exists(), f"Seed data file not found at {path}"


def test_seed_questions_load_and_validate():
    questions = load_seed_questions()
    assert len(questions) >= 6, f"Expected at least 6 seed questions, got {len(questions)}"


def test_all_question_ids_are_unique():
    questions = load_seed_questions()
    ids = [q.id for q in questions]
    assert len(ids) == len(set(ids)), f"Duplicate question IDs detected: {ids}"


def test_required_fields_and_options_integrity():
    questions = load_seed_questions()
    required_topics = {"Newton's Laws", "Kinematics", "Chemical Bonding"}
    found_topics = set()

    for q in questions:
        # Pydantic instance verification
        assert isinstance(q, Question)
        assert q.id.strip() != ""
        assert q.concept.strip() != ""
        assert q.topic.strip() != ""
        assert q.difficulty in ("easy", "medium", "hard")
        assert len(q.question_text.strip()) > 10

        # Options verification
        assert len(q.options) >= 2
        for opt_key, opt_val in q.options.items():
            assert opt_key in ("A", "B", "C", "D")
            assert len(opt_val.strip()) > 0

        # Correct option must be in options
        assert q.correct_option in q.options

        # Distractor misconceptions must map only to incorrect options
        for distractor_opt, misc_id in q.distractor_misconceptions.items():
            assert distractor_opt in q.options, f"Distractor key '{distractor_opt}' not in options of {q.id}"
            assert distractor_opt != q.correct_option, f"Correct option cannot be in distractor_misconceptions for {q.id}"
            assert len(misc_id.strip()) > 0

        found_topics.add(q.topic)

    assert required_topics.issubset(found_topics), f"Missing topics. Expected {required_topics}, found {found_topics}"


def test_topic_filtering():
    newton_qs = get_seed_questions_by_topic("Newton's Laws")
    assert len(newton_qs) >= 4
    for q in newton_qs:
        assert q.topic == "Newton's Laws"

    kinematics_qs = get_seed_questions_by_topic("Kinematics")
    assert len(kinematics_qs) >= 2
    for q in kinematics_qs:
        assert q.topic == "Kinematics"

    chem_qs = get_seed_questions_by_topic("Chemical Bonding")
    assert len(chem_qs) >= 2
    for q in chem_qs:
        assert q.topic == "Chemical Bonding"
