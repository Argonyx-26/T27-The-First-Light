import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { api } from "../api/client";
import { RevisionPage } from "../pages/RevisionPage";
import { DailyRevisionPage } from "../pages/DailyRevisionPage";

import { DailyRevisionResponse, RevisionListResponse, RemediationResponse } from "../types";

const mockRevisionList: RevisionListResponse = {
  session_id: "sess_test_123",
  revision_items: [
    {
      concept: "Newton's Laws",
      misconception: "Force-Acceleration Conflation",
      misconception_id: "force_acceleration_confusion",
      status: "persistent",
      recommended_review_in_days: 1,
      summary: "Review targeted fundamentals for Force-Acceleration Conflation.",
      revision_priority: 31.84,
      questions_affected: 3,
    },
    {
      concept: "Newton's Laws",
      misconception: "Inertia as Active Resistance",
      misconception_id: "mass_inertia_resistance",
      status: "persistent",
      recommended_review_in_days: 1,
      summary: "Review targeted fundamentals for Inertia as Active Resistance.",
      revision_priority: 21.7,
      questions_affected: 2,
    },
  ],
};

const mockDailyRevisionData: DailyRevisionResponse = {
  session_id: "sess_test_123",
  topic: "Newton's Laws",
  total_questions: 5,
  estimated_minutes: 10,
  questions: [
    {
      question: {
        id: "q_rev_1",
        concept: "Newton's First Law",
        topic: "Newton's Laws",
        prerequisite: "Inertia",
        difficulty: "medium",
        question_type: "diagnostic" as any,
        question_text: "A space probe coasts at 500 m/s in deep space. What net force is required to maintain this velocity?",
        options: {
          A: "A continuous forward thrust equal to mass times velocity",
          B: "Zero net force",
          C: "A small thrust balancing its inertia",
          D: "Opposing gravitational thrust",
        },
        correct_option: "B",
        distractor_misconceptions: {
          A: "force_acceleration_confusion",
          C: "mass_inertia_resistance",
        },
        diagnostic_targets: ["force_acceleration_confusion"],
        explanation: "At constant velocity, acceleration is zero, so by Newton's First Law, net force is zero.",
      },
      revision_type: "persistent_misconception",
      target_misconception_id: "force_acceleration_confusion",
      target_misconception_label: "Force-Acceleration Conflation",
      reason_description: "Top persistent cognitive misconception requiring immediate reinforcement.",
    },
    {
      question: {
        id: "q_rev_2",
        concept: "Newton's Third Law",
        topic: "Newton's Laws",
        prerequisite: "Forces",
        difficulty: "medium",
        question_type: "verification" as any,
        question_text: "When a book rests on a table, what is the Newton's Third Law pair to the Earth's gravitational pull on the book?",
        options: {
          A: "The normal force exerted by the table on the book",
          B: "The gravitational pull exerted by the book on the Earth",
          C: "The weight of the table",
          D: "Static friction",
        },
        correct_option: "B",
        distractor_misconceptions: {
          A: "action_reaction_same_body",
        },
        diagnostic_targets: ["action_reaction_same_body"],
        explanation: "Action-reaction pairs act on different bodies. The pair to Earth pulling the book is the book pulling the Earth.",
      },
      revision_type: "spaced_recheck",
      target_misconception_id: "action_reaction_same_body",
      target_misconception_label: "Action-Reaction on Same Body",
      reason_description: "Spaced verification check: validating long-term retention of recently resolved gap.",
    },
  ],
};

const mockRemediation: RemediationResponse = {
  misconception_id: "force_acceleration_confusion",
  remediation_title: "Forces Cause Acceleration, Not Velocity",
  remediation_text: "In everyday experience, friction stops objects, making us think force is needed to keep moving. Newton's First Law proves net force causes acceleration.",
  example: "A hockey puck on frictionless ice glides forever with no net force.",
  key_takeaway: "Zero net force means constant velocity.",
  check_for_understanding: "If cruise control maintains 60 mph, what is net force?",
  grounded: true,
  grounded_source: "physics_notes.pdf — Page 14",
  page_number: 14,
  sources: [
    {
      document_id: "doc_notes",
      document_name: "physics_notes.pdf",
      page_number: 14,
      excerpt: "Newton's First Law: An object remains at rest or in uniform motion unless acted upon by a net force.",
      similarity_score: 0.95,
      source_type: "text",
    },
  ],
};

