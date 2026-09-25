"""
Deterministic Hypothesis Engine for Misconception Mapper (MM).
Handles hypothesis initialization, confidence-weighted probabilistic hypothesis updating,
evidence evaluation, ranking, and confirmation gating.
"""

from typing import Any, Dict, List, Optional, Sequence, Tuple
from app.engine.models import ConfirmationResult, Hypothesis

# ==============================================================================
# Centralized Weight & Threshold Configuration (No Magic Numbers)
# ==============================================================================

# Confirmation Gate Thresholds
CONFIRMATION_TOP_PROBABILITY_THRESHOLD = 0.60  # P(top) must be strictly greater than this
CONFIRMATION_GAP_THRESHOLD = 0.20             # P(top) - P(second) must be >= this

# Float comparison & normalization tolerance
PROBABILITY_SUM_TOLERANCE = 1e-4
MIN_PROBABILITY_FLOOR = 1e-5

# Evidence Weight Scaling Constants:
# Formula for Matched Distractor:
#   W_match(c) = WEIGHT_MATCH_BASE + (WEIGHT_MATCH_SCALE * c)
# For c in [1..5]:
#   c=1 -> 1.0 + 0.3 = 1.30 (low-confidence match)
#   c=2 -> 1.0 + 0.6 = 1.60
#   c=3 -> 1.0 + 0.9 = 1.90
#   c=4 -> 1.0 + 1.2 = 2.20
#   c=5 -> 1.0 + 1.5 = 2.50 (high-confidence match, strongest boost)
WEIGHT_MATCH_BASE = 1.0
WEIGHT_MATCH_SCALE = 0.30

# Formula for Contradictory Evidence (Student picked a distractor belonging to a competing hypothesis):
#   W_contradict(c) = max(WEIGHT_CONTRADICT_MIN, WEIGHT_CONTRADICT_BASE - (WEIGHT_CONTRADICT_SCALE * c))
# For c in [1..5]:
#   c=1 -> 1.0 - 0.10 = 0.90 (slight reduction)
#   c=2 -> 1.0 - 0.20 = 0.80
#   c=3 -> 1.0 - 0.30 = 0.70
#   c=4 -> 1.0 - 0.40 = 0.60
#   c=5 -> 1.0 - 0.50 = 0.50 (high-confidence mistake pointing elsewhere, strongest dampening)
WEIGHT_CONTRADICT_BASE = 1.0
WEIGHT_CONTRADICT_SCALE = 0.10
WEIGHT_CONTRADICT_MIN = 0.15

# Neutral Evidence: Distractor not associated with any tracked hypothesis
WEIGHT_NEUTRAL = 1.0


def validate_confidence(confidence: int) -> int:
    """Validates that student confidence is an integer between 1 and 5."""
    if not isinstance(confidence, int):
        raise TypeError(f"Confidence must be an integer, got {type(confidence).__name__}")
    if confidence < 1 or confidence > 5:
        raise ValueError(f"Confidence must be between 1 and 5 (inclusive), got {confidence}")
    return confidence


def calculate_evidence_weight(
    is_match: bool,
    is_contradiction: bool,
    confidence: int
) -> float:
    """
    Computes deterministic evidence weight W(E | H) based on match status and student confidence.
    Strictly guarantees:
    - Evidential strength strictly increases with confidence (5 > 4 > 3 > 2 > 1).
    - Returns strictly positive float (> 0.0) preventing negative probabilities or zero collapse.
    """
    validate_confidence(confidence)

    if is_match:
        # High confidence in incorrect response matching this misconception gives highest weight
        return WEIGHT_MATCH_BASE + (WEIGHT_MATCH_SCALE * confidence)

    if is_contradiction:
        # High confidence in a different misconception indicates this one is less likely
        raw_contradict = WEIGHT_CONTRADICT_BASE - (WEIGHT_CONTRADICT_SCALE * confidence)
        return max(WEIGHT_CONTRADICT_MIN, raw_contradict)

    # Neutral or untracked distractor
    return WEIGHT_NEUTRAL


