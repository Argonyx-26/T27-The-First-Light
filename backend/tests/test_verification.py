"""
Unit tests for deterministic verification engine.
Tests RESOLVED, PERSISTENT, and error-handling conditions.
"""

import pytest
from app.engine.models import Question, QuestionType, VerificationStatus
from app.engine.verification import evaluate_verification


@pytest.fixture
def verification_question():
    return Question(
        id="q_verify_newton_01",
        concept="Newton's First Law",
        topic="Newton's Laws",
        prerequisite="Tension and gravity",
        difficulty="medium",
        question_type=QuestionType.VERIFICATION,
        verified_misconception_id="force_acceleration_confusion",
        question_text="Elevator moving upward at constant velocity: compare tension T and weight W.",
        options={
            "A": "T > W",
            "B": "T = W",
            "C": "T < W",
            "D": "T depends on velocity magnitude",
        },
        correct_option="B",
        distractor_misconceptions={
            "A": "force_acceleration_confusion",
            "D": "force_acceleration_confusion",
        },
    )


def test_verification_resolved_on_correct_answer(verification_question):
    result = evaluate_verification(
        original_misconception_id="force_acceleration_confusion",
        verification_question=verification_question,
        selected_option="B",
    )

    assert result.status == VerificationStatus.RESOLVED
    assert result.is_correct is True
    assert "resolved" in result.feedback.lower()


def test_verification_persistent_on_misconception_distractor(verification_question):
    result = evaluate_verification(
        original_misconception_id="force_acceleration_confusion",
        verification_question=verification_question,
        selected_option="A",
    )

    assert result.status == VerificationStatus.PERSISTENT
    assert result.is_correct is False
    assert "persistent" in result.feedback.lower()


def test_verification_persistent_on_other_incorrect_distractor(verification_question):
    result = evaluate_verification(
        original_misconception_id="force_acceleration_confusion",
        verification_question=verification_question,
        selected_option="C",
    )

    assert result.status == VerificationStatus.PERSISTENT
    assert result.is_correct is False


def test_verification_invalid_option_raises(verification_question):
    with pytest.raises(ValueError, match="not valid"):
        evaluate_verification(
            original_misconception_id="force_acceleration_confusion",
            verification_question=verification_question,
            selected_option="Z",
        )


def test_verification_empty_misconception_id_raises(verification_question):
    with pytest.raises(ValueError, match="cannot be empty"):
        evaluate_verification(
            original_misconception_id="",
            verification_question=verification_question,
            selected_option="B",
        )
