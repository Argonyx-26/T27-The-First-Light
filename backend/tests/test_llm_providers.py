"""
Unit tests for LLM provider abstraction, fallback failover, and structured responses.
All tests use mocks and do NOT make real external API calls.
"""

from unittest.mock import AsyncMock, patch
import pytest
from app.llm.base import LLMProvider, LLMProviderError
from app.llm.client import LLMClient
from app.llm.openrouter_provider import OpenRouterPoolProvider
from app.llm.mock_provider import MockProvider
from app.llm.schemas import (
    HypothesisProposalResponse,
    LLMResponse,
    RemediationResponse,
    SelfConsistencyResponse,
)


class DummyFailingProvider(LLMProvider):
    def __init__(self, name: str):
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    @property
    def model_name(self) -> str:
        return "dummy-fail"

    async def complete(self, prompt: str, system_prompt=None, json_mode=True, temperature=0.2):
        raise LLMProviderError(self._name, "Simulated network failure", status_code=503)


class DummySuccessProvider(LLMProvider):
    def __init__(self, name: str, response_content: str):
        self._name = name
        self._content = response_content

    @property
    def name(self) -> str:
        return self._name

    @property
    def model_name(self) -> str:
        return "dummy-success"

    async def complete(self, prompt: str, system_prompt=None, json_mode=True, temperature=0.2):
        return LLMResponse(
            provider=self._name,
            model=self.model_name,
            content=self._content,
        )


@pytest.mark.anyio
async def test_mock_provider_returns_deterministic_responses():
    provider = MockProvider()
    response = await provider.complete("simulate a student with inertia misconception")
    assert response.provider == "mock"
    assert "predicted_option" in response.content

    data = SelfConsistencyResponse.model_validate_json(response.content)
    assert data.predicted_option in ("A", "B", "C", "D")


@pytest.mark.anyio
async def test_openrouter_success_path():
    success_json = '{"hypotheses": [{"id": "h1", "label": "L1", "initial_probability": 0.5, "predicted_wrong_options": ["A"], "reason": "R"}]}'
    
    client = LLMClient(force_mode="live")
    client.diagnostic_provider = DummySuccessProvider("openrouter", success_json)
    
    result = await client.complete("test prompt")

    assert result.provider == "openrouter"
    assert result.content == success_json


@pytest.mark.anyio
async def test_openrouter_failure_triggers_mock_fallback():
    client = LLMClient(force_mode="live")
    client.diagnostic_provider = DummyFailingProvider("openrouter")
    
    with patch("app.core.config.settings.ENVIRONMENT", "development"):
        result = await client.complete("test prompt")
        assert result.provider == "mock"


@pytest.mark.anyio
async def test_openrouter_failure_in_strict_mode():
    client = LLMClient(force_mode="live")
    client.diagnostic_provider = DummyFailingProvider("openrouter")

    # In production mode with keys, should raise error instead of fallback to mock
    with patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch("app.core.config.settings.OPEN_ROUTER_API", "real_key"):
        with pytest.raises(LLMProviderError) as exc_info:
            await client.complete("test prompt")
        assert exc_info.value.status_code == 503


@pytest.mark.anyio
async def test_structured_response_schemas_validation():
    # Hypothesis Proposal Schema
    raw_hyp_json = {
        "hypotheses": [
            {
                "id": "force_accel",
                "label": "Force Acceleration Confusion",
                "initial_probability": 0.6,
                "predicted_wrong_options": ["A"],
                "reason": "Believes force causes speed.",
            }
        ]
    }
    proposal = HypothesisProposalResponse(**raw_hyp_json)
    assert len(proposal.hypotheses) == 1
    assert proposal.hypotheses[0].id == "force_accel"

    # Remediation Schema
    raw_rem_json = {
        "misconception_id": "force_accel",
        "remediation_title": "Understanding Acceleration",
        "remediation_text": "Net force produces acceleration, not velocity.",
        "key_takeaway": "Constant speed = zero net force.",
    }
    remediation = RemediationResponse(**raw_rem_json)
    assert remediation.misconception_id == "force_accel"

    # Self-Consistency Schema
    raw_sc_json = {
        "predicted_option": "A",
        "reasoning_summary": "Simulated student believes thrust is needed.",
        "confidence": 0.85,
    }
    sc = SelfConsistencyResponse(**raw_sc_json)
    assert sc.predicted_option == "A"
    assert sc.confidence == 0.85
