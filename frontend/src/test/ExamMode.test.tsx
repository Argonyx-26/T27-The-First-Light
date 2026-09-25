import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Routes, Route } from "react-router-dom";
import { api } from "../api/client";
import { ExamSetupPage } from "../pages/exam/ExamSetupPage";
import { ExamReportPage } from "../pages/exam/ExamReportPage";
import { ExamReportResponse, ExamSessionResponse } from "../types";

const mockExamSession: ExamSessionResponse = {
  exam_id: "exam_test_123",
  student_id: "stud_1",
  topic: "Comprehensive Science",
  total_questions: 12,
  time_limit_minutes: 20,
  started_at: new Date().toISOString(),
  remaining_seconds: 1200,
  status: "in_progress",
  questions: [
    {
      id: "q_test_1",
      order_index: 1,
      concept: "Newton's First Law",
      topic: "Newton's Laws",
      question_text: "What maintains constant velocity in deep space?",
      options: {
        A: "Continuous thrust force",
        B: "Zero net external force",
        C: "Gravitational inertia",
        D: "Kinetic dissipation",
      },
    },
    {
      id: "q_test_2",
      order_index: 2,
      concept: "Kinematic Vectors",
      topic: "Kinematics",
      question_text: "At the peak of vertical projectile motion, what is zero?",
      options: {
        A: "Both velocity and acceleration",
        B: "Instantaneous vertical velocity only",
        C: "Gravitational force only",
        D: "Total mechanical energy",
      },
    },
  ],
  attempts: [
    {
      question_id: "q_test_1",
      order_index: 1,
      selected_option: null,
      confidence: null,
      is_marked_for_review: false,
      time_spent_seconds: 0,
    },
    {
      question_id: "q_test_2",
      order_index: 2,
      selected_option: null,
      confidence: null,
      is_marked_for_review: false,
      time_spent_seconds: 0,
    },
  ],
};

const mockExamReport: ExamReportResponse = {
  exam_id: "exam_test_123",
  student_id: "stud_1",
  topic: "Comprehensive Science",
  total_questions: 12,
  correct_count: 8,
  incorrect_count: 4,
  unattempted_count: 0,
  score_percentage: 66.7,
  time_limit_minutes: 20,
  time_taken_seconds: 840,
  average_confidence: 4.2,
  calibration_index: 0.75,
  why_you_lost_marks: {
    conceptual: 3,
    overconfidence_errors: 2,
    formula_confusion: 1,
    calculation_slips: 0,
  },
  identified_misconceptions: [
    {
      misconception_id: "force_acceleration_confusion",
      name: "Force Required for Motion (Impetus)",
      topic: "Comprehensive Science",
      questions_failed: ["Q1"],
      count: 1,
      probability: 0.82,
      remediation_available: true,
    },
  ],
  concept_breakdown: [
    {
      concept: "Newton's First Law",
      total_questions: 4,
      correct_questions: 3,
      accuracy_percentage: 75.0,
    },
  ],
  question_details: [
    {
      question_id: "q_test_1",
      order_index: 1,
      concept: "Newton's First Law",
      topic: "Newton's Laws",
      question_text: "What maintains constant velocity in deep space?",
      options: {
        A: "Continuous thrust force",
        B: "Zero net external force",
        C: "Gravitational inertia",
        D: "Kinetic dissipation",
      },
      correct_option: "B",
      selected_option: "A",
      is_correct: false,
      confidence: 5,
      confidence_level_label: "Level 5",
      error_type: "conceptual",
      detected_misconception_id: "force_acceleration_confusion",
      detected_misconception_name: "Force Required for Motion (Impetus)",
      explanation: "Newton's first law states zero net force maintains constant velocity.",
      remediation_preview: null,
      time_spent_seconds: 45,
    },
  ],
};

describe("Exam Mode API Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls createExam with selected preset and topic", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockExamSession,
    } as Response);

    const res = await api.createExam({
      topic: "Comprehensive Science",
      question_count: 12,
      time_limit_minutes: 20,
    });

    expect(res.exam_id).toBe("exam_test_123");
    expect(res.total_questions).toBe(12);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/exam"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Comprehensive Science"),
      })
    );
  });

  it("calls saveExamAnswer with question_id, selected_option, confidence", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "saved", question_id: "q_test_1" }),
    } as Response);

    const res = await api.saveExamAnswer("exam_test_123", {
      question_id: "q_test_1",
      selected_option: "B",
      confidence: 4,
      is_marked_for_review: true,
      time_spent_seconds: 30,
    });

    expect(res.status).toBe("saved");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/exam/exam_test_123/answer"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          question_id: "q_test_1",
          selected_option: "B",
          confidence: 4,
          is_marked_for_review: true,
          time_spent_seconds: 30,
        }),
      })
    );
  });

  it("calls submitExam and retrieves post-mortem report", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        exam_id: "exam_test_123",
        status: "submitted",
        score: 8,
        total: 12,
        percentage: 66.7,
        time_taken_seconds: 840,
      }),
    } as Response);

    const subRes = await api.submitExam("exam_test_123");
    expect(subRes.status).toBe("submitted");
    expect(subRes.score).toBe(8);

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockExamReport,
    } as Response);

    const repRes = await api.getExamReport("exam_test_123");
    expect(repRes.score_percentage).toBe(66.7);
    expect(repRes.why_you_lost_marks["conceptual"]).toBe(3);
    expect(repRes.why_you_lost_marks["overconfidence_errors"]).toBe(2);
  });
});

describe("ExamSetupPage UI", () => {
  it("renders exam setup header, topic input, and configuration options", () => {
    render(
      <BrowserRouter>
        <ExamSetupPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Adaptive Exam Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Enter Exam Topic/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search for a topic to take a quiz/i)).toBeInTheDocument();
    expect(screen.getByText(/Number of Questions/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Timed Exam/i)).toBeInTheDocument();
  });
});

describe("ExamReportPage UI", () => {
  it("renders score hero, why you lost marks taxonomy, and diagnosed misconceptions", async () => {
    vi.spyOn(api, "getExamReport").mockResolvedValueOnce(mockExamReport);

    render(
      <MemoryRouter initialEntries={["/exam/exam_test_123/report"]}>
        <Routes>
          <Route path="/exam/:examId/report" element={<ExamReportPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Your score isn't the whole story/i)).toBeInTheDocument();
    });

    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText(/Why You Lost Marks/i)).toBeInTheDocument();
    expect(screen.getByText(/Cognitive Misconceptions/i)).toBeInTheDocument();
    expect(screen.getByText(/Overconfidence Traps/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Force Required for Motion/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Question-by-Question Audit/i)).toBeInTheDocument();
  });
});
