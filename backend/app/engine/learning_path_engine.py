"""
Deterministic Learning Path & Advanced Calibration Trend Engine.
Builds the prescriptive layer over the existing Knowledge Map and computes
longitudinal calibration trajectories across student sessions.
"""

from datetime import datetime
import json
import math
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.db.models import (
    AttemptModel,
    MisconceptionStateModel,
    QuestionModel,
    SessionModel,
)
from app.engine.revision_engine import compute_revision_priorities


# Curated prerequisite dependency graph across foundational STEM concepts
CONCEPT_DEPENDENCIES: Dict[str, List[str]] = {
    "force_acceleration_confusion": [
        "Newton's Second Law",
        "Apparent Weight & Elevators",
        "Circular Dynamics",
        "Work-Energy Theorem",
    ],
    "mass_inertia_resistance": [
        "Newton's Second Law",
        "Momentum Conservation",
        "Gravitational Fields",
    ],
    "action_reaction_cancellation": [
        "Free Body Diagrams",
        "Equilibrium Systems",
        "Tension and Pulleys",
    ],
    "gravitational_mass_fallacy": [
        "Newton's Second Law",
        "Orbital Mechanics",
        "Universal Gravitation",
    ],
    "impetus_fallacy": [
        "Newton's First Law",
        "Newton's Second Law",
        "Projectile Motion",
        "Circular Dynamics",
    ],
    "acceleration_velocity_conflation": [
        "Kinematics in Two Dimensions",
        "Harmonic Motion",
        "Rotational Dynamics",
    ],
    "centrifugal_force_reality": [
        "Non-inertial Frames",
        "Planetary Orbits",
        "Rotational Motion",
    ],
    "energy_creation_fallacy": [
        "Thermodynamics",
        "Chemical Energetics",
        "Conservation Laws",
    ],
    "high_energy_bond_fallacy": [
        "ATP Hydrolysis",
        "Cellular Respiration",
        "Bioenergetics",
    ],
    "exothermic_bond_confusion": [
        "Thermochemistry",
        "Enthalpy Cycles",
        "Chemical Equilibrium",
    ],
}


def count_dependent_concepts_blocked(db: Session, misconception_id: str, concept_name: str) -> int:
    """
    Computes count of downstream concepts and curriculum questions that depend
    on this concept/misconception as a prerequisite.
    """
    base_deps = CONCEPT_DEPENDENCIES.get(misconception_id, [])
    dep_set = set(base_deps)

    # Also query QuestionModel for questions where prerequisite references this concept
    clean_concept = concept_name.lower().replace("'", "").replace("-", " ")
    clean_misc = misconception_id.lower().replace("_", " ")

    questions = db.query(QuestionModel).all()
    for q in questions:
        prereq = (q.prerequisite or "").lower().replace("'", "").replace("-", " ")
        if clean_concept in prereq or clean_misc in prereq:
            if q.concept != concept_name:
                dep_set.add(q.concept)

    return max(len(dep_set), 1)


