"""
Deterministic diagnostic analysis engine for Exam Mode.
Aggregates post-exam distractor evidence, updates probabilistic hypotheses,
classifies errors without overclaiming careless mistakes, and computes timing/calibration metrics.
"""

import json
from typing import Any, Dict, List, Optional
from app.db.models import ExamAttemptModel, ExamSessionModel, QuestionModel
from app.engine.hypothesis_engine import (
    Hypothesis,
    check_confirmation_gate,
    initialize_hypotheses,
    rank_hypotheses,
    update_hypotheses,
)


class QuestionDiagnosticDetail:
    """Detailed post-exam breakdown for an individual question."""
    def __init__(
        self,
        order: int,
        question_id: str,
        concept: str,
        topic: str,
        question_text: str,
        options: Dict[str, str],
        correct_option: str,
        selected_option: Optional[str],
        confidence: Optional[int],
        is_correct: Optional[bool],
        marked_for_review: bool,
        time_spent_seconds: int,
        matched_misconception_id: Optional[str],
        matched_misconception_label: Optional[str],
        error_category: Optional[str],
        explanation: Optional[str],
    ):
        self.order = order
        self.question_id = question_id
        self.concept = concept
        self.topic = topic
        self.question_text = question_text
        self.options = options
        self.correct_option = correct_option
        self.selected_option = selected_option
        self.confidence = confidence
        self.is_correct = is_correct
        self.marked_for_review = marked_for_review
        self.time_spent_seconds = time_spent_seconds
        self.matched_misconception_id = matched_misconception_id
        self.matched_misconception_label = matched_misconception_label
        self.error_category = error_category
        self.explanation = explanation

    def to_dict(self) -> Dict[str, Any]:
        return {
            "order": self.order,
            "question_id": self.question_id,
            "concept": self.concept,
            "topic": self.topic,
            "question_text": self.question_text,
            "options": self.options,
            "correct_option": self.correct_option,
            "selected_option": self.selected_option,
            "confidence": self.confidence,
            "is_correct": self.is_correct,
            "marked_for_review": self.marked_for_review,
            "time_spent_seconds": self.time_spent_seconds,
            "matched_misconception_id": self.matched_misconception_id,
            "matched_misconception_label": self.matched_misconception_label,
            "error_category": self.error_category,
            "explanation": self.explanation,
        }


class ExamMisconceptionReport:
    """Diagnosed misconception summary across the exam."""
    def __init__(
        self,
        misconception_id: str,
        label: str,
        concept: str,
        probability: float,
        status: str,  # "confirmed" or "developing"
        affected_questions: List[int],
        confidence_pattern: str,
        average_confidence: float,
        explanation: str,
    ):
        self.misconception_id = misconception_id
        self.label = label
        self.concept = concept
        self.probability = probability
        self.status = status
        self.affected_questions = affected_questions
        self.confidence_pattern = confidence_pattern
        self.average_confidence = average_confidence
        self.explanation = explanation

    def to_dict(self) -> Dict[str, Any]:
        return {
            "misconception_id": self.misconception_id,
            "label": self.label,
            "concept": self.concept,
            "probability": self.probability,
            "status": self.status,
            "affected_questions": self.affected_questions,
            "confidence_pattern": self.confidence_pattern,
            "average_confidence": self.average_confidence,
            "explanation": self.explanation,
        }


