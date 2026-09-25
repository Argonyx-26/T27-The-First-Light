"""
FastAPI REST API router implementing core contracts from shared/schemas.md.
"""

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.api.schemas import (
    ActiveSessionListResponse,
    ActiveSessionSummary,
    AlternativeHypothesis,
    ConfidenceCalibration,
    CreateSessionRequest,
    CreateSessionResponse,
    DailyRevisionResponse,
    DashboardResponse,
    DiagnosisSummary,
    DocPreviewResponse,
    DocumentListResponse,
    DocumentMetadata,
    ErrorBreakdown,
    EvidenceItem,
    GenerateDocQuizRequest,
    GenerateQuizRequest,
    GenerateQuizResponse,
    KnowledgeMapEdge,
    KnowledgeMapNode,
    KnowledgeMapResponse,
    PrimaryMisconceptionDiagnosis,
    QuizHistoryItem,
    RAGUploadResponse,
    RemediateRequest,
    RemediateResponse,
    RevisionItem,
    RevisionListResponse,

    SameScoreDemoResponse,
    SessionDetailResponse,
    SourceItem,
    StudentDetailProfileResponse,
    StudentHistoryResponse,
    StudentSummary,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    TeacherAnalyticsResponse,
    TeacherMisconceptionsResponse,
    TeacherOverviewResponse,
    TeacherStudentsResponse,
    VerifyRequest,
    VerifyResponse,
    VideoSnippet,
    CreateExamRequest,
    ExamAttemptView,
    ExamMisconceptionItem,
    ExamQuestionReportDetail,
    ExamQuestionView,
    ExamReportResponse,
    ExamSessionResponse,
    SaveExamAnswerRequest,
    SubmitExamResponse,
    TeacherExamSummary,
    TeacherExamsResponse,
    LossAttributionResponse,
    MisconceptionJourneyResponse,
    CalibrationTrendPoint,
    CalibrationTrendResponse,
    TopicHistoryGroup,
    ExamHistoryItem,
)
from app.core.config import settings
from app.db.cohort_seed import DEMO_STUDENTS, seed_cohort_if_needed
from app.db.database import get_db
from app.db.models import (
    AttemptModel,
    EvidenceRecordModel,
    ExamSessionModel,
    ExamAttemptModel,
    MisconceptionStateModel,
    QuestionModel,
    RemediationRecordModel,
    SessionModel,
)
from app.db.repositories import (
    attempt_repository as attempt_repo,
    document_repository as doc_repo,
    exam_repository as exam_repo,
    misconception_repository as misc_repo,
    question_repository as question_repo,
    session_repository as session_repo,
)
from app.engine.models import Question
from app.engine.exam_diagnostic import analyze_exam_submission, compute_longitudinal_loss_attribution
from app.engine.journey_engine import compute_misconception_journey
from app.engine.learning_path_engine import compute_learning_path, compute_calibration_trend
from app.engine.hypothesis_engine import (
    check_confirmation_gate,
    get_top_hypotheses,
    initialize_hypotheses,
    rank_hypotheses,
    update_hypotheses,
)
from app.engine.question_selector import select_best_diagnostic_question
from app.engine.revision_engine import compose_daily_revision_set, get_prioritized_revision_list
from app.engine.verification import evaluate_verification
from app.llm.client import LLMClient, default_llm_client, generate_default_visual_svg
from app.llm.self_consistency_service import SelfConsistencyService


import sys
root_dir = Path(__file__).resolve().parent.parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
if "rag" in sys.modules and not hasattr(sys.modules["rag"], "__file__"):
    sys.modules.pop("rag", None)

try:
    from rag.retrieval.retriever import default_rag_retriever
    from rag.ingestion.pipeline import default_ingestion_pipeline
    from rag.ingestion.pdf_loader import DocumentLoader
    from rag.storage.chroma import default_chroma_store
    from rag.schemas import DocumentChunk, RetrievedChunk
except ImportError:
    default_rag_retriever = None
    default_ingestion_pipeline = None
    DocumentLoader = None
    default_chroma_store = None
    DocumentChunk = None
    RetrievedChunk = None


logger = logging.getLogger(__name__)

router = APIRouter()


def get_llm_client() -> LLMClient:
    return default_llm_client


def get_self_consistency_service(
    client: LLMClient = Depends(get_llm_client),
) -> SelfConsistencyService:
    return SelfConsistencyService(llm_client=client)


# ==============================================================================
# 1. POST /session
# ==============================================================================
@router.post("/session", response_model=CreateSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    req: CreateSessionRequest,
    db: Session = Depends(get_db),
):
    session = session_repo.create_session(
        db=db,
        topic=req.topic,
        student_id=req.student_id,
        mode=req.mode,
        session_length=req.session_length,
    )
    return CreateSessionResponse(
        session_id=session.id,
        student_id=session.student_id,
        topic=session.topic,
        status=session.status,
        session_length=session.session_length,
        created_at=session.created_at.isoformat(),
    )


