"""
API request and response schemas matching shared/schemas.md contracts.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.engine.models import (
    DailyRevisionQuestionItem,
    DailyRevisionResponse,
    Hypothesis,
    Question,
    RevisionItem,
    RevisionListResponse,
)



# ==============================================================================
# 1. Session Schemas
# ==============================================================================
class CreateSessionRequest(BaseModel):
    topic: str = Field(..., description="Subject or concept topic (e.g. 'Newton\'s Laws')")
    student_id: Optional[str] = Field(default=None, description="Optional student identifier")
    mode: str = Field(default="adaptive_diagnosis", description="'adaptive_diagnosis' or 'exam_mode'")


class CreateSessionResponse(BaseModel):
    session_id: str
    student_id: str
    topic: str
    status: str
    created_at: str


# ==============================================================================
# 2. Quiz Generation Schemas
# ==============================================================================
class GenerateQuizRequest(BaseModel):
    topic: str = Field(..., description="Target topic")
    session_id: Optional[str] = Field(default=None, description="Active session ID")
    count: int = Field(default=3, ge=1, le=10, description="Number of questions requested")


class GenerateQuizResponse(BaseModel):
    session_id: Optional[str]
    questions: List[Question]


# ==============================================================================
# 3. Answer Submission Schemas
# ==============================================================================
class SubmitAnswerRequest(BaseModel):
    session_id: str = Field(..., description="Active session ID")
    question_id: str = Field(..., description="ID of question being answered")
    selected_option: str = Field(..., description="Chosen option ('A', 'B', 'C', 'D')")
    confidence: int = Field(..., ge=1, le=5, description="Confidence level (1-5)")


class EvidenceItem(BaseModel):
    step: int
    question_id: Optional[str] = None
    observation: str
    signal: str


class AlternativeHypothesis(BaseModel):
    name: str
    probability: float


class PrimaryMisconceptionDiagnosis(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    confidence_score: float


class DiagnosisSummary(BaseModel):
    confirmed: bool
    primary_misconception: PrimaryMisconceptionDiagnosis
    evidence: List[EvidenceItem]
    alternatives: List[AlternativeHypothesis]


class SubmitAnswerResponse(BaseModel):
    session_id: str
    status: str = Field(..., description="'correct' | 'diagnosing' | 'confirmed'")
    evaluation: str = Field(..., description="'correct' | 'incorrect'")
    mastery_level: float = Field(default=0.0)
    next_question: Optional[Question] = None
    active_hypotheses: Optional[List[Hypothesis]] = None
    diagnosis: Optional[DiagnosisSummary] = None


# ==============================================================================
from datetime import datetime


# ==============================================================================
# 4. Remediation & RAG Schemas
# ==============================================================================
class SourceItem(BaseModel):
    document_id: str
    document_name: str
    page_number: int
    excerpt: str
    similarity_score: float = 0.0
    source_type: str = "text"



class RemediateRequest(BaseModel):
    session_id: str
    misconception_id: str
    use_rag: bool = True


class RemediateResponse(BaseModel):
    misconception_id: str
    remediation_title: Optional[str] = None
    remediation_text: str
    example: Optional[str] = None
    key_takeaway: Optional[str] = None
    check_for_understanding: Optional[str] = None
    grounded: bool = False
    grounded_source: Optional[str] = None
    page_number: Optional[int] = None
    sources: List[SourceItem] = Field(default_factory=list)


class DocumentMetadata(BaseModel):
    id: str
    filename: str
    file_size_bytes: int
    page_count: int
    chunk_count: int
    status: str
    topic: Optional[str] = None
    uploaded_at: datetime


class DocumentListResponse(BaseModel):
    documents: List[DocumentMetadata]
    total: int


class RAGUploadResponse(BaseModel):
    document_id: str
    filename: str
    page_count: int
    chunk_count: int
    status: str
    message: str


# ==============================================================================
# 5. Verification Schemas
# ==============================================================================
class VerifyRequest(BaseModel):
    session_id: str
    misconception_id: str
    question_id: str
    selected_option: str


class VerifyResponse(BaseModel):
    session_id: str
    misconception_id: str
    status: str = Field(..., description="'resolved' or 'persistent'")
    is_correct: bool
    explanation: str


# ==============================================================================
# 6. Dashboard & Analytics Schemas
# ==============================================================================
class ConfidenceCalibration(BaseModel):
    high_confidence_correct: int = 0
    high_confidence_incorrect: int = 0
    low_confidence_correct: int = 0
    low_confidence_incorrect: int = 0
    calibration_index: float = 0.0


class ErrorBreakdown(BaseModel):
    conceptual: int = 0
    calculation: int = 0
    careless_reading: int = 0
    overconfidence_errors: int = 0


class DashboardResponse(BaseModel):
    session_id: str
    total_questions_attempted: int
    accuracy_rate: float
    overall_mastery: float
    misconceptions_identified: int
    misconceptions_resolved: int
    confidence_calibration: ConfidenceCalibration
    error_breakdown: ErrorBreakdown


# ==============================================================================
# 7. Knowledge Map Schemas
# ==============================================================================
class KnowledgeMapNode(BaseModel):
    id: str
    type: str  # "concept" or "misconception"
    label: str
    status: str  # "mastered", "developing", "resolved", "persistent"
    parent_concept_id: Optional[str] = None
    mastery_score: Optional[float] = None
    recommended_next: bool = False
    next_recommended_rank: Optional[int] = None
    dependent_concepts_blocked: int = 0
    revision_priority: float = 0.0



class KnowledgeMapEdge(BaseModel):
    source: str
    target: str
    type: str = "sub_gap"


class KnowledgeMapResponse(BaseModel):
    topic: str
    nodes: List[KnowledgeMapNode]
    edges: List[KnowledgeMapEdge]


# ==============================================================================
# 8. Revision List Schemas (imported from app.engine.models)
# ==============================================================================
# RevisionItem, RevisionListResponse, DailyRevisionQuestionItem, DailyRevisionResponse




# ==============================================================================
# 9. Teacher Analytics & Cohort Schemas
# ==============================================================================
class StudentSummary(BaseModel):
    student_id: str
    name: str
    topic: str
    mastery_score: float
    accuracy_rate: float
    active_gaps: int
    persistent_misconceptions: int
    calibration_status: str
    last_active: str


class RecentActivityItem(BaseModel):
    id: str
    student_id: str
    student_name: str
    topic: str
    activity_type: str
    detail: str
    timestamp: str


class TeacherOverviewResponse(BaseModel):
    total_students: int
    average_mastery: float
    active_knowledge_gaps: int
    persistent_misconceptions: int
    class_accuracy: float
    confidence_calibration: ConfidenceCalibration
    students_requiring_attention: List[StudentSummary]
    recent_activity: List[RecentActivityItem]


class TeacherStudentsResponse(BaseModel):
    total_students: int
    students: List[StudentSummary]


class ConceptMasteryItem(BaseModel):
    concept: str
    topic: str
    mastery_score: float
    status: str


class StudentMisconceptionDetail(BaseModel):
    misconception_id: str
    label: str
    concept: str
    status: str
    probability: float
    evidence_count: int
    supporting_evidence: List[str]
    contradicting_evidence: List[str]
    remediation_title: Optional[str] = None
    verification_outcome: Optional[str] = None
    grounded_source: Optional[str] = None
    page_number: Optional[int] = None


class AttemptHistoryItem(BaseModel):
    step_index: int
    question_id: str
    question_text: str
    selected_option: str
    confidence: int
    is_correct: bool
    matched_misconception: Optional[str] = None
    timestamp: str


class StudentDetailProfileResponse(BaseModel):
    student_id: str
    name: str
    topic: str
    mastery_score: float
    accuracy_rate: float
    calibration_status: str
    last_active: str
    concept_breakdown: List[ConceptMasteryItem]
    misconceptions: List[StudentMisconceptionDetail]
    attempts_timeline: List[AttemptHistoryItem]
    confidence_calibration: ConfidenceCalibration


class HeatmapCell(BaseModel):
    concept: str
    category: str
    student_count: int
    frequency: float
    student_ids: List[str]


class HeatmapData(BaseModel):
    concepts: List[str]
    misconception_categories: List[str]
    cells: List[HeatmapCell]


class ConceptAnalyticsItem(BaseModel):
    concept: str
    topic: str
    mastery: float
    accuracy: float
    misconception_count: int
    resolved_count: int
    persistent_count: int
    status: str


class MisconceptionAggregateItem(BaseModel):
    misconception_id: str
    label: str
    concept: str
    category: str
    affected_students_count: int
    resolved_count: int
    persistent_count: int
    average_probability: float


class TeacherMisconceptionsResponse(BaseModel):
    concepts: List[ConceptAnalyticsItem]
    heatmap: HeatmapData
    misconceptions: List[MisconceptionAggregateItem]


class TeacherAnalyticsResponse(BaseModel):
    total_students: int
    overall_mastery: float
    overall_accuracy: float
    confidence_calibration: ConfidenceCalibration
    error_breakdown: ErrorBreakdown
    concept_analytics: List[ConceptAnalyticsItem]


# ==============================================================================
# 10. Same-Score / Different-Misconception Demo Schemas
# ==============================================================================
class DemoInitialAttempt(BaseModel):
    selected_option: str
    selected_text: str
    confidence: int
    is_correct: bool
    distractor_signal: str
    observation: str


class DemoHypothesisItem(BaseModel):
    id: str
    label: str
    probability: float


class DemoDiagnosticProbe(BaseModel):
    id: str
    question_text: str
    selected_option: str
    selected_text: str
    confidence: int
    observation: str


class DemoDiagnosis(BaseModel):
    confirmed: bool
    misconception_id: str
    label: str
    probability: float
    probability_gap: float
    reasoning: str
    alternatives: List[AlternativeHypothesis]


class DemoRemediation(BaseModel):
    title: str
    text: str
    example: str
    key_takeaway: str


class DemoVerification(BaseModel):
    id: str
    question_text: str
    selected_option: str
    selected_text: str
    status: str
    explanation: str


class DemoStudentWalkthrough(BaseModel):
    student_id: str
    name: str
    initial_attempt: DemoInitialAttempt
    competing_hypotheses: List[DemoHypothesisItem]
    diagnostic_probe: DemoDiagnosticProbe
    diagnosis: DemoDiagnosis
    remediation: DemoRemediation
    verification: DemoVerification


class DemoQuestionSummary(BaseModel):
    id: str
    concept: str
    topic: str
    question_text: str
    options: Dict[str, str]
    correct_option: str


class SameScoreDemoResponse(BaseModel):
    title: str
    subtitle: str
    initial_question: DemoQuestionSummary
    shared_result: Dict[str, str]
    student_a: DemoStudentWalkthrough
    student_b: DemoStudentWalkthrough
    key_takeaway: str


# ==============================================================================
# 9. Exam Mode Schemas
# ==============================================================================
class CreateExamRequest(BaseModel):
    topic: str = Field(..., description="'Newton\\'s Laws', 'Kinematics', 'Chemical Bonding', or 'Comprehensive Science'")
    question_count: int = Field(default=12, ge=10, le=15, description="Number of questions (10, 12, or 15)")
    time_limit_minutes: int = Field(default=20, ge=5, le=60, description="Time limit in minutes")
    student_id: Optional[str] = Field(default=None, description="Optional student identifier")


class ExamQuestionView(BaseModel):
    id: str
    order_index: int
    concept: str
    topic: str
    question_text: str
    options: Dict[str, str]


class ExamAttemptView(BaseModel):
    question_id: str
    order_index: int
    selected_option: Optional[str] = None
    confidence: Optional[int] = None
    is_marked_for_review: bool = False
    time_spent_seconds: int = 0


class ExamSessionResponse(BaseModel):
    exam_id: str
    student_id: str
    topic: str
    total_questions: int
    time_limit_minutes: int
    started_at: str
    remaining_seconds: int
    status: str
    questions: List[ExamQuestionView]
    attempts: List[ExamAttemptView]


class SaveExamAnswerRequest(BaseModel):
    question_id: str
    selected_option: Optional[str] = None
    confidence: Optional[int] = None
    is_marked_for_review: Optional[bool] = None
    time_spent_seconds: Optional[int] = None


class SubmitExamResponse(BaseModel):
    exam_id: str
    status: str
    score: int
    total: int
    percentage: float
    time_taken_seconds: int


class ExamQuestionReportDetail(BaseModel):
    question_id: str
    order_index: int
    concept: str
    topic: str
    question_text: str
    options: Dict[str, str]
    correct_option: str
    selected_option: Optional[str] = None
    is_correct: bool
    confidence: Optional[int] = None
    confidence_level_label: str
    error_type: Optional[str] = None
    detected_misconception_id: Optional[str] = None
    detected_misconception_name: Optional[str] = None
    explanation: str
    remediation_preview: Optional[str] = None
    time_spent_seconds: int = 0


class ExamMisconceptionItem(BaseModel):
    misconception_id: str
    name: str
    topic: str
    questions_failed: List[str]
    count: int
    probability: float
    remediation_available: bool


class ExamReportResponse(BaseModel):
    exam_id: str
    student_id: str
    topic: str
    total_questions: int
    correct_count: int
    incorrect_count: int
    unattempted_count: int
    score_percentage: float
    time_limit_minutes: int
    time_taken_seconds: int
    average_confidence: float
    calibration_index: float
    why_you_lost_marks: Dict[str, int]
    identified_misconceptions: List[ExamMisconceptionItem]
    concept_breakdown: List[Dict[str, Any]]
    question_details: List[ExamQuestionReportDetail]


class TeacherExamSummary(BaseModel):
    exam_id: str
    student_id: str
    student_name: str
    topic: str
    score: int
    total: int
    percentage: float
    submitted_at: str
    primary_misconceptions: List[str]


class TeacherExamsResponse(BaseModel):
    exams: List[TeacherExamSummary]
    total_exams: int
    average_score: float


# ==============================================================================
# 11. Longitudinal Loss Attribution & Progress Journey Schemas
# ==============================================================================
class LossAttributionResponse(BaseModel):
    student_id: str
    total_evaluated_attempts: int
    total_losses: int
    why_you_lost_marks: Dict[str, int]
    percentages: Dict[str, float]
    conceptual: int = 0
    overconfidence_errors: int = 0
    calculation_slips: int = 0
    formula_confusion: int = 0


class JourneyStageItem(BaseModel):
    stage_id: str
    title: str
    status: str  # "completed", "current", "upcoming"
    timestamp: Optional[str] = None
    detail: str
    metadata: Dict[str, Any] = {}


class MisconceptionJourneyResponse(BaseModel):
    session_id: str
    misconception_id: str
    misconception_label: str
    current_stage: str
    current_stage_index: int
    stages: List[JourneyStageItem]


class CalibrationTrendPoint(BaseModel):
    session_id: str
    label: str
    date: str
    topic: str
    calibration_index: float
    accuracy: float
    high_confidence_accuracy: float
    total_attempts: int


class CalibrationTrendResponse(BaseModel):
    student_id: str
    points: List[CalibrationTrendPoint]



