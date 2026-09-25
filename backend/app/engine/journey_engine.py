"""
Deterministic Progress Journey Engine for Misconception Mapper.
Computes a 5-stage timeline: Diagnosed -> Learned -> Practiced -> Verified -> Mastered
dynamically from existing session, state, remediation, and attempt records.
Does NOT duplicate storage.
"""

import json
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.db.models import (
    AttemptModel,
    MisconceptionStateModel,
    QuestionModel,
    RemediationRecordModel,
    SessionModel,
)


def compute_misconception_journey(
    db: Session,
    session_id: str,
    misconception_id: str,
) -> Dict[str, Any]:
    """
    Computes the 5-stage progress journey for a specific misconception in a session:
    1. Diagnosed: Identified through distractor analysis / hypothesis confirmation.
    2. Learned: RAG-grounded remediation card reviewed.
    3. Practiced: Solved subsequent practice questions on this topic.
    4. Verified: Isomorphic counter-example verification question answered.
    5. Mastered: Concept retained stably without recurrence.
    """
    # 1. Fetch Misconception State
    state = (
        db.query(MisconceptionStateModel)
        .filter(
            MisconceptionStateModel.session_id == session_id,
            MisconceptionStateModel.misconception_id == misconception_id,
        )
        .first()
    )

    label = state.label if state else misconception_id.replace("_", " ").title()
    prob = state.probability if state else 0.0
    ev_count = state.evidence_count if state else 0
    misc_status = state.status if state else "candidate"

    # 2. Fetch Remediation Record
    remediation = (
        db.query(RemediationRecordModel)
        .filter(
            RemediationRecordModel.session_id == session_id,
            RemediationRecordModel.misconception_id == misconception_id,
        )
        .order_by(RemediationRecordModel.created_at.desc())
        .first()
    )

    # 3. Fetch Session Attempts & Question details
    attempts = (
        db.query(AttemptModel)
        .filter(AttemptModel.session_id == session_id)
        .order_by(AttemptModel.created_at.asc())
        .all()
    )

    q_ids = set([a.question_id for a in attempts])
    questions_map = {}
    if q_ids:
        q_records = db.query(QuestionModel).filter(QuestionModel.id.in_(q_ids)).all()
        questions_map = {q.id: q for q in q_records}

    # Analyze attempts related to this misconception
    diagnostic_matched_attempts = []
    verification_attempts = []
    practice_attempts = []

    for att in attempts:
        q = questions_map.get(att.question_id)
        is_verification_q = bool(q and q.verified_misconception_id == misconception_id)
        is_distractor_match = bool(att.matched_misconception_id == misconception_id)

        # Check targets
        targets = []
        if q and q.diagnostic_targets_json:
            targets = json.loads(q.diagnostic_targets_json) if isinstance(q.diagnostic_targets_json, str) else q.diagnostic_targets_json

        is_concept_target = misconception_id in targets or (q and q.verified_misconception_id == misconception_id)

        if is_verification_q:
            verification_attempts.append(att)
        elif is_distractor_match:
            diagnostic_matched_attempts.append(att)
        elif is_concept_target:
            practice_attempts.append(att)

    total_attempts_on_concept = len(diagnostic_matched_attempts) + len(practice_attempts) + len(verification_attempts)

    # =========================================================================
    # Stage 1: DIAGNOSED
    # =========================================================================
    has_diagnosed = bool(state or len(diagnostic_matched_attempts) > 0)
    stage1_time = state.updated_at.isoformat() if state and state.updated_at else (
        diagnostic_matched_attempts[0].created_at.isoformat() if diagnostic_matched_attempts else None
    )
    stage1_status = "completed" if has_diagnosed else "current"
    stage1_detail = (
        f"Misconception detected via distractor analysis with {int(prob * 100)}% hypothesis probability ({ev_count} signals logged)."
        if has_diagnosed
        else "Awaiting diagnostic distractor signals to establish cognitive baseline."
    )

    # =========================================================================
    # Stage 2: LEARNED
    # =========================================================================
    has_learned = bool(remediation is not None)
    stage2_time = remediation.created_at.isoformat() if remediation and remediation.created_at else None
    if has_learned:
        stage2_status = "completed"
        grounded_note = "grounded in textbook curriculum" if remediation.grounded else "interactive AI breakdown"
        stage2_detail = f"Reviewed targeted remediation '{remediation.title or 'Conceptual Guide'}' ({grounded_note})."
    elif has_diagnosed:
        stage2_status = "current"
        stage2_detail = "Targeted remediation is ready. Review core principles to correct the faulty mental model."
    else:
        stage2_status = "upcoming"
        stage2_detail = "Unlocks once a candidate misconception is diagnosed."

    # =========================================================================
    # Stage 3: PRACTICED
    # =========================================================================
    # Practiced if student has answered questions touching the concept or session practice attempts exist
    has_practiced = (total_attempts_on_concept >= 1) or (has_learned and len(attempts) >= 1)
    stage3_time = (practice_attempts[-1].created_at.isoformat() if practice_attempts else (attempts[-1].created_at.isoformat() if attempts else None))
    if has_practiced:
        stage3_status = "completed"
        correct_p = sum(1 for a in practice_attempts if a.is_correct)
        stage3_detail = f"Completed {max(len(practice_attempts), 1)} deliberate practice questions ({correct_p} solved correctly)."
    elif has_learned:
        stage3_status = "current"
        stage3_detail = "Reinforce the corrected rule with targeted practice exercises."
    else:
        stage3_status = "upcoming"
        stage3_detail = "Follows completion of the conceptual remediation step."

    # =========================================================================
    # Stage 4: VERIFIED
    # =========================================================================
    # Check if verification challenge succeeded
    verification_passed = (misc_status == "resolved") or any(v.is_correct for v in verification_attempts)
    verification_tested = bool(verification_attempts or misc_status in ["resolved", "persistent"])
    stage4_time = verification_attempts[-1].created_at.isoformat() if verification_attempts else None

    if verification_passed:
        stage4_status = "completed"
        stage4_detail = "Passed isomorphic counter-example challenge proving the gap has been resolved."
    elif verification_tested and misc_status == "persistent":
        stage4_status = "current"
        stage4_detail = "Verification showed the misconception persists under cognitive stress. Additional revision queued."
    elif has_practiced:
        stage4_status = "current"
        stage4_detail = "Ready to test mental model stability with an isomorphic verification question."
    else:
        stage4_status = "upcoming"
        stage4_detail = "Unlocks after deliberate practice is completed."

    # =========================================================================
    # Stage 5: MASTERED
    # =========================================================================
    # Mastered if verification passed and high confidence / retention confirmed
    has_mastered = verification_passed and (
        prob <= 0.25 or
        any(v.is_correct and (v.confidence or 0) >= 4 for v in verification_attempts) or
        (misc_status == "resolved" and has_practiced)
    )
    stage5_time = stage4_time if has_mastered else None

    if has_mastered:
        stage5_status = "completed"
        stage5_detail = "Knowledge gap fully mastered. Concept retained consistently across transfer problems."
    elif verification_passed:
        stage5_status = "current"
        stage5_detail = "Maintain long-term retention via daily 10-minute priority revision intervals."
    else:
        stage5_status = "upcoming"
        stage5_detail = "Achieved when verification is successfully passed and retained over time."

    # Assemble stages list
    stages = [
        {
            "stage_id": "diagnosed",
            "title": "Diagnosed",
            "status": stage1_status,
            "timestamp": stage1_time,
            "detail": stage1_detail,
            "metadata": {"probability": prob, "evidence_count": ev_count},
        },
        {
            "stage_id": "learned",
            "title": "Learned",
            "status": stage2_status,
            "timestamp": stage2_time,
            "detail": stage2_detail,
            "metadata": {"remediation_title": remediation.title if remediation else None},
        },
        {
            "stage_id": "practiced",
            "title": "Practiced",
            "status": stage3_status,
            "timestamp": stage3_time,
            "detail": stage3_detail,
            "metadata": {"practice_count": len(practice_attempts)},
        },
        {
            "stage_id": "verified",
            "title": "Verified",
            "status": stage4_status,
            "timestamp": stage4_time,
            "detail": stage4_detail,
            "metadata": {"verified": verification_passed, "status": misc_status},
        },
        {
            "stage_id": "mastered",
            "title": "Mastered",
            "status": stage5_status,
            "timestamp": stage5_time,
            "detail": stage5_detail,
            "metadata": {"mastered": has_mastered},
        },
    ]

    # Compute current overall stage label and index
    stage_order = ["Diagnosed", "Learned", "Practiced", "Verified", "Mastered"]
    current_idx = 0
    if has_mastered:
        current_idx = 4
    elif verification_passed:
        current_idx = 3
    elif has_practiced:
        current_idx = 2
    elif has_learned:
        current_idx = 1
    elif has_diagnosed:
        current_idx = 0

    current_stage = stage_order[current_idx]

    return {
        "session_id": session_id,
        "misconception_id": misconception_id,
        "misconception_label": label,
        "current_stage": current_stage,
        "current_stage_index": current_idx,
        "stages": stages,
    }
