"""
Deterministic mock LLM provider for local development, testing, and offline execution.
Produces structured, pedagogically sound responses without requiring API keys or network calls.
"""

import json
from typing import Optional
from app.llm.base import LLMProvider
from app.llm.schemas import LLMResponse


class MockProvider(LLMProvider):
    """
    Mock LLM provider that recognizes keywords in prompts and returns valid JSON payloads.
    Guarantees deterministic, instant responses.
    """

    def __init__(self, model_name: str = "mock-deterministic-v1"):
        self._model_name = model_name

    @property
    def name(self) -> str:
        return "mock"

    @property
    def model_name(self) -> str:
        return self._model_name

    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = True,
        temperature: float = 0.2,
    ) -> LLMResponse:
        content = self._generate_fixture(prompt)
        return LLMResponse(
            provider=self.name,
            model=self.model_name,
            content=content,
            usage={"prompt_tokens": 100, "completion_tokens": 100, "total_tokens": 200},
        )

    def _generate_fixture(self, prompt: str) -> str:
        p_lower = prompt.lower()

        # 1. Self-Consistency Simulation
        if "simulated student" in p_lower or "simulate a student" in p_lower:
            if "inertia" in p_lower:
                return json.dumps({
                    "predicted_option": "C",
                    "reasoning_summary": "Simulated student believes inertia acts as a continuous resisting force.",
                    "confidence": 0.85
                })
            elif "action" in p_lower or "reaction" in p_lower:
                return json.dumps({
                    "predicted_option": "D",
                    "reasoning_summary": "Simulated student believes equal and opposite forces cancel each other out on the same body.",
                    "confidence": 0.80
                })
            elif "velocity" in p_lower and "acceleration" in p_lower:
                return json.dumps({
                    "predicted_option": "A",
                    "reasoning_summary": "Simulated student conflates zero velocity with zero acceleration.",
                    "confidence": 0.88
                })
            elif "bond" in p_lower:
                return json.dumps({
                    "predicted_option": "B",
                    "reasoning_summary": "Simulated student believes breaking a bond releases energy like snapping a glowstick.",
                    "confidence": 0.82
                })
            else:
                # Default for force_acceleration_confusion: picks Option A or D (force required for motion)
                return json.dumps({
                    "predicted_option": "A",
                    "reasoning_summary": "Simulated student believes active continuous force is required to sustain velocity.",
                    "confidence": 0.90
                })

        # 2. Targeted Remediation
        if "targeted remediation" in p_lower or "remediation" in p_lower:
            if "inertia" in p_lower:
                return json.dumps({
                    "misconception_id": "mass_inertia_resistance",
                    "remediation_title": "Inertia Is Mass, Not an Opposing Force",
                    "remediation_text": "Inertia is not a force that pushes back against motion. It is simply the measure of an object's mass and its tendency to maintain its current velocity. In deep space, once an object moves, no force opposes it and no force is needed to sustain it.",
                    "example": "Consider gliding on completely frictionless ice: once you are pushed, you don't feel a force fighting your motion; you simply keep moving freely.",
                    "key_takeaway": "Inertia is a property of matter (mass), not an active opposing force.",
                    "check_for_understanding": "If a 1,000 kg satellite drifts in deep space at 10 m/s, how much force is required to keep it moving at 10 m/s?"
                })
            elif "bond" in p_lower:
                return json.dumps({
                    "misconception_id": "bond_breaking_releases_energy",
                    "remediation_title": "Breaking Bonds ALWAYS Requires Energy",
                    "remediation_text": "It is a very common misconception that breaking chemical bonds releases energy. In reality, breaking chemical bonds ALWAYS absorbs energy (endothermic). Energy is released when NEW, stronger bonds are formed (exothermic).",
                    "example": "Think of pulling two strong magnets apart: you have to pull hard (input energy) to separate them.",
                    "key_takeaway": "Bond breaking absorbs energy; bond formation releases energy.",
                    "check_for_understanding": "Why does ATP hydrolysis release energy if breaking the phosphate bond requires energy?"
                })
            else:
                return json.dumps({
                    "misconception_id": "force_acceleration_confusion",
                    "remediation_title": "Net Force Causes Acceleration, Not Constant Motion",
                    "remediation_text": "In everyday life, objects slow down because friction opposes them, giving the false illusion that force is needed to keep moving. According to Newton's First Law, net force causes a CHANGE in velocity (acceleration), not velocity itself.",
                    "example": "A spacecraft in deep space with zero gravity and zero friction coasts forever with engines off.",
                    "key_takeaway": "If velocity is constant, acceleration is zero, and net force is exactly zero.",
                    "check_for_understanding": "If a car drives down the highway at a steady 60 mph on cruise control, is the net force forward, backward, or zero?"
                })

        # 3. Misconception Hypothesis Proposal
        if "propose 2 to 3 distinct" in p_lower or "hypotheses" in p_lower:
            return json.dumps({
                "hypotheses": [
                    {
                        "id": "force_acceleration_confusion",
                        "label": "Force-Acceleration Conflation",
                        "initial_probability": 0.45,
                        "predicted_wrong_options": ["A"],
                        "reason": "Student selected continuous forward force option, indicating belief in impetus theory."
                    },
                    {
                        "id": "mass_inertia_resistance",
                        "label": "Inertia as Active Resistance",
                        "initial_probability": 0.35,
                        "predicted_wrong_options": ["C"],
                        "reason": "Student selected the distractor invoking inertia as a force to overcome."
                    },
                    {
                        "id": "calculation_error",
                        "label": "Careless Misread / Calculation Error",
                        "initial_probability": 0.20,
                        "predicted_wrong_options": ["D"],
                        "reason": "Student may have conflated units or misread constant velocity."
                    }
                ]
            })

        # 4. Question Generation
        return json.dumps({
            "id": "gen_physics_newton_01",
            "concept": "Newton's First Law",
            "topic": "Newton's Laws",
            "prerequisite": "Inertia and Force Concepts",
            "difficulty": "medium",
            "question_type": "diagnostic",
            "question_text": "A curling stone slides along flat, frictionless ice at constant velocity. What net force is required to keep it moving?",
            "options": {
                "A": "A forward force equal to its mass times speed.",
                "B": "Zero net force.",
                "C": "A small forward force to balance its inertia.",
                "D": "A backward force of momentum."
            },
            "correct_option": "B",
            "distractor_misconceptions": {
                "A": "force_acceleration_confusion",
                "C": "mass_inertia_resistance",
                "D": "calculation_error"
            },
            "diagnostic_targets": ["force_acceleration_confusion", "mass_inertia_resistance"],
            "explanation": "At constant velocity on frictionless ice, acceleration is zero so net force is zero."
        })
