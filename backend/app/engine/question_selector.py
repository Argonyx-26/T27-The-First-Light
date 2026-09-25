"""
Deterministic Diagnostic Question Selector for Misconception Mapper (MM).
Scores and ranks candidate diagnostic questions using:
    Score(Q) = HypothesisSeparation(Q) * ConceptRelevance(Q) * ConfidenceGap(Q)
Guarantees 100% deterministic selection without randomness or LLM dependency.
"""

from typing import List, Optional, Sequence, Set
from app.engine.hypothesis_engine import get_top_hypotheses
from app.engine.models import Hypothesis, Question, ScoredQuestion

# ==============================================================================
# Scoring Coefficients & Constants
# ==============================================================================

# Separation Scores
SEPARATION_BOTH_TARGETS = 1.00     # Question directly contrasts top and runner-up hypotheses
SEPARATION_SINGLE_TOP_TARGET = 0.55 # Question targets either top or runner-up
SEPARATION_OTHER_ACTIVE = 0.25     # Question targets a 3rd/lower active hypothesis
SEPARATION_NO_MATCH = 0.05         # Question does not target any active hypothesis

# Relevance Scores
RELEVANCE_EXACT_CONCEPT = 1.00     # Exact concept match (e.g. "Newton's First Law")
RELEVANCE_SAME_TOPIC = 0.70        # Same broad topic (e.g. "Newton's Laws")
RELEVANCE_DISTANT = 0.20           # Different topic

# Confidence Gap Modifier Bounds
CONFIDENCE_GAP_MATCH_BONUS = 1.20   # Bonus when question difficulty matches student confidence profile
CONFIDENCE_GAP_NEUTRAL = 1.00       # Neutral alignment
CONFIDENCE_GAP_MISMATCH = 0.85     # Mild penalty for mismatched difficulty profile


def calculate_hypothesis_separation(
    question: Question,
    top_hypothesis: Optional[Hypothesis],
    runner_up_hypothesis: Optional[Hypothesis],
    all_hypotheses: Sequence[Hypothesis],
) -> float:
    """
    Measures how effectively question Q discriminates between the leading competing hypotheses.
    A question that has distractor options or explicit diagnostic targets for BOTH the top
    and runner-up hypotheses receives the highest separation score.
    """
    if not top_hypothesis:
        return SEPARATION_NO_MATCH

    # Extract all misconception IDs tagged in this question
    targets_in_question: Set[str] = set(question.diagnostic_targets)
    targets_in_question.update(question.distractor_misconceptions.values())

    top_id = top_hypothesis.id
    runner_up_id = runner_up_hypothesis.id if runner_up_hypothesis else None

    # Scenario 1: Competing top and runner-up both addressed by this question
    if runner_up_id and (top_id in targets_in_question) and (runner_up_id in targets_in_question):
        return SEPARATION_BOTH_TARGETS

    # Scenario 2: At least one of the top two is targeted
    if top_id in targets_in_question or (runner_up_id and runner_up_id in targets_in_question):
        return SEPARATION_SINGLE_TOP_TARGET

    # Scenario 3: Targets another active hypothesis from the pool
    all_active_ids = {h.id for h in all_hypotheses}
    if any(t in all_active_ids for t in targets_in_question):
        return SEPARATION_OTHER_ACTIVE

    return SEPARATION_NO_MATCH


def calculate_concept_relevance(
    question: Question,
    target_concept: str,
    target_topic: Optional[str] = None,
) -> float:
    """
    Measures semantic proximity of question Q to the learning concept under active diagnosis.
    """
    clean_target_concept = target_concept.strip().lower()
    clean_q_concept = question.concept.strip().lower()

    if clean_q_concept == clean_target_concept:
        return RELEVANCE_EXACT_CONCEPT

    if target_topic:
        clean_target_topic = target_topic.strip().lower()
        clean_q_topic = question.topic.strip().lower()
        if clean_q_topic == clean_target_topic:
            return RELEVANCE_SAME_TOPIC

    return RELEVANCE_DISTANT


