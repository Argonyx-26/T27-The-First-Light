import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionCard } from "../components/quiz/QuestionCard";
import { Question } from "../types";

const mockQuestion: Question = {
  id: "q_test_1",
  concept: "Newtonian Mechanics",
  topic: "Physics",
  prerequisite: "Kinematics",
  question_text: "What happens to the acceleration if mass doubles and force is constant?",
  options: {
    A: "It doubles",
    B: "It is halved",
    C: "It stays unchanged",
    D: "It drops to zero",
  },
  difficulty: "medium",
  question_type: "standard",
};

describe("QuestionCard", () => {
  it("renders question text and all options", () => {
    const onSelect = vi.fn();
    render(
      <QuestionCard
        question={mockQuestion}
        selectedOption={null}
        onSelectOption={onSelect}
      />
    );

    expect(screen.getByText(mockQuestion.question_text)).toBeInTheDocument();
    expect(screen.getByText("It doubles")).toBeInTheDocument();
    expect(screen.getByText("It is halved")).toBeInTheDocument();
    expect(screen.getByText("It stays unchanged")).toBeInTheDocument();
    expect(screen.getByText("It drops to zero")).toBeInTheDocument();
  });

  it("calls onSelectOption when an option is clicked", () => {
    const onSelect = vi.fn();
    render(
      <QuestionCard
        question={mockQuestion}
        selectedOption={null}
        onSelectOption={onSelect}
      />
    );

    const optionB = screen.getByText("It is halved");
    fireEvent.click(optionB);

    expect(onSelect).toHaveBeenCalledWith("B");
  });

  it("shows diagnostic badge when question_type is diagnostic", () => {
    const diagnosticQ: Question = {
      ...mockQuestion,
      question_type: "diagnostic",
    };
    render(
      <QuestionCard
        question={diagnosticQ}
        selectedOption="B"
        onSelectOption={() => {}}
      />
    );

    expect(screen.getByText("Diagnostic Evidence Probe")).toBeInTheDocument();
  });
});
