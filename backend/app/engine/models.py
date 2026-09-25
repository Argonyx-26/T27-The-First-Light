"""
Misconception Mapper (MM) - Core Engine Data Models.
Deterministic schemas for hypotheses, questions, diagnostic scoring, and verification.
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class MisconceptionCategory(str, Enum):
    CONCEPTUAL = "conceptual"
    CALCULATION = "calculation"
    CARELESS_READING = "careless_reading"
    FORMULA_CONFUSION = "formula_confusion"


class QuestionType(str, Enum):
    STANDARD = "standard"
    DIAGNOSTIC = "diagnostic"
    VERIFICATION = "verification"


class VerificationStatus(str, Enum):
    RESOLVED = "RESOLVED"
    PERSISTENT = "PERSISTENT"


class Hypothesis(BaseModel):
    """
    Represents an active or candidate misconception hypothesis.
    Probabilities across a set of competing hypotheses must sum to ~1.0.
    """
    id: str = Field(..., description="Unique identifier for the misconception hypothesis")
    label: str = Field(..., description="Short descriptive title of the misconception")
    probability: float = Field(..., description="Current probability belief (0.0 to 1.0)")
    description: Optional[str] = Field(None, description="Detailed pedagogical description of the misconception")
    category: MisconceptionCategory = Field(
        default=MisconceptionCategory.CONCEPTUAL,
        description="Category of student error"
    )
    evidence_count: int = Field(default=0, ge=0, description="Number of observed evidence pieces supporting this hypothesis")

    @field_validator("probability")
    @classmethod
    def validate_probability(cls, v: float) -> float:
        if v < 0.0 or v > 1.0:
            raise ValueError(f"Hypothesis probability must be between 0.0 and 1.0, got {v}")
        return v


class Question(BaseModel):
    """
    Diagnostic or standard assessment question.
    Each distractor maps directly to an underlying misconception or error pattern.
    """
    id: str = Field(..., description="Unique question identifier")
    concept: str = Field(..., description="Specific target concept (e.g. 'Newton First Law')")
    topic: str = Field(..., description="Broad subject area (e.g. 'Newton's Laws')")
    prerequisite: str = Field(..., description="Prerequisite knowledge required")
    difficulty: str = Field(..., description="Question difficulty: easy, medium, hard")
    question_text: str = Field(..., description="The problem prompt presented to the student")
    options: Dict[str, str] = Field(..., description="Keyed options, e.g. {'A': '...', 'B': '...'}")
    correct_option: str = Field(..., description="The key of the correct option ('A', 'B', 'C', or 'D')")
    distractor_misconceptions: Dict[str, str] = Field(
        default_factory=dict,
        description="Mapping from incorrect option keys to associated misconception hypothesis IDs"
    )
    question_type: QuestionType = Field(default=QuestionType.STANDARD, description="Role of this question")
    diagnostic_targets: List[str] = Field(
        default_factory=list,
        description="Hypothesis IDs that this question is specifically designed to distinguish"
    )
    verified_misconception_id: Optional[str] = Field(
        default=None,
        description="For verification questions, the specific misconception being re-tested"
    )
    explanation: Optional[str] = Field(None, description="Pedagogical explanation of the solution")

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: Dict[str, str]) -> Dict[str, str]:
        if len(v) < 2:
            raise ValueError("A question must have at least 2 options")
        return v

    @field_validator("correct_option")
    @classmethod
    def validate_correct_option(cls, v: str, info) -> str:
        options = info.data.get("options", {})
        if options and v not in options:
            raise ValueError(f"Correct option '{v}' must be one of the available options: {list(options.keys())}")
        return v


class ConfirmationResult(BaseModel):
    """
    Result of evaluating whether a dominant hypothesis satisfies confirmation rules.
    Eligibility means candidate is ready for LLM self-consistency simulation,
    NOT that the misconception is unconditionally confirmed.
    """
    is_eligible: bool = Field(..., description="True if probability > 0.60 and gap >= 0.20")
    top_hypothesis: Optional[Hypothesis] = Field(None, description="The leading hypothesis candidate")
    runner_up_hypothesis: Optional[Hypothesis] = Field(None, description="The second leading hypothesis")
    probability_gap: float = Field(default=0.0, description="Probability difference: P(top) - P(second)")
    reason: str = Field(..., description="Deterministic explanation for gate decision")


class VerificationResult(BaseModel):
    """
    Result of testing a student on a different-form verification question.
    """
    status: VerificationStatus = Field(..., description="RESOLVED or PERSISTENT")
    is_correct: bool = Field(..., description="Whether student answered the verification question correctly")
    misconception_id: str = Field(..., description="The misconception ID that was verified")
    selected_option: str = Field(..., description="The option selected by the student")
    correct_option: str = Field(..., description="The correct answer option")
    feedback: str = Field(..., description="Pedagogical feedback explaining the verification outcome")


class ScoredQuestion(BaseModel):
    """
    Container for candidate diagnostic questions ranked by deterministic score.
    """
    question: Question
    score: float
    separation_score: float
    relevance_score: float
    confidence_gap_score: float


class DailyRevisionQuestionItem(BaseModel):
    question: Question
    revision_type: str  # "persistent_misconception" | "spaced_recheck" | "confidence_calibration"
    target_misconception_id: Optional[str] = None
    target_misconception_label: Optional[str] = None
    reason_description: str


class DailyRevisionResponse(BaseModel):
    session_id: str
    topic: str
    total_questions: int = 5
    estimated_minutes: int = 10
    questions: List[DailyRevisionQuestionItem]


class RevisionItem(BaseModel):
    concept: str
    misconception: str
    misconception_id: Optional[str] = None
    status: str
    recommended_review_in_days: int
    summary: str
    revision_priority: float = 0.0
    questions_affected: int = 0


class RevisionListResponse(BaseModel):
    session_id: str
    revision_items: List[RevisionItem]


