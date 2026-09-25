# Shared Data Contracts & API Specification
### Project: Misconception Mapper (MM) | Team: The First Light

This document specifies the exact JSON schemas and REST API endpoints agreed upon for communication between the FastAPI backend, the React frontend, and internal services.

---

## 📐 Core Entity Models

### 1. Question Schema
Every question (diagnostic or verification) includes structured distractor metadata linking options directly to potential misconceptions.

```json
{
  "id": "q_newton_01",
  "concept": "Newton's First Law",
  "topic": "Newton's Laws",
  "prerequisite": "Inertia and Velocity Concepts",
  "difficulty": "medium", // "easy" | "medium" | "hard"
  "question_type": "standard", // "standard" | "diagnostic" | "verification"
  "question_text": "A spacecraft is drifting in deep interstellar space far from any gravitational source with engines turned off. What force is required to keep it moving at a constant speed of 10,000 km/h?",
  "options": {
    "A": "A continuous forward thrust equal to its mass times speed.",
    "B": "Zero net force.",
    "C": "A small periodic force to overcome cosmic inertia.",
    "D": "A force proportional to its kinetic energy."
  },
  "correct_option": "B",
  "distractor_misconceptions": {
    "A": "misc_impetus_force_required_for_motion",
    "C": "misc_inertia_as_resistance_force",
    "D": "misc_energy_force_conflation"
  },
  "explanation": "According to Newton's First Law, an object in uniform motion continues in motion with constant velocity unless acted upon by a net external force. In frictionless space, zero force is needed."
}
```

---

### 2. Misconception Hypothesis & State
Tracks probabilistic belief in candidate misconceptions throughout a diagnostic session.

```json
{
  "misconception_id": "misc_impetus_force_required_for_motion",
  "name": "Impetus & Constant Force Misconception",
  "category": "conceptual", // "conceptual" | "calculation" | "careless_reading" | "formula_confusion"
  "description": "Belief that sustained motion always requires an active, continuous net force in the direction of motion.",
  "probability": 0.74,
  "evidence_count": 2,
  "status": "candidate" // "candidate" | "confirmed" | "eliminated"
}
```

---

### 3. Explainable Diagnosis Summary
Delivered when a hypothesis satisfies both the confirmation threshold and the self-consistency check.

```json
{
  "confirmed": true,
  "primary_misconception": {
    "id": "misc_impetus_force_required_for_motion",
    "name": "Force Required to Maintain Motion",
    "description": "Student believes a continuous forward force is required to sustain constant velocity.",
    "confidence_score": 0.82
  },
  "evidence": [
    {
      "step": 1,
      "question_id": "q_newton_01",
      "observation": "Selected Option A (continuous thrust) with high confidence (5/5).",
      "signal": "distractor_match"
    },
    {
      "step": 2,
      "question_id": "q_diag_newton_02",
      "observation": "Selected Option C predicting puck stops when pushing hand releases.",
      "signal": "hypothesis_reinforcement"
    },
    {
      "step": 3,
      "simulation": "self_consistency",
      "observation": "Simulated student with this misconception produced identical response pattern to real student.",
      "signal": "consistency_confirmed"
    }
  ],
  "alternatives": [
    {
      "name": "Inertia as active resistive force",
      "probability": 0.11
    },
    {
      "name": "Energy-force confusion",
      "probability": 0.07
    }
  ]
}
```

---

## 🌐 REST API Endpoints

### 1. Create Session
**`POST /session`**

Initializes a new diagnostic session for a student.

* Request:
```json
{
  "student_id": "student_101",
  "topic": "Newton's Laws",
  "mode": "adaptive_diagnosis" // "adaptive_diagnosis" | "exam_mode"
}
```

* Response:
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "student_id": "student_101",
  "topic": "Newton's Laws",
  "status": "in_progress",
  "created_at": "2026-09-24T22:00:00Z"
}
```

---

### 2. Generate / Retrieve Quiz
**`POST /generate-quiz`**

Retrieves an initial diagnostic set for a topic. Drawn from high-fidelity curated seed data or generated dynamically if configured.

* Request:
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "topic": "Newton's Laws",
  "count": 3
}
```

