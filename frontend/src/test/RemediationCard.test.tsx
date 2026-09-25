import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { RemediationCard } from "../components/remediation/RemediationCard";
import { RemediationResponse } from "@/types";

describe("RemediationCard Component", () => {
  it("renders ungrounded general remediation card correctly", () => {
    const remediation: RemediationResponse = {
      misconception_id: "motion_requires_force",
      remediation_title: "Understanding Newton's First Law",
      remediation_text: "Forces cause changes in motion, not continuous constant velocity.",
      example: "Consider a hockey puck sliding on frictionless ice.",
      key_takeaway: "No net force is needed to maintain constant velocity.",
      check_for_understanding: "Does a spacecraft in deep vacuum need engines firing constantly?",
      grounded: false,
    };

    render(
      <BrowserRouter>
        <RemediationCard remediation={remediation} />
      </BrowserRouter>
    );

    expect(screen.getByText("General explanation")).toBeInTheDocument();
    expect(screen.getByText("Understanding Newton's First Law")).toBeInTheDocument();
    expect(screen.getByText(/Forces cause changes in motion/)).toBeInTheDocument();
    expect(screen.getByText("Consider a hockey puck sliding on frictionless ice.")).toBeInTheDocument();
    expect(screen.getByText("No net force is needed to maintain constant velocity.")).toBeInTheDocument();
  });

  it("renders grounded study material citation badge and page excerpt", () => {
    const remediation: RemediationResponse = {
      misconception_id: "motion_requires_force",
      remediation_title: "Newton's First Law & Inertia",
      remediation_text: "Inertia is a property of mass, not an applied force.",
      example: "When a bus stops abruptly, you lurch forward due to your own inertia.",
      key_takeaway: "Inertia is resistance to velocity change.",
      grounded: true,
      grounded_source: "sample_physics_notes.pdf — Page 2",
      page_number: 2,
      sources: [
        {
          document_id: "doc_123",
          document_name: "sample_physics_notes.pdf",
          page_number: 2,
          excerpt: "Inertia is the natural tendency of an object to resist any change in its velocity.",
          similarity_score: 0.88,
        },
      ],
    };

    render(
      <BrowserRouter>
        <RemediationCard remediation={remediation} />
      </BrowserRouter>
    );

    expect(screen.getByText("Grounded in your study material")).toBeInTheDocument();
    expect(screen.getByText("Textbook & Course Citation")).toBeInTheDocument();
    expect(screen.getByText("sample_physics_notes.pdf — Page 2")).toBeInTheDocument();
    expect(screen.getByText(/Inertia is the natural tendency/)).toBeInTheDocument();
  });
});
