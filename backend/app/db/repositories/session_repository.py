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
    session_length: Optional[int] = None,
) -> SessionModel:
    session_id = f"sess_{uuid.uuid4().hex[:16]}"
    model = SessionModel(
        id=session_id,
        student_id=student_id or f"student_{uuid.uuid4().hex[:8]}",
        topic=topic,
        mode=mode,
        status="in_progress",
        mastery_score=0.0,
        session_length=session_length,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


def get_session(db: Session, session_id: str) -> Optional[SessionModel]:
    return db.query(SessionModel).filter(SessionModel.id == session_id).first()


from datetime import datetime

def list_active_sessions(db: Session, student_id: Optional[str] = None) -> list[SessionModel]:
    query = db.query(SessionModel).filter(
        SessionModel.status != "completed"
    )
    if student_id:
        query = query.filter(SessionModel.student_id == student_id)
    return query.order_by(SessionModel.updated_at.desc()).all()


def list_completed_sessions(db: Session, student_id: Optional[str] = None) -> list[SessionModel]:
    query = db.query(SessionModel).filter(
        SessionModel.status == "completed"
    )
    if student_id:
        query = query.filter(SessionModel.student_id == student_id)
    return query.order_by(SessionModel.completed_at.desc(), SessionModel.updated_at.desc()).all()


def update_session(
    db: Session,
    session_id: str,
    status: Optional[str] = None,
    current_question_id: Optional[str] = None,
    active_misconception_id: Optional[str] = None,
    mastery_score: Optional[float] = None,
    session_length: Optional[int] = None,
    final_score: Optional[float] = None,
    completed_at: Optional[datetime] = None,
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
    if session_length is not None:
        sess.session_length = session_length
    if final_score is not None:
        sess.final_score = final_score
    if completed_at is not None:
        sess.completed_at = completed_at

    db.commit()
    db.refresh(sess)
    return sess

