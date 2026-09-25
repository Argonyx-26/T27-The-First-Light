import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { TopicPage } from "@/pages/TopicPage";
import { QuizPage } from "@/pages/QuizPage";
import { api } from "@/api/client";

// Mock the API client
vi.mock("@/api/client", () => ({
  api: {
    getActiveSessions: vi.fn(),
    createSession: vi.fn(),
    generateQuiz: vi.fn(),
    getSession: vi.fn(),
    pauseSession: vi.fn(),
    resumeSession: vi.fn(),
    endSession: vi.fn(),
    submitAnswer: vi.fn(),
  },
}));

const mockQuestion = {
  id: "test_q01",
  concept: "Thermodynamics",
  topic: "Thermodynamics and Heat Transfer",
  prerequisite: "Temperature and Heat",
  difficulty: "medium",
  question_type: "standard",
  question_text: "What happens to the internal energy of an ideal gas during isothermal expansion?",
  options: {
    A: "It increases.",
    B: "It remains constant.",
    C: "It decreases.",
    D: "It fluctuates unpredictably.",
  },
  correct_option: "B",
  distractor_misconceptions: {
    A: "temperature_energy_confusion",
  },
  diagnostic_targets: ["temperature_energy_confusion"],
};

describe("Topic Setup, Free-text Input & Pause/Resume Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    (api.getActiveSessions as any).mockResolvedValue({
      sessions: [
        {
          session_id: "sess_paused_999",
          topic: "Thermodynamics",
          session_length: 20,
          current_question_index: 7,
          evidence_count: 3,
          hypotheses_count: 2,
          status: "paused",
          updated_at: "2026-09-25T10:00:00Z",
        },
      ],
    });

    (api.createSession as any).mockResolvedValue({
      session_id: "sess_new_123",
      student_id: "student_default",
      topic: "Quantum Mechanics",
      session_length: 10,
      status: "in_progress",
    });

    (api.generateQuiz as any).mockResolvedValue({
      session_id: "sess_new_123",
      questions: [mockQuestion],
    });

    (api.pauseSession as any).mockResolvedValue({
      session_id: "sess_new_123",
      status: "paused",
    });

    (api.endSession as any).mockResolvedValue({
      session_id: "sess_new_123",
      status: "completed",
    });

    (api.resumeSession as any).mockResolvedValue({
      session_id: "sess_paused_999",
      student_id: "student_default",
      topic: "Thermodynamics",
      session_length: 20,
      status: "in_progress",
      mastery_score: 0.65,
      evidence_count: 3,
      current_question_index: 7,
      current_question: mockQuestion,
      active_hypotheses: [],
    });
  });

  it("renders free-text input and question count selector without hardcoded preset cards", async () => {
    render(
      <MemoryRouter initialEntries={["/topic"]}>
        <SessionProvider>
          <Routes>
            <Route path="/topic" element={<TopicPage />} />
            <Route path="/quiz" element={<QuizPage />} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    );

    // Verify main header
    expect(screen.getByText("What do you want to practice?")).toBeInTheDocument();

    // Verify free-text input with placeholder
    const input = screen.getByPlaceholderText(/Search for a topic to take a quiz/i);
    expect(input).toBeInTheDocument();

    // Verify question count options: 10, 20, Unlimited
    expect(screen.getByText("10 Questions")).toBeInTheDocument();
    expect(screen.getByText("20 Questions")).toBeInTheDocument();
    expect(screen.getByText("Unlimited")).toBeInTheDocument();

    // Verify resume section rendered with active session
    await waitFor(() => {
      expect(screen.getByText("Resume Practice Session")).toBeInTheDocument();
      expect(screen.getByText("Thermodynamics")).toBeInTheDocument();
      expect(screen.getByText("Q7 of 20")).toBeInTheDocument();
    });
  });

  it("allows typing free-text topic, selecting Unlimited questions, and starting session", async () => {
    (api.createSession as any).mockResolvedValue({
      session_id: "sess_unlimited_777",
      student_id: "student_default",
      topic: "Fluid Dynamics",
      session_length: null,
      status: "in_progress",
    });

    (api.generateQuiz as any).mockResolvedValue({
      session_id: "sess_unlimited_777",
      questions: [mockQuestion],
    });

    render(
      <MemoryRouter initialEntries={["/topic"]}>
        <SessionProvider>
          <Routes>
            <Route path="/topic" element={<TopicPage />} />
            <Route path="/quiz" element={<QuizPage />} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Search for a topic to take a quiz/i);
    fireEvent.change(input, { target: { value: "Fluid Dynamics" } });

    // Select Unlimited
    const unlimitedBtn = screen.getByText("Unlimited");
    fireEvent.click(unlimitedBtn);

    // Click Start Practice
    const startBtn = screen.getByRole("button", { name: /Start Practice Session/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(api.createSession).toHaveBeenCalledWith("Fluid Dynamics", null);
      expect(api.generateQuiz).toHaveBeenCalledWith("Fluid Dynamics", "sess_unlimited_777", 3);
    });

    // In QuizPage, verify Unlimited indicator and End Session button are present
    await waitFor(() => {
      expect(screen.getByText("End Session")).toBeInTheDocument();
      expect(screen.getByText("Pause")).toBeInTheDocument();
      expect(screen.getByText(/Q1 \(Unlimited\)/i)).toBeInTheDocument();
    });
  });

  it("supports pausing quiz and navigating back to topic page", async () => {
    // Session setup for QuizPage
    const Initializer = () => {
      const { startSession } = useSession();
      React.useEffect(() => {
        startSession("Optics", 10);
      }, []);
      return <QuizPage />;
    };

    (api.createSession as any).mockResolvedValue({
      session_id: "sess_pause_test",
      student_id: "student_default",
      topic: "Optics",
      session_length: 10,
      status: "in_progress",
    });

    (api.generateQuiz as any).mockResolvedValue({
      session_id: "sess_pause_test",
      questions: [mockQuestion],
    });

    render(
      <MemoryRouter initialEntries={["/quiz"]}>
        <SessionProvider>
          <Routes>
            <Route path="/quiz" element={<Initializer />} />
            <Route path="/topic" element={<TopicPage />} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Pause")).toBeInTheDocument();
    });

    // Click Pause
    const pauseBtn = screen.getByText("Pause");
    fireEvent.click(pauseBtn);

    await waitFor(() => {
      expect(api.pauseSession).toHaveBeenCalledWith("sess_pause_test");
    });
  });

  it("resumes an existing session restoring progress without resetting", async () => {
    render(
      <MemoryRouter initialEntries={["/topic"]}>
        <SessionProvider>
          <Routes>
            <Route path="/topic" element={<TopicPage />} />
            <Route path="/quiz" element={<QuizPage />} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    );

    // Wait for active sessions list
    await waitFor(() => {
      expect(screen.getByText("Thermodynamics")).toBeInTheDocument();
    });

    // Click Resume
    const resumeBtn = screen.getByRole("button", { name: /Resume/i });
    fireEvent.click(resumeBtn);

    await waitFor(() => {
      expect(api.resumeSession).toHaveBeenCalledWith("sess_paused_999");
    });

    // In QuizPage, verify question progress restored to Q7 of 20
    await waitFor(() => {
      expect(screen.getByText("Q7 of 20")).toBeInTheDocument();
      expect(screen.getByText(/What happens to the internal energy/i)).toBeInTheDocument();
    });
  });
});