def calculate_confidence_gap_score(
    question: Question,
    last_confidence: Optional[int] = None,
) -> float:
    """
    Modulates score based on student's previous confidence level on error:
    - High-confidence error (4 or 5): student holds an ingrained misconception;
      medium or hard diagnostic question yields higher discrimination.
    - Low-confidence error (1 or 2): student was guessing or uncertain;
      an easy or medium foundational diagnostic question isolates the gap best.
    """
    if last_confidence is None:
        return CONFIDENCE_GAP_NEUTRAL

    q_diff = question.difficulty.strip().lower()

    if last_confidence >= 4:
        # High confidence error: benefits from medium/hard diagnostic challenge
        if q_diff in ("medium", "hard"):
            return CONFIDENCE_GAP_MATCH_BONUS
        return CONFIDENCE_GAP_MISMATCH

    if last_confidence <= 2:
        # Low confidence error: benefits from easy/medium fundamental question
        if q_diff in ("easy", "medium"):
            return CONFIDENCE_GAP_MATCH_BONUS
        return CONFIDENCE_GAP_MISMATCH

    return CONFIDENCE_GAP_NEUTRAL


def score_diagnostic_question(
    question: Question,
    hypotheses: Sequence[Hypothesis],
    target_concept: str,
    target_topic: Optional[str] = None,
    last_confidence: Optional[int] = None,
) -> ScoredQuestion:
    """
    Evaluates a candidate question and computes its composite diagnostic score:
        Score(Q) = Separation(Q) * Relevance(Q) * ConfidenceGap(Q)
    """
    top_h, runner_up_h = get_top_hypotheses(hypotheses)

    separation = calculate_hypothesis_separation(
        question=question,
        top_hypothesis=top_h,
        runner_up_hypothesis=runner_up_h,
        all_hypotheses=hypotheses,
    )

    relevance = calculate_concept_relevance(
        question=question,
        target_concept=target_concept,
        target_topic=target_topic,
    )

    conf_gap = calculate_confidence_gap_score(
        question=question,
        last_confidence=last_confidence,
    )

    total_score = round(separation * relevance * conf_gap, 6)

    return ScoredQuestion(
        question=question,
        score=total_score,
        separation_score=round(separation, 4),
        relevance_score=round(relevance, 4),
        confidence_gap_score=round(conf_gap, 4),
    )


def rank_candidate_questions(
    candidate_questions: Sequence[Question],
    hypotheses: Sequence[Hypothesis],
    target_concept: str,
    target_topic: Optional[str] = None,
    excluded_ids: Optional[Set[str]] = None,
    last_confidence: Optional[int] = None,
) -> List[ScoredQuestion]:
    """
    Scores and ranks all candidate questions.
    Ties are broken deterministically by question ID.
    Excludes questions listed in excluded_ids (e.g. already answered).
    """
    excluded = excluded_ids or set()
    scored_list: List[ScoredQuestion] = []

    for q in candidate_questions:
        if q.id in excluded:
            continue
        scored = score_diagnostic_question(
            question=q,
            hypotheses=hypotheses,
            target_concept=target_concept,
            target_topic=target_topic,
            last_confidence=last_confidence,
        )
        scored_list.append(scored)

    # Sort descending by score; on tie, sort ascending by question.id
    return sorted(scored_list, key=lambda sq: (-sq.score, sq.question.id))


def select_best_diagnostic_question(
    candidate_questions: Sequence[Question],
    hypotheses: Sequence[Hypothesis],
    target_concept: str,
    target_topic: Optional[str] = None,
    excluded_ids: Optional[Set[str]] = None,
    last_confidence: Optional[int] = None,
) -> Optional[ScoredQuestion]:
    """
    Selects the single highest-scoring diagnostic question deterministically.
    Returns None if no candidates are eligible or available.
    """
    ranked = rank_candidate_questions(
        candidate_questions=candidate_questions,
        hypotheses=hypotheses,
        target_concept=target_concept,
        target_topic=target_topic,
        excluded_ids=excluded_ids,
        last_confidence=last_confidence,
    )
    return ranked[0] if ranked else None
