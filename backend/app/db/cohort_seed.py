"""
Cohort seeding utility for teacher analytics and student diagnostic records.
Creates realistic student diagnostic trajectories across Newton's Laws, Kinematics,
and Chemical Bonding without inventing fake UI numbers.
"""

from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from app.db.models import (
    AttemptModel,
    EvidenceRecordModel,
    MisconceptionStateModel,
    RemediationRecordModel,
    SessionModel,
)

DEMO_STUDENTS = [
    {
        "student_id": "student_demo_01",
        "name": "Alex Rivera",
        "topic": "Newton's Laws",
        "mastery_score": 0.65,
        "attempts": [
            ("physics_newton_q01", "A", 5, False, "force_acceleration_confusion", 1),
            ("physics_newton_diag_01", "A", 4, False, "force_acceleration_confusion", 2),
            ("physics_newton_verify_01", "B", 4, True, None, 3),
        ],
        "misconceptions": [
            ("force_acceleration_confusion", "Force Required for Motion (Impetus)", 0.76, "resolved", 2),
            ("mass_inertia_resistance", "Inertia as Active Resistance", 0.14, "candidate", 1),
            ("action_reaction_cancellation", "Action-Reaction Cancellation", 0.10, "candidate", 1),
        ],
        "evidence": [
            ("physics_newton_q01", 1, "distractor_match", "Selected continuous force option with confidence 5"),
            ("physics_newton_diag_01", 2, "hypothesis_reinforcement", "Reinforced belief that puck retains force with confidence 4"),
            ("physics_newton_verify_01", 3, "verification_passed", "Correctly identified T = W for constant velocity elevator post-remediation"),
        ],
        "remediation": (
            "force_acceleration_confusion",
            "Separating Velocity from Acceleration",
            "Net force causes changes in velocity (acceleration), not velocity itself. In frictionless space, zero net force maintains motion.",
            "Deep-space coasting requires zero thrust once cruising speed is reached.",
            "No force is needed to sustain constant velocity.",
        ),
    },
    {
        "student_id": "student_demo_02",
        "name": "Bethany Chen",
        "topic": "Newton's Laws",
        "mastery_score": 0.40,
        "attempts": [
            ("physics_newton_q01", "C", 5, False, "mass_inertia_resistance", 1),
            ("physics_newton_diag_02", "C", 4, False, "mass_inertia_resistance", 2),
            ("physics_newton_verify_02", "A", 4, False, "mass_inertia_resistance", 3),
        ],
        "misconceptions": [
            ("mass_inertia_resistance", "Inertia as Active Resistance", 0.74, "persistent", 3),
            ("force_acceleration_confusion", "Force Required for Motion", 0.16, "candidate", 1),
        ],
        "evidence": [
            ("physics_newton_q01", 1, "distractor_match", "Selected force to overcome cosmic inertia with confidence 5"),
            ("physics_newton_diag_02", 2, "hypothesis_reinforcement", "Believed 500kg crate needs internal inertia force with confidence 4"),
            ("physics_newton_verify_02", 3, "verification_failed", "Selected 100x force option for sphere Y; misconception remains persistent"),
        ],
        "remediation": (
            "mass_inertia_resistance",
            "Inertia is Mass, Not a Counter-Force",
            "Inertia does not fight against existing motion; it is merely an object's mass resisting acceleration.",
            "A 10,000 kg asteroid moving through space requires zero energy to keep moving.",
            "Inertia is a property of matter, not an active physical force.",
        ),
    },
    {
        "student_id": "student_demo_03",
        "name": "Carlos Gomez",
        "topic": "Kinematics",
        "mastery_score": 0.88,
        "attempts": [
            ("physics_kinematics_q01", "C", 4, True, None, 1),
            ("physics_kinematics_q02", "B", 5, True, None, 2),
        ],
        "misconceptions": [],
        "evidence": [
            ("physics_kinematics_q01", 1, "correct_reasoning", "Correctly distinguished acceleration from instantaneous zero velocity with confidence 4"),
            ("physics_kinematics_q02", 2, "correct_reasoning", "Accurately derived velocity slope with confidence 5"),
        ],
        "remediation": None,
    },
    {
        "student_id": "student_demo_04",
        "name": "Devon Washington",
        "topic": "Chemical Bonding",
        "mastery_score": 0.52,
        "attempts": [
            ("chem_bonding_q01", "A", 5, False, "bond_breaking_releases_energy", 1),
            ("chem_bonding_diag_01", "A", 4, False, "bond_breaking_releases_energy", 2),
            ("chem_bonding_verify_01", "A", 3, False, "bond_breaking_releases_energy", 3),
        ],
        "misconceptions": [
            ("bond_breaking_releases_energy", "Bond Breaking Releases Energy", 0.78, "persistent", 3),
            ("octet_rule_teleology", "Octet Rule Teleological Drive", 0.12, "candidate", 1),
        ],
        "evidence": [
            ("chem_bonding_q01", 1, "distractor_match", "Asserted ATP bond cleavage inherently releases energy with confidence 5"),
            ("chem_bonding_diag_01", 2, "hypothesis_reinforcement", "Stated breaking H2 requires zero input and emits energy with confidence 4"),
            ("chem_bonding_verify_01", 3, "verification_failed", "Distractor chosen on combustion reaction bond balance; gap persistent"),
        ],
        "remediation": (
            "bond_breaking_releases_energy",
            "Bond Breaking ALWAYS Absorbs Energy",
            "Chemical bonds represent lower potential energy wells. Energy must always be supplied to break bonds; energy is released only when new stronger bonds form.",
            "ATP releases net energy because subsequent hydrolysis products form stronger, lower-energy bonds.",
            "Breaking bonds requires energy; forming bonds releases energy.",
        ),
    },
    {
        "student_id": "student_demo_05",
        "name": "Elena Rostova",
        "topic": "Newton's Laws",
        "mastery_score": 0.92,
        "attempts": [
            ("physics_newton_q01", "B", 5, True, None, 1),
            ("physics_newton_q02", "B", 5, True, None, 2),
        ],
        "misconceptions": [],
        "evidence": [
            ("physics_newton_q01", 1, "correct_reasoning", "Selected zero net force with max confidence 5"),
            ("physics_newton_q02", 2, "correct_reasoning", "Identified exact third law interaction symmetry with confidence 5"),
        ],
        "remediation": None,
    },
    {
        "student_id": "student_demo_06",
        "name": "Farhan Malik",
        "topic": "Kinematics",
        "mastery_score": 0.44,
        "attempts": [
            ("physics_kinematics_q01", "A", 4, False, "velocity_acceleration_conflation", 1),
            ("physics_kinematics_diag_01", "B", 4, False, "velocity_acceleration_conflation", 2),
            ("physics_kinematics_verify_01", "C", 4, False, "velocity_acceleration_conflation", 3),
        ],
        "misconceptions": [
            ("velocity_acceleration_conflation", "Velocity and Acceleration Conflation", 0.72, "persistent", 3),
        ],
        "evidence": [
            ("physics_kinematics_q01", 1, "distractor_match", "Believed acceleration is zero at top of projectile trajectory with confidence 4"),
            ("physics_kinematics_diag_01", 2, "hypothesis_reinforcement", "Equated instantaneous turnaround with vanishing gravitational field"),
        ],
        "remediation": (
            "velocity_acceleration_conflation",
            "Rate of Change vs Instantaneous Value",
            "Acceleration is the rate of change of velocity. A ball at peak height has v = 0 for an instant, but a = -9.8 m/s² continuously.",
            "When a pendulum reaches its maximum swing amplitude, its speed is 0 but restoring acceleration is maximal.",
            "Zero velocity does not mean zero acceleration.",
        ),
    },
    {
        "student_id": "student_demo_07",
        "name": "Grace Hopper",
        "topic": "Chemical Bonding",
        "mastery_score": 0.78,
        "attempts": [
            ("chem_bonding_q01", "B", 4, True, None, 1),
            ("chem_bonding_q02", "B", 5, True, None, 2),
        ],
        "misconceptions": [],
        "evidence": [],
        "remediation": None,
    },
    {
        "student_id": "student_demo_08",
        "name": "Hassan Ali",
        "topic": "Newton's Laws",
        "mastery_score": 0.32,
        "attempts": [
            ("physics_newton_q02", "A", 5, False, "action_reaction_cancellation", 1),
            ("physics_newton_diag_01", "A", 5, False, "force_acceleration_confusion", 2),
            ("physics_newton_verify_01", "A", 4, False, "force_acceleration_confusion", 3),
        ],
        "misconceptions": [
            ("force_acceleration_confusion", "Force Required for Motion", 0.73, "persistent", 2),
            ("action_reaction_cancellation", "Action-Reaction Cancellation", 0.68, "developing", 2),
        ],
        "evidence": [
            ("physics_newton_q02", 1, "distractor_match", "Argued truck exerts greater force on car due to greater momentum with confidence 5"),
            ("physics_newton_diag_01", 2, "distractor_match", "Selected impetus stored force distractor with confidence 5"),
        ],
        "remediation": (
            "force_acceleration_confusion",
            "Force as Instantaneous Interaction",
            "Forces act during interaction; they cannot be stored or possessed by objects.",
            "A hammer delivers an impulse on a nail; once contact ends, no hammer force remains inside the nail.",
            "Forces exist only during contact/interaction.",
        ),
    },
    {
        "student_id": "student_demo_09",
        "name": "Isabella Rossi",
        "topic": "Kinematics",
        "mastery_score": 0.72,
        "attempts": [
            ("physics_kinematics_q01", "A", 3, False, "velocity_acceleration_conflation", 1),
            ("physics_kinematics_diag_01", "A", 4, True, None, 2),
            ("physics_kinematics_verify_01", "A", 5, True, None, 3),
        ],
        "misconceptions": [
            ("velocity_acceleration_conflation", "Velocity and Acceleration Conflation", 0.40, "resolved", 1),
        ],
        "evidence": [
            ("physics_kinematics_q01", 1, "distractor_match", "Initial confusion on apex acceleration with moderate confidence 3"),
            ("physics_kinematics_verify_01", 3, "verification_passed", "Successfully identified continuous g acting on turning vehicle"),
        ],
        "remediation": (
            "velocity_acceleration_conflation",
            "Distinguishing Rate from Magnitude",
            "Distinguish between where an object is, how fast it is moving, and how quickly its speed is changing.",
            "A stopped car pressing the accelerator has speed 0 but high acceleration.",
            "Rate of change is independent of the instantaneous value.",
        ),
    },
    {
        "student_id": "student_demo_10",
        "name": "Jordan Lee",
        "topic": "Chemical Bonding",
        "mastery_score": 0.62,
        "attempts": [
            ("chem_bonding_q01", "A", 4, False, "bond_breaking_releases_energy", 1),
            ("chem_bonding_diag_01", "B", 4, True, None, 2),
            ("chem_bonding_verify_01", "B", 4, True, None, 3),
        ],
        "misconceptions": [
            ("bond_breaking_releases_energy", "Bond Breaking Releases Energy", 0.45, "resolved", 1),
        ],
        "evidence": [
            ("chem_bonding_q01", 1, "distractor_match", "Confused high energy phosphate bonds with release upon lysis"),
            ("chem_bonding_verify_01", 3, "verification_passed", "Calculated endothermic enthalpy correctly"),
        ],
        "remediation": (
            "bond_breaking_releases_energy",
            "Endothermic vs Exothermic Steps",
            "All bond breaking is endothermic (+ΔH). Net release occurs only when product bond formation exceeds reactant breaking.",
            "Combustion of methane requires initial spark energy to break C-H bonds first.",
            "Bonds store stability, not explosive energy.",
        ),
    },
    {
        "student_id": "student_demo_11",
        "name": "Kiran Patel",
        "topic": "Newton's Laws",
        "mastery_score": 0.82,
        "attempts": [
            ("physics_newton_q01", "B", 4, True, None, 1),
            ("physics_newton_q02", "A", 3, False, "action_reaction_cancellation", 2),
            ("physics_newton_verify_01", "B", 5, True, None, 3),
        ],
        "misconceptions": [
            ("action_reaction_cancellation", "Action-Reaction Cancellation", 0.35, "resolved", 1),
        ],
        "evidence": [
            ("physics_newton_q02", 2, "distractor_match", "Brief hesitation regarding truck-car mass disparity with low confidence 3"),
        ],
        "remediation": None,
    },
    {
        "student_id": "student_demo_12",
        "name": "Liam O'Connor",
        "topic": "Kinematics",
        "mastery_score": 0.48,
        "attempts": [
            ("physics_kinematics_q01", "B", 5, False, "velocity_acceleration_conflation", 1),
            ("physics_kinematics_diag_01", "B", 4, False, "velocity_acceleration_conflation", 2),
        ],
        "misconceptions": [
            ("velocity_acceleration_conflation", "Velocity and Acceleration Conflation", 0.70, "developing", 2),
        ],
        "evidence": [
            ("physics_kinematics_q01", 1, "distractor_match", "Assumed apex acceleration points sideways with high confidence 5"),
        ],
        "remediation": None,
    },
]


