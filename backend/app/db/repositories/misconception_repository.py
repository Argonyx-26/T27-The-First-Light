"""
Misconception, evidence, and remediation repository.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import EvidenceRecordModel, MisconceptionStateModel, RemediationRecordModel
from app.engine.models import Hypothesis


def save_or_update_hypotheses(
    db: Session,
    session_id: str,
    hypotheses: List[Hypothesis],
    status: str = "candidate",
) -> List[MisconceptionStateModel]:
    results = []
    for h in hypotheses:
        record = (
            db.query(MisconceptionStateModel)
            .filter(
                MisconceptionStateModel.session_id == session_id,
                MisconceptionStateModel.misconception_id == h.id,
            )
            .first()
        )
        if record:
            record.probability = h.probability
            record.evidence_count = h.evidence_count
            record.status = status
        else:
            record = MisconceptionStateModel(
                session_id=session_id,
                misconception_id=h.id,
                label=h.label,
                probability=h.probability,
                status=status,
                evidence_count=h.evidence_count,
            )
            db.add(record)
        results.append(record)

    db.commit()
    return results


def get_session_hypotheses(db: Session, session_id: str) -> List[Hypothesis]:
    records = (
        db.query(MisconceptionStateModel)
        .filter(MisconceptionStateModel.session_id == session_id)
        .all()
    )
    return [
        Hypothesis(
            id=r.misconception_id,
            label=r.label,
            probability=r.probability,
            evidence_count=r.evidence_count,
        )
        for r in records
    ]


def update_misconception_status(
    db: Session,
    session_id: str,
    misconception_id: str,
    status: str,
) -> Optional[MisconceptionStateModel]:
    record = (
        db.query(MisconceptionStateModel)
        .filter(
            MisconceptionStateModel.session_id == session_id,
            MisconceptionStateModel.misconception_id == misconception_id,
        )
        .first()
    )
    if record:
        record.status = status
    else:
        label = misconception_id.replace("_", " ").title()
        record = MisconceptionStateModel(
            session_id=session_id,
            misconception_id=misconception_id,
            label=label,
            probability=1.0 if status == "persistent" else 0.0,
            status=status,
            evidence_count=1,
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record


def record_evidence(
    db: Session,
    session_id: str,
    question_id: str,
    signal: str,
    observation: str,
) -> EvidenceRecordModel:
    current_step = (
        db.query(EvidenceRecordModel)
        .filter(EvidenceRecordModel.session_id == session_id)
        .count()
        + 1
    )
    evidence = EvidenceRecordModel(
        session_id=session_id,
        question_id=question_id,
        step_index=current_step,
        signal=signal,
        observation=observation,
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence


def get_session_evidence(db: Session, session_id: str) -> List[EvidenceRecordModel]:
    return (
        db.query(EvidenceRecordModel)
        .filter(EvidenceRecordModel.session_id == session_id)
        .order_by(EvidenceRecordModel.step_index.asc())
        .all()
    )


def save_remediation(
    db: Session,
    session_id: str,
    misconception_id: str,
    remediation_text: str,
    title: Optional[str] = None,
    example: Optional[str] = None,
    key_takeaway: Optional[str] = None,
    source: Optional[str] = None,
    grounded: bool = False,
    page_number: Optional[int] = None,
) -> RemediationRecordModel:
    record = (
        db.query(RemediationRecordModel)
        .filter(
            RemediationRecordModel.session_id == session_id,
            RemediationRecordModel.misconception_id == misconception_id,
        )
        .first()
    )
    if record:
        record.remediation_text = remediation_text
        record.title = title
        record.example = example
        record.key_takeaway = key_takeaway
        record.source = source
        record.grounded = grounded
        record.page_number = page_number
    else:
        record = RemediationRecordModel(
            session_id=session_id,
            misconception_id=misconception_id,
            title=title,
            remediation_text=remediation_text,
            example=example,
            key_takeaway=key_takeaway,
            source=source,
            grounded=grounded,
            page_number=page_number,
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record


def get_remediation(
    db: Session, session_id: str, misconception_id: str
) -> Optional[RemediationRecordModel]:
    return (
        db.query(RemediationRecordModel)
        .filter(
            RemediationRecordModel.session_id == session_id,
            RemediationRecordModel.misconception_id == misconception_id,
        )
        .first()
    )
