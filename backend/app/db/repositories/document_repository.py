"""
Repository for managing RAG reference document metadata in SQLite.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import DocumentModel


def create_document(
    db: Session,
    document_id: str,
    filename: str,
    file_path: str,
    file_size_bytes: int,
    page_count: int = 1,
    chunk_count: int = 0,
    status: str = "ready",
    topic: Optional[str] = None,
    preview_text: Optional[str] = None,
) -> DocumentModel:
    doc = DocumentModel(
        id=document_id,
        filename=filename,
        file_path=file_path,
        file_size_bytes=file_size_bytes,
        page_count=page_count,
        chunk_count=chunk_count,
        status=status,
        topic=topic,
        preview_text=preview_text,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_document(db: Session, document_id: str) -> Optional[DocumentModel]:
    return db.query(DocumentModel).filter(DocumentModel.id == document_id).first()


def list_documents(db: Session, topic: Optional[str] = None) -> List[DocumentModel]:
    query = db.query(DocumentModel)
    if topic:
        query = query.filter(DocumentModel.topic == topic)
    return query.order_by(DocumentModel.uploaded_at.desc()).all()


def delete_document(db: Session, document_id: str) -> bool:
    doc = get_document(db, document_id)
    if not doc:
        return False
    db.delete(doc)
    db.commit()
    return True


def update_document_status(
    db: Session,
    document_id: str,
    status: str,
    chunk_count: Optional[int] = None,
) -> Optional[DocumentModel]:
    doc = get_document(db, document_id)
    if not doc:
        return None
    doc.status = status
    if chunk_count is not None:
        doc.chunk_count = chunk_count
    db.commit()
    db.refresh(doc)
    return doc
