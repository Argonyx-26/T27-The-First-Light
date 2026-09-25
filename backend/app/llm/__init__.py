"""
LLM abstraction and service layer.
"""

from app.llm.base import LLMProvider, LLMProviderError
from app.llm.client import LLMClient
from app.llm.groq_provider import GroqProvider
from app.llm.gemini_provider import GeminiProvider
from app.llm.mock_provider import MockProvider
from app.llm.schemas import (
    HypothesisProposalResponse,
    LLMResponse,
    ProposedHypothesis,
    RemediationResponse,
    SelfConsistencyResponse,
)
from app.llm.self_consistency_service import (
    SelfConsistencyEvaluation,
    SelfConsistencyService,
)

__all__ = [
    "LLMProvider",
    "LLMProviderError",
    "OpenRouterPoolProvider",
    "MockProvider",
    "LLMClient",
    "LLMResponse",
    "ProposedHypothesis",
    "HypothesisProposalResponse",
    "RemediationResponse",
    "SelfConsistencyResponse",
    "SelfConsistencyService",
    "SelfConsistencyEvaluation",
]
