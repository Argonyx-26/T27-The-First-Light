import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemoComparisonView } from "../components/teacher/DemoComparisonView";
import { SameScoreDemoResponse } from "../types";

const mockDemoData: SameScoreDemoResponse = {
  title: "Same Score. Different Misconception.",
  subtitle: "Two students make the exact same mistake for completely different reasons.",
  initial_question: {
    id: "physics_newton_q01",
    concept: "Newton's First Law",
    topic: "Newton's Laws",
    question_text: "A deep-space probe is coasting at constant speed...",
    options: {
      A: "Forward continuous force",
      B: "Zero net force",
      C: "Force to overcome inertia",
      D: "Resistive force",
    },
    correct_option: "B",
  },
  shared_result: {
    score: "0 / 1",
    accuracy: "0%",
    summary: "Both students fail the question identically.",
  },
  student_a: {
    student_id: "student_alex_01",
    name: "Student A (Alex)",
    initial_attempt: {
      selected_option: "A",
      selected_text: "Forward continuous force",
      confidence: 5,
      is_correct: false,
      distractor_signal: "force_acceleration_confusion",
      observation: "Believes motion requires continuous forward force.",
    },
    competing_hypotheses: [
      { id: "h1", label: "Force Required for Motion", probability: 0.55 },
    ],
    diagnostic_probe: {
      id: "diag_01",
      question_text: "Hockey puck gliding across frictionless ice...",
      selected_option: "A",
      selected_text: "Stick force stored in puck",
      confidence: 4,
      observation: "Impetus confirmed.",
    },
    diagnosis: {
      confirmed: true,
      misconception_id: "force_acceleration_confusion",
      label: "Force Required for Motion (Impetus Theory)",
      probability: 0.76,
      probability_gap: 0.52,
      reasoning: "Alex consistently assumes constant velocity needs thrust.",
      alternatives: [],
    },
    remediation: {
      title: "Separating Velocity from Acceleration",
      text: "Net force causes acceleration, not velocity itself.",
      example: "Gliding space probe",
      key_takeaway: "No force needed for constant velocity.",
    },
    verification: {
      id: "verify_01",
      question_text: "Elevator cab at constant 3 m/s...",
      selected_option: "B",
      selected_text: "T is equal to W",
      status: "resolved",
      explanation: "Alex recognized constant velocity implies net force is zero.",
    },
  },
  student_b: {
    student_id: "student_beth_02",
    name: "Student B (Beth)",
    initial_attempt: {
      selected_option: "C",
      selected_text: "Force to overcome inertia",
      confidence: 5,
      is_correct: false,
      distractor_signal: "mass_inertia_resistance",
      observation: "Believes inertia is an active opposing counter-force.",
    },
    competing_hypotheses: [
      { id: "h2", label: "Inertia as Active Resistance", probability: 0.56 },
    ],
    diagnostic_probe: {
      id: "diag_02",
      question_text: "500 kg crate nudged in zero gravity...",
      selected_option: "C",
      selected_text: "Inertia force pushes back against space",
      confidence: 4,
      observation: "Inertia resistance confirmed.",
    },
    diagnosis: {
      confirmed: true,
      misconception_id: "mass_inertia_resistance",
      label: "Inertia as Active Resistance",
      probability: 0.74,
      probability_gap: 0.48,
      reasoning: "Beth treats inertia as an active force.",
      alternatives: [],
    },
    remediation: {
      title: "Inertia is Mass, Not a Force",
      text: "Inertia does not fight against existing motion; it is merely mass.",
      example: "Asteroid in space",
      key_takeaway: "Inertia is property of matter.",
    },
    verification: {
      id: "verify_02",
      question_text: "Two spheres 1kg and 100kg coasting in space...",
      selected_option: "A",
      selected_text: "Sphere Y requires 100x force",
      status: "persistent",
      explanation: "Beth still exhibits the mass-inertia confusion.",
    },
  },
  key_takeaway: "Same wrong answer does not mean same misconception.",
};

describe("DemoComparisonView", () => {
  it("renders initial question and identical score (0 / 1)", () => {
    render(<DemoComparisonView demoData={mockDemoData} />);

    expect(screen.getByText("Same Score. Different Misconception.")).toBeInTheDocument();
    expect(screen.getByText("A deep-space probe is coasting at constant speed...")).toBeInTheDocument();
    expect(screen.getByText("0 / 1")).toBeInTheDocument();
  });

  it("renders both Student A and Student B side-by-side", () => {
    render(<DemoComparisonView demoData={mockDemoData} />);

    expect(screen.getByText("Student A (Alex)")).toBeInTheDocument();
    expect(screen.getByText("Student B (Beth)")).toBeInTheDocument();
  });

  it("shows different confirmed hypotheses and probabilities", () => {
    render(<DemoComparisonView demoData={mockDemoData} />);

    expect(screen.getByText("Force Required for Motion (Impetus Theory)")).toBeInTheDocument();
    expect(screen.getByText("Inertia as Active Resistance")).toBeInTheDocument();
    expect(screen.getByText("76% Fit")).toBeInTheDocument();
    expect(screen.getByText("74% Fit")).toBeInTheDocument();
  });

  it("shows different remediations and verification states (resolved vs persistent)", () => {
    render(<DemoComparisonView demoData={mockDemoData} />);

    expect(screen.getByText("Separating Velocity from Acceleration")).toBeInTheDocument();
    expect(screen.getByText("Inertia is Mass, Not a Force")).toBeInTheDocument();
    expect(screen.getByText("RESOLVED")).toBeInTheDocument();
    expect(screen.getByText("PERSISTENT")).toBeInTheDocument();
  });
});
