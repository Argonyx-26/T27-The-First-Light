"""
Deterministic Self-Consistency Verification Service.
Enforces the core architectural rule:
    The LLM simulates the student's predicted choice;
    The Python application code compares simulation vs actual student choice
    and decides whether to confirm or continue diagnosis.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from app.engine.models import Hypothesis, Question
from app.llm.client import LLMClient, default_llm_client
from app.llm.schemas import SelfConsistencyResponse


class SelfConsistencyEvaluation(BaseModel):
    """Result of deterministic self-consistency evaluation."""
    is_consistent: bool = Field(..., description="Whether predicted student option matches observed student option")
    simulated_option: str = Field(..., description="Option predicted by simulated student agent")
    actual_student_option: str = Field(..., description="Actual option selected by the real student")
    simulated_reasoning: str = Field(..., description="The rationale produced by the simulated student")
    confidence_adjustment: float = Field(..., description="Numeric adjustment (+0.10 for match, -0.15 for mismatch)")
    application_decision: str = Field(..., description="'CONFIRMED' or 'CONTINUE_DIAGNOSIS'")
    summary: str = Field(..., description="Human-readable explanation of self-consistency verification")


class SelfConsistencyService:
    """
    Evaluates candidate hypotheses by running LLM simulations and deterministically
    comparing predicted behavior with observed behavioral traces.
    """

    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm_client = llm_client or default_llm_client

    async def verify_hypothesis_consistency(
        self,
        candidate: Hypothesis,
        question: Question,
        actual_student_option: str,
    ) -> SelfConsistencyEvaluation:
        """
        Runs self-consistency simulation:
        1. Calls LLM to simulate a student holding ONLY candidate hypothesis.
        2. LLM returns predicted_option.
        3. Application code (Python) compares simulated_option vs actual_student_option.
        4. Application decides confirmation or continuation.
        """
        simulation_result: SelfConsistencyResponse = await self.llm_client.simulate_student(
            misconception_id=candidate.id,
            misconception_label=candidate.label,
            misconception_description=candidate.description or candidate.label,
            question=question,
        )

        simulated_option = simulation_result.predicted_option.strip().upper()
        clean_actual_option = actual_student_option.strip().upper()

        # Deterministic comparison owned completely by application code:
        is_consistent = (simulated_option == clean_actual_option)

        if is_consistent:
            confidence_adjustment = +0.10
            application_decision = "CONFIRMED"
            summary = (
                f"Self-consistency simulation confirmed hypothesis '{candidate.label}'. "
                f"Simulated student predicted Option {simulated_option}, which perfectly matches "
                f"the real student's actual response. Rationale: {simulation_result.reasoning_summary}"
            )
        else:
            confidence_adjustment = -0.15
            application_decision = "CONTINUE_DIAGNOSIS"
            summary = (
                f"Self-consistency simulation diverged for '{candidate.label}'. "
                f"Simulated student predicted Option {simulated_option}, but the real student selected "
                f"Option {clean_actual_option}. Rationale: {simulation_result.reasoning_summary}. "
                f"Confidence dampened; continuing diagnosis."
            )

        return SelfConsistencyEvaluation(
            is_consistent=is_consistent,
            simulated_option=simulated_option,
            actual_student_option=clean_actual_option,
            simulated_reasoning=simulation_result.reasoning_summary,
            confidence_adjustment=confidence_adjustment,
            application_decision=application_decision,
            summary=summary,
        )
