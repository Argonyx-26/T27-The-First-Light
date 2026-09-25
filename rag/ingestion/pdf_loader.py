"""
Document loader supporting PDF, TXT, Markdown, and standalone/embedded images with page number preservation.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import pypdf
from rag.ingestion.image_processor import default_image_processor

logger = logging.getLogger("rag.document_loader")


class DocumentLoaderError(Exception):
    pass


class DocumentLoader:
    """
    Extracts text and embedded/standalone images from files while preserving exact page boundaries.
    """

    IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
    SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"} | IMAGE_EXTENSIONS

    @classmethod
    def load_pages(cls, file_path: str | Path) -> List[Dict[str, Any]]:
        path = Path(file_path).resolve()
        if not path.exists():
            raise DocumentLoaderError(f"File not found: {path}")

        ext = path.suffix.lower()
        if ext not in cls.SUPPORTED_EXTENSIONS:
            raise DocumentLoaderError(
                f"Unsupported file format '{ext}'. Supported formats: {', '.join(cls.SUPPORTED_EXTENSIONS)}"
            )

        if ext == ".pdf":
            return cls._load_pdf(path)
        elif ext in cls.IMAGE_EXTENSIONS:
            return cls._load_image(path)
        else:
            return cls._load_text(path)

    @classmethod
    def _load_pdf(cls, path: Path) -> List[Dict[str, Any]]:
        pages: List[Dict[str, Any]] = []
        try:
            reader = pypdf.PdfReader(str(path))
            total_pages = len(reader.pages)
            if total_pages == 0:
                raise DocumentLoaderError(f"PDF file '{path.name}' has 0 pages.")

            for page_idx, page in enumerate(reader.pages):
                page_num = page_idx + 1

                # 1. Text extraction
                page_text = page.extract_text() or ""
                cleaned_text = "\n".join(
                    line.strip() for line in page_text.splitlines() if line.strip()
                )
                if cleaned_text:
                    pages.append({
                        "page_number": page_num,
                        "text": cleaned_text,
                        "source_type": "text",
                    })

                # 2. Embedded image extraction (diagrams, figures, charts)
                try:
                    page_images = getattr(page, "images", [])
                    for img_idx, img_file in enumerate(page_images):
                        img_bytes = getattr(img_file, "data", None)
                        if not img_bytes:
                            continue

                        extracted = default_image_processor.process_image(
                            image_bytes=img_bytes,
                            page_number=page_num,
                            filename=f"{path.stem}_p{page_num}_img{img_idx + 1}",
                        )
                        if extracted:
                            pages.append({
                                "page_number": page_num,
                                "text": extracted,
                                "source_type": "image",
                            })
                except Exception as img_err:
                    logger.warning(
                        "Error extracting images from page %d of '%s': %s",
                        page_num,
                        path.name,
                        img_err,
                    )

            if not pages:
                raise DocumentLoaderError(
                    f"PDF file '{path.name}' contains no readable text or visual content."
                )

            return pages
        except Exception as e:
            if isinstance(e, DocumentLoaderError):
                raise
            raise DocumentLoaderError(f"Error reading PDF '{path.name}': {str(e)}")

    @classmethod
    def _load_image(cls, path: Path) -> List[Dict[str, Any]]:
        """Extracts text or generates descriptive caption for a standalone image."""
        try:
            img_bytes = path.read_bytes()
            if len(img_bytes) == 0:
                raise DocumentLoaderError(f"Image file '{path.name}' is empty.")

            extracted = default_image_processor.process_image(
                image_bytes=img_bytes,
                page_number=1,
                filename=path.name,
            )
            if not extracted:
                raise DocumentLoaderError(
                    f"Could not extract text or generate description for image '{path.name}'."
                )

            return [
                {
                    "page_number": 1,
                    "text": extracted,
                    "source_type": "image",
                }
            ]
        except Exception as e:
            if isinstance(e, DocumentLoaderError):
                raise
            raise DocumentLoaderError(f"Error processing image '{path.name}': {str(e)}")

    @classmethod
    def _load_text(cls, path: Path) -> List[Dict[str, Any]]:
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            try:
                content = path.read_text(encoding="latin-1")
            except Exception as e:
                raise DocumentLoaderError(f"Could not decode text file '{path.name}': {str(e)}")

        if not content.strip():
            raise DocumentLoaderError(f"File '{path.name}' is empty.")

        # Check for form-feed or explicit page breaks
        raw_pages = content.split("\f")
        if len(raw_pages) > 1:
            return [
                {
                    "page_number": idx + 1,
                    "text": p.strip(),
                    "source_type": "text",
                }
                for idx, p in enumerate(raw_pages)
                if p.strip()
            ]

        # Single page text
        return [
            {
                "page_number": 1,
                "text": content.strip(),
                "source_type": "text",
            }
        ]
