import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "../api/client";

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls createSession with correct payload and returns session data", async () => {
    const mockResponse = {
      session_id: "test-session-123",
      topic: "Newtonian Gravity",
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await api.createSession("Newtonian Gravity");
    expect(result.session_id).toBe("test-session-123");
    expect(result.topic).toBe("Newtonian Gravity");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/session"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Newtonian Gravity"),
      })
    );
  });

  it("calls submitAnswer with session_id, question_id, selected_option, confidence", async () => {
    const mockResponse = {
      session_id: "sess-1",
      status: "diagnosing",
      evaluation: "incorrect",
      mastery_level: 0.5,
      next_question: null,
      active_hypotheses: [],
      diagnosis: null,
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await api.submitAnswer("sess-1", "q1", "A", 4);
    expect(result.status).toBe("diagnosing");
    expect(result.evaluation).toBe("incorrect");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/submit-answer"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          session_id: "sess-1",
          question_id: "q1",
          selected_option: "A",
          confidence: 4,
        }),
      })
    );
  });

  it("handles HTTP errors appropriately", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Session not found." }),
    } as Response);

    await expect(api.getDashboard("invalid-id")).rejects.toThrow("Session not found.");
  });
});
