"""
SQLAlchemy ORM models for SQLite session persistence.
"""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.database import Base


class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True, index=True)
    student_id = Column(String(64), default="student_anonymous", index=True)
    topic = Column(String(128), nullable=False)
    mode = Column(String(64), default="adaptive_diagnosis")
    status = Column(String(64), default="in_progress")
    current_question_id = Column(String(64), nullable=True)
    active_misconception_id = Column(String(64), nullable=True)
    mastery_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    attempts = relationship("AttemptModel", back_populates="session", cascade="all, delete-orphan")
    misconception_states = relationship("MisconceptionStateModel", back_populates="session", cascade="all, delete-orphan")
    evidence_records = relationship("EvidenceRecordModel", back_populates="session", cascade="all, delete-orphan")
    remediations = relationship("RemediationRecordModel", back_populates="session", cascade="all, delete-orphan")


class QuestionModel(Base):
    __tablename__ = "questions"

    id = Column(String(64), primary_key=True, index=True)
    concept = Column(String(128), nullable=False, index=True)
    topic = Column(String(128), nullable=False, index=True)
    prerequisite = Column(String(256), nullable=False)
    difficulty = Column(String(32), default="medium")
    question_type = Column(String(32), default="standard")
    question_text = Column(Text, nullable=False)
    options_json = Column(Text, nullable=False)  # JSON-encoded dict of options
    correct_option = Column(String(8), nullable=False)
    distractor_misconceptions_json = Column(Text, default="{}")  # JSON-encoded dict of distractor mappings
    diagnostic_targets_json = Column(Text, default="[]")  # JSON-encoded list of targets
    verified_misconception_id = Column(String(64), nullable=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AttemptModel(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("sessions.id"), nullable=False, index=True)
    question_id = Column(String(64), ForeignKey("questions.id"), nullable=False)
    selected_option = Column(String(8), nullable=False)
    confidence = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    matched_misconception_id = Column(String(64), nullable=True)
    step_index = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("SessionModel", back_populates="attempts")


class MisconceptionStateModel(Base):
    __tablename__ = "misconception_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("sessions.id"), nullable=False, index=True)
    misconception_id = Column(String(64), nullable=False, index=True)
    label = Column(String(128), nullable=False)
    probability = Column(Float, nullable=False)
    status = Column(String(32), default="candidate")  # candidate, confirmed, resolved, persistent
    evidence_count = Column(Integer, default=0)
    revision_priority = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("SessionModel", back_populates="misconception_states")



class EvidenceRecordModel(Base):
    __tablename__ = "evidence_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("sessions.id"), nullable=False, index=True)
    question_id = Column(String(64), nullable=False)
    step_index = Column(Integer, default=1)
    signal = Column(String(64), nullable=False)  # distractor_match, hypothesis_reinforcement, consistency_confirmed
    observation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("SessionModel", back_populates="evidence_records")


class RemediationRecordModel(Base):
    __tablename__ = "remediation_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("sessions.id"), nullable=False, index=True)
    misconception_id = Column(String(64), nullable=False)
    title = Column(String(128), nullable=True)
    remediation_text = Column(Text, nullable=False)
    example = Column(Text, nullable=True)
    key_takeaway = Column(Text, nullable=True)
    source = Column(String(256), nullable=True)
    grounded = Column(Boolean, default=False)
    page_number = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("SessionModel", back_populates="remediations")


class DocumentModel(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(256), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    page_count = Column(Integer, default=1)
    chunk_count = Column(Integer, default=0)
    status = Column(String(32), default="ready")  # processing, ready, failed
    topic = Column(String(128), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)


class ExamSessionModel(Base):
    __tablename__ = "exam_sessions"

    id = Column(String(64), primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("sessions.id"), nullable=False, index=True)
    topic = Column(String(128), nullable=False)
    difficulty = Column(String(32), default="medium")
    question_count = Column(Integer, default=12)
    time_limit_minutes = Column(Integer, default=20)
    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    status = Column(String(32), default="in_progress")  # in_progress, submitted, completed, expired
    score = Column(Integer, nullable=True)
    percentage = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    total_questions = Column(Integer, default=12)
    diagnostic_report_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("SessionModel")
    attempts = relationship(
        "ExamAttemptModel",
        back_populates="exam",
        cascade="all, delete-orphan",
        order_by="ExamAttemptModel.attempt_order.asc()",
    )


class ExamAttemptModel(Base):
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_id = Column(String(64), ForeignKey("exam_sessions.id"), nullable=False, index=True)
    question_id = Column(String(64), ForeignKey("questions.id"), nullable=False)
    attempt_order = Column(Integer, nullable=False)
    selected_option = Column(String(8), nullable=True)
    confidence = Column(Integer, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    matched_misconception_id = Column(String(64), nullable=True)
    marked_for_review = Column(Boolean, default=False)
    time_spent_seconds = Column(Integer, default=0)
    answered_at = Column(DateTime, nullable=True)

    exam = relationship("ExamSessionModel", back_populates="attempts")
    question = relationship("QuestionModel")