def normalize_hypotheses(hypotheses: Sequence[Hypothesis]) -> List[Hypothesis]:
    """
    Validates and normalizes probabilities across a set of hypotheses so that sum(p) == 1.0.
    Rejects:
    - Empty hypotheses
    - Missing or empty IDs
    - Duplicate IDs
    - Negative probabilities
    - All-zero sum
    """
    if not hypotheses:
        raise ValueError("Cannot normalize an empty list of hypotheses")

    seen_ids = set()
    total_prob = 0.0

    for h in hypotheses:
        if not h.id or not h.id.strip():
            raise ValueError("Hypothesis ID cannot be empty or whitespace")
        if h.id in seen_ids:
            raise ValueError(f"Duplicate hypothesis ID detected: '{h.id}'")
        seen_ids.add(h.id)

        if h.probability < 0.0:
            raise ValueError(f"Negative probability {h.probability} on hypothesis '{h.id}' is invalid")
        total_prob += h.probability

    if total_prob <= 0.0:
        raise ValueError("Cannot normalize hypotheses when sum of probabilities is zero or negative")

    normalized: List[Hypothesis] = []
    for h in hypotheses:
        new_prob = h.probability / total_prob
        normalized.append(
            Hypothesis(
                id=h.id,
                label=h.label,
                probability=new_prob,
                description=h.description,
                category=h.category,
                evidence_count=h.evidence_count,
            )
        )

    return normalized


def initialize_hypotheses(
    raw_hypotheses: Sequence[Dict[str, Any] | Hypothesis]
) -> List[Hypothesis]:
    """
    Accepts candidate hypotheses (as dicts or Hypothesis models) and produces
    a valid, normalized hypothesis state.
    """
    if not raw_hypotheses:
        raise ValueError("Raw hypothesis list cannot be empty")

    raw_items: List[Tuple[str, str, float, Optional[str], Any, int]] = []
    seen_ids = set()
    total_raw_prob = 0.0

    for item in raw_hypotheses:
        if isinstance(item, Hypothesis):
            h_id = item.id
            label = item.label
            prob = item.probability
            desc = item.description
            cat = item.category
            ev_count = item.evidence_count
        elif isinstance(item, dict):
            h_id = item.get("id")
            label = item.get("label")
            prob = item.get("probability")
            desc = item.get("description")
            cat = item.get("category", "conceptual")
            ev_count = item.get("evidence_count", 0)
        else:
            raise TypeError(f"Expected dict or Hypothesis instance, got {type(item).__name__}")

        if not h_id or not str(h_id).strip():
            raise ValueError("Hypothesis ID cannot be empty or whitespace")
        clean_id = str(h_id).strip()
        if clean_id in seen_ids:
            raise ValueError(f"Duplicate hypothesis ID detected: '{clean_id}'")
        seen_ids.add(clean_id)

        if not label:
            label = clean_id

        num_prob = float(prob) if prob is not None else 1.0
        if num_prob < 0.0:
            raise ValueError(f"Negative probability {num_prob} on hypothesis '{clean_id}' is invalid")

        total_raw_prob += num_prob
        raw_items.append((clean_id, str(label), num_prob, desc, cat, ev_count))

    if total_raw_prob <= 0.0:
        raise ValueError("Cannot normalize hypotheses when sum of probabilities is zero or negative")

    normalized: List[Hypothesis] = []
    for h_id, label, prob, desc, cat, ev_count in raw_items:
        norm_p = prob / total_raw_prob
        normalized.append(
            Hypothesis(
                id=h_id,
                label=label,
                probability=norm_p,
                description=desc,
                category=cat,
                evidence_count=ev_count,
            )
        )

    return normalized


def update_hypotheses(
    hypotheses: Sequence[Hypothesis],
    selected_option: str,
    confidence: int,
    evidence_mapping: Dict[str, str],
) -> List[Hypothesis]:
    """
    Updates the hypothesis probability distribution given a student's selected option,
    confidence level, and the question's distractor-to-misconception mapping.

    Concept:
        new_p(H_i) = normalize(old_p(H_i) * W(E | H_i))

    Properties:
    - Never produces negative probabilities.
    - Preserves all hypotheses without dropping any.
    - Deterministic and pure function.
    - Increments evidence_count on matched hypothesis.
    """
    validate_confidence(confidence)
    if not hypotheses:
        raise ValueError("Hypotheses collection cannot be empty")

    # Determine which hypothesis (if any) the selected distractor is associated with
    matched_target_id = evidence_mapping.get(selected_option)

    unnormalized_probs: List[float] = []
    new_evidence_counts: List[int] = []

    for h in hypotheses:
        is_match = (matched_target_id is not None and h.id == matched_target_id)
        is_contradiction = (
            matched_target_id is not None
            and h.id != matched_target_id
            and matched_target_id in {item.id for item in hypotheses}
        )

        weight = calculate_evidence_weight(
            is_match=is_match,
            is_contradiction=is_contradiction,
            confidence=confidence,
        )

        new_ev_count = h.evidence_count + (1 if is_match else 0)
        unnorm_p = h.probability * weight

        unnormalized_probs.append(unnorm_p)
        new_evidence_counts.append(new_ev_count)

    total_prob = sum(unnormalized_probs)
    if total_prob <= 0.0:
        raise ValueError("Sum of updated probabilities collapsed to zero")

    updated: List[Hypothesis] = []
    for h, unnorm_p, ev_count in zip(hypotheses, unnormalized_probs, new_evidence_counts):
        norm_p = unnorm_p / total_prob
        updated.append(
            Hypothesis(
                id=h.id,
                label=h.label,
                probability=norm_p,
                description=h.description,
                category=h.category,
                evidence_count=ev_count,
            )
        )

    return updated