* Response:
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "questions": [
    {
      "id": "q_newton_01",
      "concept": "Newton's First Law",
      "question_text": "A spacecraft is drifting in deep interstellar space...",
      "options": {
        "A": "A continuous forward thrust equal to its mass times speed.",
        "B": "Zero net force.",
        "C": "A small periodic force to overcome cosmic inertia.",
        "D": "A force proportional to its kinetic energy."
      }
    }
  ]
}
```

---

### 3. Submit Student Answer & Confidence
**`POST /submit-answer`**

The core submission endpoint. Executes deterministic probability updates, threshold evaluation, and optional self-consistency check.

* Request:
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "question_id": "q_newton_01",
  "selected_option": "A",
  "confidence": 5 // Integer between 1 and 5
}
```

* Response (Scenario A: Answer is Correct):
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "evaluation": "correct",
  "state": "mastery_updated",
  "mastery_level": 0.85,
  "next_question": {
    "id": "q_newton_02",
    "question_text": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." }
  }
}
```

* Response (Scenario B: Answer is Wrong - Gathering Evidence / Diagnostic Required):
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "evaluation": "incorrect",
  "state": "diagnosing",
  "active_hypotheses": [
    {
      "misconception_id": "misc_impetus_force_required_for_motion",
      "name": "Force Required to Maintain Motion",
      "probability": 0.52
    },
    {
      "misconception_id": "misc_inertia_as_resistance_force",
      "name": "Inertia Treated as Active Resistance",
      "probability": 0.31
    },
    {
      "misconception_id": "misc_energy_force_conflation",
      "name": "Energy-Force Conflation",
      "probability": 0.17
    }
  ],
  "next_question": {
    "id": "q_diag_newton_02",
    "concept": "Newton's First Law",
    "question_type": "diagnostic",
    "question_text": "An air-hockey puck glides along a frictionless surface after being given a quick push. Immediately after the hand loses contact with the puck, what horizontal forces act on it?",
    "options": {
      "A": "Only the forward force supplied by the hand's original push.",
      "B": "No horizontal forces.",
      "C": "Both the forward force and inertia resisting motion.",
      "D": "A diminishing force that drops to zero when it reaches the wall."
    }
  }
}
```

* Response (Scenario C: Misconception Confirmed):
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "evaluation": "incorrect",
  "state": "confirmed",
  "diagnosis": {
    "confirmed": true,
    "primary_misconception": {
      "id": "misc_impetus_force_required_for_motion",
      "name": "Force Required to Maintain Motion",
      "description": "Student believes a continuous forward force is required to sustain constant velocity.",
      "confidence_score": 0.82
    },
    "evidence": [
      {
        "step": 1,
        "question_id": "q_newton_01",
        "observation": "Selected Option A (continuous thrust) with confidence 5/5.",
        "signal": "distractor_match"
      },
      {
        "step": 2,
        "question_id": "q_diag_newton_02",
        "observation": "Selected Option A (force of hand remains) with confidence 4/5.",
        "signal": "hypothesis_reinforcement"
      },
      {
        "step": 3,
        "simulation": "self_consistency",
        "observation": "Simulated student agent predicted identical choice pattern.",
        "signal": "consistency_confirmed"
      }
    ],
    "alternatives": [
      { "name": "Inertia Treated as Active Resistance", "probability": 0.12 },
      { "name": "Energy-Force Conflation", "probability": 0.06 }
    ]
  }
}
```

---

### 4. Generate Remediation
**`POST /remediate`**

Generates targeted remediation specifically addressing the confirmed misconception.

* Request:
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "misconception_id": "misc_impetus_force_required_for_motion",
  "use_rag": true // boolean, defaults to true
}
```

* Response:
```json
{
  "misconception_id": "misc_impetus_force_required_for_motion",
  "remediation_title": "Understanding Motion: Why Forces Cause Acceleration, Not Velocity",
  "remediation_text": "In daily life, moving objects (like a rolling ball) stop because friction and air resistance are opposing forces. This creates the illusion that continuous force is needed to keep things moving. However, Newton's First Law teaches us that motion itself does not require a cause—only a *change* in motion (acceleration or deceleration) requires a net force.",
  "key_takeaway": "Net force produces acceleration (F = ma). If acceleration is zero, net force is zero, even if the object is moving at 1,000,000 km/h.",
  "grounded": true,
  "grounded_source": "sample_physics_notes.pdf — Page 2",
  "page_number": 2,
  "sources": [
    {
      "document_id": "doc_4a737f9e830c",
      "document_name": "sample_physics_notes.pdf",
      "page_number": 2,
      "excerpt": "Inertia is not a force. It is the inherent resistance of matter to any change in its velocity...",
      "similarity_score": 0.89
    }
  ]
}
```

