import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/api/client";
import {
  DiagnosisSummary,
  Hypothesis,
  Question,
  RemediationResponse,
  SubmitAnswerResponse,
  VerifyResponse,
} from "@/types";

interface SessionContextType {
  sessionId: string | null;
  topic: string | null;
  sessionLength: number | null;
  currentQuestionIndex: number;
  currentQuestion: Question | null;
  verificationQuestion: Question | null;
  activeHypotheses: Hypothesis[];
  latestDiagnosis: DiagnosisSummary | null;
  latestRemediation: RemediationResponse | null;
  latestVerification: VerifyResponse | null;
  masteryLevel: number;
  evidenceCount: number;
  isLoading: boolean;
  error: string | null;
  lastAnswerResult: {
    evaluation: "correct" | "incorrect";
    selectedOption: string;
    isCorrect: boolean;
  } | null;

  // Methods
  startSession: (topic: string, sessionLength?: number | null) => Promise<void>;
  submitAnswer: (option: string, confidence: number) => Promise<SubmitAnswerResponse>;
  pauseSession: () => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  endSession: () => Promise<void>;
  fetchRemediation: () => Promise<RemediationResponse>;
  submitVerification: (option: string) => Promise<VerifyResponse>;
  clearSession: () => void;
  setError: (err: string | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const STORAGE_SESSION_KEY = "mm_session_id";
const STORAGE_TOPIC_KEY = "mm_topic";
const STORAGE_LENGTH_KEY = "mm_session_length";
const STORAGE_INDEX_KEY = "mm_question_index";

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_SESSION_KEY) || null;
  });
  const [topic, setTopic] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_TOPIC_KEY) || null;
  });

  const [sessionLength, setSessionLength] = useState<number | null>(() => {
    const stored = sessionStorage.getItem(STORAGE_LENGTH_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() => {
    const stored = sessionStorage.getItem(STORAGE_INDEX_KEY);
    return stored ? parseInt(stored, 10) : 1;
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [verificationQuestion, setVerificationQuestion] = useState<Question | null>(null);
  const [activeHypotheses, setActiveHypotheses] = useState<Hypothesis[]>([]);
  const [latestDiagnosis, setLatestDiagnosis] = useState<DiagnosisSummary | null>(null);
  const [latestRemediation, setLatestRemediation] = useState<RemediationResponse | null>(null);
  const [latestVerification, setLatestVerification] = useState<VerifyResponse | null>(null);
  const [masteryLevel, setMasteryLevel] = useState<number>(0);
  const [evidenceCount, setEvidenceCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<{
    evaluation: "correct" | "incorrect";
    selectedOption: string;
    isCorrect: boolean;
  } | null>(null);

  // Sync session ID to sessionStorage
  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem(STORAGE_SESSION_KEY, sessionId);
    } else {
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
    }
  }, [sessionId]);

  // Sync topic to sessionStorage
  useEffect(() => {
    if (topic) {
      sessionStorage.setItem(STORAGE_TOPIC_KEY, topic);
    } else {
      sessionStorage.removeItem(STORAGE_TOPIC_KEY);
    }
  }, [topic]);

  // Sync session length and index to sessionStorage
  useEffect(() => {
    if (sessionLength !== null) {
      sessionStorage.setItem(STORAGE_LENGTH_KEY, String(sessionLength));
    } else {
      sessionStorage.removeItem(STORAGE_LENGTH_KEY);
    }
  }, [sessionLength]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_INDEX_KEY, String(currentQuestionIndex));
  }, [currentQuestionIndex]);

  /**
   * Starts a new adaptive diagnostic session.
   */
  const startSession = async (chosenTopic: string, chosenLength?: number | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const lengthVal = chosenLength !== undefined ? chosenLength : null;
      let studentId = typeof window !== "undefined" ? localStorage.getItem("mm_student_id") : null;
      if (!studentId && typeof window !== "undefined") {
        studentId = `student_${Math.random().toString(36).substring(2, 10)}`;
        localStorage.setItem("mm_student_id", studentId);
      }
      const sessionRes = await api.createSession(chosenTopic, lengthVal);
      if (typeof window !== "undefined") {
        localStorage.setItem("mm_student_id", (sessionRes as any).student_id || studentId || "student_active");
      }
      setSessionId(sessionRes.session_id);
      setTopic(chosenTopic);
      setSessionLength(lengthVal);
      setCurrentQuestionIndex(1);
      setMasteryLevel(0);
      setEvidenceCount(0);
      setActiveHypotheses([]);
      setLatestDiagnosis(null);
      setLatestRemediation(null);
      setLatestVerification(null);
      setLastAnswerResult(null);

      // Load initial question set
      const quizRes = await api.generateQuiz(chosenTopic, sessionRes.session_id, 3);
      if (quizRes.questions && quizRes.questions.length > 0) {
        setCurrentQuestion(quizRes.questions[0]);
      } else {
        throw new Error("No diagnostic questions found for this topic.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to start assessment session.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Pauses the active session saving progress on backend.
   */
  const pauseSession = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      await api.pauseSession(sessionId);
    } catch (err: any) {
      console.error("Failed to pause session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resumes an existing active or paused session exactly as it was.
   */
  const resumeSession = async (targetSessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const detail = await api.resumeSession(targetSessionId);
      setSessionId(detail.session_id);
      setTopic(detail.topic);
      setSessionLength(detail.session_length ?? null);
      setCurrentQuestionIndex(detail.current_question_index || 1);
      setMasteryLevel(detail.mastery_score || 0);
      setEvidenceCount(detail.evidence_count || 0);
      setActiveHypotheses(detail.active_hypotheses || []);
      setLatestDiagnosis(null);
      setLatestRemediation(null);
      setLatestVerification(null);
      setLastAnswerResult(null);

      if (detail.current_question) {
        setCurrentQuestion(detail.current_question);
      } else {
        const quiz = await api.generateQuiz(detail.topic, detail.session_id, 3);
        if (quiz.questions && quiz.questions.length > 0) {
          setCurrentQuestion(quiz.questions[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to resume session.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Ends the active session cleanly.
   */
  const endSession = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      await api.endSession(sessionId);
      clearSession();
    } catch (err: any) {
      console.error("Failed to end session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Submits student answer and confidence level.
   */
  const submitAnswer = async (option: string, confidence: number): Promise<SubmitAnswerResponse> => {
    if (!sessionId || !currentQuestion) {
      throw new Error("No active session or question.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.submitAnswer(sessionId, currentQuestion.id, option, confidence);
      setLastAnswerResult({
        evaluation: res.evaluation,
        selectedOption: option,
        isCorrect: res.evaluation === "correct",
      });
      setMasteryLevel(res.mastery_level);
      setEvidenceCount((prev) => prev + 1);
      setCurrentQuestionIndex((prev) => prev + 1);

      if (res.active_hypotheses) {
        setActiveHypotheses(res.active_hypotheses);
      }

      if (res.diagnosis) {
        setLatestDiagnosis(res.diagnosis);
      }
      if (res.next_question) {
        setCurrentQuestion(res.next_question);
      }

      return res;
    } catch (err: any) {
      setError(err.message || "Failed to submit response.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetches targeted remediation for confirmed misconception.
   */
  const fetchRemediation = async (): Promise<RemediationResponse> => {
    if (!sessionId || !latestDiagnosis) {
      throw new Error("No active confirmed diagnosis to remediate.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const rem = await api.getRemediation(
        sessionId,
        latestDiagnosis.primary_misconception.id
      );
      setLatestRemediation(rem);

      // Also pre-fetch the different-form verification question
      const quiz = await api.generateQuiz(topic || "General Knowledge", sessionId, 10);
      const verifyQ = quiz.questions.find(
        (q) => q.question_type === "verification" || q.id.includes("verify")
      );
      if (verifyQ) {
        setVerificationQuestion(verifyQ);
      }
      return rem;
    } catch (err: any) {
      setError(err.message || "Failed to retrieve remediation.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Submits verification response.
   */
  const submitVerification = async (option: string): Promise<VerifyResponse> => {
    if (!sessionId || !latestDiagnosis) {
      throw new Error("Missing active session or diagnosis for verification.");
    }

    // Default to verificationQuestion or fallback to currentQuestion
    const vQ = verificationQuestion || currentQuestion;
    if (!vQ) {
      throw new Error("No verification question available.");
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.verifyAnswer(
        sessionId,
        latestDiagnosis.primary_misconception.id,
        vQ.id,
        option
      );
      setLatestVerification(res);
      return res;
    } catch (err: any) {
      setError(err.message || "Failed to verify response.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = () => {
    setSessionId(null);
    setTopic(null);
    setSessionLength(null);
    setCurrentQuestionIndex(1);
    setCurrentQuestion(null);
    setVerificationQuestion(null);
    setActiveHypotheses([]);
    setLatestDiagnosis(null);
    setLatestRemediation(null);
    setLatestVerification(null);
    setLastAnswerResult(null);
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    sessionStorage.removeItem(STORAGE_TOPIC_KEY);
    sessionStorage.removeItem(STORAGE_LENGTH_KEY);
    sessionStorage.removeItem(STORAGE_INDEX_KEY);
  };

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        topic,
        sessionLength,
        currentQuestionIndex,
        currentQuestion,
        verificationQuestion,
        activeHypotheses,
        latestDiagnosis,
        latestRemediation,
        latestVerification,
        masteryLevel,
        evidenceCount,
        isLoading,
        error,
        lastAnswerResult,
        startSession,
        submitAnswer,
        pauseSession,
        resumeSession,
        endSession,
        fetchRemediation,
        submitVerification,
        clearSession,
        setError,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
