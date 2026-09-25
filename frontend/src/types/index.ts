/**
 * TypeScript Data Models for Misconception Mapper (MM).
 * Aligned with backend schemas and shared/schemas.md.
 */

export interface Question {
  id: string;
  concept: string;
  topic: string;
  prerequisite: string;
  difficulty: "easy" | "medium" | "hard" | string;
  question_type?: "standard" | "diagnostic" | "verification" | string;
  question_text: string;
  options: Record<string, string>;
  correct_option?: string;
  distractor_misconceptions?: Record<string, string>;
  diagnostic_targets?: string[];
  verified_misconception_id?: string | null;
  explanation?: string | null;
}

export interface Hypothesis {
  id: string;
  label: string;
  probability: number;
  description?: string | null;
  category?: string;
  evidence_count?: number;
}

export interface EvidenceItem {
  step: number;
  question_id?: string | null;
  observation: string;
  signal: string;
}

export interface AlternativeHypothesis {
  name: string;
  probability: number;
}

export interface PrimaryMisconceptionDiagnosis {
  id: string;
  name: string;
  description?: string | null;
  confidence_score: number;
}

export interface DiagnosisSummary {
  confirmed: boolean;
  primary_misconception: PrimaryMisconceptionDiagnosis;
  evidence: EvidenceItem[];
  alternatives: AlternativeHypothesis[];
}

export interface SubmitAnswerResponse {
  session_id: string;
  status: "correct" | "diagnosing" | "confirmed";
  evaluation: "correct" | "incorrect";
  mastery_level: number;
  next_question?: Question | null;
  active_hypotheses?: Hypothesis[] | null;
  diagnosis?: DiagnosisSummary | null;
}

export interface SourceItem {
  document_id: string;
  document_name: string;
  page_number: number;
  excerpt: string;
  similarity_score?: number;
  source_type?: 'text' | 'image' | string;
}


export interface RemediationResponse {
  misconception_id: string;
  remediation_title?: string | null;
  remediation_text: string;
  example?: string | null;
  key_takeaway?: string | null;
  check_for_understanding?: string | null;
  grounded?: boolean;
  grounded_source?: string | null;
  page_number?: number | null;
  sources?: SourceItem[];
}

export interface DocumentMetadata {
  id: string;
  filename: string;
  file_size_bytes: number;
  page_count: number;
  chunk_count: number;
  status: "processing" | "ready" | "failed" | string;
  topic?: string | null;
  uploaded_at: string;
}

export interface DocumentListResponse {
  documents: DocumentMetadata[];
  total: number;
}

export interface RAGUploadResponse {
  document_id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  status: string;
  message: string;
}

export interface VerifyResponse {
  session_id: string;
  misconception_id: string;
  status: "resolved" | "persistent";
  is_correct: boolean;
  explanation: string;
}

export interface ConfidenceCalibration {
  high_confidence_correct: number;
  high_confidence_incorrect: number;
  low_confidence_correct: number;
  low_confidence_incorrect: number;
  calibration_index: number;
}

export interface ErrorBreakdown {
  conceptual: number;
  calculation: number;
  careless_reading: number;
  overconfidence_errors: number;
}

export interface DashboardResponse {
  session_id: string;
  total_questions_attempted: number;
  accuracy_rate: number;
  overall_mastery: number;
  misconceptions_identified: number;
  misconceptions_resolved: number;
  confidence_calibration: ConfidenceCalibration;
  error_breakdown: ErrorBreakdown;
}

export interface KnowledgeMapNode {
  id: string;
  type: "concept" | "misconception" | string;
  label: string;
  status: "mastered" | "developing" | "resolved" | "persistent" | string;
  parent_concept_id?: string | null;
  mastery_score?: number | null;
  recommended_next?: boolean;
  next_recommended_rank?: number | null;
  dependent_concepts_blocked?: number;
  revision_priority?: number;
}

export interface KnowledgeMapEdge {
  source: string;
  target: string;
  type: string;
}

export interface KnowledgeMapResponse {
  topic: string;
  nodes: KnowledgeMapNode[];
  edges: KnowledgeMapEdge[];
}

export interface RevisionItem {
  concept: string;
  misconception: string;
  misconception_id?: string;
  status: string;
  recommended_review_in_days: number;
  summary: string;
  revision_priority?: number;
  questions_affected?: number;
}

export interface RevisionListResponse {
  session_id: string;
  revision_items: RevisionItem[];
}

export interface DailyRevisionQuestionItem {
  question: Question;
  revision_type: "persistent_misconception" | "spaced_recheck" | "confidence_calibration" | string;
  target_misconception_id?: string | null;
  target_misconception_label?: string | null;
  reason_description: string;
}

