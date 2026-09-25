"""
Utility for loading and validating seed diagnostic questions from JSON.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional
from app.engine.models import Question


def get_seed_data_path() -> Path:
    """Returns the absolute path to seed_questions.json."""
    return Path(__file__).resolve().parent.parent.parent / "data" / "seed_questions.json"


def load_seed_questions(filepath: Optional[Path] = None) -> List[Question]:
    """Loads and validates all seed questions from JSON file."""
    path = filepath or get_seed_data_path()
    if not path.exists():
        raise FileNotFoundError(f"Seed questions file not found at: {path}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    questions_raw = data.get("questions", [])
    return [Question(**q) for q in questions_raw]


def get_seed_questions_by_topic(topic: str, filepath: Optional[Path] = None) -> List[Question]:
    """Filters seed questions by broad topic."""
    questions = load_seed_questions(filepath)
    clean_topic = topic.strip().lower()
    return [q for q in questions if q.topic.strip().lower() == clean_topic]


def get_seed_questions_by_concept(concept: str, filepath: Optional[Path] = None) -> List[Question]:
    """Filters seed questions by specific concept."""
    questions = load_seed_questions(filepath)
    clean_concept = concept.strip().lower()
    return [q for q in questions if q.concept.strip().lower() == clean_concept]


def get_question_by_id(question_id: str, filepath: Optional[Path] = None) -> Optional[Question]:
    """Retrieves a single question by its unique ID."""
    questions = load_seed_questions(filepath)
    for q in questions:
        if q.id == question_id:
            return q
    return None
