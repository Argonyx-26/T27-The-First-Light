import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { QuizPage } from "@/pages/QuizPage";
import { DiagnosisPage } from "@/pages/DiagnosisPage";
import { RemediationPage } from "@/pages/RemediationPage";
import { api } from "@/api/client";

// Mock the API client
vi.mock("@/api/client", () => ({
  api: {
    createSession: vi.fn(),
    generateQuiz: vi.fn(),
    submitAnswer: vi.fn(),
    getRemediation: vi.fn(),
    getKnowledgeMap: vi.fn(),
  },
}));

const mockQuestion = {
  id: "physics_newton_q01",
  concept: "Newton's First Law",
  topic: "Newton's Laws",
  prerequisite: "Inertia, Net Force, and Velocity",
  difficulty: "medium",
  question_type: "standard",
  question_text: "A deep-space probe is coasting at a constant velocity of 20,000 km/h far from any gravitational source. What is the net external force?",
  options: {
    A: "A continuous forward net force is required.",
    B: "Zero net force.",
    C: "A small continuous forward force required to overcome cosmic inertia.",
    D: "A backward resistive force equal to its momentum.",
  },
  correct_option: "B",
  distractor_misconceptions: {
    A: "force_acceleration_confusion",
    C: "mass_inertia_resistance",
  },
  diagnostic_targets: ["force_acceleration_confusion", "mass_inertia_resistance"],
};

// Component to initialize session with a question
const QuizInitializer: React.FC = () => {
  const { startSession } = useSession();
  React.useEffect(() => {
    startSession("Newton's Laws");
  }, []);
  return <QuizPage />;
};

