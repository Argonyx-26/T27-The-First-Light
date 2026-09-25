"""
Repository for managing Exam Mode sessions and question attempts in SQLite.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import ExamAttemptModel, ExamSessionModel, QuestionModel


def create_exam_session(
    db: Session,
    session_id: str,
    topic: str,
    question_count: int,
    time_limit_minutes: int,
    difficulty: str,
    questions: List[QuestionModel],
) -> ExamSessionModel:
    """
    Creates an exam session record and initializes ordered question attempts.
    """
    exam_id = f"exam_{uuid.uuid4().hex[:12]}"
    exam = ExamSessionModel(
        id=exam_id,
        session_id=session_id,
        topic=topic,
        difficulty=difficulty,
        question_count=len(questions),
        time_limit_minutes=time_limit_minutes,
        started_at=datetime.utcnow(),
        status="in_progress",
        total_questions=len(questions),
    )
    db.add(exam)
    db.flush()

    for idx, q in enumerate(questions):
        attempt = ExamAttemptModel(
            exam_id=exam_id,
            question_id=q.id,
            attempt_order=idx + 1,
            selected_option=None,
            confidence=None,
            is_correct=None,
            matched_misconception_id=None,
            marked_for_review=False,
            time_spent_seconds=0,
        )
        db.add(attempt)

    db.commit()
    db.refresh(exam)
    return exam


def get_exam_session(db: Session, exam_id: str) -> Optional[ExamSessionModel]:
    """
    Retrieves an exam session by ID with its ordered attempts.
    """
    return db.query(ExamSessionModel).filter(ExamSessionModel.id == exam_id).first()


def update_exam_attempt(
    db: Session,
    exam_id: str,
    question_id: str,
    selected_option: Optional[str] = None,
    confidence: Optional[int] = None,
    marked_for_review: Optional[bool] = None,
    time_spent_seconds: Optional[int] = None,
) -> Optional[ExamAttemptModel]:
    """
    Updates student response, confidence, review flag, or time spent for a specific question attempt.
    """
    attempt = (
        db.query(ExamAttemptModel)
        .filter(
            ExamAttemptModel.exam_id == exam_id,
            ExamAttemptModel.question_id == question_id,
        )
        .first()
    )
    if not attempt:
        return None

    if selected_option is not None:
        attempt.selected_option = selected_option.upper().strip()
        attempt.answered_at = datetime.utcnow()
    if confidence is not None:
        attempt.confidence = max(1, min(5, confidence))
    if marked_for_review is not None:
        attempt.marked_for_review = marked_for_review
    if time_spent_seconds is not None:
        attempt.time_spent_seconds = max(0, time_spent_seconds)

    db.commit()
    db.refresh(attempt)
    return attempt


def submit_exam_session(
    db: Session,
    exam_id: str,
    score: int,
    percentage: float,
    accuracy: float,
    diagnostic_report_json: Optional[str] = None,
) -> Optional[ExamSessionModel]:
    """
    Marks an exam session as submitted and records calculated scoring metrics and diagnostic report.
    """
    exam = get_exam_session(db, exam_id)
    if not exam:
        return None

    exam.status = "submitted"
    exam.submitted_at = datetime.utcnow()
    exam.score = score
    exam.percentage = round(percentage, 2)
    exam.accuracy = round(accuracy, 2)
    if diagnostic_report_json is not None:
        exam.diagnostic_report_json = diagnostic_report_json

    db.commit()
    db.refresh(exam)
    return exam


def list_teacher_exams(db: Session) -> List[ExamSessionModel]:
    """
    Returns submitted exams for cohort teacher analytics.
    """
    return (
        db.query(ExamSessionModel)
        .filter(ExamSessionModel.status == "submitted")
        .order_by(ExamSessionModel.submitted_at.desc())
        .all()
    )
