"""
Priority Revision Engine: Computes revision priority scores based on affected questions
and composes deterministic 5-question daily revision sets.
"""

from datetime import datetime, timedelta
import json
import logging
from typing import Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from app.db.models import AttemptModel, EvidenceRecordModel, MisconceptionStateModel, QuestionModel, SessionModel
from app.db.repositories import question_repository as question_repo
from app.engine.models import (
    DailyRevisionQuestionItem,
    DailyRevisionResponse,
    Question,
    QuestionType,
    RevisionItem,
    RevisionListResponse,
)


logger = logging.getLogger("revision_engine")


def get_affected_question_counts(db: Session, session_id: str) -> Dict[str, Set[str]]:
    """
    Returns a mapping of misconception_id -> set of distinct question_ids affected in past attempts/evidence.
    """
    affected_map: Dict[str, Set[str]] = {}

    # 1. From attempts
    attempts = db.query(AttemptModel).filter(AttemptModel.session_id == session_id).all()
    q_ids = {a.question_id for a in attempts}
    questions = db.query(QuestionModel).filter(QuestionModel.id.in_(q_ids)).all() if q_ids else []
    q_dict = {q.id: q for q in questions}

    for att in attempts:
        q_model = q_dict.get(att.question_id)
        # Check matched_misconception_id
        if att.matched_misconception_id:
            affected_map.setdefault(att.matched_misconception_id, set()).add(att.question_id)

        # Check distractor mappings if answer was incorrect
        if not att.is_correct and q_model:
            try:
                distractor_map = json.loads(q_model.distractor_misconceptions_json or "{}")
                chosen_misc = distractor_map.get(att.selected_option)
                if chosen_misc:
                    affected_map.setdefault(chosen_misc, set()).add(att.question_id)
            except Exception:
                pass

    # 2. From evidence records
    evidence_records = db.query(EvidenceRecordModel).filter(EvidenceRecordModel.session_id == session_id).all()
    for ev in evidence_records:
        # Check if observation mentions misconception id
        for misc_id in affected_map.keys():
            if misc_id in ev.observation:
                affected_map.setdefault(misc_id, set()).add(ev.question_id)

    return affected_map


def compute_revision_priorities(db: Session, session_id: str) -> List[MisconceptionStateModel]:
    """
    Computes and updates revision_priority for all misconception states in a session.
    Ranks persistent misconceptions by number of questions affected.
    """
    records = (
        db.query(MisconceptionStateModel)
        .filter(MisconceptionStateModel.session_id == session_id)
        .all()
    )
    if not records:
        return []

    affected_map = get_affected_question_counts(db, session_id)

    for r in records:
        affected_set = affected_map.get(r.misconception_id, set())
        questions_affected = len(affected_set)

        # Deterministic formula ranking persistent misconceptions highest by affected questions
        if r.status == "persistent":
            priority = (float(questions_affected) * 10.0) + (r.probability * 2.0) + 10.0
        elif r.status == "confirmed":
            priority = (float(questions_affected) * 5.0) + (r.probability * 1.5) + 5.0
        elif r.status == "candidate":
            priority = (float(questions_affected) * 2.0) + r.probability
        elif r.status == "resolved":
            priority = 0.5 * r.probability
        else:
            priority = 0.0

        r.revision_priority = round(priority, 3)

    db.commit()

    # Return ordered by revision_priority descending
    records.sort(key=lambda x: (x.revision_priority, x.probability), reverse=True)
    return records


def get_prioritized_revision_list(db: Session, session_id: str) -> RevisionListResponse:
    """
    Returns the student's prioritized revision list with computed priority scores and affected question counts.
    """
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        return RevisionListResponse(session_id=session_id, revision_items=[])

    sorted_records = compute_revision_priorities(db, session_id)
    affected_map = get_affected_question_counts(db, session_id)

    items: List[RevisionItem] = []
    for r in sorted_records:
        if r.status in ("persistent", "developing", "confirmed", "candidate"):
            q_count = len(affected_map.get(r.misconception_id, set()))
            items.append(
                RevisionItem(
                    concept=session.topic,
                    misconception=r.label,
                    misconception_id=r.misconception_id,
                    status=r.status,
                    recommended_review_in_days=1 if r.status == "persistent" else 3,
                    summary=f"Review targeted fundamentals for '{r.label}'. Affected {q_count} questions.",
                    revision_priority=r.revision_priority,
                    questions_affected=q_count,
                )
            )

    return RevisionListResponse(
        session_id=session_id,
        revision_items=items,
    )