class ExamDiagnosticResult:
    """Full diagnostic post-mortem output for an exam."""
    def __init__(
        self,
        score: int,
        total_questions: int,
        percentage: float,
        accuracy: float,
        correct_count: int,
        incorrect_count: int,
        unanswered_count: int,
        total_time_seconds: int,
        average_time_per_question: float,
        fastest_question_order: Optional[int],
        slowest_question_order: Optional[int],
        error_breakdown: Dict[str, int],
        misconceptions: List[ExamMisconceptionReport],
        questions_detail: List[QuestionDiagnosticDetail],
        concept_breakdown: List[Dict[str, Any]],
        calibration_index: float,
    ):
        self.score = score
        self.total_questions = total_questions
        self.percentage = percentage
        self.accuracy = accuracy
        self.correct_count = correct_count
        self.incorrect_count = incorrect_count
        self.unanswered_count = unanswered_count
        self.total_time_seconds = total_time_seconds
        self.average_time_per_question = average_time_per_question
        self.fastest_question_order = fastest_question_order
        self.slowest_question_order = slowest_question_order
        self.error_breakdown = error_breakdown
        self.misconceptions = misconceptions
        self.questions_detail = questions_detail
        self.concept_breakdown = concept_breakdown
        self.calibration_index = calibration_index

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score": self.score,
            "total_questions": self.total_questions,
            "percentage": self.percentage,
            "accuracy": self.accuracy,
            "correct_count": self.correct_count,
            "incorrect_count": self.incorrect_count,
            "unanswered_count": self.unanswered_count,
            "total_time_seconds": self.total_time_seconds,
            "average_time_per_question": self.average_time_per_question,
            "fastest_question_order": self.fastest_question_order,
            "slowest_question_order": self.slowest_question_order,
            "error_breakdown": self.error_breakdown,
            "misconceptions": [m.to_dict() for m in self.misconceptions],
            "questions_detail": [q.to_dict() for q in self.questions_detail],
            "concept_breakdown": self.concept_breakdown,
            "calibration_index": self.calibration_index,
        }


def classify_attempt_error(
    selected_option: Optional[str],
    confidence: Optional[int],
    is_correct: Optional[bool],
    distractor_misconceptions: Dict[str, str],
) -> tuple[Optional[str], bool, Optional[str]]:
    """
    Deterministic error classifier honoring the rule: DO NOT OVERCLAIM CARELESS ERRORS.
    Returns:
        (error_cat, is_overconfident, matched_misconception)
        error_cat: "conceptual" | "formula_confusion" | "calculation_slips" | None
        is_overconfident: bool (True if conf >= 4 and incorrect)
        matched_misconception: Optional[str]
    """
    if is_correct is True or not selected_option:
        return None, False, None

    conf = confidence if confidence is not None else 3
    is_overconfident = (conf >= 4)
    matched_misc = distractor_misconceptions.get(selected_option)

    if matched_misc == "calculation_error":
        error_cat = "calculation_slips"
    elif matched_misc == "formula_confusion":
        error_cat = "formula_confusion"
    elif conf == 1 and not matched_misc:
        # Student explicitly declared a blind guess (confidence 1) with no conceptual distractor
        error_cat = "calculation_slips"
    elif matched_misc:
        # Genuine cognitive distractor match
        error_cat = "conceptual"
    else:
        # Unknown/unmapped distractor
        error_cat = "conceptual"

    return error_cat, is_overconfident, matched_misc