def seed_cohort_if_needed(db: Session) -> int:
    """
    Populates realistic classroom cohort records if fewer than 5 sessions exist.
    Returns the count of seeded students.
    """
    existing_sessions = db.query(SessionModel).filter(SessionModel.student_id.like("student_demo_%")).count()
    if existing_sessions >= len(DEMO_STUDENTS):
        return 0

    now = datetime.utcnow()
    seeded = 0

    for idx, student in enumerate(DEMO_STUDENTS):
        # Check if already present
        existing = db.query(SessionModel).filter(SessionModel.student_id == student["student_id"]).first()
        if existing:
            continue

        sess_id = f"sess_{student['student_id']}"
        session_time = now - timedelta(hours=(len(DEMO_STUDENTS) - idx) * 3)

        sess_model = SessionModel(
            id=sess_id,
            student_id=student["student_id"],
            topic=student["topic"],
            mode="adaptive_diagnosis",
            status="completed" if student["mastery_score"] >= 0.7 else "in_progress",
            mastery_score=student["mastery_score"],
            created_at=session_time,
            updated_at=session_time + timedelta(minutes=25),
        )
        db.add(sess_model)

        # Attempts
        for attempt in student["attempts"]:
            q_id, opt, conf, is_corr, misc_id, step = attempt
            att_model = AttemptModel(
                session_id=sess_id,
                question_id=q_id,
                selected_option=opt,
                confidence=conf,
                is_correct=is_corr,
                matched_misconception_id=misc_id,
                step_index=step,
                created_at=session_time + timedelta(minutes=step * 4),
            )
            db.add(att_model)

        # Misconception States
        for misc in student["misconceptions"]:
            m_id, lbl, prob, status, ev_count = misc
            m_model = MisconceptionStateModel(
                session_id=sess_id,
                misconception_id=m_id,
                label=lbl,
                probability=prob,
                status=status,
                evidence_count=ev_count,
                updated_at=session_time + timedelta(minutes=18),
            )
            db.add(m_model)

        # Evidence Records
        for ev in student["evidence"]:
            q_id, step, sig, obs = ev
            ev_model = EvidenceRecordModel(
                session_id=sess_id,
                question_id=q_id,
                step_index=step,
                signal=sig,
                observation=obs,
                created_at=session_time + timedelta(minutes=step * 4),
            )
            db.add(ev_model)

        # Remediation
        if student["remediation"]:
            m_id, tit, txt, ex, kw = student["remediation"]
            rem_model = RemediationRecordModel(
                session_id=sess_id,
                misconception_id=m_id,
                title=tit,
                remediation_text=txt,
                example=ex,
                key_takeaway=kw,
                source="Standard Curriculum Benchmark",
                created_at=session_time + timedelta(minutes=15),
            )
            db.add(rem_model)

        seeded += 1

    db.commit()
    return seeded
