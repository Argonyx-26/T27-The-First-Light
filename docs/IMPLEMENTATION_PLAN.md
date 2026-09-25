# Misconception Mapper (MM) — Implementation Plan
### Team: The First Light | Argonyx '26

---

## 1. System Vision & Architecture

The core objective is to detect the **underlying cognitive misconception** that causes a student to make an error, not just count wrong answers.

### Architectural Boundary
```text
┌────────────────────────────────────────────────────────────────────────┐
│                      DETERMINISTIC ENGINE                              │
│                      (Python / FastAPI App)                            │
│  - Misconception State Machine                                         │
│  - Confidence-Weighted Probabilistic Hypothesis Updates               │
│  - Hypothesis Elimination & Separation Ranking                         │
│  - Diagnostic Question Selector                                        │
│  - Confirmation Threshold Gate (P > 0.60, Delta >= 0.20)               │
│  - Mastery & Knowledge-Gap State Transitions (Persistent / Resolved)   │
│  - Calibration & Mark-Loss Error Taxonomy                              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Controlled Prompts & Validation
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        LLM SERVICES LAYER                              │
│                 (Groq Primary / Gemini Fallback)                       │
│  - Question & Distractor Generation                                    │
│  - Initial Hypothesis Formulation                                      │
│  - Self-Consistency Simulated Student Check                            │
│  - Targeted Remediation Formulation                                    │
│  - Natural Language Concept Explanation                                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical & Algorithmic Foundation

### A. Confidence-Weighted Probability Update
Let competing hypotheses be $H_1, H_2, \dots, H_k$.
Initial prior: $P(H_i) = \frac{1}{k}$ (or weighted by common misconception frequencies).

When a student selects option $O$ with confidence $c \in \{1, 2, 3, 4, 5\}$:
1. Normalized confidence scale: $\tilde{c} = 0.5 + 0.1 \times c \in [0.6, 1.0]$.
2. For each hypothesis $H_i$:
   - If distractor $O$ is tagged to $H_i$:
     $$W(E \mid H_i) = 1.0 + (1.5 \times \tilde{c})$$
   - If distractor $O$ is tagged to a *competing* hypothesis $H_j$ ($j \neq i$):
     $$W(E \mid H_i) = 1.0 - (0.6 \times \tilde{c})$$
   - If distractor $O$ is untagged or neutral:
     $$W(E \mid H_i) = 1.0$$
3. Posterior probability:
   $$P_{\text{new}}(H_i) = \frac{P_{\text{old}}(H_i) \times W(E \mid H_i)}{\sum_{m=1}^{k} P_{\text{old}}(H_m) \times W(E \mid H_m)}$$

### B. Diagnostic Question Selection Scoring
To eliminate random question jumping, candidate diagnostic questions $Q$ are evaluated using:
$$\text{Score}(Q) = \text{Separation}(Q) \times \text{ConceptRelevance}(Q) \times \text{ConfidenceGap}$$
- **Separation$(Q)$**: The degree to which options in $Q$ directly distinguish between the top 2 active hypotheses ($H_{\text{top}}$ and $H_{\text{runner\_up}}$).
- **ConceptRelevance$(Q)$**: Semantic closeness to the target concept node.
- **ConfidenceGap**: Bias towards questions that test edge-cases if previous answers were high-confidence errors.

### C. Confirmation & Self-Consistency Gate
A misconception hypothesis transitions to `DIAGNOSIS_CANDIDATE` if and only if:
1. $P(H_{\text{top}}) > 0.60$
2. $P(H_{\text{top}}) - P(H_{\text{runner\_up}}) \ge 0.20$

Once candidate status is achieved:
- **Self-Consistency Check**: An LLM agent is instantiated simulating a student possessing *specifically* $H_{\text{top}}$. The agent is prompted to solve the original question and the diagnostic question.
- If the simulation's chosen distractors and error justifications align with the real student's behavioral trace, confidence is boosted and the diagnosis is **CONFIRMED**.
- If inconsistent, $P(H_{\text{top}})$ is dampened, and the engine continues adaptive diagnosis.

### D. Verification & Knowledge Gap State
Following targeted remediation:
- Student is served a verification question of a **different form** (e.g., graphical if original was verbal, or counterfactual).
- Correct answer $\rightarrow$ Misconception marked `RESOLVED`.
- Incorrect answer $\rightarrow$ Misconception marked `PERSISTENT`.

---

## 3. Phased Implementation Roadmap

### Phase 0: Foundations & Architecture (Current)
- [x] Workspace verification & empty directory audit.
- [x] Create project `.gitignore` and `.env.example`.
- [x] Establish shared data contracts (`/shared/schemas.md`).
- [x] Document high-level architecture (`README.md` & `IMPLEMENTATION_PLAN.md`).

### Phase 1: Deterministic Engine & Backend Core (P0)
- Scaffold `/backend` structure with FastAPI, Pydantic v2, and SQLite via SQLAlchemy / SQLModel.
- Implement `ProbabilityEngine` class with strict unit tests (`pytest`).
- Implement `QuestionSelector` with deterministic separation scoring.
- Implement state tracking session manager in SQLite.
- Write unit tests verifying edge cases (zero division, high-confidence flip, ties).

### Phase 2: Seed Content & LLM Providers (P0)
- Curate seed diagnostic questions for:
  1. Newton's Laws (Action/Reaction, Impetus, Inertia confusion).
  2. Kinematics (Velocity vs. Acceleration, Negative velocity vs. Deceleration).
  3. Chemical Bonding (Octet rule rigidness, Ionic vs. Covalent sharing confusion).
- Implement resilient LLM provider client:
  - Groq API (`llama-3.3-70b-versatile`) as primary.
  - Gemini API (`gemini-1.5-flash`) as automatic fallback on rate limit/error.
- Implement structured output parsers for self-consistency simulation & remediation.

### Phase 3: REST API Implementation (P0)
- Implement all endpoints documented in `shared/schemas.md`:
  - `POST /session`
  - `POST /generate-quiz`
  - `POST /submit-answer`
  - `POST /remediate`
  - `POST /verify`
  - `GET /dashboard/{session_id}`
  - `GET /knowledge-map/{session_id}`
  - `GET /revision-list/{session_id}`
- End-to-end integration tests using FastAPI `TestClient`.

### Phase 4: React + Tailwind Frontend (P1)
- Scaffold React + Tailwind frontend using Vite.
- Build clean, accessible components:
  - `QuizContainer` with clear question text and options.
  - `ConfidenceSlider` (1 to 5 tactile segmented control).
  - `DiagnosticIndicator` showing evidence acquisition progress.
  - `DiagnosisModal` / `ExplainableCard` ("Why we think this" evidence timeline).
  - `RemediationView` with key takeaways.
  - `VerificationCard` with different-form challenge.
  - `ResolutionBadge` (RESOLVED / PERSISTENT).

### Phase 5: "Same Score, Different Misconception" Demo Story (P1)
- Interactive comparison walkthrough:
  - Student A (Conceptual confusion) vs. Student B (Calculation error).
  - Visual proof showing identical scores (e.g. 50%) but vastly different diagnostic paths and remediations.

### Phase 6: Student & Teacher Dashboards (Complete - Stage 4)
- Student Dashboard:
  - Confidence calibration chart (Overconfident errors vs. Guesses).
  - "Why you're losing marks" categorized breakdown.
- Teacher Dashboard:
  - Class-wide misconception heatmap.
  - 4-quadrant calibration matrix.
  - Same-Score / Different-Misconception interactive demo walkthrough.
- Interactive Knowledge-Gap Map (visual graph representation).

### Phase 7: RAG-Grounded Remediation (Complete - Stage 5)
- Document ingestion pipeline (.pdf, .txt, .md) with page-boundary tracking.
- PageAwareChunker preserving exact document_id, document_name, and page_number.
- Local persistent ChromaDB vector store (`mm_remediation_knowledge`).
- Strict prompt-injection defense with untrusted reference context boundaries.
- Deterministic citations & source attribution ("Physics Notes — Page 2").
- Teacher Materials & Curriculum Ingestion UI (`/teacher/materials`).
- Student Remediation UI with "Grounded in your study material" badge and verbatim citation quotes.

### Phase 8: Exam Mode with Diagnostic Post-Mortem (Complete - Stage 6)
- Competitive timed exam simulation (10, 12, or 15 questions; 15, 20, or 30 minutes).
- Server-authoritative countdown timing with visual warning states (low time, critical pulse, auto-submit).
- Expanded high-discrimination question pool to 45 questions across Newton's Laws, Kinematics, and Chemical Bonding.
- "Comprehensive Science" sampling evenly across all three topic pools.
- Question palette grid navigation with answered, flagged, and review tracking.
- Principled error classification taxonomy (cognitive misconceptions, overconfidence traps, formula confusion, slips/guesses) avoiding irresponsible overclaiming of careless errors.
- Comprehensive post-mortem diagnostic report answering *"Why did I lose marks?"* with 1-click targeted remediation.
- Cohort exam monitoring view for teachers (`/teacher/exams`).
- 83/83 backend tests passing, 30/30 frontend tests passing, clean production build.

---

## 4. Initial Directory Scaffold To Set Up

```text
Argonyx/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── engine/
│   │   ├── llm/
│   │   ├── models/
│   │   └── seed/
│   └── tests/
├── frontend/
│   └── src/
├── shared/
├── docs/
├── rag/
└── website/
```
