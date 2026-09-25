"""
Question repository for querying and persisting diagnostic items.
"""

import json
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import QuestionModel
from app.engine.models import Question, QuestionType


def model_to_question(model: QuestionModel) -> Question:
    """Converts a QuestionModel ORM entity to a validated Pydantic Question."""
    return Question(
        id=model.id,
        concept=model.concept,
        topic=model.topic,
        prerequisite=model.prerequisite,
        difficulty=model.difficulty,
        question_type=QuestionType(model.question_type) if model.question_type in [e.value for e in QuestionType] else QuestionType.STANDARD,
        question_text=model.question_text,
        options=json.loads(model.options_json),
        correct_option=model.correct_option,
        distractor_misconceptions=json.loads(model.distractor_misconceptions_json or "{}"),
        diagnostic_targets=json.loads(model.diagnostic_targets_json or "[]"),
        verified_misconception_id=model.verified_misconception_id,
        explanation=model.explanation,
    )


def get_question_by_id(db: Session, question_id: str) -> Optional[Question]:
    model = db.query(QuestionModel).filter(QuestionModel.id == question_id).first()
    return model_to_question(model) if model else None


def list_questions(
    db: Session,
    topic: Optional[str] = None,
    concept: Optional[str] = None,
    question_type: Optional[str] = None,
    limit: int = 50,
) -> List[Question]:
    query = db.query(QuestionModel)
    if topic:
        query = query.filter(QuestionModel.topic.ilike(f"%{topic}%"))
    if concept:
        query = query.filter(QuestionModel.concept.ilike(f"%{concept}%"))
    if question_type:
        query = query.filter(QuestionModel.question_type == question_type)

    models = query.limit(limit).all()
    return [model_to_question(m) for m in models]


def save_question(db: Session, question: Question) -> Question:
    existing = db.query(QuestionModel).filter(QuestionModel.id == question.id).first()
    if existing:
        return model_to_question(existing)

    q_type_str = question.question_type.value if hasattr(question.question_type, "value") else str(question.question_type)
    model = QuestionModel(
        id=question.id,
        concept=question.concept,
        topic=question.topic,
        prerequisite=question.prerequisite,
        difficulty=question.difficulty,
        question_type=q_type_str,
        question_text=question.question_text,
        options_json=json.dumps(question.options),
        correct_option=question.correct_option,
        distractor_misconceptions_json=json.dumps(question.distractor_misconceptions),
        diagnostic_targets_json=json.dumps(question.diagnostic_targets),
        verified_misconception_id=question.verified_misconception_id,
        explanation=question.explanation,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model_to_question(model)
