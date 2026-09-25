import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MisconceptionHeatmap } from "../components/teacher/MisconceptionHeatmap";
import { HeatmapData } from "../types";

const mockHeatmapData: HeatmapData = {
  concepts: ["Newton's Laws", "Kinematics"],
  misconception_categories: ["Force & Motion (Impetus)", "Inertia Resistance"],
  cells: [
    {
      concept: "Newton's Laws",
      category: "Force & Motion (Impetus)",
      student_count: 3,
      frequency: 0.25,
      student_ids: ["student_demo_01", "student_demo_08"],
    },
    {
      concept: "Newton's Laws",
      category: "Inertia Resistance",
      student_count: 2,
      frequency: 0.16,
      student_ids: ["student_demo_02"],
    },
    {
      concept: "Kinematics",
      category: "Force & Motion (Impetus)",
      student_count: 0,
      frequency: 0.0,
      student_ids: [],
    },
    {
      concept: "Kinematics",
      category: "Inertia Resistance",
      student_count: 1,
      frequency: 0.08,
      student_ids: ["student_demo_06"],
    },
  ],
};

describe("MisconceptionHeatmap", () => {
  it("renders concepts and category column headers", () => {
    render(
      <MemoryRouter>
        <MisconceptionHeatmap heatmapData={mockHeatmapData} />
      </MemoryRouter>
    );

    expect(screen.getByText("Newton's Laws")).toBeInTheDocument();
    expect(screen.getByText("Kinematics")).toBeInTheDocument();
    expect(screen.getByText("Force & Motion (Impetus)")).toBeInTheDocument();
    expect(screen.getByText("Inertia Resistance")).toBeInTheDocument();
  });

  it("shows student count in cell buttons and opens drawer on click", () => {
    render(
      <MemoryRouter>
        <MisconceptionHeatmap heatmapData={mockHeatmapData} />
      </MemoryRouter>
    );

    const cell3 = screen.getByTitle("Newton's Laws • Force & Motion (Impetus): 3 students");
    expect(cell3).toBeInTheDocument();

    fireEvent.click(cell3);

    expect(screen.getByText(/Inspecting Focus Area:/)).toBeInTheDocument();
    expect(
      screen.getByText(/3 students exhibiting this misconception pattern/)
    ).toBeInTheDocument();
  });
});