export interface DailyRevisionResponse {
  session_id: string;
  topic: string;
  total_questions: number;
  estimated_minutes: number;
  questions: DailyRevisionQuestionItem[];
}


export interface StudentSummary {
  student_id: string;
  name: string;
  topic: string;
  mastery_score: number;
  accuracy_rate: number;
  active_gaps: number;
  persistent_misconceptions: number;
  calibration_status: string;
  last_active: string;
}

export interface RecentActivityItem {
  id: string;
  student_id: string;
  student_name: string;
  topic: string;
  activity_type: string;
  detail: string;
  timestamp: string;
}

export interface TeacherOverviewResponse {
  total_students: number;
  average_mastery: number;
  active_knowledge_gaps: number;
  persistent_misconceptions: number;
  class_accuracy: number;
  confidence_calibration: ConfidenceCalibration;
  students_requiring_attention: StudentSummary[];
  recent_activity: RecentActivityItem[];
}

export interface TeacherStudentsResponse {
  total_students: number;
  students: StudentSummary[];
}

export interface ConceptMasteryItem {
  concept: string;
  topic: string;
  mastery_score: number;
  status: string;
}

export interface StudentMisconceptionDetail {
  misconception_id: string;
  label: string;
  concept: string;
  status: string;
  probability: number;
  evidence_count: number;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  remediation_title?: string | null;
  verification_outcome?: string | null;
  grounded_source?: string | null;
  page_number?: number | null;
}

export interface AttemptHistoryItem {
  step_index: number;
  question_id: string;
  question_text: string;
  selected_option: string;
  confidence: number;
  is_correct: boolean;
  matched_misconception?: string | null;
  timestamp: string;
}

export interface StudentDetailProfileResponse {
  student_id: string;
  name: string;
  topic: string;
  mastery_score: number;
  accuracy_rate: number;
  calibration_status: string;
  last_active: string;
  concept_breakdown: ConceptMasteryItem[];
  misconceptions: StudentMisconceptionDetail[];
  attempts_timeline: AttemptHistoryItem[];
  confidence_calibration: ConfidenceCalibration;
}

export interface HeatmapCell {
  concept: string;
  category: string;
  student_count: number;
  frequency: number;
  student_ids: string[];
}

export interface HeatmapData {
  concepts: string[];
  misconception_categories: string[];
  cells: HeatmapCell[];
}

export interface ConceptAnalyticsItem {
  concept: string;
  topic: string;
  mastery: number;
  accuracy: number;
  misconception_count: number;
  resolved_count: number;
  persistent_count: number;
  status: string;
}

export interface MisconceptionAggregateItem {
  misconception_id: string;
  label: string;
  concept: string;
  category: string;
  affected_students_count: number;
  resolved_count: number;
  persistent_count: number;
  average_probability: number;
}

export interface TeacherMisconceptionsResponse {
  concepts: ConceptAnalyticsItem[];
  heatmap: HeatmapData;
  misconceptions: MisconceptionAggregateItem[];
}

export interface TeacherAnalyticsResponse {
  total_students: number;
  overall_mastery: number;
  overall_accuracy: number;
  confidence_calibration: ConfidenceCalibration;
  error_breakdown: ErrorBreakdown;
  concept_analytics: ConceptAnalyticsItem[];
}

export interface DemoInitialAttempt {
  selected_option: string;
  selected_text: string;
  confidence: number;
  is_correct: boolean;
  distractor_signal: string;
  observation: string;
}

export interface DemoHypothesisItem {
  id: string;
  label: string;
  probability: number;
}

export interface DemoDiagnosticProbe {
  id: string;
  question_text: string;
  selected_option: string;
  selected_text: string;
  confidence: number;
  observation: string;
}

export interface DemoDiagnosis {
  confirmed: boolean;
  misconception_id: string;
  label: string;
  probability: number;
  probability_gap: number;
  reasoning: string;
  alternatives: AlternativeHypothesis[];
}

export interface DemoRemediation {
  title: string;
  text: string;
  example: string;
  key_takeaway: string;
}

export interface DemoVerification {
  id: string;
  question_text: string;
  selected_option: string;
  selected_text: string;
  status: "resolved" | "persistent";
  explanation: string;
}

export interface DemoStudentWalkthrough {
  student_id: string;
  name: string;
  initial_attempt: DemoInitialAttempt;
  competing_hypotheses: DemoHypothesisItem[];
  diagnostic_probe: DemoDiagnosticProbe;
  diagnosis: DemoDiagnosis;
  remediation: DemoRemediation;
  verification: DemoVerification;
}

