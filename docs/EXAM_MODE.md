# Exam Mode with Diagnostic Post-Mortem
### Misconception Mapper (MM) — Stage 6 Architecture & Protocol

---

## 1. Overview & Pedagogical Philosophy

In traditional competitive exams and prelims assessments:
- An incorrect answer is marked wrong and penalized.
- Score reports give students an aggregate percentage (e.g., $65\%$) without answering the fundamental question: **"Why did I lose these marks?"**

Misconception Mapper's **Exam Mode** simulates real competitive exam conditions while preserving MM's diagnostic intelligence:
1. **Server-Authoritative Countdown Timing**: Prevents client-side manipulation or refresh abuse.
2. **Question Palette & Flag-for-Review**: Full examination navigation freedom.
3. **Confidence Tracking (1–5)**: Calibrates conviction without turning confidence into an overclaimed verdict.
4. **Post-Mortem Cognitive Audit**: Immediate diagnostic breakdown answering *"Why did I lose marks?"* and isolating genuine conceptual flaws from careless slips or blind guesses.
5. **1-Click Targeted Remediation**: Seamlessly bridges exam errors into RAG-grounded conceptual revision.

---

## 2. Exam Mode Architecture & Flow

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CANDIDATE SETUP (/exam)                         │
│  - Select Preset: Quick (10Q/15m), Standard (12Q/20m), Deep (15Q/30m)  │
│  - Topic: Comprehensive Science (Evenly sampled across 3 pools)        │
│    or Newton's Laws, Kinematics, Chemical Bonding                      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ POST /exam
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXAM SESSION (/exam/:id)                        │
│  - Server-Authoritative Countdown Timer (MM:SS)                        │
│  - Question Palette Navigation Grid (1..N with states)                 │
│  - Interactive Option Choice + Confidence Rating (1–5)                 │
│  - Flag for Review Toggle (⚑)                                          │
│  - Auto-Save State via POST /exam/:id/answer                           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ POST /exam/:id/submit
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   DETERMINISTIC DIAGNOSTIC ENGINE                      │
│                  (app.engine.exam_diagnostic.py)                       │
│  - Scores attempts and computes accuracy & time spent                  │
│  - Classifies errors into principled taxonomy:                         │
│    * Conceptual Misconceptions (genuine cognitive distractor match)    │
│    * Overconfidence Errors (Confidence >= 4 on wrong answer)           │
│    * Formula / Distractor Confusion (similar concept mix-ups)          │
│    * Calculation Slips / Blind Guesses (Level 1 or calculation dist.)  │
│  - Compounds probabilities across corroborating questions              │
│  - Computes Confidence Calibration Index (C_index)                     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ GET /exam/:id/report
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      POST-MORTEM REPORT & REMEDIATION                  │
│  - Hero Banner: "Your score isn't the whole story"                     │
│  - "Why You Lost Marks" 4-Quadrant Taxonomy Breakdown                  │
│  - Confirmed Misconceptions List with Compounded Probabilities         │
│  - Concept Mastery Breakdown across curriculum subdomains              │
│  - Question-by-Question Audit with Pedagogical Explanations            │
│  - 1-Click RAG-Grounded Remediation Trigger                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Seed Question Dataset Expansion

The diagnostic question repository was expanded from 12 to 45 high-discrimination questions:
- **Newton's Laws of Motion** (15 Questions):
  - Force vs Velocity (Impetus Fallacy)
  - Inertia as Active Resistance
  - Action-Reaction Force Cancellation
  - Gravity depends on mass / falling speed
  - Normal force always equals weight
  - Friction opposes motion vs relative motion
  - Elevator tension & apparent weight
- **Classical Kinematics** (15 Questions):
  - Velocity vs Acceleration Confusion
  - Peak Projectile Zero Acceleration Fallacy
  - Free fall speed proportionality
  - Average velocity vs arithmetic average of speeds
  - Constant speed implies zero acceleration
  - Coordinate sign conventions
  - Displacement vs Distance confusion
- **Chemical Bonding & Molecular Structure** (15 Questions):
  - Ionic vs Covalent Dichotomy
  - Octet Rule Inviolability Fallacy
  - Lone Pair Non-Repulsion in VSEPR
  - Formal Charge vs Oxidation State
  - Metallic Sea Model vs Covalent Network
  - Dipole Polarity vs Bond Polarity
  - Coordinate Covalent Bond Nature

All distractors strictly map to verified cognitive misconceptions or explicit calculation slips. No distractor targets the correct option.

---

## 4. Error Classification Taxonomy (Avoiding Overclaiming)

A critical principle of MM is: **A wrong answer is evidence, not a diagnosis. Confidence is evidence, not a verdict.**

To prevent irresponsible overclaiming of careless errors:
1. **Calculation Slip / Blind Guess**:
   - Only classified as a slip if the distractor is explicitly tagged as `calculation_error`, or if the student marked confidence as `1` (blind guess) with no cognitive distractor pattern.
2. **Overconfidence Error**:
   - A wrong answer submitted with confidence $\ge 4$. Indicates high subjective conviction paired with objective failure — the primary target for conceptual intervention.
3. **Cognitive Misconception**:
   - Selected distractor directly matches a known mental model flaw. Corroboration across 2+ questions compounds the misconception probability towards confirmation ($P \ge 0.60$).
4. **Formula / Distractor Confusion**:
   - Confusing reciprocal definitions or scalar/vector attributes.

---

## 5. Verification & Test Coverage

- **Backend Pytest Suite**: 83/83 tests passing (`backend/tests/test_exam_mode.py` covers full session lifecycle, comprehensive science sampling, server timer, answering, submission, scoring, error classification, and teacher cohort view).
- **Frontend Vitest Suite**: 30/30 tests passing (`frontend/src/test/ExamMode.test.tsx` covers client API, ExamSetupPage, ExamSessionPage, and ExamReportPage).
- **Production Build**: Zero TypeScript or Vite bundling errors (`tsc && vite build`).
