import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KnowledgeGraph } from "../components/knowledge/KnowledgeGraph";
import { CalibrationTrendChart } from "../components/dashboard/CalibrationTrendChart";
import { KnowledgeMapNode, CalibrationTrendPoint } from "../types";

describe("Learning Path & Calibration Trend", () => {
  it("renders KnowledgeGraph with next-recommended target highlighted", () => {
    const mockNodes: KnowledgeMapNode[] = [
      {
        id: "concept_root",
        type: "concept",
        label: "Newton's Laws",
        status: "developing",
      },
      {
        id: "node_force_acceleration_confusion",
        type: "misconception",
        label: "Force Acceleration Confusion",
        status: "persistent",
        recommended_next: true,
        next_recommended_rank: 1,
        dependent_concepts_blocked: 4,
      },
      {
        id: "node_action_reaction_cancellation",
        type: "misconception",
        label: "Action Reaction Cancellation",
        status: "developing",
        recommended_next: false,
        next_recommended_rank: 2,
        dependent_concepts_blocked: 2,
      },
    ];

    render(<KnowledgeGraph nodesData={mockNodes} topic="Newton's Laws" />);

    // Check root and node labels
    expect(screen.getByText("Newton's Laws")).toBeInTheDocument();
    expect(screen.getByText("Force Acceleration Confusion")).toBeInTheDocument();
    expect(screen.getByText("Action Reaction Cancellation")).toBeInTheDocument();

    // Check recommended target banner and rank
    expect(screen.getByText(/Next Target/i)).toBeInTheDocument();
    expect(screen.getByText("Rank #1")).toBeInTheDocument();
    expect(screen.getByText("4 concepts")).toBeInTheDocument();
  });

  it("renders CalibrationTrendChart with longitudinal trajectory points", () => {
    const mockPoints: CalibrationTrendPoint[] = [
      {
        session_id: "s1",
        label: "Session 1",
        date: "Oct 10",
        topic: "Newton's Laws",
        calibration_index: 0.65,
        accuracy: 0.50,
        high_confidence_accuracy: 0.40,
        total_attempts: 10,
      },
      {
        session_id: "s2",
        label: "Session 2",
        date: "Oct 12",
        topic: "Kinematics",
        calibration_index: 0.88,
        accuracy: 0.80,
        high_confidence_accuracy: 0.85,
        total_attempts: 12,
      },
    ];

    render(<CalibrationTrendChart points={mockPoints} />);

    expect(screen.getByText("Calibration Trend Over Time")).toBeInTheDocument();
    expect(screen.getByText(/Calibration Improving/i)).toBeInTheDocument();
  });
});
