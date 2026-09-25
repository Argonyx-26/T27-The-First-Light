import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { TeacherMaterialsPage } from "../pages/teacher/TeacherMaterialsPage";
import { api } from "@/api/client";

// Mock the API client
vi.mock("@/api/client", () => ({
  api: {
    getDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));

describe("TeacherMaterialsPage", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  it("renders page header, upload zone, and KPI statistics", async () => {
    (api.getDocuments as any).mockResolvedValue({
      total: 1,
      documents: [
        {
          id: "doc_test_1",
          filename: "sample_physics_notes.pdf",
          file_size_bytes: 45000,
          page_count: 3,
          chunk_count: 7,
          status: "ready",
          topic: "Newton's Laws",
          uploaded_at: "2026-09-24T12:00:00Z",
        },
      ],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TeacherMaterialsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Header & KPIs
    expect(screen.getByText("Study Materials & RAG Ingestion")).toBeInTheDocument();
    expect(screen.getByText("Ingested Documents")).toBeInTheDocument();
    expect(screen.getByText("Indexed Pages")).toBeInTheDocument();
    expect(screen.getByText("Vector Chunks")).toBeInTheDocument();
    expect(screen.getByText("Upload Course Material for Ingestion")).toBeInTheDocument();

    // Table rows
    expect(await screen.findByText("sample_physics_notes.pdf")).toBeInTheDocument();
    expect(screen.getByText("3 pages")).toBeInTheDocument();
    expect(screen.getByText("7 vectors")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
  });
});
