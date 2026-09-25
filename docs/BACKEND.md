# Misconception Mapper (MM) — Backend Service Guide
### Team: The First Light | Argonyx '26

---

## 1. Quick Start

### A. Install Dependencies
```powershell
cd backend
python -m pip install -r requirements.txt
```

### B. Configure Environment Variables
Copy the template and supply your keys (optional in mock mode):
```powershell
cp .env.example .env
```
Inside `.env`:
```ini
ENVIRONMENT=development
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DATABASE_URL=sqlite:///./misconception_mapper.db

# LLM Configuration
# Mode: "mock" (offline deterministic test fixtures) or "live" (calls Groq/Gemini APIs)
LLM_MODE=mock

# Primary Provider: Groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Fallback Provider: Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

### C. Run the Backend Server
```powershell
# From the backend directory:
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Server runs at: `http://localhost:8000`

### D. Interactive Swagger / OpenAPI Docs
Open in your browser:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### E. Run the Automated Test Suite
```powershell
# Run all 61 unit, integration, and provider tests:
python -m pytest backend/tests -v
```

---

## 2. API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/session` | Initializes a new student diagnostic session. |
| `POST` | `/generate-quiz` | Retrieves seed or generated diagnostic questions for a topic. |
| `POST` | `/submit-answer` | Core endpoint: records attempts, executes probability updates, and triggers self-consistency simulations. |
| `POST` | `/remediate` | Returns targeted conceptual remediation for a confirmed misconception. |
| `POST` | `/verify` | Evaluates student performance on a different-form verification question (`RESOLVED` or `PERSISTENT`). |
| `GET` | `/dashboard/{session_id}` | Aggregated metrics, accuracy, confidence calibration, and error taxonomy. |
| `GET` | `/knowledge-map/{session_id}` | Hierarchical node-edge graph representation of concepts and misconception states. |
| `GET` | `/revision-list/{session_id}` | Prioritized list of persistent misconceptions for student review. |
| `GET` | `/health` | Health check and system configuration summary. |

---

## 3. LLM Provider Failover Architecture

```text
Request (Hypothesis Proposal, Remediation, Simulation)
                       │
                       ▼
             LLM Client Controller
                       │
            Is LLM_MODE == "mock"?
                   ┌───┴───┐
                  YES      NO
                   │       │
                   ▼       ▼
              MockProvider GroqProvider (Primary: Llama-3.3-70b-versatile)
                           │
                 Did Groq fail or rate limit?
                           ┌┴┐
                          NO YES
                          │  │
             Return Result◄┘  ▼
                           GeminiProvider (Fallback: gemini-1.5-flash)
                           │
                 Did Gemini succeed?
                           ┌┴┐
                         YES NO
                          │  │
             Return Result◄┘  ▼
                           Return Structured 502 / Dev Mock Fallback
```

---

## 4. Self-Consistency Verification Flow

1. Student answer drives top hypothesis probability past confirmation threshold:
   $$P(H_{\text{top}}) > 0.60 \quad \text{AND} \quad \Delta \ge 0.20$$
2. Backend calls `SelfConsistencyService`.
3. LLM roleplays a student holding **only** $H_{\text{top}}$ and predicts option $O_{\text{simulated}}$.
4. **Python Application Logic** compares:
   $$O_{\text{simulated}} == O_{\text{student}}$$
5. If matched $\rightarrow$ Misconception is marked **`CONFIRMED`**.
6. If mismatched $\rightarrow$ Probability is dampened by $-0.15$ and adaptive diagnosis continues.
