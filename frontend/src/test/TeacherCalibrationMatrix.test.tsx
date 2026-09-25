import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeacherCalibrationMatrix } from "../components/teacher/TeacherCalibrationMatrix";
import { ConfidenceCalibration } from "../types";

const mockCalibration: ConfidenceCalibration = {
  high_confidence_correct: 12,
  high_confidence_incorrect: 7,
  low_confidence_correct: 3,
  low_confidence_incorrect: 2,
  calibration_index: 0.62,
};

describe("TeacherCalibrationMatrix", () => {
  it("renders 4 quadrants with counts", () => {
    render(<TeacherCalibrationMatrix calibration={mockCalibration} />);

    expect(screen.getByText("Calibrated Mastery")).toBeInTheDocument();
    expect(screen.getByText("Deep Misconception Zone")).toBeInTheDocument();
    expect(screen.getByText("Hesitant Understanding")).toBeInTheDocument();
    expect(screen.getByText("Recognized Knowledge Gap")).toBeInTheDocument();

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders metacognitive index badge and pedagogical callout", () => {
    render(<TeacherCalibrationMatrix calibration={mockCalibration} />);

    expect(screen.getByText("Metacognitive Index: 62%")).toBeInTheDocument();
    expect(
      screen.getByText(/Confidence is evidence, not a diagnosis./)
    ).toBeInTheDocument();
  });
});
