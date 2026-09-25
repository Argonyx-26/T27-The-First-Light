"""
Document ingestion pipeline coordinating extraction, chunking, embedding, vector storage, and metadata persistence.
"""

import os
import uuid
from pathlib import Path
from typing import Any, Optional
from sqlalchemy.orm import Session

from rag.embeddings.provider import default_embedding_provider
from rag.ingestion.chunker import PageAwareChunker
from rag.ingestion.pdf_loader import DocumentLoader, DocumentLoaderError
from rag.schemas import RAGUploadResponse
from rag.storage.chroma import default_chroma_store

try:
    from app.db.repositories import document_repository as doc_repo
except ModuleNotFoundError:
    from backend.app.db.repositories import document_repository as doc_repo

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


class IngestionError(Exception):
    pass


class IngestionPipeline:
    """
    Coordinates end-to-end document ingestion.
    """

    def __init__(
        self,
        storage_dir: str = "./rag/storage/uploads",
        chroma_store=default_chroma_store,
        embedding_provider=default_embedding_provider,
    ):
        self.storage_dir = Path(storage_dir).resolve()
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.chroma_store = chroma_store
        self.embedding_provider = embedding_provider
        self.chunker = PageAwareChunker()

    def ingest_file(
        self,
        file_bytes: Optional[bytes] = None,
        filename: str = "uploaded_doc",
        db: Optional[Session] = None,
        topic: Optional[str] = None,
        file_obj: Optional[Any] = None,
    ) -> RAGUploadResponse:
        # Handle file_obj if provided
        if file_bytes is None and file_obj is not None:
            if hasattr(file_obj, "read"):
                file_bytes = file_obj.read()
            elif isinstance(file_obj, bytes):
                file_bytes = file_obj

        if file_bytes is None:
            raise IngestionError("No file bytes provided.")

        # 1. Validation
        if len(file_bytes) == 0:
            raise IngestionError("Uploaded file is empty.")

        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise IngestionError(
                f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
            )

        ext = Path(filename).suffix.lower()
        if ext not in DocumentLoader.SUPPORTED_EXTENSIONS:
            raise IngestionError(
                f"Unsupported format '{ext}'. Supported formats: {', '.join(DocumentLoader.SUPPORTED_EXTENSIONS)}"
            )

        # 2. Save file
        doc_id = f"doc_{uuid.uuid4().hex[:12]}"
        safe_filename = Path(filename).name
        target_path = self.storage_dir / f"{doc_id}_{safe_filename}"
        target_path.write_bytes(file_bytes)

        try:
            # 3. Text Extraction with Page Boundaries
            pages = DocumentLoader.load_pages(target_path)
            page_count = len(pages)

            # 4. Chunking
            chunks = self.chunker.chunk_pages(
                document_id=doc_id,
                document_name=safe_filename,
                pages=pages,
                topic=topic,
            )
            chunk_count = len(chunks)

            if chunk_count == 0:
                raise IngestionError(f"No usable text chunks could be extracted from '{safe_filename}'.")

            # 5. Embedding
            texts_to_embed = [c.text for c in chunks]
            embeddings = self.embedding_provider.embed_texts(texts_to_embed)

            # 6. ChromaDB Storage
            self.chroma_store.add_chunks(chunks=chunks, embeddings=embeddings)

            # 7. SQLite Metadata Persistence
            if db is not None:
                doc_repo.create_document(
                    db=db,
                    document_id=doc_id,
                    filename=safe_filename,
                    file_path=str(target_path),
                    file_size_bytes=len(file_bytes),
                    page_count=page_count,
                    chunk_count=chunk_count,
                    status="ready",
                    topic=topic,
                )

            return RAGUploadResponse(
                success=True,
                document_id=doc_id,
                filename=safe_filename,
                page_count=page_count,
                chunk_count=chunk_count,
                message=f"Successfully ingested '{safe_filename}' ({page_count} pages, {chunk_count} chunks).",
            )
        except Exception as e:
            # Clean up target file on failure
            if target_path.exists():
                try:
                    target_path.unlink()
                except Exception:
                    pass
            if isinstance(e, IngestionError):
                raise
            raise IngestionError(f"Ingestion failed for '{safe_filename}': {str(e)}")

    def delete_document(self, document_id: str, db: Session) -> bool:
        # Delete from ChromaDB
        self.chroma_store.delete_document(document_id)

        # Delete local file if present
        doc_record = doc_repo.get_document(db, document_id)
        if doc_record and doc_record.file_path:
            p = Path(doc_record.file_path)
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass

        # Delete from SQLite
        return doc_repo.delete_document(db, document_id)


default_ingestion_pipeline = IngestionPipeline()
