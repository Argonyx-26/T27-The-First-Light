"""
RAG (Retrieval-Augmented Generation) Module for Misconception Mapper.
Grounds personalized misconception remediation in student/teacher course materials.
"""

from rag.schemas import (
    DocumentChunk,
    DocumentMetadata,
    DocumentListResponse,
    GroundedRemediationResponse,
    RAGUploadResponse,
    RetrievedChunk,
    SourceItem,
)
from rag.storage.chroma import ChromaStore, default_chroma_store
from rag.embeddings.provider import EmbeddingProvider, default_embedding_provider
from rag.ingestion.pipeline import IngestionPipeline, default_ingestion_pipeline
from rag.retrieval.retriever import RAGRetriever, default_rag_retriever

__all__ = [
    "DocumentChunk",
    "DocumentMetadata",
    "DocumentListResponse",
    "GroundedRemediationResponse",
    "RAGUploadResponse",
    "RetrievedChunk",
    "SourceItem",
    "ChromaStore",
    "default_chroma_store",
    "EmbeddingProvider",
    "default_embedding_provider",
    "IngestionPipeline",
    "default_ingestion_pipeline",
    "RAGRetriever",
    "default_rag_retriever",
]
