# Misconception Mapper (MM) — Deterministic Diagnostic Engine
### Team: The First Light | Argonyx '26

---

## 1. Overview & Architectural Philosophy

The **Misconception Mapper Core Diagnostic Engine** is a **deterministic, confidence-weighted probabilistic hypothesis updating system** (also referred to as **evidence-weighted hypothesis updating**). It is **not** a black-box machine learning model, a formal statistical prior/likelihood Bayesian network, or an unconstrained LLM prompt chain.

The engine treats an incorrect answer as **evidence, not automatically a diagnosis**. Its goal is to systematically accumulate evidence across diagnostic interactions, dynamically adjust belief distributions across competing misconception hypotheses, and verify whether targeted remediation successfully resolves the root conceptual error.

```text
Student Interaction
        │
        ▼ (Answer + Confidence 1-5)
┌────────────────────────────────────────────────────────┐
│             Deterministic Diagnostic Engine            │
│  - Hypothesis Initialization & Normalization           │
│  - Evidence Weighting by Confidence                    │
│  - Evidence-Weighted Probability Update: P(H|E)        │
│  - Diagnostic Question Scoring (Separation * Relevance)│
│  - Confirmation Gating (P > 0.60 AND Delta >= 0.20)    │
│  - Different-Form Verification Evaluation              │
└────────────────────────────────────────────────────────┘
        │
        ▼
Candidate for Confirmation ──► Self-Consistency Simulation Check (LLM)
                                           │
                                           ▼
                                 Confirmed Misconception
```

---

## 2. What is a Misconception Hypothesis?

A **Misconception Hypothesis** ($H_i$) represents a specific, structured explanation of why a student made an error, rather than just noting that an answer was incorrect.

Each hypothesis holds:
- **`id`**: Unique machine-readable identifier (e.g., `force_acceleration_confusion`).
- **`label`**: Pedagogical title (e.g., *"Force Required to Maintain Motion"*).
- **`probability`**: The current probability ($0.0 \le P(H_i) \le 1.0$).
- **`category`**: Error classification (`conceptual`, `calculation`, `careless_reading`, `formula_confusion`).
- **`evidence_count`**: Number of independent questions where the student's behavior matched this hypothesis.

Across any active diagnostic session with $k$ competing hypotheses:
$$\sum_{i=1}^{k} P(H_i) = 1.0$$

---

## 3. Evidence-Weighted Hypothesis Updating

When a student answers a question, the application checks which distractor was chosen. Each question has a pedagogical mapping from distractor keys to misconception hypotheses:
$$\text{distractor\_misconceptions}: \{\text{'A'}: H_1, \text{'C'}: H_2\}$$

The probability distribution is updated deterministically via confidence-weighted probabilistic hypothesis updating:
$$P_{\text{new}}(H_i) = \frac{P_{\text{old}}(H_i) \times W(E \mid H_i)}{\sum_{j=1}^{k} \big[P_{\text{old}}(H_j) \times W(E \mid H_j)\big]}$$

Where $W(E \mid H_i)$ is the **deterministic evidence weight**.

---

## 4. Confidence Weighting ($c \in \{1, 2, 3, 4, 5\}$)

Student confidence is captured on a 1 to 5 scale:
- $1$ = Complete guess / lowest confidence
- $3$ = Moderate certainty
- $5$ = Absolute conviction / highest confidence

### Evidence Weight Formulation

The engine guarantees that evidential strength is **strictly monotonic** with confidence ($5 > 4 > 3 > 2 > 1$):

1. **Supporting Evidence ($H_i$ matches selected distractor):**
   $$W_{\text{match}}(c) = 1.0 + (0.30 \times c)$$
   - $c = 1 \implies W = 1.30$ (weak support for guess)
   - $c = 3 \implies W = 1.90$
   - $c = 5 \implies W = 2.50$ (maximum evidential weight)

2. **Contradictory Evidence ($H_i$ did not match, but a competing hypothesis $H_j$ did):**
   $$W_{\text{contradict}}(c) = \max\left(0.15, \, 1.0 - (0.10 \times c)\right)$$
   - $c = 1 \implies W = 0.90$ (slight dampening)
   - $c = 3 \implies W = 0.70$
   - $c = 5 \implies W = 0.50$ (strong dampening when student is very certain about an alternative error)

3. **Neutral Evidence (untracked distractor or neutral response):**
   $$W_{\text{neutral}} = 1.0$$

*Guarantee: Weights are strictly positive ($W > 0$), preventing negative probabilities or mathematical collapse.*

---

## 5. Deterministic Diagnostic Question Selection

The system **never** relies on an LLM to randomly pick questions. Instead, every candidate question is scored deterministically:

$$\text{Score}(Q) = \text{Separation}(Q) \times \text{ConceptRelevance}(Q) \times \text{ConfidenceGap}(Q)$$

### A. Hypothesis Separation ($\text{Separation}(Q)$)
Measures how effectively question $Q$ contrasts the top two competing hypotheses ($H_{\text{top}}$ and $H_{\text{runner\_up}}$):
- **$1.00$**: Question directly contrasts both $H_{\text{top}}$ and $H_{\text{runner\_up}}$ (both appear in distractor mappings or diagnostic targets).
- **$0.55$**: Question targets either $H_{\text{top}}$ or $H_{\text{runner\_up}}$.
- **$0.25$**: Question targets an active lower hypothesis.
- **$0.05$**: Question targets none of the active hypotheses.

### B. Concept Relevance ($\text{ConceptRelevance}(Q)$)
- **$1.00$**: Exact concept match (e.g., *"Newton's First Law"*).
- **$0.70$**: Same parent topic (e.g., *"Newton's Laws"*).
- **$0.20$**: Distant topic.

### C. Confidence Gap Modifier ($\text{ConfidenceGap}(Q)$)
Adjusts difficulty to student cognitive state:
- High confidence error ($c \ge 4$): Student holds an entrenched misconception; medium/hard discrimination question receives a **$1.20$** bonus.
- Low confidence error ($c \le 2$): Student was guessing; foundational easy/medium question receives a **$1.20$** bonus.
- Otherwise: Neutral **$1.00$**.

### Tie-Breaking
When candidate questions receive identical scores, ties are broken **deterministically by unique question ID** (never pseudo-random choice).

---

## 6. Confirmation Gating Rule

A hypothesis transitions from active investigation to a **Candidate for Confirmation** if and only if both conditions are satisfied:

$$P(H_{\text{top}}) > 0.60 \quad \text{AND} \quad \big(P(H_{\text{top}}) - P(H_{\text{runner\_up}})\big) \ge 0.20$$

### Why Confirmation Gate $\ne$ Final Confirmation
Reaching this gate does **not** instantly mark a misconception as confirmed.
The system maintains strict state separation:
$$\text{diagnosing} \longrightarrow \text{candidate\_for\_confirmation} \longrightarrow \text{confirmed}$$

The gate certifies that the quantitative evidence strongly favors $H_{\text{top}}$. The system then invokes the **Self-Consistency Simulation** (an LLM simulating a student with $H_{\text{top}}$). Only when the simulated behavioral rationale matches the student's observed choices is the misconception promoted to **`CONFIRMED`**.

---

## 7. Verification: Resolved vs. Persistent

Following targeted conceptual remediation, the student is served a **different-form verification question**:
- Tests the **exact same underlying concept**.
- Uses an **altered physical scenario or different representation** (e.g., an elevator cable tension problem instead of a deep-space coasting probe) to prevent superficial pattern memorization.

Evaluation logic:
- **`RESOLVED`**: Student selects the correct option. The conceptual mental model has been repaired.
- **`PERSISTENT`**: Student selects an incorrect option (especially the distractor matching the diagnosed misconception). The student requires further intervention.

---

## 8. "Same Score, Different Misconception" Demonstration

Two students can start with the **exact same initial question**, both score $0 / 1$ (both answer wrong), yet be diagnosed with completely different cognitive root causes:

| Aspect | Student A | Student B |
| :--- | :--- | :--- |
| **Initial Question** | *Newton's 1st Law (Spacecraft coasting)* | *Newton's 1st Law (Spacecraft coasting)* |
| **Initial Score** | $0 / 1$ (Incorrect) | $0 / 1$ (Incorrect) |
| **Selected Distractor** | Option A: *"Continuous forward force needed"* | Option C: *"Force needed to overcome inertia"* |
| **Top Hypothesis** | `force_acceleration_confusion` | `mass_inertia_resistance` |
| **Diagnostic Question** | Hockey puck on frictionless ice | Drifting 500 kg crate in zero-g |
| **Diagnostic Choice** | Chooses stick force stored in puck | Chooses inertia pushes back |
| **Confirmation Gate** | Passed ($P > 0.60, \Delta \ge 0.20$) | Passed ($P > 0.60, \Delta \ge 0.20$) |
| **Diagnosis** | **Force-Acceleration Conflation** | **Inertia as Active Resistance** |
| **Remediation** | Net force causes $\Delta v$ (acceleration), not $v$ | Inertia is passive mass, not an opposing force |
| **Verification Q** | Elevator tension at constant speed | Large vs small asteroid in zero-g |
| **Outcome** | `RESOLVED` | `RESOLVED` |

*Verified end-to-end in automated test suite: `backend/tests/test_demo_story.py`.*