def compose_daily_revision_set(db: Session, session_id: str) -> DailyRevisionResponse:
    """
    Composes a deterministic 5-question daily revision set:
    - 2 questions on top 2 persistent misconceptions (or top confirmed)
    - 2 verification-style questions on gaps resolved in roughly the last 7 days (spaced re-check)
    - 1 confidence-calibration question (previous confidence-correctness mismatch)
    """
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    topic = session.topic if session else "Physics"

    # Compute priorities
    prioritized_hyps = compute_revision_priorities(db, session_id)

    # Load candidate questions
    all_topic_questions = question_repo.list_questions(db, topic=topic, limit=100)
    if len(all_topic_questions) < 5:
        # Fallback to entire pool if topic pool is small
        all_topic_questions = question_repo.list_questions(db, limit=100)

    used_q_ids: Set[str] = set()
    selected_items: List[DailyRevisionQuestionItem] = []

    def find_question_matching(
        misc_id: Optional[str] = None,
        concept: Optional[str] = None,
        preferred_type: Optional[QuestionType] = None,
    ) -> Optional[Question]:
        candidates: List[Question] = []
        for q in all_topic_questions:
            if q.id in used_q_ids:
                continue

            matches_misc = False
            if misc_id:
                if q.verified_misconception_id == misc_id:
                    matches_misc = True
                elif misc_id in q.diagnostic_targets:
                    matches_misc = True
                elif misc_id in q.distractor_misconceptions.values():
                    matches_misc = True

            matches_concept = (q.concept == concept) if concept else True

            if misc_id and matches_misc:
                candidates.append(q)
            elif concept and matches_concept and not misc_id:
                candidates.append(q)

        # Sort candidates preferring preferred_type, then deterministic by id
        if candidates:
            if preferred_type:
                candidates.sort(key=lambda x: (x.question_type != preferred_type, x.id))
            else:
                candidates.sort(key=lambda x: x.id)
            chosen = candidates[0]
            used_q_ids.add(chosen.id)
            return chosen

        # Fallback: pick any unused question from candidates
        fallback = [q for q in all_topic_questions if q.id not in used_q_ids]
        if fallback:
            fallback.sort(key=lambda x: (preferred_type is not None and x.question_type != preferred_type, x.id))
            chosen = fallback[0]
            used_q_ids.add(chosen.id)
            return chosen

        return None

    # =========================================================================
    # 1. 2 questions on top 2 persistent misconceptions
    # =========================================================================
    persistent_hyps = [h for h in prioritized_hyps if h.status in ("persistent", "confirmed")]
    if not persistent_hyps:
        persistent_hyps = [h for h in prioritized_hyps if h.status != "resolved"]

    # Slot 1
    target_1 = persistent_hyps[0] if len(persistent_hyps) > 0 else None
    q1 = find_question_matching(
        misc_id=target_1.misconception_id if target_1 else None,
        preferred_type=QuestionType.DIAGNOSTIC,
    )
    if q1:
        selected_items.append(
            DailyRevisionQuestionItem(
                question=q1,
                revision_type="persistent_misconception",
                target_misconception_id=target_1.misconception_id if target_1 else None,
                target_misconception_label=target_1.label if target_1 else "High-Priority Concept Gap",
                reason_description="Top persistent cognitive misconception requiring immediate reinforcement.",
            )
        )

    # Slot 2
    target_2 = persistent_hyps[1] if len(persistent_hyps) > 1 else target_1
    q2 = find_question_matching(
        misc_id=target_2.misconception_id if target_2 else None,
        preferred_type=QuestionType.DIAGNOSTIC,
    )
    if q2:
        selected_items.append(
            DailyRevisionQuestionItem(
                question=q2,
                revision_type="persistent_misconception",
                target_misconception_id=target_2.misconception_id if target_2 else None,
                target_misconception_label=target_2.label if target_2 else "High-Priority Concept Gap",
                reason_description="Secondary persistent gap scheduled for daily reinforcement.",
            )
        )

    # =========================================================================
    # 2. 2 verification-style questions on gaps resolved in roughly last 7 days
    # =========================================================================
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    resolved_hyps = [
        h for h in prioritized_hyps
        if h.status == "resolved" and (h.updated_at is None or h.updated_at >= seven_days_ago)
    ]
    if not resolved_hyps:
        # Fallback to any resolved gaps
        resolved_hyps = [h for h in prioritized_hyps if h.status == "resolved"]

    # Slot 3
    res_target_1 = resolved_hyps[0] if len(resolved_hyps) > 0 else None
    q3 = find_question_matching(
        misc_id=res_target_1.misconception_id if res_target_1 else None,
        preferred_type=QuestionType.VERIFICATION,
    )
    if q3:
        selected_items.append(
            DailyRevisionQuestionItem(
                question=q3,
                revision_type="spaced_recheck",
                target_misconception_id=res_target_1.misconception_id if res_target_1 else None,
                target_misconception_label=res_target_1.label if res_target_1 else "Spaced Retention Check",
                reason_description="Spaced verification check: validating long-term retention of recently resolved gap.",
            )
        )

    # Slot 4
    res_target_2 = resolved_hyps[1] if len(resolved_hyps) > 1 else res_target_1
    q4 = find_question_matching(
        misc_id=res_target_2.misconception_id if res_target_2 else None,
        preferred_type=QuestionType.VERIFICATION,
    )
    if q4:
        selected_items.append(
            DailyRevisionQuestionItem(
                question=q4,
                revision_type="spaced_recheck",
                target_misconception_id=res_target_2.misconception_id if res_target_2 else None,
                target_misconception_label=res_target_2.label if res_target_2 else "Spaced Retention Check",
                reason_description="Spaced verification check: ensuring stable conceptual grounding over time.",
            )
        )

    # =========================================================================
    # 3. 1 confidence-calibration question (confidence-correctness mismatch)
    # =========================================================================
    attempts = db.query(AttemptModel).filter(AttemptModel.session_id == session_id).all()
    # Find mismatch: overconfidence (wrong with conf >= 4) or underconfidence (correct with conf <= 2)
    mismatch_attempts = [
        a for a in attempts
        if (not a.is_correct and a.confidence >= 4) or (a.is_correct and a.confidence <= 2)
    ]
    # Prioritize overconfidence errors
    mismatch_attempts.sort(key=lambda a: (not a.is_correct, a.confidence), reverse=True)

    calibration_concept = None
    calibration_reason = "Confidence calibration: probe targeting conceptual areas prone to metacognitive bias."
    if mismatch_attempts:
        mismatch_att = mismatch_attempts[0]
        q_mismatch = db.query(QuestionModel).filter(QuestionModel.id == mismatch_att.question_id).first()
        if q_mismatch:
            calibration_concept = q_mismatch.concept
            if not mismatch_att.is_correct and mismatch_att.confidence >= 4:
                calibration_reason = f"Confidence calibration: past attempt in '{calibration_concept}' was submitted with high confidence ({mismatch_att.confidence}/5) but incorrect."
            else:
                calibration_reason = f"Confidence calibration: past attempt in '{calibration_concept}' was correct despite low confidence ({mismatch_att.confidence}/5)."

    q5 = find_question_matching(
        concept=calibration_concept,
        preferred_type=QuestionType.STANDARD,
    )
    if q5:
        selected_items.append(
            DailyRevisionQuestionItem(
                question=q5,
                revision_type="confidence_calibration",
                target_misconception_id=None,
                target_misconception_label="Metacognitive Calibration",
                reason_description=calibration_reason,
            )
        )

    # Fill remaining slots up to 5 if needed
    while len(selected_items) < 5:
        fallback_q = find_question_matching()
        if not fallback_q:
            break
        selected_items.append(
            DailyRevisionQuestionItem(
                question=fallback_q,
                revision_type="persistent_misconception",
                target_misconception_id=None,
                target_misconception_label="Adaptive Concept Reinforcement",
                reason_description="Concept reinforcement probe.",
            )
        )

    return DailyRevisionResponse(
        session_id=session_id,
        topic=topic,
        total_questions=len(selected_items),
        estimated_minutes=10,
        questions=selected_items,
    )
