import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StudentsTable } from "../components/teacher/StudentsTable";
import { StudentSummary } from "../types";

const mockStudents: StudentSummary[] = [
  {
    student_id: "student_demo_01",
    name: "Alex Rivera",
    topic: "Newton's Laws",
    mastery_score: 0.65,
    accuracy_rate: 0.5,
    active_gaps: 1,
    persistent_misconceptions: 0,
    calibration_status: "Overconfident",
    last_active: "10 mins ago",
  },
  {
    student_id: "student_demo_02",
    name: "Bethany Chen",
    topic: "Newton's Laws",
    mastery_score: 0.4,
    accuracy_rate: 0.35,
    active_gaps: 2,
    persistent_misconceptions: 1,
    calibration_status: "Overconfident",
    last_active: "15 mins ago",
  },
  {
    student_id: "student_demo_03",
    name: "Carlos Gomez",
    topic: "Kinematics",
    mastery_score: 0.88,
    accuracy_rate: 0.8,
    active_gaps: 0,
    persistent_misconceptions: 0,
    calibration_status: "Calibrated",
    last_active: "1 hour ago",
  },
];

describe("StudentsTable", () => {
  it("renders student rows with name, topic, mastery, and calibration", () => {
    render(
      <MemoryRouter>
        <StudentsTable students={mockStudents} />
      </MemoryRouter>
    );

    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Bethany Chen")).toBeInTheDocument();
    expect(screen.getByText("Carlos Gomez")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
  });

  it("filters students based on search input", () => {
    render(
      <MemoryRouter>
        <StudentsTable students={mockStudents} />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText("Search name or topic...");
    fireEvent.change(searchInput, { target: { value: "Carlos" } });

    expect(screen.getByText("Carlos Gomez")).toBeInTheDocument();
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument();
    expect(screen.queryByText("Bethany Chen")).not.toBeInTheDocument();
  });

  it("filters students based on status dropdown", () => {
    render(
      <MemoryRouter>
        <StudentsTable students={mockStudents} />
      </MemoryRouter>
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "persistent" } });

    expect(screen.getByText("Bethany Chen")).toBeInTheDocument();
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument();
    expect(screen.queryByText("Carlos Gomez")).not.toBeInTheDocument();
  });
});
