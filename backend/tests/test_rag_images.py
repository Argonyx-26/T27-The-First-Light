"""
Tests for multimodal RAG ingestion: embedded PDF images, standalone images, OCR extraction, and caption fallback.
"""

import io
import pytest
from PIL import Image, ImageDraw
import pypdf

from rag.ingestion.image_processor import (
    ImageProcessor,
    is_meaningful_ocr,
    detect_mime_type,
)
from rag.ingestion.pdf_loader import DocumentLoader
from rag.ingestion.chunker import PageAwareChunker
from rag.ingestion.pipeline import IngestionPipeline
from rag.retrieval.retriever import RAGRetriever
from rag.storage.chroma import ChromaStore
from app.llm.client import LLMClient
from app.llm.mock_provider import MockProvider


@pytest.fixture
def mock_llm_client():
    return LLMClient(mock_provider=MockProvider(), force_mode="mock")


@pytest.fixture
def image_processor(mock_llm_client):
    return ImageProcessor(llm_client=mock_llm_client)


@pytest.fixture
def ephemeral_chroma():
    return ChromaStore(persist_directory=None, collection_name="test_multimodal_rag")


def create_test_image_with_text(text: str = "Newton First Law: Inertia depends on mass.") -> bytes:
    """Creates a PNG image with readable text for OCR verification."""
    img = Image.new("RGB", (450, 100), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((20, 35), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_test_diagram_without_text() -> bytes:
    """Creates a PNG diagram with geometrical vector arrows and no textual characters."""
    img = Image.new("RGB", (300, 300), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([50, 50, 250, 250], outline=(0, 0, 0), width=4)
    d.line([150, 50, 150, 20], fill=(255, 0, 0), width=3)  # Normal force
    d.line([150, 250, 150, 280], fill=(0, 0, 255), width=3)  # Gravitational force
    d.line([250, 150, 290, 150], fill=(0, 200, 0), width=3)  # Applied force
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_pdf_with_text_and_embedded_diagram(tmp_path) -> str:
    """Creates a PDF file with textual explanations and an embedded vector diagram."""
    pdf_path = tmp_path / "physics_lecture_diagram.pdf"

    # 1. Create a Pillow image for the diagram
    diagram_bytes = create_test_diagram_without_text()
    img = Image.open(io.BytesIO(diagram_bytes))

    # 2. Save image directly as PDF
    img.save(str(pdf_path), format="PDF")

    return str(pdf_path)


def test_is_meaningful_ocr_heuristics():
    assert is_meaningful_ocr("Newton First Law of Motion and Inertia") is True
    assert is_meaningful_ocr("Breaking chemical bonds requires energy input") is True
    assert is_meaningful_ocr("") is False
    assert is_meaningful_ocr("   ") is False
    assert is_meaningful_ocr(".-|_") is False
    assert is_meaningful_ocr("Hi") is False  # too short (< 15 chars)


def test_detect_mime_type():
    png_bytes = create_test_image_with_text("Test")
    assert detect_mime_type(png_bytes) == "image/png"


def test_image_processor_ocr_extraction(image_processor):
    img_bytes = create_test_image_with_text("Newton First Law of Motion: Inertia is property of mass.")
    result = image_processor.process_image(
        image_bytes=img_bytes,
        page_number=3,
        filename="newton_diagram.png",
    )
    assert result is not None
    assert "[Diagram Text - Page 3]:" in result
    assert "Newton" in result or "First" in result or "Inertia" in result


def test_image_processor_caption_fallback_on_diagram(image_processor):
    img_bytes = create_test_diagram_without_text()
    result = image_processor.process_image(
        image_bytes=img_bytes,
        page_number=12,
        filename="free_body_diagram.png",
    )
    assert result is not None
    # No text in diagram -> fallback to LLM caption
    assert "[Figure Description - Page 12]:" in result
    assert "Diagram" in result or "vectors" in result or "Newton" in result


def test_standalone_image_loading_and_chunking(tmp_path, image_processor):
    img_path = tmp_path / "orbit_diagram.png"
    img_path.write_bytes(create_test_diagram_without_text())

    pages = DocumentLoader.load_pages(img_path)
    assert len(pages) == 1
    assert pages[0]["page_number"] == 1
    assert pages[0]["source_type"] == "image"
    assert "Figure Description" in pages[0]["text"] or "Figure" in pages[0]["text"]

    chunker = PageAwareChunker()
    chunks = chunker.chunk_pages(
        document_id="doc_orbit",
        document_name="orbit_diagram.png",
        pages=pages,
        topic="Gravitation",
    )
    assert len(chunks) >= 1
    assert chunks[0].metadata.get("source_type") == "image"
    assert "_img" in chunks[0].chunk_id


def test_pdf_with_embedded_diagram_end_to_end(tmp_path, ephemeral_chroma, mock_llm_client):
    pdf_file = create_pdf_with_text_and_embedded_diagram(tmp_path)

    # 1. DocumentLoader extracts page content including the embedded image
    pages = DocumentLoader.load_pages(pdf_file)
    assert len(pages) >= 1
    # Check that image was processed
    has_image_chunk = any(p.get("source_type") == "image" for p in pages)
    assert has_image_chunk is True

    # 2. Ingest through IngestionPipeline
    pipeline = IngestionPipeline(
        storage_dir=str(tmp_path / "uploads"),
        chroma_store=ephemeral_chroma,
    )
    with open(pdf_file, "rb") as f:
        response = pipeline.ingest_file(
            file_bytes=f.read(),
            filename="physics_lecture_diagram.pdf",
            topic="Newton's Laws",
        )

    assert response.success is True
    assert response.chunk_count >= 1

    # 3. Retrieve chunks with RAGRetriever
    retriever = RAGRetriever(
        chroma_store=ephemeral_chroma,
        min_relevance_threshold=0.0,
    )
    sources, raw_chunks = retriever.retrieve_for_misconception(
        concept="Newton's Laws",
        misconception_label="Force is required to sustain velocity",
        top_k=3,
    )
    assert len(sources) > 0
    # At least one source should be tagged with source_type == "image"
    image_sources = [s for s in sources if s.source_type == "image"]
    assert len(image_sources) > 0

    # 4. Formatted context check
    context_str = retriever.format_context_for_prompt(raw_chunks)
    assert "(Figure, Page 1)" in context_str