# ==============================================================================
# 1B. Session Management (Pause, Resume, Active Sessions List, End)
# ==============================================================================
@router.get("/sessions/active", response_model=ActiveSessionListResponse)
def list_active_sessions(
    student_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    sessions = session_repo.list_active_sessions(db, student_id=student_id)
    summaries = []
    for s in sessions:
        attempts = attempt_repo.get_session_attempts(db, s.id)
        evidence = misc_repo.get_session_evidence(db, s.id)
        hyps = misc_repo.get_session_hypotheses(db, s.id)
        summaries.append(
            ActiveSessionSummary(
                session_id=s.id,
                student_id=s.student_id,
                topic=s.topic,
                status=s.status,
                session_length=s.session_length,
                current_question_index=len(attempts) + 1,
                evidence_count=len(evidence),
                active_hypotheses_count=len(hyps),
                mastery_score=s.mastery_score,
                updated_at=s.updated_at.isoformat() if s.updated_at else s.created_at.isoformat(),
            )
        )
    return ActiveSessionListResponse(sessions=summaries)


@router.get("/session/{session_id}", response_model=SessionDetailResponse)
def get_session_detail(
    session_id: str,
    db: Session = Depends(get_db),
):
    session = session_repo.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")

    attempts = attempt_repo.get_session_attempts(db, session_id)
    evidence = misc_repo.get_session_evidence(db, session_id)
    hyps = misc_repo.get_session_hypotheses(db, session_id)

    curr_q = None
    if session.current_question_id:
        curr_q = question_repo.get_question_by_id(db, session.current_question_id)
    if not curr_q:
        candidates = question_repo.list_questions(db, topic=session.topic, limit=1)
        curr_q = candidates[0] if candidates else None

    return SessionDetailResponse(
        session_id=session.id,
        student_id=session.student_id,
        topic=session.topic,
        status=session.status,
        mode=session.mode,
        session_length=session.session_length,
        current_question_index=len(attempts) + 1,
        mastery_score=session.mastery_score,
        current_question=curr_q,
        active_hypotheses=hyps,
        evidence_count=len(evidence),
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat() if session.updated_at else session.created_at.isoformat(),
    )


@router.post("/session/{session_id}/pause", response_model=SessionDetailResponse)
def pause_session(
    session_id: str,
    db: Session = Depends(get_db),
):
    session = session_repo.update_session(db, session_id, status="paused")
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")
    return get_session_detail(session_id, db)


@router.post("/session/{session_id}/resume", response_model=SessionDetailResponse)
def resume_session(
    session_id: str,
    db: Session = Depends(get_db),
):
    session = session_repo.update_session(db, session_id, status="in_progress")
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")
    return get_session_detail(session_id, db)


@router.post("/session/{session_id}/end", response_model=SessionDetailResponse)
def end_session(
    session_id: str,
    db: Session = Depends(get_db),
):
    existing = session_repo.get_session(db, session_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")

    attempts = attempt_repo.get_session_attempts(db, session_id)
    if attempts:
        correct_count = sum(1 for a in attempts if a.is_correct)
        computed_score = round((correct_count / len(attempts)) * 100.0, 1)
    else:
        computed_score = round(existing.mastery_score * 100.0, 1) if existing.mastery_score <= 1.0 else round(existing.mastery_score, 1)

    session = session_repo.update_session(
        db,
        session_id,
        status="completed",
        final_score=computed_score,
        completed_at=datetime.utcnow(),
    )
    return get_session_detail(session_id, db)


# ==============================================================================
# 1C. GET /history/{student_id}
# ==============================================================================
@router.get("/history/{student_id}", response_model=StudentHistoryResponse)
def get_student_history(
    student_id: str,
    db: Session = Depends(get_db),
):
    sessions = session_repo.list_completed_sessions(db, student_id=student_id)
    history_items: list[QuizHistoryItem] = []

    for s in sessions:
        attempts = attempt_repo.get_session_attempts(db, s.id)
        if s.final_score is not None:
            score = round(s.final_score, 1)
        elif attempts:
            correct_count = sum(1 for a in attempts if a.is_correct)
            score = round((correct_count / len(attempts)) * 100.0, 1)
        else:
            score = round(s.mastery_score * 100.0, 1) if s.mastery_score <= 1.0 else round(s.mastery_score, 1)

        q_count = s.session_length if s.session_length is not None else (len(attempts) if attempts else 1)
        dt = s.completed_at or s.updated_at or s.created_at
        date_str = dt.strftime("%Y-%m-%d %H:%M") if dt else "Recent"

        history_items.append(
            QuizHistoryItem(
                session_id=s.id,
                topic=s.topic,
                question_count=q_count,
                score=score,
                date=date_str,
                status=s.status,
            )
        )

    # Group by topic
    topic_map: dict[str, list[QuizHistoryItem]] = {}
    for item in history_items:
        topic_map.setdefault(item.topic, []).append(item)

    topics_grouped: list[TopicHistoryGroup] = []
    for topic_name, items in topic_map.items():
        avg = round(sum(it.score for it in items) / len(items), 1) if items else 0.0
        topics_grouped.append(
            TopicHistoryGroup(
                topic=topic_name,
                attempt_count=len(items),
                average_score=avg,
                latest_date=items[0].date if items else "",
                attempts=items,
            )
        )

    # Query completed exams for this student
    exam_records = (
        db.query(ExamSessionModel)
        .join(SessionModel, ExamSessionModel.session_id == SessionModel.id)
        .filter(SessionModel.student_id == student_id)
        .order_by(ExamSessionModel.created_at.desc())
        .all()
    )
    exam_items: list[ExamHistoryItem] = []
    for ex in exam_records:
        dt = ex.submitted_at or ex.created_at
        date_str = dt.strftime("%Y-%m-%d %H:%M") if dt else "Recent"
        time_taken = 0
        if ex.diagnostic_report_json:
            try:
                rep = json.loads(ex.diagnostic_report_json)
                time_taken = rep.get("total_time_seconds", 0)
            except Exception:
                time_taken = 0
        exam_items.append(
            ExamHistoryItem(
                exam_id=ex.id,
                topic=ex.topic,
                score=ex.score or 0,
                total_questions=ex.total_questions or ex.question_count,
                percentage=ex.percentage or 0.0,
                accuracy=ex.accuracy or 0.0,
                time_taken_seconds=time_taken,
                date=date_str,
                status=ex.status,
            )
        )

    return StudentHistoryResponse(
        student_id=student_id,
        total_completed=len(history_items) + len(exam_items),
        topics=topics_grouped,
        history=history_items,
        exams=exam_items,
    )


# ==============================================================================
# 2. POST /generate-quiz
# ==============================================================================
@router.post("/generate-quiz", response_model=GenerateQuizResponse)
async def generate_quiz(
    req: GenerateQuizRequest,
    db: Session = Depends(get_db),
    llm_client: LLMClient = Depends(get_llm_client),
):
    # Retrieve available questions for the requested topic
    questions = question_repo.list_questions(db, topic=req.topic, limit=req.count)

    # If topic does not have enough stored questions and Groq is active, generate via Groq
    if len(questions) < req.count and (settings.OPEN_ROUTER_API or settings.OPENROUTER_API_KEY or llm_client.mode == "live"):
        try:
            needed = req.count - len(questions)
            for _ in range(needed):
                gen_q = await llm_client.generate_question(topic=req.topic)
                if gen_q:
                    question_repo.save_question(db=db, question=gen_q)
                    questions.append(gen_q)
        except Exception as exc:
            logger.warning("Groq question generation fallback: %s", exc)

    if not questions:
        # Fallback to any questions if topic has no exact match
        questions = question_repo.list_questions(db, limit=req.count)

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No questions found for topic '{req.topic}'.",
        )

    # Attach initial question to session if session_id is provided
    if req.session_id:
        session = session_repo.get_session(db, req.session_id)
        if session and questions:
            session_repo.update_session(db, req.session_id, current_question_id=questions[0].id)

    return GenerateQuizResponse(
        session_id=req.session_id,
        questions=questions[: req.count],
    )


# ==============================================================================
# 3. POST /submit-answer
# ==============================================================================
@router.post("/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    req: SubmitAnswerRequest,
    db: Session = Depends(get_db),
    llm_client: LLMClient = Depends(get_llm_client),
    self_consistency_svc: SelfConsistencyService = Depends(get_self_consistency_service),
):
    # 1. Validation
    session = session_repo.get_session(db, req.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{req.session_id}' not found.")

    question = question_repo.get_question_by_id(db, req.question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question '{req.question_id}' not found.")

    if req.selected_option not in question.options:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid option '{req.selected_option}'. Valid options: {list(question.options.keys())}",
        )

    if req.confidence < 1 or req.confidence > 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Confidence must be between 1 and 5.")

    # 2. Evaluation
    is_correct = (req.selected_option == question.correct_option)
    matched_misconception_id = question.distractor_misconceptions.get(req.selected_option)

    # 3. Record Attempt
    attempt_repo.record_attempt(
        db=db,
        session_id=req.session_id,
        question_id=question.id,
        selected_option=req.selected_option,
        confidence=req.confidence,
        is_correct=is_correct,
        matched_misconception_id=matched_misconception_id,
    )

    # ==========================================================================
    # NEW LOGIC: Confidence based routing (Low confidence <= 3)
    # ==========================================================================
    if req.confidence <= 3 and session.status != "diagnosing":
        diag_id = "guessing" if is_correct else "incomplete_knowledge"
        diag_label = "Guessing / Needs Revision" if is_correct else "Incomplete Knowledge"
        diag_desc = (
            "You got it right, but your low confidence suggests you might have been guessing. Let's review the core concept." 
            if is_correct else 
            "Your low confidence indicates you aren't sure about this topic rather than holding a deep misconception. Let's study it."
        )
        
        misc_repo.record_evidence(db, req.session_id, question.id, diag_id, f"{'Correct' if is_correct else 'Incorrect'} with low confidence ({req.confidence}/5).")
        session_repo.update_session(db, req.session_id, status="confirmed", active_misconception_id=diag_id)
        
        from app.engine.models import DiagnosisSummary, PrimaryMisconceptionDiagnosis
        return SubmitAnswerResponse(
            session_id=req.session_id,
            status="confirmed",
            evaluation="correct" if is_correct else "incorrect",
            active_hypotheses=[],
            diagnosis=DiagnosisSummary(
                confirmed=True,
                primary_misconception=PrimaryMisconceptionDiagnosis(
                    id=diag_id,
                    name=diag_label,
                    description=diag_desc,
                    confidence_score=1.0,
                ),
                evidence=[],
                alternatives=[],
            )
        )

    # ==========================================================================
    # Scenario A: Student is CORRECT
    # ==========================================================================
    if is_correct and session.status != "diagnosing":
        new_mastery = min(1.0, round(session.mastery_score + 0.25, 2))
        session_repo.update_session(db, req.session_id, mastery_score=new_mastery)

        misc_repo.record_evidence(
            db=db,
            session_id=req.session_id,
            question_id=question.id,
            signal="correct_response",
            observation=f"Answered '{req.selected_option}' correctly with confidence {req.confidence}/5.",
        )

        # Select next standard question if available
        attempts = attempt_repo.get_session_attempts(db, req.session_id)
        attempted_ids = {a.question_id for a in attempts}
        candidates = question_repo.list_questions(db, topic=session.topic, question_type="standard")
        remaining = [q for q in candidates if q.id not in attempted_ids]
        next_q = remaining[0] if remaining else None

        if next_q:
            session_repo.update_session(db, req.session_id, current_question_id=next_q.id)

        return SubmitAnswerResponse(
            session_id=req.session_id,
            status="correct",
            evaluation="correct",
            mastery_level=new_mastery,
            next_question=next_q,
        )

    # ==========================================================================
    # Scenario B: Student is INCORRECT (or answering Diagnostic) -> Adaptive Diagnosis
    # ==========================================================================
    misc_repo.record_evidence(
        db=db,
        session_id=req.session_id,
        question_id=question.id,
        signal="distractor_match" if matched_misconception_id else ("correct_response" if is_correct else "incorrect_response"),
        observation=f"Selected Option {req.selected_option} with confidence {req.confidence}/5.",
    )

    # Load active session hypotheses from database
    current_hyps = misc_repo.get_session_hypotheses(db, req.session_id)

    # If no hypotheses exist yet for this session, formulate competing candidates
    if not current_hyps:
        # Use LLM client to propose candidates or fallback to question's known targets
        proposal = await llm_client.propose_hypotheses(question, req.selected_option, req.confidence)
        raw_candidates = [
            {"id": h.id, "label": h.label, "probability": h.initial_probability}
            for h in proposal.hypotheses
        ]
        if matched_misconception_id and not any(c["id"] == matched_misconception_id for c in raw_candidates):
            raw_candidates.insert(0, {
                "id": matched_misconception_id,
                "label": matched_misconception_id.replace("_", " ").title(),
                "probability": 0.5,
            })
        current_hyps = initialize_hypotheses(raw_candidates)

    # Update hypotheses using the deterministic engine
    updated_hyps = update_hypotheses(
        hypotheses=current_hyps,
        selected_option=req.selected_option,
        confidence=req.confidence,
        evidence_mapping=question.distractor_misconceptions,
    )

    # Persist updated hypothesis distribution
    misc_repo.save_or_update_hypotheses(db, req.session_id, updated_hyps, status="candidate")

    ranked = rank_hypotheses(updated_hyps)

    # === NEW LOGIC TO FORCE EXACTLY 2 FOLLOW UPS ===
    from app.engine.models import Hypothesis
    
    stored_evidence = misc_repo.get_session_evidence(db, req.session_id)
    diag_count = len(stored_evidence)
    
    is_eligible = False
    top_h = None
    if diag_count >= 3:
        is_eligible = True
        
        # Check if they got the last two follow-up questions correct
        # To determine if it was just a minor confusion
        from app.db.models import AttemptModel
        attempts = db.query(AttemptModel).filter(AttemptModel.session_id == req.session_id).order_by(AttemptModel.id.desc()).limit(2).all()
        if len(attempts) == 2 and all(a.is_correct for a in attempts):
            top_h = Hypothesis(
                id="no_misconception", 
                label="Minor Confusion", 
                probability=1.0, 
                description="You answered both follow-ups correctly. You just got a little confused on the initial question!"
            )
        else:
            top_h = ranked[0] if ranked else Hypothesis(id="unknown", label="Unknown", probability=1.0)
    # ================================================

    # ==========================================================================
    # Scenario C: Candidate Eligible for Confirmation (Exactly 2 follow-ups reached)
    # ==========================================================================
    if is_eligible and top_h:
        # Application code makes the final decision directly based on rule
        session_repo.update_session(
            db=db,
            session_id=req.session_id,
            status="confirmed",
            active_misconception_id=top_h.id,
        )
        misc_repo.update_misconception_status(db, req.session_id, top_h.id, "confirmed")

        # Collect stored evidence trail
        stored_evidence = misc_repo.get_session_evidence(db, req.session_id)
        evidence_items = [
            EvidenceItem(
                step=e.step_index,
                question_id=e.question_id,
                observation=e.observation,
                signal=e.signal,
            )
            for e in stored_evidence
        ]

        # Collect alternative hypotheses
        alternatives = [
            AlternativeHypothesis(name=h.label, probability=round(h.probability, 4))
            for h in ranked[1:]
        ]

        diagnosis_summary = DiagnosisSummary(
            confirmed=True,
            primary_misconception=PrimaryMisconceptionDiagnosis(
                id=top_h.id,
                name=top_h.label,
                description=top_h.description,
                confidence_score=round(top_h.probability, 4),
            ),
            evidence=evidence_items,
            alternatives=alternatives,
        )

        return SubmitAnswerResponse(
            session_id=req.session_id,
            status="confirmed",
            evaluation="incorrect",
            active_hypotheses=updated_hyps,
            diagnosis=diagnosis_summary,
        )

    # ==========================================================================
    # Scenario D: Diagnosis Continues -> Deterministic Question Selection
    # ==========================================================================
    attempts = attempt_repo.get_session_attempts(db, req.session_id)
    attempted_ids = {a.question_id for a in attempts}

    all_candidates = question_repo.list_questions(db, topic=session.topic)
    scored_diag = select_best_diagnostic_question(
        candidate_questions=all_candidates,
        hypotheses=updated_hyps,
        target_concept=question.concept,
        target_topic=session.topic,
        excluded_ids=attempted_ids,
        last_confidence=req.confidence,
    )

    next_q = scored_diag.question if scored_diag else None
    if not next_q:
        try:
            target_misc_desc = "\n".join(f"- {h.id}: {h.label}" for h in updated_hyps[:3])
            next_q = await llm_client.generate_question(
                topic=session.topic,
                concept=question.concept,
                difficulty="medium",
                target_misconceptions=target_misc_desc,
                is_followup=True,
            )
            if next_q:
                question_repo.save_question(db, next_q)
        except Exception as gen_err:
            logger.warning("Dynamic diagnostic question generation fallback: %s", gen_err)

    if next_q:
        session_repo.update_session(
            db=db,
            session_id=req.session_id,
            status="diagnosing",
            current_question_id=next_q.id,
        )

    # Collect stored evidence trail and alternatives for provisional diagnosis
    stored_evidence = misc_repo.get_session_evidence(db, req.session_id)
    evidence_items = [
        EvidenceItem(
            step=e.step_index,
            question_id=e.question_id,
            observation=e.observation,
            signal=e.signal,
        )
        for e in stored_evidence
    ]

    top_h = ranked[0] if ranked else None
    alternatives = [
        AlternativeHypothesis(name=h.label, probability=round(h.probability, 4))
        for h in ranked[1:]
    ] if ranked else []

    provisional_diagnosis = DiagnosisSummary(
        confirmed=False,
        primary_misconception=PrimaryMisconceptionDiagnosis(
            id=top_h.id if top_h else "unknown",
            name=top_h.label if top_h else "Evaluating Misconception",
            description=top_h.description if top_h else None,
            confidence_score=round(top_h.probability, 4) if top_h else 0.0,
        ),
        evidence=evidence_items,
        alternatives=alternatives,
    ) if top_h else None

    return SubmitAnswerResponse(
        session_id=req.session_id,
        status="diagnosing",
        evaluation="incorrect",
        next_question=next_q,
        active_hypotheses=updated_hyps,
        diagnosis=provisional_diagnosis,
    )


# ==============================================================================
# 4. POST /remediate
# ==============================================================================
@router.post("/remediate", response_model=RemediateResponse)
async def remediate(
    req: RemediateRequest,
    db: Session = Depends(get_db),
    llm_client: LLMClient = Depends(get_llm_client),
):
    session = session_repo.get_session(db, req.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{req.session_id}' not found.")

    if req.misconception_id == "no_misconception":
        return RemediateResponse(
            misconception_id="no_misconception",
            remediation_title="Minor Confusion, Not a Misconception!",
            remediation_text="You answered both follow-up questions correctly! It looks like you just made a simple mistake on the initial question rather than having a deep conceptual misunderstanding. Your foundation is solid!",
            example=None,
            key_takeaway="Always double-check your initial intuition.",
            check_for_understanding=None,
            feynman_explanation="Sometimes we just slip up on a small detail even if we know the big picture. Since you nailed the follow-ups, you're good to go!",
            visual_artifact_svg=None,
            video_snippet=None,
        )

    # Find misconception metadata
    hyps = misc_repo.get_session_hypotheses(db, req.session_id)
    target_hyp = next((h for h in hyps if h.id == req.misconception_id), None)
    label = target_hyp.label if target_hyp else req.misconception_id.replace("_", " ").title()
    desc = target_hyp.description if target_hyp else label

    evidence_records = misc_repo.get_session_evidence(db, req.session_id)
    evidence_text = "\n".join(f"- {e.observation}" for e in evidence_records) or "Observed distractor error."

    # RAG Retrieval
    reference_context = ""
    sources: List[SourceItem] = []
    grounded = False
    grounded_source = None
    page_number = None

    if req.use_rag:
        try:
            retrieval_res = default_rag_retriever.retrieve(
                misconception_id=req.misconception_id,
                misconception_label=label,
                concept=session.topic,
                top_k=2,
            )
            if retrieval_res.chunks:
                grounded = True
                reference_context = retrieval_res.formatted_context
                sources = [
                    SourceItem(
                        document_id=c.document_id,
                        document_name=c.document_name,
                        page_number=c.page_number,
                        excerpt=c.content[:200] + ("..." if len(c.content) > 200 else ""),
                        similarity_score=c.similarity_score,
                        source_type=getattr(c, "source_type", "text"),
                    )
                    for c in retrieval_res.chunks
                ]
                top_chunk = retrieval_res.chunks[0]
                source_type = getattr(top_chunk, "source_type", "text")
                page_label = f"Figure, Page {top_chunk.page_number}" if source_type == "image" else f"Page {top_chunk.page_number}"
                grounded_source = f"{top_chunk.document_name} — {page_label}"
                page_number = top_chunk.page_number

        except Exception as rag_err:
            logger.warning("RAG retrieval failed, falling back to ungrounded remediation: %s", rag_err)

    # Call LLM client for targeted remediation
    remediation_result = await llm_client.generate_remediation(
        misconception_id=req.misconception_id,
        misconception_label=label,
        misconception_description=desc,
        concept=session.topic,
        evidence_summary=evidence_text,
        reference_material=reference_context if grounded else None,
    )

    # Persist remediation record
    misc_repo.save_remediation(
        db=db,
        session_id=req.session_id,
        misconception_id=req.misconception_id,
        remediation_text=remediation_result.remediation_text,
        title=remediation_result.remediation_title,
        example=remediation_result.example,
        key_takeaway=remediation_result.key_takeaway,
        source=grounded_source or remediation_result.grounded_source,
        grounded=grounded,
        page_number=page_number,
    )

    return RemediateResponse(
        misconception_id=req.misconception_id,
        remediation_title=remediation_result.remediation_title,
        remediation_text=remediation_result.remediation_text,
        example=remediation_result.example,
        key_takeaway=remediation_result.key_takeaway,
        check_for_understanding=remediation_result.check_for_understanding,
        grounded=grounded,
        grounded_source=grounded_source or remediation_result.grounded_source,
        page_number=page_number,
        sources=sources,
        feynman_explanation=remediation_result.feynman_explanation,
        visual_artifact_svg=remediation_result.visual_artifact_svg,
        video_snippet=VideoSnippet(
            title=remediation_result.video_snippet.title,
            youtube_video_id=remediation_result.video_snippet.youtube_video_id,
            start_seconds=remediation_result.video_snippet.start_seconds,
            end_seconds=remediation_result.video_snippet.end_seconds,
            concept_summary=remediation_result.video_snippet.concept_summary,
        ) if remediation_result.video_snippet else None,
    )


# ==============================================================================
# 5. POST /verify
# ==============================================================================
@router.post("/verify", response_model=VerifyResponse)
def verify(
    req: VerifyRequest,
    db: Session = Depends(get_db),
):
    session = session_repo.get_session(db, req.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{req.session_id}' not found.")

    question = question_repo.get_question_by_id(db, req.question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question '{req.question_id}' not found.")

    # Call deterministic verification engine
    result = evaluate_verification(
        original_misconception_id=req.misconception_id,
        verification_question=question,
        selected_option=req.selected_option,
    )

    # Update misconception status in DB (RESOLVED or PERSISTENT)
    new_status = result.status.value.lower()
    misc_repo.update_misconception_status(db, req.session_id, req.misconception_id, new_status)

    # Record verification attempt
    attempt_repo.record_attempt(
        db=db,
        session_id=req.session_id,
        question_id=question.id,
        selected_option=req.selected_option,
        confidence=5,
        is_correct=result.is_correct,
        matched_misconception_id=req.misconception_id if not result.is_correct else None,
    )

    return VerifyResponse(
        session_id=req.session_id,
        misconception_id=req.misconception_id,
        status=new_status,
        is_correct=result.is_correct,
        explanation=result.feedback,
    )


# ==============================================================================
# 6. GET /dashboard/{session_id}
# ==============================================================================
@router.get("/dashboard/{session_id}", response_model=DashboardResponse)
def get_dashboard(
    session_id: str,
    db: Session = Depends(get_db),
):
    session = session_repo.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")

    attempts = attempt_repo.get_session_attempts(db, session_id)
    hyps_records = (
        db.query(MisconceptionStateModel)
        .filter(MisconceptionStateModel.session_id == session_id)
        .all()
    )

    total_attempts = len(attempts)
    correct_count = sum(1 for a in attempts if a.is_correct)
    accuracy_rate = round(correct_count / total_attempts, 2) if total_attempts > 0 else 0.0

    # Misconceptions resolved vs identified
    resolved_count = sum(1 for h in hyps_records if h.status == "resolved")
    identified_count = sum(1 for h in hyps_records if h.status in ("confirmed", "resolved", "persistent"))

    # Confidence Calibration
    hi_corr = sum(1 for a in attempts if a.is_correct and a.confidence >= 4)
    hi_inc = sum(1 for a in attempts if not a.is_correct and a.confidence >= 4)
    lo_corr = sum(1 for a in attempts if a.is_correct and a.confidence <= 2)
    lo_inc = sum(1 for a in attempts if not a.is_correct and a.confidence <= 2)

    calib_index = round((hi_corr + lo_inc) / total_attempts, 2) if total_attempts > 0 else 0.0

    # Error Breakdown
    conceptual_errors = sum(1 for a in attempts if not a.is_correct and a.matched_misconception_id)
    overconfident_errors = hi_inc

    return DashboardResponse(
        session_id=session_id,
        total_questions_attempted=total_attempts,
        accuracy_rate=accuracy_rate,
        overall_mastery=session.mastery_score,
        misconceptions_identified=identified_count,
        misconceptions_resolved=resolved_count,
        confidence_calibration=ConfidenceCalibration(
            high_confidence_correct=hi_corr,
            high_confidence_incorrect=hi_inc,
            low_confidence_correct=lo_corr,
            low_confidence_incorrect=lo_inc,
            calibration_index=calib_index,
        ),
        error_breakdown=ErrorBreakdown(
            conceptual=conceptual_errors,
            calculation=0,
            careless_reading=0,
            overconfidence_errors=overconfident_errors,
        ),
    )


# ==============================================================================
# 7. GET /knowledge-map/{session_id}
# ==============================================================================
@router.get("/knowledge-map/{session_id}", response_model=KnowledgeMapResponse)
def get_knowledge_map(
    session_id: str,
    db: Session = Depends(get_db),
):
    session = session_repo.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")

    hyps_records = (
        db.query(MisconceptionStateModel)
        .filter(MisconceptionStateModel.session_id == session_id)
        .all()
    )

    clean_topic = session.topic.lower().replace(' ', '_').replace("'", "")
    concept_node_id = f"concept_{clean_topic}"
    nodes: List[KnowledgeMapNode] = [
        KnowledgeMapNode(
            id=concept_node_id,
            type="concept",
            label=session.topic,
            status="mastered" if session.mastery_score >= 0.75 else "developing",
            mastery_score=session.mastery_score,
        )
    ]
    edges: List[KnowledgeMapEdge] = []

    for r in hyps_records:
        misc_node_id = f"node_{r.misconception_id}"
        nodes.append(
            KnowledgeMapNode(
                id=misc_node_id,
                type="misconception",
                label=r.label,
                status=r.status,
                parent_concept_id=concept_node_id,
            )
        )
        edges.append(
            KnowledgeMapEdge(
                source=concept_node_id,
                target=misc_node_id,
                type="sub_gap",
            )
        )

    return KnowledgeMapResponse(
        topic=session.topic,
        nodes=nodes,
        edges=edges,
    )


# ==============================================================================
# 8. GET /revision-list/{session_id} & GET /revision/daily/{session_id}
# ==============================================================================
@router.get("/revision-list/{session_id}", response_model=RevisionListResponse)
def get_revision_list(
    session_id: str,
    db: Session = Depends(get_db),
):
    session = session_repo.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")

    return get_prioritized_revision_list(db=db, session_id=session_id)


@router.get("/revision/daily/{session_id}", response_model=DailyRevisionResponse)
def get_daily_revision(
    session_id: str,
    db: Session = Depends(get_db),
):
    session = session_repo.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")

    return compose_daily_revision_set(db=db, session_id=session_id)



# ==============================================================================
# 9. TEACHER & COHORT ANALYTICS ENDPOINTS
# ==============================================================================

import json
from pathlib import Path
from app.api.schemas import (
    AttemptHistoryItem,
    ConceptAnalyticsItem,
    ConceptMasteryItem,
    DemoDiagnosis,
    DemoDiagnosticProbe,
    DemoHypothesisItem,
    DemoInitialAttempt,
    DemoQuestionSummary,
    DemoRemediation,
    DemoStudentWalkthrough,
    DemoVerification,
    HeatmapCell,
    HeatmapData,
    MisconceptionAggregateItem,
    RecentActivityItem,
    StudentMisconceptionDetail,
)


def _get_student_name(student_id: str) -> str:
    name_map = {s["student_id"]: s["name"] for s in DEMO_STUDENTS}
    if student_id in name_map:
        return name_map[student_id]
    clean_id = student_id.replace("student_", "").replace("_", " ").title()
    return f"Student {clean_id}"


def _get_student_summary(s: SessionModel, db: Session) -> StudentSummary:
    attempts = db.query(AttemptModel).filter(AttemptModel.session_id == s.id).all()
    hyps = db.query(MisconceptionStateModel).filter(MisconceptionStateModel.session_id == s.id).all()

    total_att = len(attempts)
    correct_att = sum(1 for a in attempts if a.is_correct)
    acc = round(correct_att / total_att, 2) if total_att > 0 else 0.0

    active_gaps = sum(1 for h in hyps if h.status in ("candidate", "confirmed"))
    persistent_count = sum(1 for h in hyps if h.status == "persistent")

    hi_wrong = sum(1 for a in attempts if not a.is_correct and a.confidence >= 4)
    lo_corr = sum(1 for a in attempts if a.is_correct and a.confidence <= 2)

    if hi_wrong >= 2:
        calib_status = "Overconfident"
    elif lo_corr >= 2:
        calib_status = "Underconfident"
    else:
        calib_status = "Calibrated"

    last_active_str = s.updated_at.strftime("%b %d, %H:%M") if s.updated_at else "Recently"

    return StudentSummary(
        student_id=s.student_id,
        name=_get_student_name(s.student_id),
        topic=s.topic,
        mastery_score=round(s.mastery_score, 2),
        accuracy_rate=acc,
        active_gaps=active_gaps,
        persistent_misconceptions=persistent_count,
        calibration_status=calib_status,
        last_active=last_active_str,
    )


@router.get("/teacher/overview", response_model=TeacherOverviewResponse)
def get_teacher_overview(db: Session = Depends(get_db)):
    seed_cohort_if_needed(db)
    sessions = db.query(SessionModel).all()
    if not sessions:
        return TeacherOverviewResponse(
            total_students=0,
            average_mastery=0.0,
            active_knowledge_gaps=0,
            persistent_misconceptions=0,
            class_accuracy=0.0,
            confidence_calibration=ConfidenceCalibration(),
            students_requiring_attention=[],
            recent_activity=[],
        )

    student_summaries = [_get_student_summary(s, db) for s in sessions]

    # Overall class statistics
    avg_mastery = round(sum(s.mastery_score for s in student_summaries) / len(student_summaries), 2)
    avg_accuracy = round(sum(s.accuracy_rate for s in student_summaries) / len(student_summaries), 2)
    total_active_gaps = sum(s.active_gaps for s in student_summaries)
    total_persistent = sum(s.persistent_misconceptions for s in student_summaries)

    # Class calibration aggregation across all attempts
    all_attempts = db.query(AttemptModel).all()
    hi_corr = sum(1 for a in all_attempts if a.is_correct and a.confidence >= 4)
    hi_inc = sum(1 for a in all_attempts if not a.is_correct and a.confidence >= 4)
    lo_corr = sum(1 for a in all_attempts if a.is_correct and a.confidence <= 2)
    lo_inc = sum(1 for a in all_attempts if not a.is_correct and a.confidence <= 2)
    total_a = len(all_attempts)
    calib_index = round((hi_corr + lo_inc) / total_a, 2) if total_a > 0 else 0.0

    calib = ConfidenceCalibration(
        high_confidence_correct=hi_corr,
        high_confidence_incorrect=hi_inc,
        low_confidence_correct=lo_corr,
        low_confidence_incorrect=lo_inc,
        calibration_index=calib_index,
    )

    # Students requiring attention: persistent misconceptions > 0 OR mastery < 0.55
    requiring_attention = [
        s for s in student_summaries
        if s.persistent_misconceptions > 0 or s.mastery_score < 0.55
    ]
    requiring_attention.sort(key=lambda x: (x.persistent_misconceptions, -x.mastery_score), reverse=True)

    # Recent activity
    recent_attempts = (
        db.query(AttemptModel)
        .order_by(AttemptModel.created_at.desc())
        .limit(10)
        .all()
    )
    recent_activity: List[RecentActivityItem] = []
    for att in recent_attempts:
        sess = db.query(SessionModel).filter(SessionModel.id == att.session_id).first()
        student_id = sess.student_id if sess else "student"
        student_name = _get_student_name(student_id)
        topic = sess.topic if sess else "General"
        act_type = "verified_resolved" if att.is_correct else ("misconception_confirmed" if att.matched_misconception_id else "diagnostic_probe")
        detail = f"{'Answered correctly' if att.is_correct else 'Selected distractor'} with confidence {att.confidence}/5"

        recent_activity.append(
            RecentActivityItem(
                id=f"act_{att.id}",
                student_id=student_id,
                student_name=student_name,
                topic=topic,
                activity_type=act_type,
                detail=detail,
                timestamp=att.created_at.strftime("%H:%M") if att.created_at else "Recently",
            )
        )

    return TeacherOverviewResponse(
        total_students=len(student_summaries),
        average_mastery=avg_mastery,
        active_knowledge_gaps=total_active_gaps,
        persistent_misconceptions=total_persistent,
        class_accuracy=avg_accuracy,
        confidence_calibration=calib,
        students_requiring_attention=requiring_attention[:6],
        recent_activity=recent_activity[:8],
    )


@router.get("/teacher/students", response_model=TeacherStudentsResponse)
def get_teacher_students(db: Session = Depends(get_db)):
    seed_cohort_if_needed(db)
    sessions = db.query(SessionModel).all()
    students = [_get_student_summary(s, db) for s in sessions]
    return TeacherStudentsResponse(
        total_students=len(students),
        students=students,
    )


@router.get("/teacher/students/{student_id}", response_model=StudentDetailProfileResponse)
def get_teacher_student_detail(student_id: str, db: Session = Depends(get_db)):
    seed_cohort_if_needed(db)
    sess = (
        db.query(SessionModel)
        .filter((SessionModel.student_id == student_id) | (SessionModel.id == student_id))
        .first()
    )
    if not sess:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student '{student_id}' not found.",
        )

    summary = _get_student_summary(sess, db)
    attempts = (
        db.query(AttemptModel)
        .filter(AttemptModel.session_id == sess.id)
        .order_by(AttemptModel.step_index.asc())
        .all()
    )
    hyps = (
        db.query(MisconceptionStateModel)
        .filter(MisconceptionStateModel.session_id == sess.id)
        .all()
    )
    evidences = (
        db.query(EvidenceRecordModel)
        .filter(EvidenceRecordModel.session_id == sess.id)
        .all()
    )
    remediations = (
        db.query(RemediationRecordModel)
        .filter(RemediationRecordModel.session_id == sess.id)
        .all()
    )
    rem_map = {r.misconception_id: r for r in remediations}

    # Concept breakdown
    concept_status = "mastered" if sess.mastery_score >= 0.75 else ("developing" if sess.mastery_score >= 0.50 else "at_risk")
    concepts = [
        ConceptMasteryItem(
            concept=sess.topic,
            topic=sess.topic,
            mastery_score=round(sess.mastery_score, 2),
            status=concept_status,
        )
    ]

    # Misconceptions detail
    misc_details: List[StudentMisconceptionDetail] = []
    for h in hyps:
        support_ev = [
            e.observation for e in evidences
            if "distractor" in e.signal or "reinforcement" in e.signal or "failed" in e.signal
        ]
        contra_ev = [
            e.observation for e in evidences
            if "passed" in e.signal or "correct" in e.signal
        ]
        target_rem = rem_map.get(h.misconception_id)
        misc_details.append(
            StudentMisconceptionDetail(
                misconception_id=h.misconception_id,
                label=h.label,
                concept=sess.topic,
                status=h.status,
                probability=round(h.probability, 2),
                evidence_count=h.evidence_count,
                supporting_evidence=support_ev,
                contradicting_evidence=contra_ev,
                remediation_title=target_rem.title if target_rem else None,
                verification_outcome="resolved" if h.status == "resolved" else ("persistent" if h.status == "persistent" else None),
                grounded_source=target_rem.source if target_rem and target_rem.grounded else None,
                page_number=target_rem.page_number if target_rem and target_rem.grounded else None,
            )
        )

    # Attempt timeline
    attempt_items: List[AttemptHistoryItem] = []
    for att in attempts:
        q_record = db.query(QuestionModel).filter(QuestionModel.id == att.question_id).first()
        q_text = q_record.question_text if q_record else f"Question {att.question_id}"
        attempt_items.append(
            AttemptHistoryItem(
                step_index=att.step_index,
                question_id=att.question_id,
                question_text=q_text,
                selected_option=att.selected_option,
                confidence=att.confidence,
                is_correct=att.is_correct,
                matched_misconception=att.matched_misconception_id,
                timestamp=att.created_at.strftime("%H:%M") if att.created_at else "Earlier",
            )
        )

    # Student calibration
    hi_corr = sum(1 for a in attempts if a.is_correct and a.confidence >= 4)
    hi_inc = sum(1 for a in attempts if not a.is_correct and a.confidence >= 4)
    lo_corr = sum(1 for a in attempts if a.is_correct and a.confidence <= 2)
    lo_inc = sum(1 for a in attempts if not a.is_correct and a.confidence <= 2)
    t_cnt = len(attempts)
    c_idx = round((hi_corr + lo_inc) / t_cnt, 2) if t_cnt > 0 else 0.0

    calib = ConfidenceCalibration(
        high_confidence_correct=hi_corr,
        high_confidence_incorrect=hi_inc,
        low_confidence_correct=lo_corr,
        low_confidence_incorrect=lo_inc,
        calibration_index=c_idx,
    )

    return StudentDetailProfileResponse(
        student_id=sess.student_id,
        name=summary.name,
        topic=sess.topic,
        mastery_score=summary.mastery_score,
        accuracy_rate=summary.accuracy_rate,
        calibration_status=summary.calibration_status,
        last_active=summary.last_active,
        concept_breakdown=concepts,
        misconceptions=misc_details,
        attempts_timeline=attempt_items,
        confidence_calibration=calib,
    )


@router.get("/teacher/misconceptions", response_model=TeacherMisconceptionsResponse)
def get_teacher_misconceptions(db: Session = Depends(get_db)):
    seed_cohort_if_needed(db)
    sessions = db.query(SessionModel).all()
    hyps_records = db.query(MisconceptionStateModel).all()

    # Concepts list
    topics = sorted(list({s.topic for s in sessions}))
    concept_items: List[ConceptAnalyticsItem] = []

    for t in topics:
        t_sessions = [s for s in sessions if s.topic == t]
        sess_ids = {s.id for s in t_sessions}
        t_hyps = [h for h in hyps_records if h.session_id in sess_ids]

        t_attempts = db.query(AttemptModel).filter(AttemptModel.session_id.in_(sess_ids)).all()
        t_acc = round(sum(1 for a in t_attempts if a.is_correct) / len(t_attempts), 2) if t_attempts else 0.0
        t_mast = round(sum(s.mastery_score for s in t_sessions) / len(t_sessions), 2) if t_sessions else 0.0

        p_count = sum(1 for h in t_hyps if h.status == "persistent")
        r_count = sum(1 for h in t_hyps if h.status == "resolved")
        m_count = len(t_hyps)

        st = "mastered" if t_mast >= 0.75 else ("developing" if t_mast >= 0.50 else "persistent_gap")
        concept_items.append(
            ConceptAnalyticsItem(
                concept=t,
                topic=t,
                mastery=t_mast,
                accuracy=t_acc,
                misconception_count=m_count,
                resolved_count=r_count,
                persistent_count=p_count,
                status=st,
            )
        )

    # Categories
    categories = [
        "Force & Motion (Impetus)",
        "Inertia Resistance",
        "Action-Reaction Cancellation",
        "Velocity-Acceleration Conflation",
        "Bond Energy Misconception",
    ]

    cat_map = {
        "force_acceleration_confusion": "Force & Motion (Impetus)",
        "mass_inertia_resistance": "Inertia Resistance",
        "action_reaction_cancellation": "Action-Reaction Cancellation",
        "velocity_acceleration_conflation": "Velocity-Acceleration Conflation",
        "bond_breaking_releases_energy": "Bond Energy Misconception",
    }

    # Heatmap matrix
    heatmap_cells: List[HeatmapCell] = []
    total_cohort = len(sessions) or 1

    for concept in topics:
        sess_ids = {s.id for s in sessions if s.topic == concept}
        for cat in categories:
            matching_student_ids = []
            for h in hyps_records:
                if h.session_id in sess_ids and cat_map.get(h.misconception_id) == cat:
                    sess_obj = db.query(SessionModel).filter(SessionModel.id == h.session_id).first()
                    if sess_obj and sess_obj.student_id not in matching_student_ids:
                        matching_student_ids.append(sess_obj.student_id)

            cnt = len(matching_student_ids)
            freq = round(cnt / total_cohort, 2)
            heatmap_cells.append(
                HeatmapCell(
                    concept=concept,
                    category=cat,
                    student_count=cnt,
                    frequency=freq,
                    student_ids=matching_student_ids,
                )
            )

    # Misconceptions aggregate list
    misc_aggregates: List[MisconceptionAggregateItem] = []
    unique_misc_ids = sorted(list({h.misconception_id for h in hyps_records}))
    for m_id in unique_misc_ids:
        records = [h for h in hyps_records if h.misconception_id == m_id]
        lbl = records[0].label if records else m_id
        avg_prob = round(sum(r.probability for r in records) / len(records), 2) if records else 0.0
        p_cnt = sum(1 for r in records if r.status == "persistent")
        r_cnt = sum(1 for r in records if r.status == "resolved")
        category_name = cat_map.get(m_id, "Conceptual Gap")

        # Find associated concept
        first_sess = db.query(SessionModel).filter(SessionModel.id == records[0].session_id).first() if records else None
        c_name = first_sess.topic if first_sess else "General"

        misc_aggregates.append(
            MisconceptionAggregateItem(
                misconception_id=m_id,
                label=lbl,
                concept=c_name,
                category=category_name,
                affected_students_count=len(records),
                resolved_count=r_cnt,
                persistent_count=p_cnt,
                average_probability=avg_prob,
            )
        )

    return TeacherMisconceptionsResponse(
        concepts=concept_items,
        heatmap=HeatmapData(
            concepts=topics,
            misconception_categories=categories,
            cells=heatmap_cells,
        ),
        misconceptions=misc_aggregates,
    )


@router.get("/teacher/analytics", response_model=TeacherAnalyticsResponse)
def get_teacher_analytics(db: Session = Depends(get_db)):
    seed_cohort_if_needed(db)
    sessions = db.query(SessionModel).all()
    attempts = db.query(AttemptModel).all()

    total_s = len(sessions)
    overall_mastery = round(sum(s.mastery_score for s in sessions) / total_s, 2) if total_s else 0.0
    overall_acc = round(sum(1 for a in attempts if a.is_correct) / len(attempts), 2) if attempts else 0.0

    hi_corr = sum(1 for a in attempts if a.is_correct and a.confidence >= 4)
    hi_inc = sum(1 for a in attempts if not a.is_correct and a.confidence >= 4)
    lo_corr = sum(1 for a in attempts if a.is_correct and a.confidence <= 2)
    lo_inc = sum(1 for a in attempts if not a.is_correct and a.confidence <= 2)
    tot = len(attempts)
    c_idx = round((hi_corr + lo_inc) / tot, 2) if tot else 0.0

    calib = ConfidenceCalibration(
        high_confidence_correct=hi_corr,
        high_confidence_incorrect=hi_inc,
        low_confidence_correct=lo_corr,
        low_confidence_incorrect=lo_inc,
        calibration_index=c_idx,
    )

    error_breakdown = ErrorBreakdown(
        conceptual=sum(1 for a in attempts if not a.is_correct and a.matched_misconception_id),
        calculation=sum(1 for a in attempts if not a.is_correct and not a.matched_misconception_id and a.confidence <= 3),
        careless_reading=sum(1 for a in attempts if not a.is_correct and a.confidence == 1),
        overconfidence_errors=hi_inc,
    )

    # Concept analytics
    topics = sorted(list({s.topic for s in sessions}))
    hyps_records = db.query(MisconceptionStateModel).all()
    concept_items: List[ConceptAnalyticsItem] = []
    for t in topics:
        t_sessions = [s for s in sessions if s.topic == t]
        sess_ids = {s.id for s in t_sessions}
        t_hyps = [h for h in hyps_records if h.session_id in sess_ids]
        t_attempts = [a for a in attempts if a.session_id in sess_ids]

        t_acc = round(sum(1 for a in t_attempts if a.is_correct) / len(t_attempts), 2) if t_attempts else 0.0
        t_mast = round(sum(s.mastery_score for s in t_sessions) / len(t_sessions), 2) if t_sessions else 0.0
        p_count = sum(1 for h in t_hyps if h.status == "persistent")
        r_count = sum(1 for h in t_hyps if h.status == "resolved")
        st = "mastered" if t_mast >= 0.75 else ("developing" if t_mast >= 0.50 else "persistent_gap")

        concept_items.append(
            ConceptAnalyticsItem(
                concept=t,
                topic=t,
                mastery=t_mast,
                accuracy=t_acc,
                misconception_count=len(t_hyps),
                resolved_count=r_count,
                persistent_count=p_count,
                status=st,
            )
        )

    return TeacherAnalyticsResponse(
        total_students=total_s,
        overall_mastery=overall_mastery,
        overall_accuracy=overall_acc,
        confidence_calibration=calib,
        error_breakdown=error_breakdown,
        concept_analytics=concept_items,
    )


@router.get("/demo/same-score", response_model=SameScoreDemoResponse)
def get_same_score_demo():
    demo_file = Path(__file__).resolve().parent.parent.parent / "data" / "demo_story.json"
    if not demo_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo story dataset not found at backend/data/demo_story.json",
        )

    data = json.loads(demo_file.read_text(encoding="utf-8"))
    return SameScoreDemoResponse(**data)


# ==============================================================================
# 11. RAG Document Management Endpoints
# ==============================================================================
@router.post("/rag/upload")
async def upload_rag_document(
    file: UploadFile = File(...),
    topic: Optional[str] = Form(None),
    stream: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    Uploads and ingests a study material document into the RAG knowledge store.
    If stream=True, streams real progress events: Uploading -> Extracting -> Chunking -> Indexing -> Ready.
    """
    allowed_exts = DocumentLoader.SUPPORTED_EXTENSIONS
    filename = file.filename or "uploaded_doc"
    ext = Path(filename).suffix.lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed types: {', '.join(sorted(allowed_exts))}",
        )

    file_bytes = await file.read()
    max_upload_size = 500 * 1024 * 1024  # 500 MB limit
    if len(file_bytes) > max_upload_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 500MB ({len(file_bytes) / (1024 * 1024):.1f}MB uploaded).",
        )

    if stream:
        async def progress_stream():
            progress_queue = []

            def on_progress(stage: str, msg: str):
                progress_queue.append({"stage": stage, "message": msg})

            try:
                # Stage 1: Uploading
                yield json.dumps({"stage": "uploading", "progress": 25, "message": f"Saving {filename} ({len(file_bytes)} bytes)..."}) + "\n"

                # Run ingestion with stage callbacks
                doc = default_ingestion_pipeline.ingest_file(
                    file_bytes=file_bytes,
                    filename=filename,
                    db=db,
                    topic=topic,
                    on_progress=lambda stage, msg: progress_queue.append((stage, msg)),
                )

                # Emit intermediate progress
                for st, m in progress_queue:
                    pct = 50 if st == "extracting" else (75 if st == "chunking" else 95)
                    yield json.dumps({"stage": st, "progress": pct, "message": m}) + "\n"

                yield json.dumps({
                    "stage": "ready",
                    "progress": 100,
                    "document_id": doc.document_id,
                    "filename": doc.filename,
                    "page_count": doc.page_count,
                    "chunk_count": doc.chunk_count,
                    "message": f"Successfully ingested '{doc.filename}' ({doc.page_count} pages, {doc.chunk_count} chunks).",
                }) + "\n"
            except Exception as exc:
                logger.error("Streaming document ingestion failed: %s", exc)
                yield json.dumps({"stage": "failed", "progress": 0, "message": str(exc)}) + "\n"

        return StreamingResponse(progress_stream(), media_type="application/x-ndjson")

    # Non-streaming fallback (standard JSON response)
    try:
        doc = default_ingestion_pipeline.ingest_file(
            file_bytes=file_bytes,
            filename=filename,
            db=db,
            topic=topic,
        )
        return RAGUploadResponse(
            document_id=doc.document_id,
            filename=doc.filename,
            page_count=doc.page_count,
            chunk_count=doc.chunk_count,
            status="ready",
            message=f"Successfully ingested '{doc.filename}' ({doc.page_count} pages, {doc.chunk_count} chunks).",
        )
    except Exception as exc:
        logger.error("Document ingestion failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest document: {str(exc)}",
        )


@router.get("/rag/documents", response_model=DocumentListResponse)
def list_rag_documents(
    topic: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Lists all ingested RAG documents with page/chunk counts and first-page preview excerpt."""
    docs = doc_repo.list_documents(db, topic=topic)
    metadata_list = [
        DocumentMetadata(
            id=d.id,
            filename=d.filename,
            file_size_bytes=d.file_size_bytes,
            page_count=d.page_count,
            chunk_count=d.chunk_count,
            status=d.status,
            topic=d.topic,
            preview_excerpt=d.preview_text or (f"Document '{d.filename}' ({d.page_count} pages, {d.chunk_count} chunks indexed)."),
            uploaded_at=d.uploaded_at,
        )
        for d in docs
    ]
    return DocumentListResponse(documents=metadata_list, total=len(metadata_list))


@router.get("/rag/documents/{document_id}/preview", response_model=DocPreviewResponse)
def get_document_preview(
    document_id: str,
    db: Session = Depends(get_db),
):
    """Retrieves document preview metadata and first-page text excerpt."""
    doc = doc_repo.get_document(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )

    excerpt = doc.preview_text or ""
    if not excerpt and doc.file_path and Path(doc.file_path).is_file():
        try:
            pages = DocumentLoader.load_pages(Path(doc.file_path))
            if pages:
                first_text = pages[0].get("text", "") if isinstance(pages[0], dict) else getattr(pages[0], "text", "")
                if first_text:
                    excerpt = first_text[:400].strip()
        except Exception:
            pass

    return DocPreviewResponse(
        document_id=doc.id,
        filename=doc.filename,
        page_count=doc.page_count,
        chunk_count=doc.chunk_count,
        topic=doc.topic,
        preview_excerpt=excerpt or f"Document '{doc.filename}' ({doc.page_count} pages, {doc.chunk_count} chunks indexed).",
    )


@router.post("/rag/generate-quiz", response_model=GenerateQuizResponse)
async def generate_quiz_from_document(
    req: GenerateDocQuizRequest,
    db: Session = Depends(get_db),
):
    """
    Generates diagnostic quiz questions scoped to an uploaded document.
    Supports 'all' (sample across document) or 'chapter' (scope to matching chunks via existing retriever).
    Reuses existing Chroma store and question models.
    """
    doc = doc_repo.get_document(db, req.document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{req.document_id}' not found.",
        )

    # 1. Retrieve matching chunks using existing retriever/ChromaStore
    matched_chunks: list[RetrievedChunk] = []

    if req.scope == "chapter" and req.chapter_or_topic:
        # Scope to chapter/topic via existing retrieval query
        raw_chunks = default_chroma_store.query(
            query_text=req.chapter_or_topic,
            n_results=req.count * 3,
            topic=doc.topic,
        )
        matched_chunks = [c for c in raw_chunks if c.chunk.document_id == req.document_id]
        if not matched_chunks:
            raw_chunks = default_chroma_store.query(
                query_text=req.chapter_or_topic,
                n_results=req.count * 3,
            )
            matched_chunks = [c for c in raw_chunks if c.chunk.document_id == req.document_id]

    if not matched_chunks:
        # Sample across the whole document
        all_chunks = default_chroma_store.collection.get(where={"document_id": req.document_id})
        if all_chunks and all_chunks.get("documents"):
            docs_list = all_chunks["documents"]
            ids_list = all_chunks["ids"]
            metas_list = all_chunks.get("metadatas", [])
            step = max(1, len(docs_list) // req.count)
            for i in range(0, len(docs_list), step):
                if len(matched_chunks) >= req.count:
                    break
                meta = metas_list[i] if i < len(metas_list) else {}
                c = DocumentChunk(
                    chunk_id=ids_list[i],
                    document_id=req.document_id,
                    document_name=doc.filename,
                    page_number=int(meta.get("page_number", 1)),
                    text=docs_list[i],
                    topic=meta.get("topic") or doc.topic or "Physics",
                )
                matched_chunks.append(RetrievedChunk(chunk=c, similarity_score=0.9, distance=0.1))

    # 2. Build diagnostic questions with misconception distractors
    topic_name = doc.topic or doc.filename
    existing_questions = question_repo.list_questions(db, topic=topic_name, limit=req.count)

    questions_to_return: list[Question] = []
    if existing_questions and len(existing_questions) >= req.count:
        for q in existing_questions[: req.count]:
            questions_to_return.append(
                Question(
                    id=q.id,
                    concept=q.concept,
                    topic=topic_name,
                    prerequisite=q.prerequisite,
                    difficulty=q.difficulty,
                    question_type=q.question_type,
                    question_text=q.question_text,
                    options=q.options,
                    correct_option=q.correct_option,
                    distractor_misconceptions=q.distractor_misconceptions,
                    diagnostic_targets=q.diagnostic_targets,
                    explanation=q.explanation or f"Grounded in uploaded document: {doc.filename}",
                )
            )
    else:
        # Create deterministic questions grounded in document chunks
        concept_base = req.chapter_or_topic or (doc.topic or "Foundational Principles")
        for idx in range(req.count):
            q_id = f"doc_{req.document_id[:8]}_q{idx+1}"
            chunk_page = matched_chunks[idx].chunk.page_number if idx < len(matched_chunks) else 1
            chunk_text = matched_chunks[idx].chunk.text[:120] if idx < len(matched_chunks) else "Core textbook definition"

            saved_q = question_repo.get_question_by_id(db, q_id)
            if saved_q:
                questions_to_return.append(
                    Question(
                        id=saved_q.id,
                        concept=saved_q.concept,
                        topic=saved_q.topic,
                        prerequisite=saved_q.prerequisite,
                        difficulty=saved_q.difficulty,
                        question_type=saved_q.question_type,
                        question_text=saved_q.question_text,
                        options=saved_q.options,
                        correct_option=saved_q.correct_option,
                        distractor_misconceptions=saved_q.distractor_misconceptions,
                        diagnostic_targets=saved_q.diagnostic_targets,
                        explanation=saved_q.explanation,
                    )
                )
            else:
                # Generate topic-adaptive grounded questions
                is_dsa = any(k in f"{topic_name} {concept_base}".lower() for k in ["search", "array", "sort", "tree", "dsa", "algorithm", "pointer", "index"])
                is_chem = any(k in f"{topic_name} {concept_base}".lower() for k in ["chem", "bond", "atom", "molecule", "reaction", "acid"])
                if is_dsa:
                    q_model = Question(
                        id=q_id,
                        concept=concept_base,
                        topic=topic_name,
                        prerequisite=f"Introductory {topic_name}",
                        difficulty="medium",
                        question_type="diagnostic",
                        question_text=f"Based on '{doc.filename}' (Page {chunk_page}), which statement accurately describes the search procedure in {concept_base}?",
                        options={
                            "A": "In an unsorted array, any element can be found in O(1) time without sequential traversal.",
                            "B": "Linear search checks each element one-by-one from the beginning until a match is found.",
                            "C": "Binary search can be applied directly to unsorted arrays without prior sorting.",
                            "D": "Search terminates only when all elements are scanned, even if a match occurs at index 0.",
                        },
                        correct_option="B",
                        distractor_misconceptions={
                            "A": "unsorted_instant_lookup",
                            "C": "unsorted_binary_search_fallacy",
                            "D": "early_exit_omission",
                        },
                        diagnostic_targets=["unsorted_instant_lookup", "unsorted_binary_search_fallacy"],
                        explanation=f"Grounded in {doc.filename} (Page {chunk_page}): {chunk_text}...",
                    )
                elif is_chem:
                    q_model = Question(
                        id=q_id,
                        concept=concept_base,
                        topic=topic_name,
                        prerequisite=f"Introductory {topic_name}",
                        difficulty="medium",
                        question_type="diagnostic",
                        question_text=f"Based on '{doc.filename}' (Page {chunk_page}), which statement accurately describes {concept_base}?",
                        options={
                            "A": "Covalent bonding involves the complete transfer of electrons between atoms.",
                            "B": "Covalent bonding involves electrostatic attraction between shared valence electrons and atomic nuclei.",
                            "C": "Breaking chemical bonds spontaneously releases net thermal energy without bond formation.",
                            "D": "Every element unconditionally satisfies the octet rule in all molecular structures.",
                        },
                        correct_option="B",
                        distractor_misconceptions={
                            "A": "ionic_covalent_confusion",
                            "C": "bond_breaking_energy_misconception",
                            "D": "octet_rule_infallibility",
                        },
                        diagnostic_targets=["ionic_covalent_confusion", "bond_breaking_energy_misconception"],
                        explanation=f"Grounded in {doc.filename} (Page {chunk_page}): {chunk_text}...",
                    )
                else:
                    q_model = Question(
                        id=q_id,
                        concept=concept_base,
                        topic=topic_name,
                        prerequisite=f"Foundational {topic_name}",
                        difficulty="medium",
                        question_type="diagnostic",
                        question_text=f"Based on '{doc.filename}' (Page {chunk_page}), which statement correctly characterizes {concept_base}?",
                        options={
                            "A": "A continuous net external force is required to sustain steady constant motion.",
                            "B": "Net force produces change in motion (acceleration), while zero net force means constant velocity.",
                            "C": "Action and reaction forces act simultaneously on the same object and cancel out.",
                            "D": "Inertia represents an active resistive force that directly opposes velocity.",
                        },
                        correct_option="B",
                        distractor_misconceptions={
                            "A": "force_acceleration_confusion",
                            "C": "action_reaction_cancellation",
                            "D": "mass_inertia_resistance",
                        },
                        diagnostic_targets=["force_acceleration_confusion", "action_reaction_cancellation"],
                        explanation=f"Grounded in {doc.filename} (Page {chunk_page}): {chunk_text}...",
                    )
                question_repo.save_question(
                    db=db,
                    question_id=q_model.id,
                    concept=q_model.concept,
                    topic=q_model.topic,
                    prerequisite=q_model.prerequisite,
                    difficulty=q_model.difficulty,
                    question_type=q_model.question_type,
                    question_text=q_model.question_text,
                    options=q_model.options,
                    correct_option=q_model.correct_option,
                    distractor_misconceptions=q_model.distractor_misconceptions,
                    diagnostic_targets=q_model.diagnostic_targets,
                    explanation=q_model.explanation,
                )
                questions_to_return.append(q_model)

    # 3. Create or attach session
    target_session_id = req.session_id
    if not target_session_id:
        new_sess = session_repo.create_session(
            db=db,
            topic=topic_name,
            student_id="student_default",
            mode="adaptive_diagnosis",
            session_length=len(questions_to_return),
        )
        target_session_id = new_sess.id

    if questions_to_return:
        session_repo.update_session(db, target_session_id, current_question_id=questions_to_return[0].id)

    return GenerateQuizResponse(
        session_id=target_session_id,
        questions=questions_to_return,
    )


@router.delete("/rag/documents/{document_id}")
def delete_rag_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    """Deletes an ingested document from both the SQLite registry and Chroma vector collection."""
    doc = doc_repo.get_document(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )

    # 1. Delete vector embeddings from ChromaDB
    try:
        default_chroma_store.delete_document_chunks(document_id)
    except Exception as exc:
        logger.warning("Failed to delete chunks from Chroma for doc %s: %s", document_id, exc)

    # 2. Delete database record
    doc_repo.delete_document(db, document_id)

    # 3. Clean up physical file if it exists
    try:
        fpath = Path(doc.file_path)
        if fpath.is_file():
            fpath.unlink()
    except Exception as exc:
        logger.warning("Failed to remove physical file for doc %s: %s", document_id, exc)

    return {"status": "deleted", "document_id": document_id}


# ==============================================================================
# 9. Exam Mode Endpoints
# ==============================================================================
@router.post("/exam", response_model=ExamSessionResponse)
async def create_exam(
    req: CreateExamRequest,
    db: Session = Depends(get_db),
):
    """
    Creates a customized Exam Mode session:
    - Accepts any user-specified topic(s).
    - Evenly partitions question count across Easy, Medium, and Hard.
    - Diagnoses and targets student's historical misconceptions.
    - Generates authentic competitive exam PYQ questions when needed.
    """
    if not req.topic or not req.topic.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam topic cannot be empty.",
        )

    clean_topic = req.topic.strip()
    supported_topics = [
        "Newton's Laws",
        "Kinematics",
        "Chemical Bonding",
        "Comprehensive Science",
        "Linear Search",
        "Binary Search",
        "Data Structures",
        "Data Structures & Algorithms",
        "Arrays",
        "Sorting",
        "Thermodynamics",
        "Physics",
        "Chemistry",
    ]
    topic_in_db = db.query(QuestionModel).filter(
        (QuestionModel.topic.ilike(f"%{req.topic}%")) | (QuestionModel.concept.ilike(f"%{req.topic}%"))
    ).first()
    is_valid_topic = any(req.topic.lower() == t.lower() for t in supported_topics) or (topic_in_db is not None)
    if not is_valid_topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid topic '{req.topic}'.",
        )

    valid_counts = [6, 9, 10, 12, 15, 18, 24, 30]
    if req.question_count not in valid_counts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Question count must be one of {valid_counts}.",
        )

    student_id = req.student_id or f"student_{uuid.uuid4().hex[:6]}"
    base_session = session_repo.create_session(
        db,
        topic=req.topic,
        student_id=student_id,
        mode="exam_mode",
    )

    selected_questions: List[QuestionModel] = []

    # Handle Comprehensive Science multi-topic sampling
    if req.topic == "Comprehensive Science":
        pool_topics = ["Newton's Laws", "Kinematics", "Chemical Bonding"]
        if req.question_count == 10:
            distribution = [4, 3, 3]
        elif req.question_count == 12:
            distribution = [4, 4, 4]
        elif req.question_count == 15:
            distribution = [5, 5, 5]
        else:
            base = req.question_count // 3
            rem = req.question_count % 3
            distribution = [base + (1 if i < rem else 0) for i in range(3)]

        for p_topic, count in zip(pool_topics, distribution):
            qs = (
                db.query(QuestionModel)
                .filter(QuestionModel.topic == p_topic)
                .order_by(QuestionModel.id.asc())
                .limit(count)
                .all()
            )
            selected_questions.extend(qs)
    else:
        # 1. Query student's historical misconceptions/weaknesses
        weak_states = (
            db.query(MisconceptionStateModel)
            .join(SessionModel, MisconceptionStateModel.session_id == SessionModel.id)
            .filter(
                SessionModel.student_id == student_id,
                MisconceptionStateModel.status.in_(["candidate", "confirmed", "persistent"]),
            )
            .all()
        )
        weak_misconception_ids = {m.misconception_id for m in weak_states}

        # 2. Partition question count equally across Easy, Medium, Hard
        total_q = req.question_count
        easy_target = total_q // 3
        hard_target = total_q // 3
        medium_target = total_q - easy_target - hard_target
        difficulty_targets = {"easy": easy_target, "medium": medium_target, "hard": hard_target}

        # 3. Fetch candidate questions matching topic
        pool_qs = (
            db.query(QuestionModel)
            .filter(
                (QuestionModel.topic == req.topic)
                | (QuestionModel.concept.ilike(f"%{req.topic}%"))
            )
            .all()
        )

        def weakness_priority(q: QuestionModel) -> int:
            targets = []
            if q.diagnostic_targets_json:
                try:
                    targets = json.loads(q.diagnostic_targets_json)
                except Exception:
                    targets = []
            return -1 if any(t in weak_misconception_ids for t in targets) else 0

        pool_qs.sort(key=weakness_priority)

        qs_by_diff: Dict[str, List[QuestionModel]] = {"easy": [], "medium": [], "hard": []}
        for q in pool_qs:
            d = (q.difficulty or "medium").lower()
            if d in qs_by_diff:
                qs_by_diff[d].append(q)
            else:
                qs_by_diff["medium"].append(q)

        # Fill each difficulty bucket
        for diff, target_count in difficulty_targets.items():
            available = qs_by_diff[diff]
            taken = available[:target_count]
            selected_questions.extend(taken)

            # If more needed, generate PYQ-style questions
            needed = target_count - len(taken)
            for i in range(needed):
                try:
                    gen_q = await default_llm_client.generate_question(
                        topic=req.topic,
                        concept=req.topic,
                        difficulty=diff,
                    )
                    if gen_q:
                        question_repo.save_question(db=db, question=gen_q)
                        saved_q_model = db.query(QuestionModel).filter(QuestionModel.id == gen_q.id).first()
                        if saved_q_model:
                            selected_questions.append(saved_q_model)
                except Exception:
                    pass

        # If needed, backfill from remaining unused questions in pool_qs
        if len(selected_questions) < total_q:
            used_ids = {q.id for q in selected_questions}
            remaining = [q for q in pool_qs if q.id not in used_ids]
            needed = total_q - len(selected_questions)
            selected_questions.extend(remaining[:needed])

        # If still needed, backfill from all questions
        if len(selected_questions) < total_q:
            used_ids = {q.id for q in selected_questions}
            all_qs = db.query(QuestionModel).filter(~QuestionModel.id.in_(used_ids)).limit(total_q - len(selected_questions)).all()
            selected_questions.extend(all_qs)

    exam = exam_repo.create_exam_session(
        db=db,
        session_id=base_session.id,
        topic=req.topic,
        question_count=len(selected_questions),
        time_limit_minutes=req.time_limit_minutes,
        difficulty="adaptive",
        questions=selected_questions,
    )

    q_views = [
        ExamQuestionView(
            id=q.id,
            order_index=idx + 1,
            concept=q.concept,
            topic=q.topic,
            question_text=q.question_text,
            options=json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json,
        )
        for idx, q in enumerate(selected_questions)
    ]

    attempt_views = [
        ExamAttemptView(
            question_id=a.question_id,
            order_index=a.attempt_order,
            selected_option=a.selected_option,
            confidence=a.confidence,
            is_marked_for_review=bool(a.marked_for_review),
            time_spent_seconds=a.time_spent_seconds or 0,
        )
        for a in exam.attempts
    ]

    return ExamSessionResponse(
        exam_id=exam.id,
        student_id=student_id,
        topic=exam.topic,
        total_questions=exam.total_questions,
        time_limit_minutes=exam.time_limit_minutes,
        started_at=exam.started_at.isoformat(),
        remaining_seconds=exam.time_limit_minutes * 60,
        status=exam.status,
        questions=q_views,
        attempts=attempt_views,
    )


@router.get("/exam/{exam_id}", response_model=ExamSessionResponse)
def get_exam(
    exam_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns the exam session state and calculates remaining seconds authoritatively.
    """
    exam = exam_repo.get_exam_session(db, exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam '{exam_id}' not found.",
        )

    # Server-authoritative countdown
    elapsed_seconds = (datetime.utcnow() - exam.started_at).total_seconds()
    remaining = max(0, int(exam.time_limit_minutes * 60 - elapsed_seconds))

    attempts = sorted(exam.attempts, key=lambda a: a.attempt_order)
    q_ids = [a.question_id for a in attempts]
    q_records = {q.id: q for q in db.query(QuestionModel).filter(QuestionModel.id.in_(q_ids)).all()}

    q_views: List[ExamQuestionView] = []
    for a in attempts:
        q = q_records.get(a.question_id)
        if q:
            opts = json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json
            q_views.append(
                ExamQuestionView(
                    id=q.id,
                    order_index=a.attempt_order,
                    concept=q.concept,
                    topic=q.topic,
                    question_text=q.question_text,
                    options=opts,
                )
            )

    attempt_views = [
        ExamAttemptView(
            question_id=a.question_id,
            order_index=a.attempt_order,
            selected_option=a.selected_option,
            confidence=a.confidence,
            is_marked_for_review=bool(a.marked_for_review),
            time_spent_seconds=a.time_spent_seconds or 0,
        )
        for a in attempts
    ]

    student_id = exam.session.student_id if exam.session else "anonymous"

    return ExamSessionResponse(
        exam_id=exam.id,
        student_id=student_id,
        topic=exam.topic,
        total_questions=exam.total_questions,
        time_limit_minutes=exam.time_limit_minutes,
        started_at=exam.started_at.isoformat(),
        remaining_seconds=remaining,
        status=exam.status,
        questions=q_views,
        attempts=attempt_views,
    )


@router.post("/exam/{exam_id}/answer")
def save_exam_answer(
    exam_id: str,
    req: SaveExamAnswerRequest,
    db: Session = Depends(get_db),
):
    """
    Saves an exam question attempt (option selection, confidence rating, mark-for-review flag, or time spent).
    """
    exam = exam_repo.get_exam_session(db, exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam '{exam_id}' not found.",
        )

    if exam.status in ["submitted", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update answers for an already submitted exam.",
        )

    attempt = exam_repo.update_exam_attempt(
        db=db,
        exam_id=exam_id,
        question_id=req.question_id,
        selected_option=req.selected_option,
        confidence=req.confidence,
        marked_for_review=req.is_marked_for_review,
        time_spent_seconds=req.time_spent_seconds,
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question '{req.question_id}' not part of exam '{exam_id}'.",
        )

    return {"status": "saved", "question_id": req.question_id}


@router.post("/exam/{exam_id}/submit", response_model=SubmitExamResponse)
def submit_exam(
    exam_id: str,
    db: Session = Depends(get_db),
):
    """
    Submits an exam session, computes score, and executes full deterministic diagnostic post-mortem.
    """
    exam = exam_repo.get_exam_session(db, exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam '{exam_id}' not found.",
        )

    if exam.status == "submitted" and exam.diagnostic_report_json:
        time_taken = min(
            int((exam.submitted_at - exam.started_at).total_seconds()) if exam.submitted_at else 0,
            exam.time_limit_minutes * 60,
        )
        return SubmitExamResponse(
            exam_id=exam.id,
            status=exam.status,
            score=exam.score or 0,
            total=exam.total_questions,
            percentage=exam.percentage or 0.0,
            time_taken_seconds=max(0, time_taken),
        )

    q_ids = [a.question_id for a in exam.attempts]
    q_records = db.query(QuestionModel).filter(QuestionModel.id.in_(q_ids)).all()
    q_map = {q.id: q for q in q_records}

    diag_result = analyze_exam_submission(exam, q_map)

    report_json = json.dumps(diag_result.to_dict())
    updated_exam = exam_repo.submit_exam_session(
        db=db,
        exam_id=exam_id,
        score=diag_result.score,
        percentage=diag_result.percentage,
        accuracy=diag_result.accuracy,
        diagnostic_report_json=report_json,
    )

    # Longitudinal Misconception Resolution & Reinforcement
    student_id = exam.session.student_id if exam.session else "anonymous"
    active_misconceptions = (
        db.query(MisconceptionStateModel)
        .join(SessionModel, MisconceptionStateModel.session_id == SessionModel.id)
        .filter(SessionModel.student_id == student_id)
        .all()
    )
    for attempt in exam.attempts:
        q = q_map.get(attempt.question_id)
        if not q:
            continue
        if attempt.is_correct:
            for m in active_misconceptions:
                if m.label == q.concept or (q.diagnostic_targets_json and m.misconception_id in q.diagnostic_targets_json):
                    m.status = "resolved"
                    m.probability = max(0.05, m.probability - 0.35)
        elif attempt.matched_misconception_id:
            for m in active_misconceptions:
                if m.misconception_id == attempt.matched_misconception_id:
                    m.status = "persistent"
                    m.probability = min(0.95, m.probability + 0.15)
                    m.evidence_count += 1
    db.commit()

    time_taken = min(
        int((datetime.utcnow() - exam.started_at).total_seconds()),
        exam.time_limit_minutes * 60,
    )
    if diag_result.total_time_seconds > 0:
        time_taken = max(time_taken, diag_result.total_time_seconds)

    return SubmitExamResponse(
        exam_id=updated_exam.id,
        status="submitted",
        score=diag_result.score,
        total=diag_result.total_questions,
        percentage=diag_result.percentage,
        time_taken_seconds=time_taken,
    )


@router.get("/exam/{exam_id}/report", response_model=ExamReportResponse)
def get_exam_report(
    exam_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns the comprehensive diagnostic post-mortem report for a submitted exam.
    """
    exam = exam_repo.get_exam_session(db, exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam '{exam_id}' not found.",
        )

    if not exam.diagnostic_report_json:
        q_ids = [a.question_id for a in exam.attempts]
        q_records = db.query(QuestionModel).filter(QuestionModel.id.in_(q_ids)).all()
        q_map = {q.id: q for q in q_records}
        diag_result = analyze_exam_submission(exam, q_map)
        exam.diagnostic_report_json = json.dumps(diag_result.to_dict())
        exam.score = diag_result.score
        exam.percentage = diag_result.percentage
        exam.accuracy = diag_result.accuracy
        exam.status = "submitted"
        exam.submitted_at = exam.submitted_at or datetime.utcnow()
        db.commit()

    data = json.loads(exam.diagnostic_report_json)
    student_id = exam.session.student_id if exam.session else "anonymous"

    answered_q = [q for q in data.get("questions_detail", []) if q.get("selected_option")]
    avg_conf = (
        round(sum((q.get("confidence") or 3) for q in answered_q) / len(answered_q), 1)
        if answered_q
        else 0.0
    )

    q_details = []
    for q in data.get("questions_detail", []):
        is_corr = bool(q.get("is_correct"))
        misc_id = q.get("matched_misconception_id")
        misc_label = q.get("matched_misconception_label") or q.get("concept", "Concept")
        
        vis_svg = None
        feynman = None
        status_chg = None
        if not is_corr:
            vis_svg = generate_default_visual_svg(misc_id or "misconception", q.get("concept", exam.topic), misc_label)
            feynman = f"Intuitive breakdown: In {q.get('concept', exam.topic)}, remember to verify ground truth rules rather than relying on common shortcuts."
            status_chg = "Needs Attention" if misc_id else "Unverified Error"
        else:
            status_chg = "Concept Mastered"

        q_details.append(
            ExamQuestionReportDetail(
                question_id=q["question_id"],
                order_index=q["order"],
                concept=q["concept"],
                topic=q["topic"],
                question_text=q["question_text"],
                options=q["options"],
                correct_option=q["correct_option"],
                selected_option=q["selected_option"],
                is_correct=is_corr,
                confidence=q["confidence"],
                confidence_level_label=f"Level {q['confidence']}" if q["confidence"] else "Unrated",
                error_type=q["error_category"],
                detected_misconception_id=misc_id,
                detected_misconception_name=misc_label,
                explanation=q["explanation"] or "",
                remediation_preview=q.get("explanation") or f"Core concept: {q.get('concept')}",
                time_spent_seconds=q.get("time_spent_seconds", 0),
                visual_artifact_svg=vis_svg,
                feynman_explanation=feynman,
                status_change=status_chg,
            )
        )

    identified_misconceptions = [
        ExamMisconceptionItem(
            misconception_id=m["misconception_id"],
            name=m["label"],
            topic=exam.topic,
            questions_failed=[f"Q{q}" for q in m["affected_questions"]],
            count=len(m["affected_questions"]),
            probability=m["probability"],
            remediation_available=True,
        )
        for m in data.get("misconceptions", [])
    ]

    return ExamReportResponse(
        exam_id=exam.id,
        student_id=student_id,
        topic=exam.topic,
        total_questions=data["total_questions"],
        correct_count=data["correct_count"],
        incorrect_count=data["incorrect_count"],
        unattempted_count=data["unanswered_count"],
        score_percentage=data["percentage"],
        time_limit_minutes=exam.time_limit_minutes,
        time_taken_seconds=data["total_time_seconds"],
        average_confidence=avg_conf,
        calibration_index=data.get("calibration_index", 0.0),
        why_you_lost_marks=data.get("error_breakdown", {}),
        identified_misconceptions=identified_misconceptions,
        concept_breakdown=data.get("concept_breakdown", []),
        question_details=q_details,
    )


@router.get("/teacher/exams", response_model=TeacherExamsResponse)
def get_teacher_exams(
    db: Session = Depends(get_db),
):
    """
    Returns submitted exams for cohort teacher analytics and post-mortem breakdown.
    """
    exams = exam_repo.list_teacher_exams(db)
    exam_summaries: List[TeacherExamSummary] = []
    total_score = 0.0

    for ex in exams:
        miscs: List[str] = []
        if ex.diagnostic_report_json:
            try:
                d = json.loads(ex.diagnostic_report_json)
                miscs = [m["label"] for m in d.get("misconceptions", [])[:3]]
            except Exception:
                pass

        pct = ex.percentage or 0.0
        total_score += pct
        student_id = ex.session.student_id if ex.session else "student_anon"
        demo_match = next((s for s in DEMO_STUDENTS if s.get("student_id") == student_id), None)
        student_name = demo_match["name"] if demo_match else student_id.replace("_", " ").title()

        exam_summaries.append(
            TeacherExamSummary(
                exam_id=ex.id,
                student_id=student_id,
                student_name=student_name,
                topic=ex.topic,
                score=ex.score or 0,
                total=ex.total_questions,
                percentage=pct,
                submitted_at=ex.submitted_at.isoformat() if ex.submitted_at else ex.started_at.isoformat(),
                primary_misconceptions=miscs,
            )
        )

    avg_score = round(total_score / len(exams), 1) if exams else 0.0

    return TeacherExamsResponse(
        exams=exam_summaries,
        total_exams=len(exam_summaries),
        average_score=avg_score,
    )


# ==============================================================================
# 11. Longitudinal Loss Attribution & Progress Journey Endpoints
# ==============================================================================
@router.get("/analytics/loss-attribution/{student_id}", response_model=LossAttributionResponse)
def get_loss_attribution(
    student_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns deterministic longitudinal 4-category loss attribution across all
    exam and practice attempts for the student.
    """
    seed_cohort_if_needed(db)
    res = compute_longitudinal_loss_attribution(db, student_id)
    return LossAttributionResponse(**res)


@router.get("/journey/{session_id}/{misconception_id}", response_model=MisconceptionJourneyResponse)
def get_misconception_journey(
    session_id: str,
    misconception_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns the dynamic 5-node Progress Journey timeline:
    Diagnosed -> Learned -> Practiced -> Verified -> Mastered
    computed directly from existing session, state, remediation, and attempt records.
    """
    res = compute_misconception_journey(db, session_id, misconception_id)
    return MisconceptionJourneyResponse(**res)


# ==============================================================================
# 12. Learning Path & Calibration Trend Endpoints
# ==============================================================================
@router.get("/learning-path/{session_id}", response_model=KnowledgeMapResponse)
def get_learning_path(
    session_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns prescriptive Learning Path over Knowledge Map, deterministically
    ranking persistent/developing concepts by blocked downstream dependencies
    and revision priority. Sets recommended_next: True on the top priority target.
    """
    session = session_repo.get_session(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    res = compute_learning_path(db, session_id)
    return KnowledgeMapResponse(**res)


@router.get("/analytics/calibration-trend/{student_id}", response_model=CalibrationTrendResponse)
def get_calibration_trend(
    student_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns longitudinal calibration index and accuracy points across student sessions.
    """
    seed_cohort_if_needed(db)
    res = compute_calibration_trend(db, student_id)
    return CalibrationTrendResponse(**res)


# ==============================================================================
# 13. Dev Utility: Cleanup Stale Test Sessions
# ==============================================================================
@router.post("/dev/cleanup-sessions", tags=["Dev Utility"])
def dev_cleanup_sessions(
    all_uncompleted: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    Developer-only utility endpoint to clear duplicate or stale uncompleted dev test sessions.
    Preserves completed sessions and demo student data.
    """
    active_sessions = (
        db.query(SessionModel)
        .filter(SessionModel.status != "completed")
        .order_by(SessionModel.created_at.desc())
        .all()
    )

    stale_sessions = []
    if all_uncompleted:
        for s in active_sessions:
            if not s.student_id.startswith("student_demo_"):
                stale_sessions.append(s)
    else:
        seen = set()
        for s in active_sessions:
            key = (s.student_id, s.topic)
            if key in seen:
                stale_sessions.append(s)
            else:
                seen.add(key)

    stale_ids = [s.id for s in stale_sessions]
    if stale_ids:
        db.query(AttemptModel).filter(AttemptModel.session_id.in_(stale_ids)).delete(synchronize_session=False)
        db.query(EvidenceRecordModel).filter(EvidenceRecordModel.session_id.in_(stale_ids)).delete(synchronize_session=False)
        db.query(MisconceptionStateModel).filter(MisconceptionStateModel.session_id.in_(stale_ids)).delete(synchronize_session=False)
        db.query(RemediationRecordModel).filter(RemediationRecordModel.session_id.in_(stale_ids)).delete(synchronize_session=False)
        db.query(SessionModel).filter(SessionModel.id.in_(stale_ids)).delete(synchronize_session=False)
        db.commit()

    return {
        "status": "success",
        "cleaned_sessions_count": len(stale_sessions),
        "cleaned_session_ids": stale_ids,
    }






