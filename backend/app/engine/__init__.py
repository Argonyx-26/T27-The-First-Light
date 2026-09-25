"""
Misconception Mapper (MM) deterministic diagnostic engine.
"""

from app.engine.hypothesis_engine import (
    CONFIRMATION_GAP_THRESHOLD,
    CONFIRMATION_TOP_PROBABILITY_THRESHOLD,
    calculate_evidence_weight,
    calculate_probability_gap,
    check_confirmation_gate,
    get_top_hypotheses,
    initialize_hypotheses,
    normalize_hypotheses,
    rank_hypotheses,
    update_hypotheses,
    validate_confidence,
)
from app.engine.models import (
    ConfirmationResult,
    Hypothesis,
    MisconceptionCategory,
    Question,
    QuestionType,
    ScoredQuestion,
    VerificationResult,
    VerificationStatus,
)
from app.engine.question_selector import (
    calculate_concept_relevance,
    calculate_confidence_gap_score,
    calculate_hypothesis_separation,
    rank_candidate_questions,
    score_diagnostic_question,
    select_best_diagnostic_question,
)
from app.engine.verification import evaluate_verification

__all__ = [
    "Hypothesis",
    "Question",
    "QuestionType",
    "MisconceptionCategory",
    "ConfirmationResult",
    "VerificationResult",
    "VerificationStatus",
    "ScoredQuestion",
    "initialize_hypotheses",
    "normalize_hypotheses",
    "validate_confidence",
    "calculate_evidence_weight",
    "update_hypotheses",
    "rank_hypotheses",
    "get_top_hypotheses",
    "calculate_probability_gap",
    "check_confirmation_gate",
    "score_diagnostic_question",
    "rank_candidate_questions",
    "select_best_diagnostic_question",
    "evaluate_verification",
    "CONFIRMATION_TOP_PROBABILITY_THRESHOLD",
    "CONFIRMATION_GAP_THRESHOLD",
]
