import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "@/context/SessionContext";
import { LibraryPage } from "@/pages/LibraryPage";
import { api } from "@/api/client";

// Mock api client
vi.mock("@/api/client", () => ({
  api: {
    getDocuments: vi.fn(),
    uploadDocumentWithProgress: vi.fn(),
    deleteDocument: vi.fn(),
    generateDocQuiz: vi.fn(),
    resumeSession: vi.fn(),
    getSession: vi.fn(),
  },
}));

const mockDoc = {
  id: "doc_test_123",
  filename: "Halliday_Resnick_Mechanics.pdf",
  file_size_bytes: 102400,
  page_count: 5,
  chunk_count: 14,
  status: "ready",
  topic: "Newton's Laws",
  preview_excerpt: "An object remains at rest or in uniform motion unless acted upon by a net external force...",
  uploaded_at: "2026-09-25T12:00:00Z",
};

describe("LibraryPage Component & Scoped Quizzing", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (api.getDocuments as any).mockResolvedValue({
      documents: [mockDoc],
      total: 1,
    });

    (api.generateDocQuiz as any).mockResolvedValue({
      session_id: "sess_doc_quiz_456",
      questions: [
        {
          id: "doc_q01",
          concept: "Newton's Laws",
          topic: "Newton's Laws",
          prerequisite: "Force & Velocity",
          difficulty: "medium",
          question_type: "diagnostic",
          question_text: "What causes change in an object's velocity according to Newton's First Law?",
          options: {
            A: "Net external force",
            B: "Constant internal energy",
            C: "Inertial resistance",
            D: "Frictional momentum",
          },
          correct_option: "A",
          distractor_misconceptions: {
            C: "mass_inertia_resistance",
          },
          diagnostic_targets: ["mass_inertia_resistance"],
        },
      ],
    });

    (api.resumeSession as any).mockResolvedValue({
      session_id: "sess_doc_quiz_456",
      student_id: "student_default",
      topic: "Newton's Laws",
      session_length: 3,
      status: "in_progress",
      mastery_score: 0.0,
      evidence_count: 0,
      current_question_index: 1,
      current_question: {
        id: "doc_q01",
        concept: "Newton's Laws",
        topic: "Newton's Laws",
        question_text: "What causes change in an object's velocity according to Newton's First Law?",
        options: { A: "Net external force", B: "Constant internal energy" },
      },
      active_hypotheses: [],
    });
  });

  it("renders indexed document library with first-page preview excerpt", async () => {
    render(
      <MemoryRouter>
        <SessionProvider>
          <LibraryPage />
        </SessionProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Document Library & Scoped Quizzing/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Halliday_Resnick_Mechanics.pdf")).toBeInTheDocument();
      expect(screen.getByText(/First-Page Preview Excerpt/i)).toBeInTheDocument();
      expect(screen.getByText(/An object remains at rest/i)).toBeInTheDocument();
      expect(screen.getByText("5 pages")).toBeInTheDocument();
      expect(screen.getByText("14 chunks indexed")).toBeInTheDocument();
    });
  });

  it("triggers whole-document quizzing on click", async () => {
    render(
      <MemoryRouter initialEntries={["/library"]}>
        <SessionProvider>
          <Routes>
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/quiz" element={<div>Quiz Player Page</div>} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Halliday_Resnick_Mechanics.pdf")).toBeInTheDocument();
    });

    const wholeDocBtn = screen.getByRole("button", { name: /Quiz Me: Whole Document/i });
    fireEvent.click(wholeDocBtn);

    const startDocModalBtn = screen.getByRole("button", { name: /Start Quiz/i });
    fireEvent.click(startDocModalBtn);

    await waitFor(() => {
      expect(api.generateDocQuiz).toHaveBeenCalledWith({
        document_id: "doc_test_123",
        scope: "all",
        chapter_or_topic: undefined,
        count: 3,
      });
      expect(api.resumeSession).toHaveBeenCalledWith("sess_doc_quiz_456");
      expect(screen.getByText("Quiz Player Page")).toBeInTheDocument();
    });
  });

  it("supports chapter/topic scoping with input prompt", async () => {
    render(
      <MemoryRouter initialEntries={["/library"]}>
        <SessionProvider>
          <Routes>
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/quiz" element={<div>Quiz Player Page</div>} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Halliday_Resnick_Mechanics.pdf")).toBeInTheDocument();
    });

    // Toggle scoped drawer
    const scopeToggleBtn = screen.getByRole("button", { name: /Quiz Me: Chapter \/ Topic/i });
    fireEvent.click(scopeToggleBtn);

    expect(screen.getByText(/Enter Chapter or Topic to Scope Retrieval/i)).toBeInTheDocument();

    const chapterInput = screen.getByPlaceholderText(/e\.g\. Chapter 2/i);
    fireEvent.change(chapterInput, { target: { value: "Chapter 3: Action-Reaction" } });

    const submitScopeBtn = screen.getByRole("button", { name: /Generate Scoped Quiz/i });
    fireEvent.click(submitScopeBtn);

    await waitFor(() => {
      expect(api.generateDocQuiz).toHaveBeenCalledWith({
        document_id: "doc_test_123",
        scope: "chapter",
        chapter_or_topic: "Chapter 3: Action-Reaction",
        count: 3,
      });
      expect(api.resumeSession).toHaveBeenCalledWith("sess_doc_quiz_456");
    });
  });
});
