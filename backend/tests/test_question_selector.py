"""
Unit tests for deterministic question selector.
Tests separation scoring, concept relevance, confidence gap modulation,
ranking, deterministic tie breaking, and question selection.
"""

import pytest
from app.engine.models import Hypothesis, Question, QuestionType
from app.engine.question_selector import (
    calculate_concept_relevance,
    calculate_confidence_gap_score,
    calculate_hypothesis_separation,
    rank_candidate_questions,
    score_diagnostic_question,
    select_best_diagnostic_question,
)


@pytest.fixture
def sample_hypotheses():
    return [
        Hypothesis(id="misc_impetus", label="Force required for motion", probability=0.55),
        Hypothesis(id="misc_inertia", label="Inertia as active force", probability=0.30),
        Hypothesis(id="misc_calc", label="Calculation error", probability=0.15),
    ]


@pytest.fixture
def sample_questions():
    q_distinguishing = Question(
        id="q_distinguish_01",
        concept="Newton's First Law",
        topic="Newton's Laws",
        prerequisite="Inertia",
        difficulty="medium",
        question_type=QuestionType.DIAGNOSTIC,
        question_text="Distinguishing question between impetus and inertia...",
        options={"A": "opt A", "B": "opt B", "C": "opt C", "D": "opt D"},
        correct_option="B",
        distractor_misconceptions={
            "A": "misc_impetus",
            "C": "misc_inertia",
        },
        diagnostic_targets=["misc_impetus", "misc_inertia"],
    )

    q_impetus_only = Question(
        id="q_single_target_02",
        concept="Newton's First Law",
        topic="Newton's Laws",
        prerequisite="Inertia",
        difficulty="medium",
        question_type=QuestionType.DIAGNOSTIC,
        question_text="Question targeting only impetus...",
        options={"A": "opt A", "B": "opt B", "C": "opt C", "D": "opt D"},
        correct_option="B",
        distractor_misconceptions={
            "A": "misc_impetus",
            "C": "unrelated_error",
        },
        diagnostic_targets=["misc_impetus"],
    )

    q_other_topic = Question(
        id="q_other_topic_03",
        concept="Thermodynamics",
        topic="Heat and Energy",
        prerequisite="Heat",
        difficulty="medium",
        question_type=QuestionType.DIAGNOSTIC,
        question_text="Distant question...",
        options={"A": "opt A", "B": "opt B"},
        correct_option="A",
        distractor_misconceptions={"B": "misc_impetus"},
        diagnostic_targets=["misc_impetus"],
    )

    return [q_distinguishing, q_impetus_only, q_other_topic]


def test_separation_scoring_both_targets(sample_hypotheses, sample_questions):
    q_both = sample_questions[0]
    top_h = sample_hypotheses[0]
    runner_up = sample_hypotheses[1]

    sep_both = calculate_hypothesis_separation(q_both, top_h, runner_up, sample_hypotheses)
    assert sep_both == 1.0


def test_separation_scoring_single_target(sample_hypotheses, sample_questions):
    q_single = sample_questions[1]
    top_h = sample_hypotheses[0]
    runner_up = sample_hypotheses[1]

    sep_single = calculate_hypothesis_separation(q_single, top_h, runner_up, sample_hypotheses)
    assert sep_single == 0.55


def test_concept_relevance():
    q = Question(
        id="q_rel",
        concept="Newton's First Law",
        topic="Newton's Laws",
        prerequisite="None",
        difficulty="medium",
        question_text="text",
        options={"A": "1", "B": "2"},
        correct_option="A",
    )
    # Exact concept
    assert calculate_concept_relevance(q, "Newton's First Law") == 1.0
    # Same topic, different concept
    assert calculate_concept_relevance(q, "Newton's Second Law", "Newton's Laws") == 0.70
    # Different topic entirely
    assert calculate_concept_relevance(q, "Chemical Bonding", "Chemistry") == 0.20


def test_confidence_gap_scoring():
    q_hard = Question(
        id="q_h",
        concept="C",
        topic="T",
        prerequisite="P",
        difficulty="hard",
        question_text="Q",
        options={"A": "1", "B": "2"},
        correct_option="A",
    )
    q_easy = Question(
        id="q_e",
        concept="C",
        topic="T",
        prerequisite="P",
        difficulty="easy",
        question_text="Q",
        options={"A": "1", "B": "2"},
        correct_option="A",
    )

    # High confidence error (5) matches hard question -> bonus
    assert calculate_confidence_gap_score(q_hard, last_confidence=5) == 1.20
    assert calculate_confidence_gap_score(q_easy, last_confidence=5) == 0.85

    # Low confidence error (1) matches easy question -> bonus
    assert calculate_confidence_gap_score(q_easy, last_confidence=1) == 1.20
    assert calculate_confidence_gap_score(q_hard, last_confidence=1) == 0.85


def test_deterministic_question_selection_distinguishes_hypotheses(sample_hypotheses, sample_questions):
    """The question that directly discriminates between top and runner-up must win."""
    best = select_best_diagnostic_question(
        candidate_questions=sample_questions,
        hypotheses=sample_hypotheses,
        target_concept="Newton's First Law",
        target_topic="Newton's Laws",
    )

    assert best is not None
    assert best.question.id == "q_distinguish_01"
    assert best.separation_score == 1.0
    assert best.relevance_score == 1.0


def test_question_ranking_with_exclusion(sample_hypotheses, sample_questions):
    """When the top question is excluded, the second best must be chosen."""
    best = select_best_diagnostic_question(
        candidate_questions=sample_questions,
        hypotheses=sample_hypotheses,
        target_concept="Newton's First Law",
        target_topic="Newton's Laws",
        excluded_ids={"q_distinguish_01"},
    )

    assert best is not None
    assert best.question.id == "q_single_target_02"


def test_deterministic_tie_breaking(sample_hypotheses):
    """Identical scores must be broken deterministically by question ID."""
    q_b = Question(
        id="q_bravo",
        concept="Concept X",
        topic="Topic X",
        prerequisite="None",
        difficulty="medium",
        question_text="B",
        options={"A": "1", "B": "2"},
        correct_option="A",
        diagnostic_targets=["misc_impetus"],
    )
    q_a = Question(
        id="q_alpha",
        concept="Concept X",
        topic="Topic X",
        prerequisite="None",
        difficulty="medium",
        question_text="A",
        options={"A": "1", "B": "2"},
        correct_option="A",
        diagnostic_targets=["misc_impetus"],
    )

    ranked = rank_candidate_questions(
        candidate_questions=[q_b, q_a],
        hypotheses=sample_hypotheses,
        target_concept="Concept X",
        target_topic="Topic X",
    )

    assert len(ranked) == 2
    assert ranked[0].score == ranked[1].score
    assert ranked[0].question.id == "q_alpha"
    assert ranked[1].question.id == "q_bravo"


def test_empty_candidates_returns_none(sample_hypotheses):
    best = select_best_diagnostic_question(
        candidate_questions=[],
        hypotheses=sample_hypotheses,
        target_concept="Newton's First Law",
    )
    assert best is None