---

### 4b. RAG Study Materials Ingestion & Management
**`POST /rag/upload`** (multipart/form-data)
Uploads and indexes course materials (.pdf, .txt, .md).
* Form fields: `file` (binary), `topic` (string, optional)
* Response:
```json
{
  "document_id": "doc_4a737f9e830c",
  "filename": "sample_physics_notes.pdf",
  "page_count": 3,
  "chunk_count": 7,
  "status": "ready",
  "message": "Successfully ingested 'sample_physics_notes.pdf' (3 pages, 7 chunks)."
}
```

**`GET /rag/documents`**
Lists all indexed curriculum reference documents.
* Query parameter: `topic` (optional)
* Response:
```json
{
  "total": 1,
  "documents": [
    {
      "id": "doc_4a737f9e830c",
      "filename": "sample_physics_notes.pdf",
      "file_size_bytes": 10594,
      "page_count": 3,
      "chunk_count": 7,
      "status": "ready",
      "topic": "Newton's Laws",
      "uploaded_at": "2026-09-24T18:00:00Z"
    }
  ]
}
```

**`DELETE /rag/documents/{document_id}`**
Deletes document record from SQLite and vector chunks from ChromaDB.

---

### 5. Verify Remediation
**`POST /verify`**

Presents a different-form question testing the same core concept in an altered context (e.g. graphical, numerical, or inverted scenario) to check if the misconception is resolved.

* Request:
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "misconception_id": "misc_impetus_force_required_for_motion",
  "question_id": "q_verify_newton_03",
  "selected_option": "B"
}
```

* Response:
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "misconception_id": "misc_impetus_force_required_for_motion",
  "status": "resolved", // "resolved" | "persistent"
  "explanation": "Excellent! You correctly recognized that an elevator moving at constant upward speed has balanced forces (zero net force), confirming you have overcome the impetus misconception.",
  "knowledge_map_update": {
    "concept": "Newton's First Law",
    "misconception": "Force Required to Maintain Motion",
    "previous_status": "developing",
    "current_status": "resolved"
  }
}
```

---

### 6. Student Dashboard & Analytics
**`GET /dashboard/{session_id}`**

Returns summary metrics, performance overview, and confidence calibration.

