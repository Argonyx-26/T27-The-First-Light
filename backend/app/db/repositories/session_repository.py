"""
Session repository for managing student diagnostic sessions.
"""

import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import SessionModel


def create_session(
    db: Session,
    topic: str,
    student_id: Optional[str] = None,
    mode: str = "adaptive_diagnosis",
) -> SessionModel:
    session_id = f"sess_{uuid.uuid4().hex[:16]}"
    model = SessionModel(
        id=session_id,
        student_id=student_id or f"student_{uuid.uuid4().hex[:8]}",
        topic=topic,
        mode=mode,
        status="in_progress",
        mastery_score=0.0,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


def get_session(db: Session, session_id: str) -> Optional[SessionModel]:
    return db.query(SessionModel).filter(SessionModel.id == session_id).first()


def update_session(
    db: Session,
    session_id: str,
    status: Optional[str] = None,
    current_question_id: Optional[str] = None,
    active_misconception_id: Optional[str] = None,
    mastery_score: Optional[float] = None,
) -> Optional[SessionModel]:
    sess = get_session(db, session_id)
    if not sess:
        return None

    if status is not None:
        sess.status = status
    if current_question_id is not None:
        sess.current_question_id = current_question_id
    if active_misconception_id is not None:
        sess.active_misconception_id = active_misconception_id
    if mastery_score is not None:
        sess.mastery_score = mastery_score

    db.commit()
    db.refresh(sess)
    return sess
