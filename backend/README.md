# Backend — Misconception Mapper (MM)

FastAPI-based deterministic diagnostic engine, session management, and LLM orchestration layer.

## Architecture Highlights
- **Deterministic State Engine**: Owns all confidence-weighted probabilistic hypothesis updates, evidence accumulation, diagnostic question scoring, threshold checks, and mastery state.
- **LLM Service Layer**: Groq (primary) and Gemini (fallback) for question generation, hypothesis generation, self-consistency simulations, and targeted remediation.
- **Database**: SQLite database for session and response logging.
- **Seed Datasets**: Curated high-fidelity diagnostic items for Newton's Laws, Kinematics, and Chemical Bonding.
