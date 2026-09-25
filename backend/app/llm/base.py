"""
Abstract base class and exceptions for LLM providers.
"""

from abc import ABC, abstractmethod
from typing import Optional
from app.llm.schemas import LLMResponse


class LLMProviderError(Exception):
    """Raised when an LLM provider encounters an error (network, rate limit, parse error)."""
    def __init__(self, provider: str, message: str, status_code: Optional[int] = None):
        super().__init__(f"[{provider}] {message}")
        self.provider = provider
        self.message = message
        self.status_code = status_code


class LLMProvider(ABC):
    """Abstract interface for all LLM providers (Groq, Gemini, Mock)."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the provider (e.g. 'groq', 'gemini', 'mock')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Name of the model in use."""
        pass

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = True,
        temperature: float = 0.2,
    ) -> LLMResponse:
        """
        Executes a completion request against the provider.
        Raises LLMProviderError on failure so fallback logic can activate.
        """
        pass

    async def describe_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
        prompt: Optional[str] = None,
    ) -> str:
        """
        Generates an educational caption/description for an image or diagram.
        """
        return "Educational diagram illustrating conceptual principles."

