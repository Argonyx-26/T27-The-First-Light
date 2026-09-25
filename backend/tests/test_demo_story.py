"""
Integration test for the core hackathon differentiator:
"Same Score, Different Misconception"

Demonstrates that two students who receive the exact same initial question
and both get it wrong (identical score) are routed along different diagnostic paths
and arrive at different confirmed root-cause diagnoses based on their distractor choices.
"""

from app.engine.hypothesis_engine import (
    check_confirmation_gate,
    initialize_hypotheses,
    update_hypotheses,
)
from app.engine.question_selector import select_best_diagnostic_question
from app.engine.seed_loader import get_question_by_id, load_seed_questions
from app.engine.verification import evaluate_verification
from app.engine.models import VerificationStatus


def test_same_score_different_misconception_walkthrough():
    all_questions = load_seed_questions()
    initial_q = get_question_by_id("physics_newton_q01")
    assert initial_q is not None
    assert initial_q.correct_option == "B"

    # Define the 3 competing hypotheses for this concept
    raw_hypotheses = [
        {"id": "force_acceleration_confusion", "label": "Force Required for Motion (Impetus)"},
        {"id": "mass_inertia_resistance", "label": "Inertia as Active Resistance"},
        {"id": "action_reaction_cancellation", "label": "Action-Reaction Cancellation"},
    ]

    # ==========================================================================
    # STUDENT A WALKTHROUGH
    # ==========================================================================
    hyps_student_a = initialize_hypotheses(raw_hypotheses)

    # Student A answers Q1 incorrectly: chooses Option A ("continuous thrust") with confidence 5
    selected_option_a = "A"
    assert selected_option_a != initial_q.correct_option  # Student A is WRONG
    assert initial_q.distractor_misconceptions[selected_option_a] == "force_acceleration_confusion"

    hyps_student_a = update_hypotheses(
        hypotheses=hyps_student_a,
        selected_option=selected_option_a,
        confidence=5,
        evidence_mapping=initial_q.distractor_misconceptions,
    )

    # Diagnostic question selected for Student A
    candidate_questions_a = [q for q in all_questions if q.question_type == "diagnostic"]
    best_diag_a = select_best_diagnostic_question(
        candidate_questions=candidate_questions_a,
        hypotheses=hyps_student_a,
        target_concept=initial_q.concept,
        target_topic=initial_q.topic,
        excluded_ids={initial_q.id},
        last_confidence=5,
    )
    assert best_diag_a is not None
    # Best diagnostic question should confront force vs motion
    assert "force_acceleration_confusion" in best_diag_a.question.diagnostic_targets

    # Student A answers the selected diagnostic question by choosing the option
    # that manifests their specific misconception (force_acceleration_confusion)
    opt_a = next(
        opt for opt, misc in best_diag_a.question.distractor_misconceptions.items()
        if misc == "force_acceleration_confusion"
    )

    hyps_student_a = update_hypotheses(
        hypotheses=hyps_student_a,
        selected_option=opt_a,
        confidence=4,
        evidence_mapping=best_diag_a.question.distractor_misconceptions,
    )

    gate_result_a = check_confirmation_gate(hyps_student_a)
    assert gate_result_a.is_eligible is True
    assert gate_result_a.top_hypothesis.id == "force_acceleration_confusion"
    assert gate_result_a.probability_gap >= 0.20

    # Verification for Student A
    verify_q_a = get_question_by_id("physics_newton_verify_01")
    assert verify_q_a is not None
    verify_result_a = evaluate_verification(
        original_misconception_id="force_acceleration_confusion",
        verification_question=verify_q_a,
        selected_option=verify_q_a.correct_option,  # Student A answers correctly post-remediation
    )
    assert verify_result_a.status == VerificationStatus.RESOLVED

    # ==========================================================================
    # STUDENT B WALKTHROUGH
    # ==========================================================================
    hyps_student_b = initialize_hypotheses(raw_hypotheses)

    # Student B answers Q1 incorrectly: chooses Option C ("force to overcome inertia") with confidence 5
    selected_option_b = "C"
    assert selected_option_b != initial_q.correct_option  # Student B is ALSO WRONG (Same score: 0/1)
    assert initial_q.distractor_misconceptions[selected_option_b] == "mass_inertia_resistance"

    hyps_student_b = update_hypotheses(
        hypotheses=hyps_student_b,
        selected_option=selected_option_b,
        confidence=5,
        evidence_mapping=initial_q.distractor_misconceptions,
    )

    # Diagnostic question selected for Student B
    candidate_questions_b = [q for q in all_questions if q.question_type == "diagnostic"]
    best_diag_b = select_best_diagnostic_question(
        candidate_questions=candidate_questions_b,
        hypotheses=hyps_student_b,
        target_concept=initial_q.concept,
        target_topic=initial_q.topic,
        excluded_ids={initial_q.id},
        last_confidence=5,
    )
    assert best_diag_b is not None
    assert "mass_inertia_resistance" in best_diag_b.question.diagnostic_targets

    # Student B answers the selected diagnostic question by choosing the option
    # that manifests their specific misconception (mass_inertia_resistance)
    opt_b = next(
        opt for opt, misc in best_diag_b.question.distractor_misconceptions.items()
        if misc == "mass_inertia_resistance"
    )

    hyps_student_b = update_hypotheses(
        hypotheses=hyps_student_b,
        selected_option=opt_b,
        confidence=4,
        evidence_mapping=best_diag_b.question.distractor_misconceptions,
    )

    gate_result_b = check_confirmation_gate(hyps_student_b)
    assert gate_result_b.is_eligible is True
    assert gate_result_b.top_hypothesis.id == "mass_inertia_resistance"
    assert gate_result_b.probability_gap >= 0.20

    # Verification for Student B
    verify_q_b = get_question_by_id("physics_newton_verify_02")
    assert verify_q_b is not None
    verify_result_b = evaluate_verification(
        original_misconception_id="mass_inertia_resistance",
        verification_question=verify_q_b,
        selected_option=verify_q_b.correct_option,
    )
    assert verify_result_b.status == VerificationStatus.RESOLVED

    # ==========================================================================
    # CORE PRODUCT DIFFERENTIATOR ASSERTIONS
    # ==========================================================================
    # Both students got question 1 wrong (same score: 0)
    assert selected_option_a != initial_q.correct_option
    assert selected_option_b != initial_q.correct_option

    # But their diagnoses are completely different
    assert gate_result_a.top_hypothesis.id != gate_result_b.top_hypothesis.id
    assert gate_result_a.top_hypothesis.id == "force_acceleration_confusion"
    assert gate_result_b.top_hypothesis.id == "mass_inertia_resistance"