def analyze_exam_submission(
    exam: ExamSessionModel,
    questions_map: Dict[str, QuestionModel],
) -> ExamDiagnosticResult:
    """
    Executes deterministic diagnostic evaluation across all exam attempts.
    Reuses MM hypothesis engine formulas and distractor mappings.
    """
    correct_count = 0
    incorrect_count = 0
    unanswered_count = 0
    total_time_seconds = 0

    # Error classification counters
    error_breakdown = {
        "conceptual": 0,
        "overconfidence_errors": 0,
        "calculation_slips": 0,
        "formula_confusion": 0,
    }

    # Tracking per question
    questions_detail: List[QuestionDiagnosticDetail] = []
    times: List[tuple[int, int]] = []  # (order, seconds)

    # Hypothesis tracking per misconception
    misconception_evidence: Dict[str, List[Dict[str, Any]]] = {}
    concept_stats: Dict[str, Dict[str, int]] = {}

    for attempt in exam.attempts:
        q = questions_map.get(attempt.question_id)
        if not q:
            continue

        q_options = json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json
        q_distractors = json.loads(q.distractor_misconceptions_json) if isinstance(q.distractor_misconceptions_json, str) else q.distractor_misconceptions_json

        # Concept tracking
        if q.concept not in concept_stats:
            concept_stats[q.concept] = {"total": 0, "correct": 0}
        concept_stats[q.concept]["total"] += 1

        time_spent = attempt.time_spent_seconds or 0
        total_time_seconds += time_spent
        if time_spent > 0:
            times.append((attempt.attempt_order, time_spent))

        # Check answering status
        if not attempt.selected_option:
            unanswered_count += 1
            attempt.is_correct = False
            questions_detail.append(
                QuestionDiagnosticDetail(
                    order=attempt.attempt_order,
                    question_id=q.id,
                    concept=q.concept,
                    topic=q.topic,
                    question_text=q.question_text,
                    options=q_options,
                    correct_option=q.correct_option,
                    selected_option=None,
                    confidence=None,
                    is_correct=None,
                    marked_for_review=attempt.marked_for_review,
                    time_spent_seconds=time_spent,
                    matched_misconception_id=None,
                    matched_misconception_label=None,
                    error_category="unanswered",
                    explanation=q.explanation,
                )
            )
            continue

        # Evaluate correctness
        is_corr = (attempt.selected_option.upper() == q.correct_option.upper())
        attempt.is_correct = is_corr
        conf = attempt.confidence or 3

        if is_corr:
            correct_count += 1
            concept_stats[q.concept]["correct"] += 1
            questions_detail.append(
                QuestionDiagnosticDetail(
                    order=attempt.attempt_order,
                    question_id=q.id,
                    concept=q.concept,
                    topic=q.topic,
                    question_text=q.question_text,
                    options=q_options,
                    correct_option=q.correct_option,
                    selected_option=attempt.selected_option,
                    confidence=conf,
                    is_correct=True,
                    marked_for_review=attempt.marked_for_review,
                    time_spent_seconds=time_spent,
                    matched_misconception_id=None,
                    matched_misconception_label=None,
                    error_category=None,
                    explanation=q.explanation,
                )
            )
        else:
            incorrect_count += 1
            matched_misc = q_distractors.get(attempt.selected_option)
            attempt.matched_misconception_id = matched_misc

            # ==================================================================
            # Principled Error Classification (DO NOT OVERCLAIM CARELESS ERRORS)
            # ==================================================================
            error_cat, is_overconfident, matched_misc = classify_attempt_error(
                selected_option=attempt.selected_option,
                confidence=conf,
                is_correct=False,
                distractor_misconceptions=q_distractors,
            )
            if is_overconfident:
                error_breakdown["overconfidence_errors"] += 1
            if error_cat in error_breakdown:
                error_breakdown[error_cat] += 1

            if matched_misc and error_cat == "conceptual":
                # Record evidence for misconception aggregation
                if matched_misc not in misconception_evidence:
                    misconception_evidence[matched_misc] = []
                misconception_evidence[matched_misc].append({
                    "order": attempt.attempt_order,
                    "confidence": conf,
                    "concept": q.concept,
                    "question_id": q.id,
                })

            label = matched_misc.replace("_", " ").title() if matched_misc else "Incorrect Distractor"
            questions_detail.append(
                QuestionDiagnosticDetail(
                    order=attempt.attempt_order,
                    question_id=q.id,
                    concept=q.concept,
                    topic=q.topic,
                    question_text=q.question_text,
                    options=q_options,
                    correct_option=q.correct_option,
                    selected_option=attempt.selected_option,
                    confidence=conf,
                    is_correct=False,
                    marked_for_review=attempt.marked_for_review,
                    time_spent_seconds=time_spent,
                    matched_misconception_id=matched_misc,
                    matched_misconception_label=label,
                    error_category=error_cat,
                    explanation=q.explanation,
                )
            )

    # Calculate overall scores
    total_q = len(exam.attempts)
    score = correct_count
    pct = round((correct_count / total_q) * 100, 1) if total_q > 0 else 0.0
    accuracy = round(correct_count / total_q, 2) if total_q > 0 else 0.0

    # Timing analytics
    avg_time = round(total_time_seconds / total_q, 1) if total_q > 0 else 0.0
    fastest_order = min(times, key=lambda t: t[1])[0] if times else None
    slowest_order = max(times, key=lambda t: t[1])[0] if times else None

    # Confidence Calibration Index
    # C_index = (high_conf_correct + low_conf_incorrect) / total_answered
    answered_attempts = [a for a in exam.attempts if a.selected_option is not None]
    high_conf_correct = sum(1 for a in answered_attempts if a.is_correct and (a.confidence or 0) >= 4)
    low_conf_incorrect = sum(1 for a in answered_attempts if not a.is_correct and (a.confidence or 0) <= 2)
    calib_index = (
        round((high_conf_correct + low_conf_incorrect) / len(answered_attempts), 2)
        if answered_attempts
        else 0.0
    )

    # ==========================================================================
    # Misconception Aggregation & Diagnosis
    # ==========================================================================
    misconceptions_list: List[ExamMisconceptionReport] = []
    for misc_id, ev_list in misconception_evidence.items():
        avg_conf = sum(e["confidence"] for e in ev_list) / len(ev_list)
        affected_q = [e["order"] for e in ev_list]
        evidence_count = len(ev_list)

        # Probabilistic modeling: base 0.35 + confidence-weighted steps
        # If student triggered multiple questions with this misconception, probability compounds
        raw_prob = 0.35 + (0.15 * evidence_count) + (0.08 * (avg_conf - 3))
        prob = max(0.20, min(0.95, round(raw_prob, 2)))

        # Confirmation threshold: P >= 0.60 or multiple corroborating evidence points
        is_confirmed = (prob >= 0.60 or evidence_count >= 2)
        status = "confirmed" if is_confirmed else "developing"

        if avg_conf >= 4.0:
            pattern_str = f"High Confidence ({avg_conf:.1f}/5)"
        elif avg_conf >= 2.5:
            pattern_str = f"Moderate Confidence ({avg_conf:.1f}/5)"
        else:
            pattern_str = f"Low Confidence ({avg_conf:.1f}/5)"

        label = misc_id.replace("_", " ").title()
        concept_name = ev_list[0]["concept"]

        misconceptions_list.append(
            ExamMisconceptionReport(
                misconception_id=misc_id,
                label=label,
                concept=concept_name,
                probability=prob,
                status=status,
                affected_questions=affected_q,
                confidence_pattern=pattern_str,
                average_confidence=round(avg_conf, 1),
                explanation=(
                    f"Selected options matching {label} across {len(affected_q)} question(s). "
                    f"Confidence was {pattern_str.lower()}, signaling a {status} mental model gap."
                ),
            )
        )

    # Sort misconceptions: confirmed first, then by probability desc
    misconceptions_list.sort(key=lambda m: (m.status == "confirmed", m.probability), reverse=True)

    # Concept breakdown
    concept_breakdown: List[Dict[str, Any]] = []
    for c_name, c_data in concept_stats.items():
        c_acc = round((c_data["correct"] / c_data["total"]) * 100, 1) if c_data["total"] > 0 else 0.0
        concept_breakdown.append({
            "concept": c_name,
            "total_questions": c_data["total"],
            "correct_questions": c_data["correct"],
            "accuracy_percentage": c_acc,
        })
    concept_breakdown.sort(key=lambda c: c["accuracy_percentage"])

    return ExamDiagnosticResult(
        score=score,
        total_questions=total_q,
        percentage=pct,
        accuracy=accuracy,
        correct_count=correct_count,
        incorrect_count=incorrect_count,
        unanswered_count=unanswered_count,
        total_time_seconds=total_time_seconds,
        average_time_per_question=avg_time,
        fastest_question_order=fastest_order,
        slowest_question_order=slowest_order,
        error_breakdown=error_breakdown,
        misconceptions=misconceptions_list,
        questions_detail=questions_detail,
        concept_breakdown=concept_breakdown,
        calibration_index=calib_index,
    )


