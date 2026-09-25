import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfidenceControl } from "../components/quiz/ConfidenceControl";

describe("ConfidenceControl", () => {
  it("renders all 5 confidence levels", () => {
    const onChange = vi.fn();
    render(<ConfidenceControl value={3} onChange={onChange} />);

    expect(screen.getByText("Guessing")).toBeInTheDocument();
    expect(screen.getByText("Unsure")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText("Confident")).toBeInTheDocument();
    expect(screen.getByText("Very Confident")).toBeInTheDocument();
  });

  it("calls onChange when an option is clicked", () => {
    const onChange = vi.fn();
    render(<ConfidenceControl value={1} onChange={onChange} />);

    const level5 = screen.getByText("Very Confident");
    fireEvent.click(level5);

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("disables buttons when disabled prop is true", () => {
    const onChange = vi.fn();
    render(<ConfidenceControl value={2} onChange={onChange} disabled={true} />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
