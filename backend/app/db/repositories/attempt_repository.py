"""
Attempt repository for recording and tracking student answers and confidence.
"""

from typing import List
from sqlalchemy.orm import Session
from app.db.models import AttemptModel


def record_attempt(
    db: Session,
    session_id: str,
    question_id: str,
    selected_option: str,
    confidence: int,
    is_correct: bool,
    matched_misconception_id: str = None,
) -> AttemptModel:
    current_step = (
        db.query(AttemptModel).filter(AttemptModel.session_id == session_id).count() + 1
    )
    attempt = AttemptModel(
        session_id=session_id,
        question_id=question_id,
        selected_option=selected_option,
        confidence=confidence,
        is_correct=is_correct,
        matched_misconception_id=matched_misconception_id,
        step_index=current_step,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def get_session_attempts(db: Session, session_id: str) -> List[AttemptModel]:
    return (
        db.query(AttemptModel)
        .filter(AttemptModel.session_id == session_id)
        .order_by(AttemptModel.step_index.asc())
        .all()
    )