describe("Wrong Answer Diagnosis Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (api.createSession as any).mockResolvedValue({
      session_id: "sess_test_123",
      student_id: "test_student",
      topic: "Newton's Laws",
      status: "active",
      mastery_score: 0.0,
      current_question_id: "physics_newton_q01",
      created_at: new Date().toISOString(),
    });

    (api.generateQuiz as any).mockResolvedValue({
      topic: "Newton's Laws",
      questions: [mockQuestion],
    });
  });

  it("submits wrong answer and directly routes to DiagnosisPage displaying hypothesis distribution and evidence", async () => {
    (api.submitAnswer as any).mockResolvedValue({
      session_id: "sess_test_123",
      status: "diagnosing",
      evaluation: "incorrect",
      mastery_level: 0.0,
      active_hypotheses: [
        {
          id: "force_acceleration_confusion",
          label: "Force-Acceleration Conflation",
          probability: 0.54,
          description: "Believing net force is required to sustain constant velocity.",
          category: "conceptual",
          evidence_count: 1,
        },
        {
          id: "mass_inertia_resistance",
          label: "Inertia as Active Resistance",
          probability: 0.29,
          description: "Believing inertia is an active opposing force.",
          category: "conceptual",
          evidence_count: 0,
        },
      ],
      diagnosis: {
        confirmed: false,
        primary_misconception: {
          id: "force_acceleration_confusion",
          name: "Force-Acceleration Conflation",
          description: "Believing net force is required to sustain constant velocity.",
          confidence_score: 0.54,
        },
        evidence: [
          {
            step: 1,
            question_id: "physics_newton_q01",
            observation: "Selected Option A with confidence 3/5.",
            signal: "distractor_match",
          },
        ],
        alternatives: [
          {
            name: "Inertia as Active Resistance",
            probability: 0.29,
          },
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={["/quiz"]}>
        <SessionProvider>
          <Routes>
            <Route path="/quiz" element={<QuizInitializer />} />
            <Route path="/diagnosis" element={<DiagnosisPage />} />
            <Route path="/remediation" element={<RemediationPage />} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    );

    // Wait for the question to load
    await waitFor(() => {
      expect(screen.getByText(/A deep-space probe is coasting/)).toBeInTheDocument();
    });

    // Select incorrect distractor A
    const optionA = screen.getByText(/A continuous forward net force/);
    fireEvent.click(optionA);

    // Click submit
    const submitBtn = screen.getByText("Submit Answer");
    fireEvent.click(submitBtn);

    // 1. Verify immediate feedback banner with follow-up probing
    await waitFor(() => {
      expect(screen.getByText("Not quite right.")).toBeInTheDocument();
      expect(screen.getByText("Start Follow-up Probing (1/2)")).toBeInTheDocument();
      expect(screen.getByText("View Diagnosis")).toBeInTheDocument();
    });

    // 2. Click View Diagnosis to inspect the diagnosis page
    const viewDiagBtn = screen.getByText("View Diagnosis");
    fireEvent.click(viewDiagBtn);

    await waitFor(() => {
      expect(screen.getByText("Analyzing Your Reasoning")).toBeInTheDocument();
    });

    // 3. Verify top hypothesis label and evidence list are rendered
    expect(screen.getByText("Leading Hypothesis")).toBeInTheDocument();
    expect(screen.getAllByText("Force-Acceleration Conflation").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Selected Option A with confidence 3\/5/)).toBeInTheDocument();
    expect(screen.getAllByText("Inertia as Active Resistance").length).toBeGreaterThanOrEqual(1);

    // 4. Verify action buttons (Continue Probing & Remediate now)
    expect(screen.getByText("Continue Probing")).toBeInTheDocument();
    expect(screen.getByText("Remediate now")).toBeInTheDocument();
  });

  it("renders confirmed diagnosis with Fix this misconception button when gate passes", async () => {
    (api.submitAnswer as any).mockResolvedValue({
      session_id: "sess_test_123",
      status: "confirmed",
      evaluation: "incorrect",
      mastery_level: 0.0,
      active_hypotheses: [
        {
          id: "force_acceleration_confusion",
          label: "Force-Acceleration Conflation",
          probability: 0.88,
          description: "Believing net force is required to sustain constant velocity.",
          category: "conceptual",
          evidence_count: 2,
        },
      ],
      diagnosis: {
        confirmed: true,
        primary_misconception: {
          id: "force_acceleration_confusion",
          name: "Force-Acceleration Conflation",
          description: "Believing net force is required to sustain constant velocity.",
          confidence_score: 0.88,
        },
        evidence: [
          {
            step: 1,
            question_id: "physics_newton_q01",
            observation: "Selected Option A with confidence 4/5.",
            signal: "distractor_match",
          },
          {
            step: 2,
            question_id: "physics_newton_q01",
            observation: "Self-consistency simulation confirmed hypothesis.",
            signal: "consistency_confirmed",
          },
        ],
        alternatives: [],
      },
    });

    render(
      <MemoryRouter initialEntries={["/quiz"]}>
        <SessionProvider>
          <Routes>
            <Route path="/quiz" element={<QuizInitializer />} />
            <Route path="/diagnosis" element={<DiagnosisPage />} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/A deep-space probe is coasting/)).toBeInTheDocument();
    });

    const optionA = screen.getByText(/A continuous forward net force/);
    fireEvent.click(optionA);

    const submitBtn = screen.getByText("Submit Answer");
    fireEvent.click(submitBtn);

    // 1. Verify confirmed banner in QuizPage
    await waitFor(() => {
      expect(screen.getByText("Misconception Confirmed")).toBeInTheDocument();
      expect(screen.getByText("View Details")).toBeInTheDocument();
      expect(screen.getByText("Go to Remediation")).toBeInTheDocument();
    });

    // 2. Click View Details to navigate to DiagnosisPage
    const viewDetailsBtn = screen.getByText("View Details");
    fireEvent.click(viewDetailsBtn);

    await waitFor(() => {
      expect(screen.getByText("We found the pattern.")).toBeInTheDocument();
    });

    expect(screen.getByText("Likely Misconception")).toBeInTheDocument();
    expect(screen.getAllByText("Force-Acceleration Conflation").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Confirmed Pattern")).toBeInTheDocument();
    expect(screen.getByText("Fix this misconception")).toBeInTheDocument();
  });
});
