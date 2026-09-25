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

    # Seed initial RAG reference document if documents table is empty
    _seed_rag_documents_if_needed(db)

    return inserted


def _seed_rag_documents_if_needed(db: Session):
    try:
        from app.db.repositories import document_repository as doc_repo
    except ImportError:
        from backend.app.db.repositories import document_repository as doc_repo

    if doc_repo.list_documents(db):
        return

    import logging
    from pathlib import Path
    logger = logging.getLogger(__name__)

    possible_paths = [
        Path(__file__).resolve().parent.parent / "data" / "sample_physics_notes.pdf",
        Path.cwd() / "backend" / "data" / "sample_physics_notes.pdf",
        Path.cwd() / "data" / "sample_physics_notes.pdf",
    ]
    pdf_path = next((p for p in possible_paths if p.is_file()), None)
    if not pdf_path:
        return

    try:
        try:
            from rag.ingestion.pipeline import default_ingestion_pipeline
        except ModuleNotFoundError:
            import sys
            root_dir = Path(__file__).resolve().parent.parent.parent.parent
            if str(root_dir) not in sys.path:
                sys.path.insert(0, str(root_dir))
            from rag.ingestion.pipeline import default_ingestion_pipeline

        with open(pdf_path, "rb") as f:
            default_ingestion_pipeline.ingest_file(
                file_obj=f,
                filename="sample_physics_notes.pdf",
                db=db,
                topic="Newton's Laws",
            )
            logger.info("Successfully auto-seeded sample physics notes into RAG knowledge base.")
    except Exception as exc:
        logger.warning("Could not auto-seed sample physics notes into RAG: %s", exc)
