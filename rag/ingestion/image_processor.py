"""
Image processing utility for RAG ingestion: OCR extraction with LLM caption fallback.
Extracts textual content from diagrams, graphs, and figures, or falls back to multimodal captioning.
"""

import io
import logging
import re
from typing import Optional
from PIL import Image
import pytesseract

try:
    from app.llm.client import default_llm_client
except ModuleNotFoundError:
    from backend.app.llm.client import default_llm_client

logger = logging.getLogger("rag.image_processor")

MIN_MEANINGFUL_ALPHANUM = 15
MIN_MEANINGFUL_WORDS = 3


def is_meaningful_ocr(text: str) -> bool:
    """
    Determines if OCR extracted meaningful textual content vs noise/empty symbols.
    """
    if not text or not text.strip():
        return False

    cleaned = text.strip()
    alphanumeric_count = sum(1 for c in cleaned if c.isalnum())
    if alphanumeric_count < MIN_MEANINGFUL_ALPHANUM:
        return False

    words = [w for w in re.split(r"\s+", cleaned) if any(c.isalnum() for c in w)]
    if len(words) < MIN_MEANINGFUL_WORDS:
        return False

    return True


def detect_mime_type(image_bytes: bytes) -> str:
    """Detects MIME type from image bytes header."""
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    elif image_bytes.startswith(b"\xff\xd8"):
        return "image/jpeg"
    elif image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:16]:
        return "image/webp"
    return "image/png"


class ImageProcessor:
    """
    Coordinates OCR and LLM-based caption fallback for images.
    """

    def __init__(self, llm_client=default_llm_client):
        self.llm_client = llm_client

    def process_image(
        self,
        image_bytes: bytes,
        page_number: int,
        filename: str = "image",
    ) -> Optional[str]:
        """
        Processes image bytes:
        1. Attempts OCR via pytesseract.
        2. If meaningful text is found, formats and returns it.
        3. If no meaningful text, invokes LLM client for caption fallback.
        """
        if not image_bytes or len(image_bytes) < 32:
            return None

        # 1. OCR Attempt
        ocr_text: Optional[str] = None
        try:
            image = Image.open(io.BytesIO(image_bytes))
            raw_ocr = pytesseract.image_to_string(image)
            if raw_ocr and is_meaningful_ocr(raw_ocr):
                cleaned_lines = [line.strip() for line in raw_ocr.splitlines() if line.strip()]
                ocr_text = "\n".join(cleaned_lines)
        except Exception as ocr_err:
            logger.debug("OCR extraction failed for %s on page %d: %s", filename, page_number, ocr_err)

        if ocr_text:
            logger.info("OCR successfully extracted text from image on page %d (%d chars)", page_number, len(ocr_text))
            return f"[Diagram Text - Page {page_number}]:\n{ocr_text}"

        # 2. LLM Caption Fallback
        logger.info("No meaningful OCR text found for image on page %d; invoking LLM caption fallback.", page_number)
        caption: Optional[str] = None
        try:
            mime = detect_mime_type(image_bytes)
            prompt = (
                "Describe this diagram or figure clearly and concisely for an educational study guide. "
                "Summarize key labels, arrows, axes, physical principles, equations, and conceptual relationships depicted."
            )
            caption = self.llm_client.describe_image_sync(
                image_bytes=image_bytes,
                mime_type=mime,
                prompt=prompt,
            )
        except Exception as llm_err:
            logger.warning("LLM captioning fallback failed: %s", llm_err)

        if caption and caption.strip():
            return f"[Figure Description - Page {page_number}]:\n{caption.strip()}"

        return f"[Figure - Page {page_number}]: Educational diagram illustrating key concepts and relationships."


default_image_processor = ImageProcessor()
