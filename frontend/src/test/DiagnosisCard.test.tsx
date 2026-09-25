import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DiagnosisCard } from "../components/diagnosis/DiagnosisCard";
import { DiagnosisSummary } from "../types";

const mockDiagnosis: DiagnosisSummary = {
  confirmed: true,
  primary_misconception: {
    id: "misc_heavier_falls_faster",
    name: "Heavier Objects Fall Faster",
    description: "Believing gravitational acceleration depends on mass in a vacuum.",
    confidence_score: 0.88,
  },
  evidence: [
    {
      step: 1,
      question_id: "q_grav_1",
      observation: "Selected 10kg ball lands first with confidence 5",
      signal: "supports",
    },
  ],
  alternatives: [
    {
      name: "Air Resistance Confusion",
      probability: 0.12,
    },
  ],
};

describe("DiagnosisCard", () => {
  it("renders diagnosis title, primary misconception, and confidence percentage", () => {
    render(
      <MemoryRouter>
        <DiagnosisCard diagnosis={mockDiagnosis} />
      </MemoryRouter>
    );

    expect(screen.getByText("We found the pattern.")).toBeInTheDocument();
    expect(screen.getByText("Heavier Objects Fall Faster")).toBeInTheDocument();
    expect(screen.getByText("Confirmed Pattern")).toBeInTheDocument();
    expect(screen.getByText("Fix this misconception")).toBeInTheDocument();
  });

  it("renders evidence observations and alternatives", () => {
    render(
      <MemoryRouter>
        <DiagnosisCard diagnosis={mockDiagnosis} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Selected 10kg ball lands first/)).toBeInTheDocument();
    expect(screen.getByText("Air Resistance Confusion")).toBeInTheDocument();
  });
});
