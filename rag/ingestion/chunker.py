"""
Page-aware text chunking utility for RAG ingestion.
Ensures every chunk is traceable to its exact document and page number.
"""

from typing import Any, Dict, List, Optional
from rag.schemas import DocumentChunk


class PageAwareChunker:
    """
    Chunks document pages while preserving page boundaries and generating unique chunk IDs.
    """

    def __init__(
        self,
        chunk_size: int = 600,
        chunk_overlap: int = 100,
        min_chunk_size: int = 50,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size

    def chunk_pages(
        self,
        document_id: str,
        document_name: str,
        pages: List[Dict[str, Any]],
        topic: Optional[str] = None,
    ) -> List[DocumentChunk]:
        all_chunks: List[DocumentChunk] = []
        page_source_counts: Dict[tuple, int] = {}

        for page in pages:
            page_num = page["page_number"]
            page_text = page["text"]
            source_type = page.get("source_type", "text")

            key = (page_num, source_type)
            start_index = page_source_counts.get(key, 0) + 1

            page_chunks = self._chunk_text(
                text=page_text,
                page_number=page_num,
                document_id=document_id,
                document_name=document_name,
                topic=topic,
                source_type=source_type,
                start_index=start_index,
            )
            page_source_counts[key] = start_index + len(page_chunks) - 1
            all_chunks.extend(page_chunks)

        return all_chunks

    def _chunk_text(
        self,
        text: str,
        page_number: int,
        document_id: str,
        document_name: str,
        topic: Optional[str] = None,
        source_type: str = "text",
        start_index: int = 1,
    ) -> List[DocumentChunk]:
        chunks: List[DocumentChunk] = []
        text = text.strip()
        if not text:
            return []

        prefix = "img" if source_type == "image" else "c"

        # If text is small enough, keep as single chunk
        if len(text) <= self.chunk_size:
            chunk_id = f"{document_id}_p{page_number}_{prefix}{start_index}"
            return [
                DocumentChunk(
                    chunk_id=chunk_id,
                    document_id=document_id,
                    document_name=document_name,
                    page_number=page_number,
                    text=text,
                    topic=topic,
                    metadata={"source_type": source_type},
                )
            ]

        # Break text using sliding window with word boundaries
        start = 0
        chunk_idx = start_index
        text_len = len(text)

        while start < text_len:
            end = min(start + self.chunk_size, text_len)

            # If not at the end of text, find last space or newline to avoid cutting words
            if end < text_len:
                last_space = text.rfind(" ", start, end)
                last_newline = text.rfind("\n", start, end)
                split_point = max(last_space, last_newline)
                if split_point > start + (self.chunk_size // 2):
                    end = split_point

            chunk_content = text[start:end].strip()

            if len(chunk_content) >= self.min_chunk_size:
                chunk_id = f"{document_id}_p{page_number}_{prefix}{chunk_idx}"
                chunks.append(
                    DocumentChunk(
                        chunk_id=chunk_id,
                        document_id=document_id,
                        document_name=document_name,
                        page_number=page_number,
                        text=chunk_content,
                        topic=topic,
                        metadata={"source_type": source_type},
                    )
                )
                chunk_idx += 1

            if end >= text_len:
                break

            # Slide start forward by (chunk length - overlap)
            start = max(start + 1, end - self.chunk_overlap)

        return chunks