vi.mock("@/context/SessionContext", () => ({
  useSession: () => ({
    sessionId: "sess_test_123",
    topic: "Newton's Laws",
    studentId: "stud_1",
    isLoading: false,
    error: null,
  }),
}));

describe("Priority Revision and Daily Revision Flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders RevisionPage with Daily 10-Minute hero card and priority score badges", async () => {
    vi.spyOn(api, "getRevisionList").mockResolvedValue(mockRevisionList);

    render(
      <MemoryRouter initialEntries={["/revision"]}>
        <Routes>
          <Route path="/revision" element={<RevisionPage />} />
        </Routes>
      </MemoryRouter>
    );


    expect(await screen.findByText("Targeted Revision Queue")).toBeInTheDocument();
    expect(screen.getByText("Daily 10-Minute Cognitive Revision")).toBeInTheDocument();
    expect(screen.getByText("Start Daily Revision")).toBeInTheDocument();

    // Priority badges
    expect(screen.getByText("Priority Score: 31.8")).toBeInTheDocument();
    expect(screen.getByText("Priority Score: 21.7")).toBeInTheDocument();
    expect(screen.getByText(/3 questions affected/)).toBeInTheDocument();
  });

  it("renders DailyRevisionPage, checks correct answer and advances", async () => {
    vi.spyOn(api, "getDailyRevision").mockResolvedValue(mockDailyRevisionData);

    render(
      <MemoryRouter initialEntries={["/revision/daily"]}>
        <Routes>
          <Route path="/revision/daily" element={<DailyRevisionPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Question 1 of 5
    expect(await screen.findByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Top Persistent Misconception")).toBeInTheDocument();
    expect(screen.getByText(/A space probe coasts at 500 m\/s in deep space/)).toBeInTheDocument();

    // Select correct option B
    const optionB = screen.getByText("Zero net force");
    fireEvent.click(optionB);

    // Submit answer
    const checkBtn = screen.getByText("Check Answer");
    fireEvent.click(checkBtn);

    // Positive feedback
    expect(await screen.findByText("Correct! Concept Confirmed")).toBeInTheDocument();
    expect(screen.getByText(/At constant velocity, acceleration is zero/)).toBeInTheDocument();
  });

  it("handles wrong answer in DailyRevisionPage by fetching remediation via existing /remediate endpoint", async () => {
    vi.spyOn(api, "getDailyRevision").mockResolvedValue(mockDailyRevisionData);
    const remediateSpy = vi.spyOn(api, "getRemediation").mockResolvedValue(mockRemediation);

    render(
      <MemoryRouter initialEntries={["/revision/daily"]}>
        <Routes>
          <Route path="/revision/daily" element={<DailyRevisionPage />} />
        </Routes>
      </MemoryRouter>
    );


    // Question 1
    expect(await screen.findByText("Question 1 of 2")).toBeInTheDocument();

    // Select wrong option A
    const optionA = screen.getByText("A continuous forward thrust equal to mass times velocity");
    fireEvent.click(optionA);

    // Submit answer
    const checkBtn = screen.getByText("Check Answer");
    fireEvent.click(checkBtn);

    // Expect remediate API call
    await waitFor(() => {
      expect(remediateSpy).toHaveBeenCalledWith("sess_test_123", "force_acceleration_confusion", true);
    });

    // Expect RemediationCard rendered
    expect(await screen.findByText("Forces Cause Acceleration, Not Velocity")).toBeInTheDocument();
    expect(screen.getByText("physics_notes.pdf — Page 14")).toBeInTheDocument();
    expect(screen.getByText("Key Takeaway")).toBeInTheDocument();
    expect(screen.getByText("Zero net force means constant velocity.")).toBeInTheDocument();
  });
});