* Response:
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "total_questions_attempted": 5,
  "accuracy_rate": 0.60,
  "overall_mastery": 0.78,
  "misconceptions_identified": 1,
  "misconceptions_resolved": 1,
  "confidence_calibration": {
    "high_confidence_correct": 2,
    "high_confidence_incorrect": 1,
    "low_confidence_correct": 1,
    "low_confidence_incorrect": 1,
    "calibration_index": 0.72
  },
  "error_breakdown": {
    "conceptual": 1,
    "calculation": 0,
    "careless_reading": 0,
    "overconfidence_errors": 1
  }
}
```

---

### 7. Knowledge-Gap Map
**`GET /knowledge-map/{session_id}`**

Returns hierarchical node-edge data for rendering in React Flow or interactive SVG visualizers.

* Response:
```json
{
  "topic": "Newton's Laws",
  "nodes": [
    {
      "id": "concept_n1",
      "type": "concept",
      "label": "Newton's First Law",
      "status": "mastered",
      "mastery_score": 0.85
    },
    {
      "id": "misc_impetus",
      "type": "misconception",
      "label": "Force Needed for Constant Motion",
      "status": "resolved", // "persistent" | "developing" | "resolved"
      "parent_concept_id": "concept_n1"
    }
  ],
  "edges": [
    { "source": "concept_n1", "target": "misc_impetus", "type": "sub_gap" }
  ]
}
```

---

### 8. Revision List
**`GET /revision-list/{session_id}`**

Returns prioritized concepts and unresolved misconceptions for targeted student review.

* Response:
```json
{
  "session_id": "sess_8f9c2d1b-3e5a-4b7f",
  "revision_items": [
    {
      "concept": "Newton's First Law",
      "misconception": "Force Required to Maintain Motion",
      "status": "resolved",
      "recommended_review_in_days": 3,
      "summary": "Remember that net force causes acceleration, not velocity."
    }
  ]
}
```

---

### 9. Teacher Overview & Analytics
**`GET /teacher/overview`**

Returns high-level class metrics, active gap counts, calibration breakdown, and students requiring intervention.

* Response:
```json
{
  "total_students": 12,
  "average_mastery": 0.64,
  "active_knowledge_gaps": 9,
  "persistent_misconceptions": 5,
  "class_accuracy": 0.58,
  "confidence_calibration": {
    "high_confidence_correct": 12,
    "high_confidence_incorrect": 7,
    "low_confidence_correct": 3,
    "low_confidence_incorrect": 2,
    "calibration_index": 0.58
  },
  "students_requiring_attention": [
    {
      "student_id": "student_demo_08",
      "name": "Hassan Ali",
      "topic": "Newton's Laws",
      "mastery_score": 0.32,
      "accuracy_rate": 0.25,
      "active_gaps": 3,
      "persistent_misconceptions": 2,
      "calibration_status": "Overconfident",
      "last_active": "Recently"
    }
  ],
  "recent_activity": []
}
```

---

### 10. Teacher Students List & Detail
**`GET /teacher/students`**
**`GET /teacher/students/{student_id}`**

Returns class cohort summary table or detailed longitudinal diagnostic profile for a specific student.

---

### 11. Teacher Misconceptions & Heatmap
**`GET /teacher/misconceptions`**

Returns 2D matrix of concepts vs misconception categories with frequencies and student counts.

---

### 12. Same-Score / Different-Misconception Demonstration
**`GET /demo/same-score`**

Returns side-by-side divergent cognitive trajectories for Student A and Student B, demonstrating that identical scores (0/1) mask fundamentally divergent mental models requiring distinct interventions.

---

### 13. Exam Mode API Endpoints

#### `POST /exam`
Creates a timed exam session with strictly 10, 12, or 15 questions and server-authoritative countdown timing.
For `"Comprehensive Science"`, questions are evenly sampled from Newton's Laws, Kinematics, and Chemical Bonding.

**Request:**
```json
{
  "topic": "Comprehensive Science",
  "question_count": 12,
  "time_limit_minutes": 20,
  "student_id": "stud_01"
}
```

**Response:**
```json
{
  "exam_id": "exam_8fa7210e7b8c",
  "student_id": "stud_01",
  "topic": "Comprehensive Science",
  "total_questions": 12,
  "time_limit_minutes": 20,
  "started_at": "2026-09-25T06:00:00Z",
  "remaining_seconds": 1200,
  "status": "in_progress",
  "questions": [
    {
      "id": "chem_bond_q01",
      "order_index": 1,
      "concept": "Ionic vs Covalent Bonding Nature",
      "topic": "Chemical Bonding",
      "question_text": "Why does molten NaCl conduct electricity whereas liquid CCl4 does not?",
      "options": {
        "A": "NaCl contains free delocalized electrons in the liquid state.",
        "B": "NaCl dissociates into freely mobile ions (Na+ and Cl-), whereas CCl4 consists of neutral covalent molecules.",
        "C": "CCl4 has ionic bonds that are too strong to allow ion migration.",
        "D": "NaCl undergoes electrolysis spontaneously without an electric field."
      }
    }
  ],
  "attempts": [
    {
      "question_id": "chem_bond_q01",
      "order_index": 1,
      "selected_option": null,
      "confidence": null,
      "is_marked_for_review": false,
      "time_spent_seconds": 0
    }
  ]
}
```

#### `GET /exam/{exam_id}`
Returns the current exam state and server-authoritative `remaining_seconds`.

#### `POST /exam/{exam_id}/answer`
Saves student selection, confidence level (1–5), mark-for-review flag, or time spent.

**Request:**
```json
{
  "question_id": "chem_bond_q01",
  "selected_option": "B",
  "confidence": 4,
  "is_marked_for_review": false,
  "time_spent_seconds": 32
}
```

#### `POST /exam/{exam_id}/submit`
Submits exam and runs deterministic diagnostic post-mortem.

**Response:**
```json
{
  "exam_id": "exam_8fa7210e7b8c",
  "status": "submitted",
  "score": 9,
  "total": 12,
  "percentage": 75.0,
  "time_taken_seconds": 780
}
```

#### `GET /exam/{exam_id}/report`
Returns comprehensive post-mortem report answering *"Why did I lose marks?"* with error taxonomy, confirmed misconceptions, concept mastery, and question-by-question audit.

#### `GET /teacher/exams`
Returns cohort completed exam submissions and post-mortem summaries for teacher analytics.


