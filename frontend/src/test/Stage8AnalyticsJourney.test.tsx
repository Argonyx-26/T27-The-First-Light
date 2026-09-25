import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LossAttributionCard } from "../components/analytics/LossAttributionCard";
import { MisconceptionJourneyTimeline } from "../components/knowledge/MisconceptionJourneyTimeline";
import { LossAttributionResponse, MisconceptionJourneyResponse } from "../types";

describe("Stage 8: Loss Attribution & Progress Journey", () => {
  it("renders LossAttributionCard with all 4 taxonomy categories", () => {
    const mockLossData: LossAttributionResponse = {
      student_id: "student_priya",
      total_evaluated_attempts: 20,
      total_losses: 6,
      why_you_lost_marks: {
        conceptual: 3,
        overconfidence_errors: 2,
        formula_confusion: 1,
        calculation_slips: 1,
      },
      percentages: {
        conceptual: 50.0,
        overconfidence_errors: 33.3,
        formula_confusion: 16.7,
        calculation_slips: 16.7,
      },
      conceptual: 3,
      overconfidence_errors: 2,
      formula_confusion: 1,
      calculation_slips: 1,
    };

    render(<LossAttributionCard data={mockLossData} />);

    // Check title and metrics
    expect(screen.getByText("Why You're Losing Marks (Longitudinal)")).toBeInTheDocument();
    expect(screen.getByText("6 Lost Marks / 20 Questions")).toBeInTheDocument();

    // Check 4 categories
    expect(screen.getByText("Conceptual")).toBeInTheDocument();
    expect(screen.getByText("Overconfidence")).toBeInTheDocument();
    expect(screen.getByText("Formula Confusion")).toBeInTheDocument();
    expect(screen.getByText("Slips / Guesses")).toBeInTheDocument();

    // Check counts
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders MisconceptionJourneyTimeline with 5 stages and allows selecting milestones", () => {
    const mockJourney: MisconceptionJourneyResponse = {
      session_id: "sess_123",
      misconception_id: "impetus_fallacy",
      misconception_label: "Impetus Fallacy",
      current_stage: "Practiced",
      current_stage_index: 2,
      stages: [
        {
          stage_id: "diagnosed",
          title: "Diagnosed",
          status: "completed",
          timestamp: "2026-09-25T10:00:00Z",
          detail: "Misconception detected via distractor analysis with 85% probability.",
        },
        {
          stage_id: "learned",
          title: "Learned",
          status: "completed",
          timestamp: "2026-09-25T10:05:00Z",
          detail: "Reviewed targeted remediation card grounded in textbook.",
        },
        {
          stage_id: "practiced",
          title: "Practiced",
          status: "completed",
          timestamp: "2026-09-25T10:15:00Z",
          detail: "Completed 2 practice questions reinforcing correct physics rules.",
        },
        {
          stage_id: "verified",
          title: "Verified",
          status: "current",
          timestamp: null,
          detail: "Ready for counter-example verification challenge.",
        },
        {
          stage_id: "mastered",
          title: "Mastered",
          status: "upcoming",
          timestamp: null,
          detail: "Achieved when verification is successfully passed and retained over time.",
        },
      ],
    };

    render(<MisconceptionJourneyTimeline journey={mockJourney} />);

    // Header and current stage
    expect(screen.getByText("Impetus Fallacy")).toBeInTheDocument();
    expect(screen.getByText("Current Stage: Practiced")).toBeInTheDocument();

    // 5 stages visible in stepper
    expect(screen.getByText("Diagnosed")).toBeInTheDocument();
    expect(screen.getByText("Learned")).toBeInTheDocument();
    expect(screen.getAllByText("Practiced").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Mastered")).toBeInTheDocument();

    // Check detail for active stage
    expect(
      screen.getByText("Completed 2 practice questions reinforcing correct physics rules.")
    ).toBeInTheDocument();

    // Click on another stage (e.g. Diagnosed)
    const diagnosedButton = screen.getByRole("button", { name: /Diagnosed/i });
    fireEvent.click(diagnosedButton);
    expect(
      screen.getByText("Misconception detected via distractor analysis with 85% probability.")
    ).toBeInTheDocument();
  });
});