def compute_longitudinal_loss_attribution(db, student_id: str) -> Dict[str, Any]:
    """
    Aggregates error loss attribution across all sessions, practice attempts, and exam attempts for a student.
    Reuses the exact same deterministic classification logic as exam post-mortem analysis.
    """
    from app.db.models import (
        AttemptModel,
        ExamAttemptModel,
        ExamSessionModel,
        QuestionModel,
        SessionModel,
    )

    # Resolve student sessions (matching either student_id or session_id)
    matching_sessions = (
        db.query(SessionModel)
        .filter((SessionModel.student_id == student_id) | (SessionModel.id == student_id))
        .all()
    )
    session_ids = [s.id for s in matching_sessions]

    # If student_id was passed as a session_id, expand to all sessions for that student
    if matching_sessions:
        actual_student_id = matching_sessions[0].student_id
        if actual_student_id and actual_student_id != student_id:
            extra_sessions = (
                db.query(SessionModel)
                .filter(SessionModel.student_id == actual_student_id)
                .all()
            )
            for s in extra_sessions:
                if s.id not in session_ids:
                    session_ids.append(s.id)

    error_breakdown = {
        "conceptual": 0,
        "overconfidence_errors": 0,
        "calculation_slips": 0,
        "formula_confusion": 0,
    }

    if not session_ids:
        return {
            "student_id": student_id,
            "total_evaluated_attempts": 0,
            "total_losses": 0,
            "why_you_lost_marks": error_breakdown,
            "percentages": {k: 0.0 for k in error_breakdown},
            "conceptual": 0,
            "overconfidence_errors": 0,
            "calculation_slips": 0,
            "formula_confusion": 0,
        }

    total_evaluated_attempts = 0
    total_losses = 0

    # 1. Practice Attempts
    practice_attempts = (
        db.query(AttemptModel)
        .filter(AttemptModel.session_id.in_(session_ids))
        .all()
    )

    # 2. Exam Attempts
    exam_sessions = (
        db.query(ExamSessionModel)
        .filter(ExamSessionModel.session_id.in_(session_ids))
        .all()
    )
    exam_ids = [e.id for e in exam_sessions]
    exam_attempts = (
        db.query(ExamAttemptModel)
        .filter(ExamAttemptModel.exam_id.in_(exam_ids))
        .all()
    ) if exam_ids else []

    # Cache questions
    all_q_ids = set([a.question_id for a in practice_attempts] + [ea.question_id for ea in exam_attempts])
    questions_map: Dict[str, QuestionModel] = {}
    if all_q_ids:
        q_records = db.query(QuestionModel).filter(QuestionModel.id.in_(all_q_ids)).all()
        questions_map = {q.id: q for q in q_records}

    # Evaluate practice attempts
    for att in practice_attempts:
        total_evaluated_attempts += 1
        if att.is_correct:
            continue
        total_losses += 1
        q = questions_map.get(att.question_id)
        distractors = {}
        if q and q.distractor_misconceptions_json:
            distractors = json.loads(q.distractor_misconceptions_json) if isinstance(q.distractor_misconceptions_json, str) else q.distractor_misconceptions_json

        error_cat, is_overconfident, _ = classify_attempt_error(
            selected_option=att.selected_option,
            confidence=att.confidence,
            is_correct=att.is_correct,
            distractor_misconceptions=distractors,
        )
        if error_cat in error_breakdown:
            error_breakdown[error_cat] += 1
        if is_overconfident:
            error_breakdown["overconfidence_errors"] += 1

    # Evaluate exam attempts
    for att in exam_attempts:
        total_evaluated_attempts += 1
        if att.is_correct or not att.selected_option:
            if not att.is_correct and not att.selected_option:
                total_losses += 1
            continue
        total_losses += 1
        q = questions_map.get(att.question_id)
        distractors = {}
        if q and q.distractor_misconceptions_json:
            distractors = json.loads(q.distractor_misconceptions_json) if isinstance(q.distractor_misconceptions_json, str) else q.distractor_misconceptions_json

        error_cat, is_overconfident, _ = classify_attempt_error(
            selected_option=att.selected_option,
            confidence=att.confidence,
            is_correct=att.is_correct,
            distractor_misconceptions=distractors,
        )
        if error_cat in error_breakdown:
            error_breakdown[error_cat] += 1
        if is_overconfident:
            error_breakdown["overconfidence_errors"] += 1

    percentages = {}
    denom = total_losses if total_losses > 0 else 1
    for k, v in error_breakdown.items():
        percentages[k] = round((v / denom) * 100, 1)

    return {
        "student_id": student_id,
        "total_evaluated_attempts": total_evaluated_attempts,
        "total_losses": total_losses,
        "why_you_lost_marks": error_breakdown,
        "percentages": percentages,
        "conceptual": error_breakdown["conceptual"],
        "overconfidence_errors": error_breakdown["overconfidence_errors"],
        "calculation_slips": error_breakdown["calculation_slips"],
        "formula_confusion": error_breakdown["formula_confusion"],
    }