export interface DemoQuestionSummary {
  id: string;
  concept: string;
  topic: string;
  question_text: string;
  options: Record<string, string>;
  correct_option: string;
}

export interface SameScoreDemoResponse {
  title: string;
  subtitle: string;
  initial_question: DemoQuestionSummary;
  shared_result: Record<string, string>;
  student_a: DemoStudentWalkthrough;
  student_b: DemoStudentWalkthrough;
  key_takeaway: string;
}

// ==============================================================================
// Exam Mode Types
// ==============================================================================
export interface CreateExamRequest {
  topic: string;
  question_count?: number;
  time_limit_minutes?: number;
  student_id?: string;
}

export interface ExamQuestionView {
  id: string;
  order_index: number;
  concept: string;
  topic: string;
  question_text: string;
  options: Record<string, string>;
}

export interface ExamAttemptView {
  question_id: string;
  order_index: number;
  selected_option: string | null;
  confidence: number | null;
  is_marked_for_review: boolean;
  time_spent_seconds: number;
}

export interface ExamSessionResponse {
  exam_id: string;
  student_id: string;
  topic: string;
  total_questions: number;
  time_limit_minutes: number;
  started_at: string;
  remaining_seconds: number;
  status: string;
  questions: ExamQuestionView[];
  attempts: ExamAttemptView[];
}

export interface SaveExamAnswerRequest {
  question_id: string;
  selected_option?: string | null;
  confidence?: number | null;
  is_marked_for_review?: boolean;
  time_spent_seconds?: number;
}

export interface SubmitExamResponse {
  exam_id: string;
  status: string;
  score: number;
  total: number;
  percentage: number;
  time_taken_seconds: number;
}

export interface ExamQuestionReportDetail {
  question_id: string;
  order_index: number;
  concept: string;
  topic: string;
  question_text: string;
  options: Record<string, string>;
  correct_option: string;
  selected_option: string | null;
  is_correct: boolean;
  confidence: number | null;
  confidence_level_label: string;
  error_type: string | null;
  detected_misconception_id: string | null;
  detected_misconception_name: string | null;
  explanation: string;
  remediation_preview?: string | null;
  time_spent_seconds: number;
}

export interface ExamMisconceptionItem {
  misconception_id: string;
  name: string;
  topic: string;
  questions_failed: string[];
  count: number;
  probability: number;
  remediation_available: boolean;
}

export interface ExamConceptBreakdown {
  concept: string;
  total_questions: number;
  correct_questions: number;
  accuracy_percentage: number;
}

export interface ExamReportResponse {
  exam_id: string;
  student_id: string;
  topic: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  score_percentage: number;
  time_limit_minutes: number;
  time_taken_seconds: number;
  average_confidence: number;
  calibration_index: number;
  why_you_lost_marks: Record<string, number>;
  identified_misconceptions: ExamMisconceptionItem[];
  concept_breakdown: ExamConceptBreakdown[];
  question_details: ExamQuestionReportDetail[];
}

export interface TeacherExamSummary {
  exam_id: string;
  student_id: string;
  student_name: string;
  topic: string;
  score: number;
  total: number;
  percentage: number;
  submitted_at: string;
  primary_misconceptions: string[];
}

export interface TeacherExamsResponse {
  exams: TeacherExamSummary[];
  total_exams: number;
  average_score: number;
}

// =============================================================================
// Stage 8: Longitudinal Loss Attribution & Progress Journey Types
// =============================================================================
export interface LossAttributionResponse {
  student_id: string;
  total_evaluated_attempts: number;
  total_losses: number;
  why_you_lost_marks: Record<string, number>;
  percentages: Record<string, number>;
  conceptual: number;
  overconfidence_errors: number;
  calculation_slips: number;
  formula_confusion: number;
}

export interface JourneyStageItem {
  stage_id: string;
  title: string;
  status: "completed" | "current" | "upcoming";
  timestamp?: string | null;
  detail: string;
  metadata?: Record<string, any>;
}

export interface MisconceptionJourneyResponse {
  session_id: string;
  misconception_id: string;
  misconception_label: string;
  current_stage: string;
  current_stage_index: number;
  stages: JourneyStageItem[];
}

export interface CalibrationTrendPoint {
  session_id: string;
  label: string;
  date: string;
  topic: string;
  calibration_index: number;
  accuracy: number;
  high_confidence_accuracy: number;
  total_attempts: number;
}

export interface CalibrationTrendResponse {
  student_id: string;
  points: CalibrationTrendPoint[];
}




