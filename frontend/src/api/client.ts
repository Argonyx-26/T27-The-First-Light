/**
 * Centralized API client for Misconception Mapper (MM).
 * Interacts with the FastAPI backend at http://localhost:8000.
 */

import {
  DashboardResponse,
  DocumentListResponse,
  KnowledgeMapResponse,
  Question,
  RAGUploadResponse,
  RemediationResponse,
  RevisionListResponse,
  SameScoreDemoResponse,
  StudentDetailProfileResponse,
  SubmitAnswerResponse,
  TeacherAnalyticsResponse,
  TeacherMisconceptionsResponse,
  TeacherOverviewResponse,
  TeacherStudentsResponse,
  VerifyResponse,
  CreateExamRequest,
  ExamReportResponse,
  ExamSessionResponse,
  SaveExamAnswerRequest,
  SubmitExamResponse,
  TeacherExamsResponse,
} from "@/types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === "string" 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // ignore parse error
      }
      throw new Error(errorMessage);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    console.error(`API Error on [${options.method || "GET"} ${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  /**
   * Initializes a new student session.
   */
  async createSession(topic: string, studentId?: string): Promise<{ session_id: string; topic: string }> {
    return request<{ session_id: string; topic: string }>("/session", {
      method: "POST",
      body: JSON.stringify({
        topic,
        student_id: studentId || `student_${Date.now().toString(36)}`,
        mode: "adaptive_diagnosis",
      }),
    });
  },

  /**
   * Retrieves diagnostic questions for a topic.
   */
  async generateQuiz(topic: string, sessionId?: string, count: number = 3): Promise<{ questions: Question[] }> {
    return request<{ session_id?: string; questions: Question[] }>("/generate-quiz", {
      method: "POST",
      body: JSON.stringify({ topic, session_id: sessionId, count }),
    });
  },

  /**
   * Submits student answer and confidence level (1-5).
   */
  async submitAnswer(
    sessionId: string,
    questionId: string,
    selectedOption: string,
    confidence: number
  ): Promise<SubmitAnswerResponse> {
    return request<SubmitAnswerResponse>("/submit-answer", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        question_id: questionId,
        selected_option: selectedOption,
        confidence,
      }),
    });
  },

  /**
   * Fetches targeted remediation for a confirmed misconception, optionally grounded via RAG.
   */
  async getRemediation(
    sessionId: string,
    misconceptionId: string,
    useRag: boolean = true
  ): Promise<RemediationResponse> {
    return request<RemediationResponse>("/remediate", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        misconception_id: misconceptionId,
        use_rag: useRag,
      }),
    });
  },

  /**
   * Uploads and indexes a study material document (.pdf, .txt, .md) into RAG storage.
   */
  async uploadDocument(file: File, topic?: string): Promise<RAGUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (topic) {
      formData.append("topic", topic);
    }

    const url = `${BASE_URL}/rag/upload`;
    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
          }
        } catch {
          // ignore
        }
        throw new Error(errorMessage);
      }

      return (await response.json()) as RAGUploadResponse;
    } catch (error: any) {
      console.error("API Error on [POST /rag/upload]:", error);
      throw error;
    }
  },

  /**
   * Lists all ingested RAG study documents.
   */
  async getDocuments(topic?: string): Promise<DocumentListResponse> {
    const query = topic ? `?topic=${encodeURIComponent(topic)}` : "";
    return request<DocumentListResponse>(`/rag/documents${query}`);
  },

  /**
   * Deletes a RAG document and its chunk vectors.
   */
  async deleteDocument(documentId: string): Promise<{ status: string; document_id: string }> {
    return request<{ status: string; document_id: string }>(`/rag/documents/${encodeURIComponent(documentId)}`, {
      method: "DELETE",
    });
  },

  /**
   * Verifies whether a misconception is RESOLVED or PERSISTENT using a different-form question.
   */
  async verifyAnswer(
    sessionId: string,
    misconceptionId: string,
    questionId: string,
    selectedOption: string
  ): Promise<VerifyResponse> {
    return request<VerifyResponse>("/verify", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        misconception_id: misconceptionId,
        question_id: questionId,
        selected_option: selectedOption,
      }),
    });
  },

  /**
   * Retrieves student analytics, mastery, and confidence calibration.
   */
  async getDashboard(sessionId: string): Promise<DashboardResponse> {
    return request<DashboardResponse>(`/dashboard/${encodeURIComponent(sessionId)}`);
  },

  /**
   * Retrieves node-edge data for the knowledge gap graph.
   */
  async getKnowledgeMap(sessionId: string): Promise<KnowledgeMapResponse> {
    return request<KnowledgeMapResponse>(`/knowledge-map/${encodeURIComponent(sessionId)}`);
  },

  /**
   * Retrieves prioritized revision items.
   */
  async getRevisionList(sessionId: string): Promise<RevisionListResponse> {
    return request<RevisionListResponse>(`/revision-list/${encodeURIComponent(sessionId)}`);
  },

  /**
   * Retrieves high-level teacher cohort overview metrics and alerts.
   */
  async getTeacherOverview(): Promise<TeacherOverviewResponse> {
    return request<TeacherOverviewResponse>("/teacher/overview");
  },

  /**
   * Retrieves list of students with diagnostic metrics.
   */
  async getTeacherStudents(): Promise<TeacherStudentsResponse> {
    return request<TeacherStudentsResponse>("/teacher/students");
  },

  /**
   * Retrieves individual student diagnostic profile and evidence trail.
   */
  async getTeacherStudentDetail(studentId: string): Promise<StudentDetailProfileResponse> {
    return request<StudentDetailProfileResponse>(`/teacher/students/${encodeURIComponent(studentId)}`);
  },

  /**
   * Retrieves class concepts and misconception heatmap matrix.
   */
  async getTeacherMisconceptions(): Promise<TeacherMisconceptionsResponse> {
    return request<TeacherMisconceptionsResponse>("/teacher/misconceptions");
  },

  /**
   * Retrieves aggregate class analytics, calibration, and error distributions.
   */
  async getTeacherAnalytics(): Promise<TeacherAnalyticsResponse> {
    return request<TeacherAnalyticsResponse>("/teacher/analytics");
  },

  /**
   * Retrieves Same-Score / Different-Misconception comparative walkthrough.
   */
  async getSameScoreDemo(): Promise<SameScoreDemoResponse> {
    return request<SameScoreDemoResponse>("/demo/same-score");
  },

  /**
   * Creates a new timed Exam Mode session.
   */
  async createExam(payload: CreateExamRequest): Promise<ExamSessionResponse> {
    return request<ExamSessionResponse>("/exam", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Retrieves exam session state, ordered questions, attempts, and authoritative timer.
   */
  async getExam(examId: string): Promise<ExamSessionResponse> {
    return request<ExamSessionResponse>(`/exam/${examId}`);
  },

  /**
   * Saves response, confidence, review flag, or time spent for a specific question.
   */
  async saveExamAnswer(
    examId: string,
    payload: SaveExamAnswerRequest
  ): Promise<{ status: string; question_id: string }> {
    return request<{ status: string; question_id: string }>(`/exam/${examId}/answer`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Submits exam session and triggers deterministic diagnostic post-mortem.
   */
  async submitExam(examId: string): Promise<SubmitExamResponse> {
    return request<SubmitExamResponse>(`/exam/${examId}/submit`, {
      method: "POST",
    });
  },

  /**
   * Retrieves comprehensive post-mortem report answering 'Why did I lose marks?'.
   */
  async getExamReport(examId: string): Promise<ExamReportResponse> {
    return request<ExamReportResponse>(`/exam/${examId}/report`);
  },

  /**
   * Retrieves cohort exam session results for teacher analytics.
   */
  async getTeacherExams(): Promise<TeacherExamsResponse> {
    return request<TeacherExamsResponse>("/teacher/exams");
  },

  /**
   * System health check.
   */
  async checkHealth(): Promise<{ status: string }> {
    return request<{ status: string }>("/health");
  },
};
