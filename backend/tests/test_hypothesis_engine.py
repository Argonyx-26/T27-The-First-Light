"""
Unit tests for deterministic hypothesis engine.
Tests initialization, normalization, confidence weighting, evidence-weighted updates,
ranking, and confirmation gating.
"""

import math
import pytest
from app.engine.hypothesis_engine import (
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
from app.engine.models import Hypothesis


# ==============================================================================
# Initialization & Normalization Tests
# ==============================================================================

def test_normalize_valid_hypotheses():
    hyps = [
        Hypothesis(id="h1", label="Force-acceleration", probability=0.45),
        Hypothesis(id="h2", label="Formula error", probability=0.35),
        Hypothesis(id="h3", label="Calculation error", probability=0.20),
    ]
    normalized = normalize_hypotheses(hyps)
    prob_sum = sum(h.probability for h in normalized)
    assert math.isclose(prob_sum, 1.0, rel_tol=1e-5)
    assert len(normalized) == 3


def test_initialize_from_dicts_with_probabilities():
    raw = [
        {"id": "h1", "label": "H1", "probability": 2.0},
        {"id": "h2", "label": "H2", "probability": 3.0},
    ]
    result = initialize_hypotheses(raw)
    assert math.isclose(result[0].probability, 0.4, rel_tol=1e-5)
    assert math.isclose(result[1].probability, 0.6, rel_tol=1e-5)
    assert sum(h.probability for h in result) == pytest.approx(1.0)


def test_initialize_from_dicts_without_probabilities_distributes_uniformly():
    raw = [
        {"id": "h1", "label": "H1"},
        {"id": "h2", "label": "H2"},
        {"id": "h3", "label": "H3"},
        {"id": "h4", "label": "H4"},
    ]
    result = initialize_hypotheses(raw)
    assert len(result) == 4
    for h in result:
        assert math.isclose(h.probability, 0.25, rel_tol=1e-5)


def test_reject_empty_hypotheses():
    with pytest.raises(ValueError, match="empty"):
        normalize_hypotheses([])


def test_reject_duplicate_ids():
    hyps = [
        Hypothesis(id="h1", label="H1", probability=0.5),
        Hypothesis(id="h1", label="Duplicate H1", probability=0.5),
    ]
    with pytest.raises(ValueError, match="Duplicate hypothesis ID"):
        normalize_hypotheses(hyps)


def test_reject_missing_or_empty_id():
    hyps = [
        Hypothesis(id="   ", label="Blank ID", probability=0.5),
        Hypothesis(id="h2", label="H2", probability=0.5),
    ]
    with pytest.raises(ValueError, match="empty or whitespace"):
        normalize_hypotheses(hyps)


def test_reject_negative_probability():
    with pytest.raises(ValueError):
        Hypothesis(id="h1", label="H1", probability=-0.2)


def test_reject_all_zero_probabilities():
    hyps = [
        Hypothesis(id="h1", label="H1", probability=0.0),
        Hypothesis(id="h2", label="H2", probability=0.0),
    ]
    with pytest.raises(ValueError, match="sum of probabilities is zero"):
        normalize_hypotheses(hyps)


# ==============================================================================
# Confidence Weighting Tests
# ==============================================================================

def test_validate_confidence_bounds():
    for valid_c in [1, 2, 3, 4, 5]:
        assert validate_confidence(valid_c) == valid_c

    with pytest.raises(ValueError):
        validate_confidence(0)

    with pytest.raises(ValueError):
        validate_confidence(6)

    with pytest.raises(TypeError):
        validate_confidence(3.5)  # type: ignore


def test_confidence_monotonic_evidential_strength():
    """Confirms evidential strength strictly increases: 5 > 4 > 3 > 2 > 1."""
    weights = [
        calculate_evidence_weight(is_match=True, is_contradiction=False, confidence=c)
        for c in range(1, 6)
    ]
    assert weights[0] < weights[1] < weights[2] < weights[3] < weights[4]


def test_confidence_contradiction_dampening():
    """Higher confidence on a competing distractor produces stronger dampening."""
    contra_weights = [
        calculate_evidence_weight(is_match=False, is_contradiction=True, confidence=c)
        for c in range(1, 6)
    ]
    assert contra_weights[0] > contra_weights[1] > contra_weights[2] > contra_weights[3] > contra_weights[4]
    # Ensure floor is respected
    assert all(w > 0.0 for w in contra_weights)


def test_neutral_weight():
    w = calculate_evidence_weight(is_match=False, is_contradiction=False, confidence=3)
    assert w == 1.0


# ==============================================================================
# Evidence Update Tests
# ==============================================================================

def test_update_hypotheses_with_match():
    initial = [
        Hypothesis(id="h1", label="Force-acceleration", probability=0.3333),
        Hypothesis(id="h2", label="Inertia resistance", probability=0.3333),
        Hypothesis(id="h3", label="Calculation error", probability=0.3334),
    ]
    evidence_mapping = {"A": "h1", "C": "h2", "D": "h3"}

    # Student chooses Option A with confidence 5 (strong match for h1)
    updated = update_hypotheses(
        hypotheses=initial,
        selected_option="A",
        confidence=5,
        evidence_mapping=evidence_mapping,
    )

    h1_updated = next(h for h in updated if h.id == "h1")
    h2_updated = next(h for h in updated if h.id == "h2")
    h3_updated = next(h for h in updated if h.id == "h3")

    # h1 probability must increase significantly
    assert h1_updated.probability > 0.3333
    # h1 evidence count must increment
    assert h1_updated.evidence_count == 1
    # Competing hypotheses must decrease
    assert h2_updated.probability < 0.3333
    assert h3_updated.probability < 0.3334
    # Sum must remain 1.0
    assert sum(h.probability for h in updated) == pytest.approx(1.0)


def test_high_confidence_has_greater_impact_than_low_confidence():
    base_hyps = [
        Hypothesis(id="h1", label="H1", probability=0.5),
        Hypothesis(id="h2", label="H2", probability=0.5),
    ]
    evidence_mapping = {"A": "h1", "B": "h2"}

    # Update with confidence 1
    result_low_conf = update_hypotheses(base_hyps, "A", confidence=1, evidence_mapping=evidence_mapping)
    h1_low = next(h for h in result_low_conf if h.id == "h1")

    # Update with confidence 5
    result_high_conf = update_hypotheses(base_hyps, "A", confidence=5, evidence_mapping=evidence_mapping)
    h1_high = next(h for h in result_high_conf if h.id == "h1")

    assert h1_high.probability > h1_low.probability


def test_neutral_option_preserves_ratios():
    base_hyps = [
        Hypothesis(id="h1", label="H1", probability=0.6),
        Hypothesis(id="h2", label="H2", probability=0.4),
    ]
    # Selected option is 'Z' which is not mapped
    evidence_mapping = {"A": "h1", "B": "h2"}
    updated = update_hypotheses(base_hyps, "Z", confidence=3, evidence_mapping=evidence_mapping)

    h1_updated = next(h for h in updated if h.id == "h1")
    h2_updated = next(h for h in updated if h.id == "h2")

    assert math.isclose(h1_updated.probability, 0.6, rel_tol=1e-4)
    assert math.isclose(h2_updated.probability, 0.4, rel_tol=1e-4)


# ==============================================================================
# Ranking & Gap Tests
# ==============================================================================

def test_rank_hypotheses_descending_and_tie_breaking():
    hyps = [
        Hypothesis(id="h_beta", label="Beta", probability=0.3),
        Hypothesis(id="h_alpha", label="Alpha", probability=0.3),
        Hypothesis(id="h_gamma", label="Gamma", probability=0.4),
    ]
    ranked = rank_hypotheses(hyps)
    assert ranked[0].id == "h_gamma"
    # Ties between h_alpha and h_beta broken alphabetically by ID
    assert ranked[1].id == "h_alpha"
    assert ranked[2].id == "h_beta"


def test_get_top_and_runner_up():
    hyps = [
        Hypothesis(id="h1", label="H1", probability=0.7),
        Hypothesis(id="h2", label="H2", probability=0.3),
    ]
    top, runner_up = get_top_hypotheses(hyps)
    assert top is not None and top.id == "h1"
    assert runner_up is not None and runner_up.id == "h2"


def test_calculate_probability_gap():
    hyps = [
        Hypothesis(id="h1", label="H1", probability=0.72),
        Hypothesis(id="h2", label="H2", probability=0.18),
        Hypothesis(id="h3", label="H3", probability=0.10),
    ]
    gap = calculate_probability_gap(hyps)
    assert math.isclose(gap, 0.54, rel_tol=1e-4)


# ==============================================================================
# Confirmation Gate Tests (Requested exact test cases)
# ==============================================================================

def test_confirmation_gate_case_1():
    """Case 1: Probability 0.61, gap 0.21 -> eligible."""
    hyps = [
        Hypothesis(id="h1", label="H1", probability=0.61),
        Hypothesis(id="h2", label="H2", probability=0.40),  # gap = 0.21
    ]
    result = check_confirmation_gate(hyps)
    assert result.is_eligible is True
    assert result.top_hypothesis.id == "h1"
    assert math.isclose(result.probability_gap, 0.21, rel_tol=1e-3)


def test_confirmation_gate_case_2():
    """Case 2: Probability 0.60 exactly -> NOT eligible (must be strictly > 0.60)."""
    hyps = [
        Hypothesis(id="h1", label="H1", probability=0.60),
        Hypothesis(id="h2", label="H2", probability=0.30),  # gap = 0.30 >= 0.20
    ]
    result = check_confirmation_gate(hyps)
    assert result.is_eligible is False
    assert "P(top)=0.6000 <= 0.6" in result.reason


def test_confirmation_gate_case_3():
    """Case 3: Probability 0.70, gap 0.19 -> NOT eligible (gap < 0.20)."""
    hyps = [
        Hypothesis(id="h1", label="H1", probability=0.70),
        Hypothesis(id="h2", label="H2", probability=0.51),  # gap = 0.19
    ]
    result = check_confirmation_gate(hyps)
    assert result.is_eligible is False
    assert "gap=0.1900 < 0.2" in result.reason


def test_confirmation_gate_case_4():
    """Case 4: Probability 0.80, gap 0.30 -> eligible."""
    hyps = [
        Hypothesis(id="h1", label="H1", probability=0.80),
        Hypothesis(id="h2", label="H2", probability=0.50),  # gap = 0.30
    ]
    result = check_confirmation_gate(hyps)
    assert result.is_eligible is True
    assert result.top_hypothesis.id == "h1"
    assert math.isclose(result.probability_gap, 0.30, rel_tol=1e-3)


def test_confirmation_gate_single_hypothesis():
    hyps = [Hypothesis(id="h1", label="H1", probability=0.90)]
    result = check_confirmation_gate(hyps)
    assert result.is_eligible is True
    assert result.runner_up_hypothesis is None


def test_confirmation_gate_empty():
    result = check_confirmation_gate([])
    assert result.is_eligible is False
    assert result.top_hypothesis is None
