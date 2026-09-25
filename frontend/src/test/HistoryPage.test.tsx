import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HistoryPage } from "@/pages/HistoryPage";
import { api } from "@/api/client";

// Mock api client
vi.mock("@/api/client", () => ({
  api: {
    getHistory: vi.fn(),
  },
}));

describe("HistoryPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state and then completed quiz history grouped by topic", async () => {
    (api.getHistory as any).mockResolvedValue({
      student_id: "student_default",
      total_completed: 3,
      topics: [
        {
          topic: "Kinematics",
          attempt_count: 2,
          average_score: 85.0,
          latest_date: "2026-09-25 14:00",
          attempts: [
            {
              session_id: "sess_kin_2",
              topic: "Kinematics",
              question_count: 10,
              score: 90.0,
              date: "2026-09-25 14:00",
              status: "completed",
            },
            {
              session_id: "sess_kin_1",
              topic: "Kinematics",
              question_count: 10,
              score: 80.0,
              date: "2026-09-24 10:30",
              status: "completed",
            },
          ],
        },
        {
          topic: "Newton's Laws",
          attempt_count: 1,
          average_score: 100.0,
          latest_date: "2026-09-25 15:00",
          attempts: [
            {
              session_id: "sess_newton_1",
              topic: "Newton's Laws",
              question_count: 20,
              score: 100.0,
              date: "2026-09-25 15:00",
              status: "completed",
            },
          ],
        },
      ],
      history: [
        {
          session_id: "sess_newton_1",
          topic: "Newton's Laws",
          question_count: 20,
          score: 100.0,
          date: "2026-09-25 15:00",
          status: "completed",
        },
        {
          session_id: "sess_kin_2",
          topic: "Kinematics",
          question_count: 10,
          score: 90.0,
          date: "2026-09-25 14:00",
          status: "completed",
        },
        {
          session_id: "sess_kin_1",
          topic: "Kinematics",
          question_count: 10,
          score: 80.0,
          date: "2026-09-24 10:30",
          status: "completed",
        },
      ],
    });

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Practice & Quiz History/i)).toBeInTheDocument();

    await waitFor(() => {
      // Summary stats
      expect(screen.getByText("3")).toBeInTheDocument(); // 3 completed quizzes
      expect(screen.getByText("2")).toBeInTheDocument(); // 2 topics practiced
      expect(screen.getByText("90%")).toBeInTheDocument(); // (100+90+80)/3 = 90%
    });

    // Topic groups
    expect(screen.getByText("Kinematics")).toBeInTheDocument();
    expect(screen.getByText("2 attempts")).toBeInTheDocument();

    expect(screen.getByText("Newton's Laws")).toBeInTheDocument();
    expect(screen.getByText("1 attempt")).toBeInTheDocument();

    // Expanded attempt details
    expect(screen.getByText("Score: 90%")).toBeInTheDocument();
    expect(screen.getByText("Score: 80%")).toBeInTheDocument();
    expect(screen.getByText("Score: 100%")).toBeInTheDocument();
  });

  it("renders empty state when no completed quizzes exist", async () => {
    (api.getHistory as any).mockResolvedValue({
      student_id: "student_default",
      total_completed: 0,
      topics: [],
      history: [],
    });

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No completed quizzes yet")).toBeInTheDocument();
      expect(screen.getByText("Start Practicing")).toBeInTheDocument();
    });
  });
});
