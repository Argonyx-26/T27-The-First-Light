"""
Resilient LLM client orchestrating primary (Groq) and fallback (Gemini) providers,
with transparent Mock fallback for testing and offline development.
"""

import json
import logging
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.engine.models import Question
from app.llm.base import LLMProvider, LLMProviderError
from app.llm.gemini_provider import GeminiProvider
from app.llm.groq_provider import GroqProvider
from app.llm.mock_provider import MockProvider
from app.llm.prompts import (
    SYSTEM_PROMPT_HYPOTHESIS_GENERATION,
    SYSTEM_PROMPT_QUESTION_GENERATION,
    SYSTEM_PROMPT_REMEDIATION,
    SYSTEM_PROMPT_SELF_CONSISTENCY,
    USER_PROMPT_HYPOTHESIS_GENERATION,
    USER_PROMPT_QUESTION_GENERATION,
    USER_PROMPT_REMEDIATION,
    USER_PROMPT_SELF_CONSISTENCY,
)
from app.llm.schemas import (
    HypothesisProposalResponse,
    LLMResponse,
    RemediationResponse,
    SelfConsistencyResponse,
)

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Unified client providing resilient LLM completion with automatic failover.
    Groq (Primary) -> Gemini (Fallback) -> Mock (if configured or keys absent).
    """

    def __init__(
        self,
        primary_provider: Optional[LLMProvider] = None,
        fallback_provider: Optional[LLMProvider] = None,
        mock_provider: Optional[LLMProvider] = None,
        force_mode: Optional[str] = None,
    ):
        self.mode = force_mode or settings.LLM_MODE

        self.mock_provider = mock_provider or MockProvider()
        self.primary_provider = primary_provider or GroqProvider(
            api_key=settings.GROQ_API_KEY,
            model=settings.GROQ_MODEL,
        )
        self.fallback_provider = fallback_provider or GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
        )

    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = True,
        temperature: float = 0.2,
    ) -> LLMResponse:
        """
        Executes completion with fallback strategy.
        If mode is 'mock', directly executes via MockProvider.
        """
        if self.mode == "mock":
            return await self.mock_provider.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                json_mode=json_mode,
                temperature=temperature,
            )

        # 1. Try Primary Provider (Groq)
        try:
            return await self.primary_provider.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                json_mode=json_mode,
                temperature=temperature,
            )
        except LLMProviderError as primary_err:
            logger.warning(
                "Primary LLM provider '%s' failed: %s. Initiating fallback...",
                self.primary_provider.name,
                primary_err.message,
            )

        # 2. Try Fallback Provider (Gemini)
        try:
            return await self.fallback_provider.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                json_mode=json_mode,
                temperature=temperature,
            )
        except LLMProviderError as fallback_err:
            logger.error(
                "Fallback LLM provider '%s' also failed: %s.",
                self.fallback_provider.name,
                fallback_err.message,
            )
            # If in development or demo resilience is needed, fallback to mock if neither provider responded
            if settings.ENVIRONMENT == "development" or not settings.GROQ_API_KEY:
                logger.info("Engaging MockProvider as ultimate development fallback.")
                return await self.mock_provider.complete(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    json_mode=json_mode,
                    temperature=temperature,
                )
            raise LLMProviderError(
                "llm_client",
                f"All LLM providers failed. Primary: {self.primary_provider.name}, Fallback: {self.fallback_provider.name}",
                status_code=502,
            )

    async def propose_hypotheses(
        self,
        question: Question,
        selected_option: str,
        confidence: int,
    ) -> HypothesisProposalResponse:
        """Calls LLM to propose candidate misconception hypotheses for an incorrect student answer."""
        formatted_options = "\n".join(f"{k}: {v}" for k, v in question.options.items())
        prompt = USER_PROMPT_HYPOTHESIS_GENERATION.format(
            topic=question.topic,
            concept=question.concept,
            question_text=question.question_text,
            options_formatted=formatted_options,
            correct_option=question.correct_option,
            selected_option=selected_option,
            confidence=confidence,
        )

        response = await self.complete(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT_HYPOTHESIS_GENERATION,
            json_mode=True,
        )

        try:
            data = json.loads(response.content)
            return HypothesisProposalResponse(**data)
        except Exception as exc:
            logger.error("Failed to parse hypothesis proposal JSON: %s. Response content: %s", exc, response.content)
            # Return deterministic fallback hypothesis
            return HypothesisProposalResponse(
                hypotheses=[
                    {
                        "id": question.distractor_misconceptions.get(selected_option, "conceptual_misunderstanding"),
                        "label": "Identified Distractor Misconception",
                        "initial_probability": 0.5,
                        "predicted_wrong_options": [selected_option],
                        "reason": f"Selected distractor {selected_option} maps to this misconception.",
                    },
                    {
                        "id": "careless_or_calculation_error",
                        "label": "Calculation or Reading Error",
                        "initial_probability": 0.25,
                        "predicted_wrong_options": [],
                        "reason": "Alternative hypothesis that student misread or calculated incorrectly.",
                    },
                    {
                        "id": "formula_confusion",
                        "label": "Formula Confusion",
                        "initial_probability": 0.25,
                        "predicted_wrong_options": [],
                        "reason": "Alternative hypothesis that student applied the incorrect formula.",
                    }
                ]
            )

    async def generate_remediation(
        self,
        misconception_id: str,
        misconception_label: str,
        misconception_description: str,
        concept: str,
        evidence_summary: str,
        reference_material: Optional[str] = None,
    ) -> RemediationResponse:
        """Calls LLM to synthesize targeted conceptual remediation."""
        prompt = USER_PROMPT_REMEDIATION.format(
            concept=concept,
            misconception_id=misconception_id,
            misconception_label=misconception_label,
            misconception_description=misconception_description or misconception_label,
            evidence_summary=evidence_summary,
            reference_context=f"\n{reference_material}\n" if reference_material else "",
        )

        response = await self.complete(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT_REMEDIATION,
            json_mode=True,
        )

        try:
            data = json.loads(response.content)
            return RemediationResponse(**data)
        except Exception as exc:
            logger.error("Failed to parse remediation JSON: %s. Falling back to structured response.", exc)
            return RemediationResponse(
                misconception_id=misconception_id,
                remediation_title=f"Understanding {concept}",
                remediation_text=(
                    f"You have been focusing on {misconception_label}. In science, remember that "
                    f"net force causes acceleration (F=ma), not constant velocity."
                ),
                key_takeaway="If velocity is constant, acceleration is zero, and net force is zero.",
                check_for_understanding="Does an object moving at 100 m/s in frictionless space need a continuous force?",
            )

    async def simulate_student(
        self,
        misconception_id: str,
        misconception_label: str,
        misconception_description: str,
        question: Question,
    ) -> SelfConsistencyResponse:
        """
        Runs the self-consistency simulation:
        Prompts LLM to roleplay a student holding this specific misconception and predict their option.
        """
        formatted_options = "\n".join(f"{k}: {v}" for k, v in question.options.items())
        prompt = USER_PROMPT_SELF_CONSISTENCY.format(
            misconception_id=misconception_id,
            misconception_label=misconception_label,
            misconception_description=misconception_description or misconception_label,
            question_text=question.question_text,
            options_formatted=formatted_options,
        )

        response = await self.complete(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT_SELF_CONSISTENCY,
            json_mode=True,
        )

        try:
            data = json.loads(response.content)
            return SelfConsistencyResponse(**data)
        except Exception as exc:
            logger.error("Failed to parse self-consistency JSON: %s", exc)
            # Default to distractor matching this misconception if present
            predicted = "A"
            for opt, misc in question.distractor_misconceptions.items():
                if misc == misconception_id:
                    predicted = opt
                    break
            return SelfConsistencyResponse(
                predicted_option=predicted,
                reasoning_summary=f"Simulated student applying {misconception_label} chooses {predicted}.",
                confidence=0.8,
            )


# Default client instance
default_llm_client = LLMClient()
