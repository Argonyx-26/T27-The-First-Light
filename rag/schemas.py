"""
Data schemas and contracts for the RAG-grounded remediation module.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    page_number: int
    text: str
    topic: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SourceItem(BaseModel):
    document_id: str
    document_name: str
    page_number: int
    chunk_id: str
    relevance_score: float
    excerpt: str
    source_type: str = "text"



class RetrievedChunk(BaseModel):
    chunk: DocumentChunk
    similarity_score: float
    distance: float


class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    file_size_bytes: int
    page_count: int
    chunk_count: int
    status: str
    topic: Optional[str] = None
    uploaded_at: str


class DocumentListResponse(BaseModel):
    total_documents: int
    documents: List[DocumentMetadata]


class RAGUploadResponse(BaseModel):
    success: bool = True
    document_id: str
    filename: str
    page_count: int
    chunk_count: int
    status: str = "ready"
    message: str

    @property
    def id(self) -> str:
        return self.document_id


class GroundedRemediationResponse(BaseModel):
    misconception_id: str
    remediation_title: Optional[str] = None
    remediation_text: str
    example: Optional[str] = None
    key_takeaway: Optional[str] = None
    check_for_understanding: Optional[str] = None
    grounded: bool
    grounded_source: Optional[str] = None
    sources: List[SourceItem] = Field(default_factory=list)
