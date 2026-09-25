"""
Document loader supporting PDF, TXT, and Markdown with page number preservation.
"""

from pathlib import Path
from typing import Any, Dict, List, Tuple
import pypdf


class DocumentLoaderError(Exception):
    pass


class DocumentLoader:
    """
    Extracts text from files while preserving exact page boundaries.
    """

    SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}

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
                page_text = page.extract_text() or ""
                # Strip excessive blank lines but preserve paragraph structure
                cleaned_text = "\n".join(
                    line.strip() for line in page_text.splitlines() if line.strip()
                )
                if cleaned_text:
                    pages.append({
                        "page_number": page_idx + 1,
                        "text": cleaned_text,
                    })

            if not pages:
                raise DocumentLoaderError(f"PDF file '{path.name}' contains no readable text.")

            return pages
        except Exception as e:
            if isinstance(e, DocumentLoaderError):
                raise
            raise DocumentLoaderError(f"Error reading PDF '{path.name}': {str(e)}")

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
                {"page_number": idx + 1, "text": p.strip()}
                for idx, p in enumerate(raw_pages)
                if p.strip()
            ]

        # Single page text
        return [{"page_number": 1, "text": content.strip()}]
