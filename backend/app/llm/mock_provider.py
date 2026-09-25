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

    async def describe_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
        prompt: Optional[str] = None,
    ) -> str:
        return "Diagram illustrating conceptual principle and structural elements on the topic."

    def _generate_fixture(self, prompt: str) -> str:
        p_lower = prompt.lower()

        # 0. Diagram / Image Description
        if "describe this diagram" in p_lower or "figure" in p_lower or "diagram" in p_lower:
            return "Diagram illustrating conceptual principle and structural elements on the topic."

        # 1. Self-Consistency Simulation
        if "simulated student" in p_lower or "simulate a student" in p_lower:
            misc_section = ""
            if "misconception to simulate:" in p_lower:
                misc_section = p_lower.split("misconception to simulate:")[1].split("question presented")[0]
            else:
                misc_section = p_lower

            if "inertia" in misc_section or "mass_inertia" in misc_section:
                return json.dumps({
                    "predicted_option": "C",
                    "reasoning_summary": "Simulated student believes inertia acts as a continuous resisting force.",
                    "confidence": 0.85
                })
            elif "action" in misc_section or "reaction" in misc_section or "action_reaction" in misc_section:
                return json.dumps({
                    "predicted_option": "D",
                    "reasoning_summary": "Simulated student believes equal and opposite forces cancel each other out on the same body.",
                    "confidence": 0.80
                })
            elif any(k in misc_section for k in ["search", "array", "dsa", "index", "pointer"]):
                return json.dumps({
                    "predicted_option": "A",
                    "reasoning_summary": "Simulated student believes array indexing can be bypassed without traversal.",
                    "confidence": 0.86
                })
            elif "force_acceleration" in misc_section or ("velocity" in misc_section and "acceleration" in misc_section):
                return json.dumps({
                    "predicted_option": "A",
                    "reasoning_summary": "Simulated student conflates zero velocity with zero acceleration.",
                    "confidence": 0.88
                })
            elif "bond" in misc_section:
                return json.dumps({
                    "predicted_option": "B",
                    "reasoning_summary": "Simulated student believes breaking a bond releases energy like snapping a glowstick.",
                    "confidence": 0.82
                })
            else:
                return json.dumps({
                    "predicted_option": "A",
                    "reasoning_summary": "Simulated student applies common intuitive heuristic.",
                    "confidence": 0.85
                })

        # 2. Targeted Remediation
        if "targeted remediation" in p_lower or "remediation" in p_lower:
            if any(k in p_lower for k in ["search", "array", "list", "dsa", "sort", "pointer", "index"]):
                return json.dumps({
                    "misconception_id": "index_out_of_bounds_confusion",
                    "remediation_title": "Sequential Traversal and Index Verification",
                    "remediation_text": "In an unsorted array or list, each element must be inspected sequentially from index 0 onward. Skipping indices or assuming elements can be matched in O(1) without indexing leads to off-by-one errors and traversal failures.",
                    "example": "To find a book on an unsorted shelf, you inspect each book title one by one from left to right.",
                    "key_takeaway": "Unsorted search requires examining elements sequentially until the target is found.",
                    "check_for_understanding": "If a target is at the final index of an array of length N, how many elements must be examined in linear search?"
                })
            elif "inertia" in p_lower:
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
            elif any(k in p_lower for k in ["force", "motion", "velocity", "accel", "friction"]):
                return json.dumps({
                    "misconception_id": "force_acceleration_confusion",
                    "remediation_title": "Net Force Causes Acceleration, Not Constant Motion",
                    "remediation_text": "In everyday life, objects slow down because friction opposes them, giving the false illusion that force is needed to keep moving. According to Newton's First Law, net force causes a CHANGE in velocity (acceleration), not velocity itself.",
                    "example": "A spacecraft in deep space with zero gravity and zero friction coasts forever with engines off.",
                    "key_takeaway": "If velocity is constant, acceleration is zero, and net force is exactly zero.",
                    "check_for_understanding": "If a car drives down the highway at a steady 60 mph on cruise control, is the net force forward, backward, or zero?"
                })
            else:
                return json.dumps({
                    "misconception_id": "intuitive_misconception",
                    "remediation_title": "Mastering Core Principles",
                    "remediation_text": "Distinguish surface intuition from underlying rigorous definitions. Verify each step rather than relying on ungrounded heuristics.",
                    "example": "Test assumptions with a minimal concrete test case to verify correctness.",
                    "key_takeaway": "Ground your understanding in core definitions and systematic verification.",
                    "check_for_understanding": "What is the key rule that disproves this common intuitive shortcut?"
                })

        # 3. Misconception Hypothesis Proposal
        if "propose 2 to 3 distinct" in p_lower or "hypotheses" in p_lower:
            if any(k in p_lower for k in ["search", "array", "dsa", "sort", "algorithm", "pointer", "tree"]):
                return json.dumps({
                    "hypotheses": [
                        {
                            "id": "index_out_of_bounds_confusion",
                            "label": "Index Boundary Misconception",
                            "initial_probability": 0.45,
                            "predicted_wrong_options": ["A"],
                            "reason": "Student selected option assuming search beyond array bounds."
                        },
                        {
                            "id": "unsorted_binary_search_fallacy",
                            "label": "Unsorted Halving Fallacy",
                            "initial_probability": 0.35,
                            "predicted_wrong_options": ["C"],
                            "reason": "Student assumed binary division works on unsorted collections."
                        },
                        {
                            "id": "careless_reading",
                            "label": "Careless Reading Error",
                            "initial_probability": 0.20,
                            "predicted_wrong_options": ["D"],
                            "reason": "Student misread index bounds or loop termination condition."
                        }
                    ]
                })
            elif "bond" in p_lower or "chem" in p_lower:
                return json.dumps({
                    "hypotheses": [
                        {
                            "id": "ionic_covalent_confusion",
                            "label": "Ionic-Covalent Conflation",
                            "initial_probability": 0.45,
                            "predicted_wrong_options": ["A"],
                            "reason": "Student confused electron transfer with electron sharing."
                        },
                        {
                            "id": "bond_breaking_energy_misconception",
                            "label": "Bond Breaking Energy Fallacy",
                            "initial_probability": 0.35,
                            "predicted_wrong_options": ["C"],
                            "reason": "Student assumed breaking chemical bonds releases energy."
                        },
                        {
                            "id": "calculation_error",
                            "label": "Careless Reading / Slip",
                            "initial_probability": 0.20,
                            "predicted_wrong_options": ["D"],
                            "reason": "Student misread molecular formula or valence count."
                        }
                    ]
                })
            elif any(k in p_lower for k in ["force", "motion", "newton", "velocity"]):
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
            else:
                return json.dumps({
                    "hypotheses": [
                        {
                            "id": "intuitive_misconception",
                            "label": "Common Intuitive Heuristic",
                            "initial_probability": 0.45,
                            "predicted_wrong_options": ["A"],
                            "reason": "Student relied on everyday intuitive heuristics rather than formal rules."
                        },
                        {
                            "id": "rule_overgeneralization",
                            "label": "Rule Overgeneralization",
                            "initial_probability": 0.35,
                            "predicted_wrong_options": ["C"],
                            "reason": "Student applied a specific rule outside its domain of validity."
                        },
                        {
                            "id": "calculation_error",
                            "label": "Careless Misread / Error",
                            "initial_probability": 0.20,
                            "predicted_wrong_options": ["D"],
                            "reason": "Student made a slip in interpreting question details."
                        }
                    ]
                })

        # 4. Question Generation
        if any(k in p_lower for k in ["search", "array", "dsa", "sort", "algorithm", "pointer", "tree", "loop"]):
            return json.dumps({
                "id": "gen_dsa_search_01",
                "concept": "Linear Search",
                "topic": "Data Structures & Algorithms",
                "prerequisite": "Arrays and Sequential Iteration",
                "difficulty": "medium",
                "question_type": "diagnostic",
                "question_text": "In an unsorted array of n elements, what is the worst-case number of comparisons needed by linear search to determine if a target is present?",
                "options": {
                    "A": "O(1) because the first element might match.",
                    "B": "O(n) comparisons because every element must be inspected if the target is absent or at the end.",
                    "C": "O(log n) because the array is halved at each step.",
                    "D": "O(n^2) due to nested element comparisons."
                },
                "correct_option": "B",
                "distractor_misconceptions": {
                    "A": "best_case_worst_case_conflation",
                    "C": "unsorted_binary_search_fallacy",
                    "D": "calculation_error"
                },
                "diagnostic_targets": ["unsorted_binary_search_fallacy", "best_case_worst_case_conflation"],
                "explanation": "In an unsorted array, linear search must examine every element sequentially in the worst case, taking O(n) comparisons."
            })
        elif "bond" in p_lower or "chem" in p_lower:
            return json.dumps({
                "id": "gen_chem_bond_01",
                "concept": "Covalent Bonding",
                "topic": "Chemical Bonding",
                "prerequisite": "Atomic Structure and Valence Electrons",
                "difficulty": "medium",
                "question_type": "diagnostic",
                "question_text": "What fundamental interaction stabilizes a covalent bond between two nonmetal atoms?",
                "options": {
                    "A": "Complete transfer of electrons creating oppositely charged ions.",
                    "B": "Mutual electrostatic attraction between the shared pair of valence electrons and both positively charged nuclei.",
                    "C": "Gravitational attraction between atomic masses.",
                    "D": "Release of nuclear binding energy."
                },
                "correct_option": "B",
                "distractor_misconceptions": {
                    "A": "ionic_covalent_confusion",
                    "C": "calculation_error",
                    "D": "nuclear_chemical_confusion"
                },
                "diagnostic_targets": ["ionic_covalent_confusion"],
                "explanation": "Covalent bonds are stabilized by sharing valence electron pairs attracted to both positive nuclei."
            })
        elif any(k in p_lower for k in ["force", "motion", "newton"]):
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
        else:
            return json.dumps({
                "id": "gen_diagnostic_q01",
                "concept": "Core Principle",
                "topic": "General Assessment",
                "prerequisite": "Foundational Concepts",
                "difficulty": "medium",
                "question_type": "diagnostic",
                "question_text": "Which of the following statements represents the scientifically verified rule rather than an intuitive shortcut?",
                "options": {
                    "A": "Intuitive heuristic that applies only under narrow conditions.",
                    "B": "The verified fundamental principle applying unconditionally.",
                    "C": "Common misconception based on surface appearance.",
                    "D": "Careless misapplication of an inverse relationship."
                },
                "correct_option": "B",
                "distractor_misconceptions": {
                    "A": "rule_overgeneralization",
                    "C": "intuitive_misconception",
                    "D": "causal_inversion"
                },
                "diagnostic_targets": ["intuitive_misconception", "rule_overgeneralization"],
                "explanation": "Option B states the verified principle. The other options reflect common cognitive shortcuts."
            })
