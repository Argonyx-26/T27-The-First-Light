# Misconception Mapper (MM)
### Team: The First Light | Argonyx '26 Hackathon

> **"Your wrong answer isn't the problem. Not knowing why it's wrong is."**

---

## 🎯 Executive Overview

**Misconception Mapper (MM)** is an intelligent, adaptive diagnostic learning system designed to shift educational assessments from *symptom detection* ("Student got Question 4 wrong") to *root-cause diagnosis* ("Student is applying an impetus misconception confusing velocity with net force").

A wrong answer is treated as **evidence, not automatically a diagnosis**. By combining deterministic confidence-weighted probabilistic hypothesis updating with targeted Large Language Model (LLM) generative capabilities, MM accurately identifies, isolates, remediates, and verifies deep conceptual misconceptions.

---

## 🏛️ Core Architectural Principle

**The LLM does NOT make final decisions.**

| Application Code (Deterministic Engine) | LLM (Generative & Interpretive Service) |
| :--- | :--- |
| Misconception state machine | Question & distractor generation |
| Probability & belief state updates | Proposing initial misconception hypotheses |
| Confidence-weighted evidence accumulation | Generating targeted, grounded remediation |
| Diagnostic question selection algorithms | Proposing candidate diagnostic questions |
| Confirmation threshold checks ($p > 0.60, \Delta \ge 0.20$) | Running self-consistency simulations |
| Verification evaluation & mastery mapping | Natural language interpretation |
| Student analytics & error taxonomy | Source document grounding |

*Never allow an LLM response alone to directly mark a misconception as confirmed or resolved.*

---

## 🔄 Core Diagnostic Loop

```text
               Student
                  │
                  ▼
               Question
                  │
                  ▼
       Answer + Confidence (1-5)
                  │
           Is answer correct?
          ┌───────┴───────┐
         YES              NO
          │               │
          ▼               ▼
    Update Mastery  Generate 2-3 Competing Hypotheses
          │               │
     Next Concept         ▼
                    Collect Evidence (Distractor Tag + Confidence)
                          │
                          ▼
                    Update Probability Distribution
                          │
                          ▼
                    Select Next Diagnostic Question (Deterministic Scoring)
                          │
                          ▼
                    Student Answers Diagnostic Question
                          │
                          ▼
                    Update Hypothesis Probabilities
                          │
            Is Top Hypothesis Sufficiently Dominant?
            (P > 0.60 AND (P_top - P_second) >= 0.20)
                         ┌┴┐
                        NO YES
                        │  │
    Continue Diagnosis ◄┘  ▼
                     Self-Consistency Simulation Check
                           │
                     Does simulated prediction match real behavior?
                         ┌─┴─┐
                        NO   YES
                        │     │
            Demote Confidence  Confirm Misconception Diagnosis
                        │     │
                        │     ▼
                        │   Deliver Targeted Conceptual Remediation
                        │     │
                        │     ▼
                        │   Present Different-Form Verification Question
                        │     │
                        │     ▼
                        │   Mark Result: RESOLVED or PERSISTENT
                        │     │
                        └─────┴──► Update Mastery & Knowledge-Gap Map
```

---

## 📂 Project Structure

```text
Argonyx/
├── backend/                  # FastAPI Application & Deterministic Diagnostic Engine
│   ├── app/
│   │   ├── api/              # REST Endpoints (/session, /generate-quiz, /submit-answer, etc.)
│   │   ├── core/             # Configuration, logging, security
│   │   ├── db/               # SQLite database models & sessions
│   │   ├── engine/           # Deterministic probability, evidence & diagnostic selectors
│   │   ├── llm/              # Groq (primary) & Gemini (fallback) service integrations
│   │   └── seed/             # Curated seed question datasets (Newton's Laws, Kinematics, etc.)
│   ├── tests/                # Unit & integration tests for probability and diagnostic logic
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment template
├── frontend/                 # React + Tailwind CSS Web Application
│   ├── src/
│   │   ├── components/       # Quiz, ConfidenceSlider, DiagnosisCard, RemediationModal
│   │   ├── pages/            # Student Flow, Dashboard, Knowledge Gap Visualizer
│   │   └── services/         # Centralized API client
│   └── package.json
├── shared/                   # Cross-boundary schemas and contract documentation
│   └── schemas.md            # Exact JSON request/response specifications
├── docs/                     # Architectural plans, design records & specifications
│   └── IMPLEMENTATION_PLAN.md
├── rag/                      # Grounded remediation vector storage (Phase P3)
├── website/                  # Showcase & marketing landing site (Phase P3)
├── .gitignore
└── README.md
```

---

## 🚀 Priority Roadmap

1. **P0 (Critical Foundation & Core Loop):**
   - Session management and deterministic state engine.
   - Confidence-weighted probability updates & hypothesis elimination.
   - Diagnostic question selection scoring.
   - Self-consistency simulation check.
   - Remediation generator & different-form verification.
   - Reliable seed questions for Newton's Laws, Kinematics, and Chemical Bonding.

2. **P1 (Student Experience & Explainability):**
   - Polished React + Tailwind student interface.
   - Transparent "Why We Think This" evidence timeline.
   - "Same Score, Different Misconception" interactive demonstration.

3. **P2 (Analytics & Teacher Portal):**
   - Knowledge-gap graph/map visualization.
   - Confidence calibration analytics (overconfidence vs. guessing).
   - "Why You're Losing Marks" error taxonomy (conceptual vs. calculation vs. misread).
   - Teacher cohort misconception heatmap.

4. **P3 (Extensions & Showcase):**
   - Optional ChromaDB RAG for textbook grounding.
   - Longitudinal tracking over multiple sessions.
   - Public project showcase site with Raah web analytics integration.

---

## 👥 Team: The First Light
Built with passion for Argonyx '26.