def compute_learning_path(db: Session, session_id: str) -> Dict[str, Any]:
    """
    Computes the prescriptive Learning Path on top of the Knowledge Map.
    Deterministically ranks persistent/developing concepts by:
    1. dependent_concepts_blocked (descending)
    2. revision_priority (descending)
    Sets recommended_next: True on the top-ranked node(s).
    """
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        return {"topic": "Unknown", "nodes": [], "edges": []}

    # Ensure revision_priorities are computed
    compute_revision_priorities(db, session_id)

    hyps_records = (
        db.query(MisconceptionStateModel)
        .filter(MisconceptionStateModel.session_id == session_id)
        .all()
    )

    clean_topic = session.topic.lower().replace(" ", "_").replace("'", "")
    concept_node_id = f"concept_{clean_topic}"

    # Evaluate each misconception node
    misc_node_items: List[Dict[str, Any]] = []
    for r in hyps_records:
        blocked = count_dependent_concepts_blocked(db, r.misconception_id, session.topic)
        prio = r.revision_priority or 0.0

        misc_node_items.append({
            "id": f"node_{r.misconception_id}",
            "misconception_id": r.misconception_id,
            "type": "misconception",
            "label": r.label,
            "status": r.status,
            "parent_concept_id": concept_node_id,
            "dependent_concepts_blocked": blocked,
            "revision_priority": prio,
            "recommended_next": False,
            "next_recommended_rank": None,
        })

    # Filter candidates for recommendation: persistent or developing concepts
    candidates = [
        item for item in misc_node_items
        if item["status"] in ["persistent", "developing", "candidate"]
    ]

    # Deterministic sort: (dependent_concepts_blocked DESC, revision_priority DESC, misconception_id ASC)
    candidates.sort(
        key=lambda x: (
            -x["dependent_concepts_blocked"],
            -x["revision_priority"],
            x["misconception_id"],
        )
    )

    # Assign ranks
    for rank, item in enumerate(candidates, start=1):
        item["next_recommended_rank"] = rank
        if rank == 1:
            item["recommended_next"] = True

    # Assemble root concept node
    root_node = {
        "id": concept_node_id,
        "type": "concept",
        "label": session.topic,
        "status": "mastered" if session.mastery_score >= 0.75 else "developing",
        "mastery_score": session.mastery_score,
        "recommended_next": False,
        "next_recommended_rank": None,
        "dependent_concepts_blocked": sum(m["dependent_concepts_blocked"] for m in misc_node_items),
        "revision_priority": 0.0,
    }

    nodes = [root_node] + misc_node_items
    edges = [
        {
            "source": concept_node_id,
            "target": m["id"],
            "type": "sub_gap",
        }
        for m in misc_node_items
    ]

    return {
        "topic": session.topic,
        "nodes": nodes,
        "edges": edges,
    }


def compute_calibration_trend(db: Session, student_id: str) -> Dict[str, Any]:
    """
    Computes calibration index and accuracy points per session across student history
    to visualize the longitudinal calibration trajectory.
    """
    sessions = (
        db.query(SessionModel)
        .filter((SessionModel.student_id == student_id) | (SessionModel.id == student_id))
        .order_by(SessionModel.created_at.asc())
        .all()
    )

    actual_student_id = student_id
    if sessions:
        actual_student_id = sessions[0].student_id or student_id
        if actual_student_id != student_id:
            extra_sessions = (
                db.query(SessionModel)
                .filter(SessionModel.student_id == actual_student_id)
                .order_by(SessionModel.created_at.asc())
                .all()
            )
            for s in extra_sessions:
                if s not in sessions:
                    sessions.append(s)
            sessions.sort(key=lambda s: s.created_at)

    points: List[Dict[str, Any]] = []

    for idx, sess in enumerate(sessions, start=1):
        attempts = (
            db.query(AttemptModel)
            .filter(AttemptModel.session_id == sess.id)
            .all()
        )
        if not attempts:
            continue

        total_q = len(attempts)
        correct_count = sum(1 for a in attempts if a.is_correct)
        acc = round(correct_count / total_q, 2)

        high_conf_attempts = [a for a in attempts if (a.confidence or 3) >= 4]
        high_conf_total = len(high_conf_attempts)
        high_conf_correct = sum(1 for a in high_conf_attempts if a.is_correct)
        high_conf_acc = round(high_conf_correct / high_conf_total, 2) if high_conf_total > 0 else acc

        # Calibration formula: 1 - |avg_conf_normalized - actual_accuracy|
        avg_conf = sum((a.confidence or 3) for a in attempts) / total_q
        normalized_conf = avg_conf / 5.0
        calib_index = round(max(0.0, 1.0 - abs(normalized_conf - acc)), 2)

        date_str = sess.created_at.strftime("%b %d") if sess.created_at else f"S{idx}"
        points.append({
            "session_id": sess.id,
            "label": f"Session {idx}",
            "date": date_str,
            "topic": sess.topic,
            "calibration_index": calib_index,
            "accuracy": acc,
            "high_confidence_accuracy": high_conf_acc,
            "total_attempts": total_q,
        })

    return {
        "student_id": actual_student_id,
        "points": points,
    }
