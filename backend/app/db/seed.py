"""
Database seeding utility.
Loads seed diagnostic questions from JSON into SQLite if questions table is empty.
"""

import json
from sqlalchemy.orm import Session
from app.db.models import QuestionModel
from app.engine.seed_loader import load_seed_questions
from app.db.cohort_seed import seed_cohort_if_needed


def seed_database(db: Session) -> int:
    """
    Seeds initial questions and cohort into the database.
    Returns the count of inserted questions.
    """
    seed_cohort_if_needed(db)

    seed_questions = load_seed_questions()
    existing_ids = {row[0] for row in db.query(QuestionModel.id).all()}
    inserted = 0

    for q in seed_questions:
        if q.id in existing_ids:
            continue
        model = QuestionModel(
            id=q.id,
            concept=q.concept,
            topic=q.topic,
            prerequisite=q.prerequisite,
            difficulty=q.difficulty,
            question_type=q.question_type.value if hasattr(q.question_type, "value") else str(q.question_type),
            question_text=q.question_text,
            options_json=json.dumps(q.options),
            correct_option=q.correct_option,
            distractor_misconceptions_json=json.dumps(q.distractor_misconceptions),
            diagnostic_targets_json=json.dumps(q.diagnostic_targets),
            verified_misconception_id=q.verified_misconception_id,
            explanation=q.explanation,
        )
        db.add(model)
        inserted += 1

    if inserted > 0:
        db.commit()

    return inserted