def rank_hypotheses(hypotheses: Sequence[Hypothesis]) -> List[Hypothesis]:
    """
    Sorts hypotheses by probability descending.
    Breaks ties deterministically using the hypothesis ID.
    """
    if not hypotheses:
        return []
    return sorted(hypotheses, key=lambda h: (-h.probability, h.id))


def get_top_hypotheses(
    hypotheses: Sequence[Hypothesis]
) -> Tuple[Optional[Hypothesis], Optional[Hypothesis]]:
    """
    Returns (top_hypothesis, runner_up_hypothesis) sorted by belief probability.
    Returns (top, None) if only 1 hypothesis exists.
    Returns (None, None) if empty.
    """
    ranked = rank_hypotheses(hypotheses)
    if not ranked:
        return (None, None)
    if len(ranked) == 1:
        return (ranked[0], None)
    return (ranked[0], ranked[1])


def calculate_probability_gap(hypotheses: Sequence[Hypothesis]) -> float:
    """
    Calculates the gap between the top hypothesis and the runner-up:
        gap = P(top) - P(second)
    If only one hypothesis exists, returns P(top).
    If no hypotheses exist, returns 0.0.
    """
    top, runner_up = get_top_hypotheses(hypotheses)
    if top is None:
        return 0.0
    if runner_up is None:
        return top.probability
    return top.probability - runner_up.probability


def check_confirmation_gate(hypotheses: Sequence[Hypothesis]) -> ConfirmationResult:
    """
    Evaluates whether the leading hypothesis satisfies the confirmation gate:
        top_probability > 0.60
        AND
        top_probability - second_probability >= 0.20

    Eligibility marks the state as CANDIDATE_FOR_CONFIRMATION (ready for self-consistency simulation).
    It does NOT automatically mark the misconception as confirmed.
    """
    if not hypotheses:
        return ConfirmationResult(
            is_eligible=False,
            top_hypothesis=None,
            runner_up_hypothesis=None,
            probability_gap=0.0,
            reason="No hypotheses provided for evaluation.",
        )

    ranked = rank_hypotheses(hypotheses)
    top = ranked[0]

    # Handle single hypothesis edge-case
    if len(ranked) == 1:
        gap = top.probability
        is_eligible = (
            top.probability > CONFIRMATION_TOP_PROBABILITY_THRESHOLD
            and gap >= CONFIRMATION_GAP_THRESHOLD
        )
        return ConfirmationResult(
            is_eligible=is_eligible,
            top_hypothesis=top,
            runner_up_hypothesis=None,
            probability_gap=round(gap, 4),
            reason=(
                f"Single hypothesis with P={top.probability:.4f}. "
                f"Eligible: {is_eligible}."
            ),
        )

    runner_up = ranked[1]
    gap = top.probability - runner_up.probability

    has_dominant_probability = top.probability > CONFIRMATION_TOP_PROBABILITY_THRESHOLD
    has_sufficient_gap = gap >= CONFIRMATION_GAP_THRESHOLD

    is_eligible = has_dominant_probability and has_sufficient_gap

    if is_eligible:
        reason = (
            f"Candidate satisfies confirmation criteria: P(top)={top.probability:.4f} > "
            f"{CONFIRMATION_TOP_PROBABILITY_THRESHOLD} and gap={gap:.4f} >= "
            f"{CONFIRMATION_GAP_THRESHOLD}. Ready for self-consistency simulation check."
        )
    else:
        failure_reasons = []
        if not has_dominant_probability:
            failure_reasons.append(
                f"P(top)={top.probability:.4f} <= {CONFIRMATION_TOP_PROBABILITY_THRESHOLD}"
            )
        if not has_sufficient_gap:
            failure_reasons.append(
                f"gap={gap:.4f} < {CONFIRMATION_GAP_THRESHOLD}"
            )
        reason = (
            f"Candidate not yet eligible: {', '.join(failure_reasons)}. "
            f"Diagnosis must continue."
        )

    return ConfirmationResult(
        is_eligible=is_eligible,
        top_hypothesis=top,
        runner_up_hypothesis=runner_up,
        probability_gap=round(gap, 4),
        reason=reason,
    )
