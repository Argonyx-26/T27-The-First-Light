import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  Flag,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Send,
} from "lucide-react";
import { api } from "@/api/client";
import { ExamAttemptView, ExamQuestionView, ExamSessionResponse } from "@/types";
import { ConfidenceControl } from "@/components/quiz/ConfidenceControl";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

export const ExamSessionPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<ExamSessionResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Local attempts map for responsive UI updates
  const [attempts, setAttempts] = useState<Record<string, ExamAttemptView>>({});
  const questionStartTimeRef = useRef<number>(Date.now());

  // Fetch exam state on mount
  useEffect(() => {
    if (!examId) return;

    let isMounted = true;
    api
      .getExam(examId)
      .then((data) => {
        if (!isMounted) return;
        if (data.status === "submitted" || data.status === "completed") {
          navigate(`/exam/${examId}/report`, { replace: true });
          return;
        }

        setExam(data);
        setRemainingSeconds(data.remaining_seconds);

        const attemptMap: Record<string, ExamAttemptView> = {};
        data.attempts.forEach((a) => {
          attemptMap[a.question_id] = a;
        });
        setAttempts(attemptMap);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || "Failed to load exam session.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [examId, navigate]);

  // Countdown timer ticker
  useEffect(() => {
    if (isLoading || !exam || exam.status === "submitted") return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, exam]);

  // Helper to persist answer updates
  const saveAttemptUpdate = useCallback(
    async (
      questionId: string,
      updates: {
        selected_option?: string | null;
        confidence?: number | null;
        is_marked_for_review?: boolean;
      }
    ) => {
      if (!examId) return;

      const elapsed = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
      const existing = attempts[questionId] || {
        question_id: questionId,
        order_index: currentIndex + 1,
        selected_option: null,
        confidence: null,
        is_marked_for_review: false,
        time_spent_seconds: 0,
      };

      const updatedAttempt: ExamAttemptView = {
        ...existing,
        ...updates,
        time_spent_seconds: (existing.time_spent_seconds || 0) + elapsed,
      };

      setAttempts((prev) => ({
        ...prev,
        [questionId]: updatedAttempt,
      }));
      questionStartTimeRef.current = Date.now();

      try {
        await api.saveExamAnswer(examId, {
          question_id: questionId,
          selected_option: updatedAttempt.selected_option,
          confidence: updatedAttempt.confidence,
          is_marked_for_review: updatedAttempt.is_marked_for_review,
          time_spent_seconds: updatedAttempt.time_spent_seconds,
        });
      } catch (err) {
        console.error("Failed to auto-save answer:", err);
      }
    },
    [examId, attempts, currentIndex]
  );

  const handleSelectOption = (optionKey: string) => {
    if (!currentQuestion) return;
    saveAttemptUpdate(currentQuestion.id, {
      selected_option: optionKey,
      confidence: currentAttempt?.confidence || 3, // Default moderate confidence if not chosen yet
    });
  };

  const handleSelectConfidence = (confVal: number) => {
    if (!currentQuestion) return;
    saveAttemptUpdate(currentQuestion.id, {
      confidence: confVal,
    });
  };

  const handleToggleReview = () => {
    if (!currentQuestion) return;
    const newFlag = !currentAttempt?.is_marked_for_review;
    saveAttemptUpdate(currentQuestion.id, {
      is_marked_for_review: newFlag,
    });
  };

  const handleNavigateQuestion = (targetIndex: number) => {
    if (!exam) return;
    if (targetIndex < 0 || targetIndex >= exam.questions.length) return;
    questionStartTimeRef.current = Date.now();
    setCurrentIndex(targetIndex);
  };

  const handleSubmitExam = async () => {
    if (!examId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.submitExam(examId);
      navigate(`/exam/${examId}/report`, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Failed to submit exam.");
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  // Format timer
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const isLowTime = remainingSeconds <= 300 && remainingSeconds > 60;
  const isCriticalTime = remainingSeconds <= 60;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Initializing secure exam session...</p>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="max-w-lg mx-auto p-6 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-rose-900">Exam Error</h2>
        <p className="text-sm text-rose-700">{error}</p>
        <Button onClick={() => navigate("/exam")} variant="outline" className="mt-2">
          Back to Exam Setup
        </Button>
      </div>
    );
  }

  if (!exam || exam.questions.length === 0) {
    return null;
  }

  const currentQuestion: ExamQuestionView | undefined = exam.questions[currentIndex];
  const currentAttempt = currentQuestion ? attempts[currentQuestion.id] : undefined;

  // Stats for palette & modal
  const totalQuestions = exam.questions.length;
  const answeredCount = Object.values(attempts).filter((a) => a.selected_option !== null && a.selected_option !== undefined).length;
  const markedCount = Object.values(attempts).filter((a) => a.is_marked_for_review).length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Banner: Timer & Controls */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-800">
            {exam.topic}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
            Candidate: <strong className="text-slate-700">{exam.student_id}</strong>
          </span>
        </div>

        {/* Server Authoritative Timer Display */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <div
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg border font-mono font-bold text-sm sm:text-base transition-colors ${
              isCriticalTime
                ? "bg-rose-100 border-rose-300 text-rose-700 animate-pulse"
                : isLowTime
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-slate-100 border-slate-200 text-slate-800"
            }`}
          >
            <Clock className={`h-4 w-4 ${isCriticalTime ? "text-rose-600" : isLowTime ? "text-amber-600" : "text-slate-600"}`} />
            <span>{timeFormatted}</span>
          </div>

          <Button
            onClick={() => setShowSubmitModal(true)}
            variant="default"
            size="sm"
            className="font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Submit Exam</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Question & Question Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Question Card */}
        <div className="lg:col-span-8 space-y-6">
          {currentQuestion && (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              {/* Question Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                    {currentIndex + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {currentQuestion.concept}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleReview}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      currentAttempt?.is_marked_for_review
                        ? "bg-amber-100 border-amber-300 text-amber-800"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Flag className={`h-3.5 w-3.5 ${currentAttempt?.is_marked_for_review ? "fill-amber-600 text-amber-600" : ""}`} />
                    <span>{currentAttempt?.is_marked_for_review ? "Flagged" : "Flag for Review"}</span>
                  </button>
                </div>
              </div>

              {/* Question Body */}
              <CardContent className="p-5 sm:p-6 space-y-6">
                <p className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
                  {currentQuestion.question_text}
                </p>

                {/* Options List */}
                <div className="space-y-3">
                  {Object.entries(currentQuestion.options).map(([optKey, optText]) => {
                    const isSelected = currentAttempt?.selected_option === optKey;
                    return (
                      <button
                        key={optKey}
                        type="button"
                        onClick={() => handleSelectOption(optKey)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all flex items-start space-x-3.5 ${
                          isSelected
                            ? "border-primary bg-indigo-50/60 ring-2 ring-primary/20 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md font-bold text-xs transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {optKey}
                        </span>
                        <span className={`text-sm sm:text-base leading-snug ${isSelected ? "text-slate-900 font-semibold" : "text-slate-700"}`}>
                          {optText}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Confidence Control */}
                {currentAttempt?.selected_option && (
                  <div className="pt-4 border-t border-slate-100">
                    <ConfidenceControl
                      value={currentAttempt.confidence || 3}
                      onChange={handleSelectConfidence}
                    />
                  </div>
                )}
              </CardContent>

              {/* Bottom Navigation */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <Button
                  onClick={() => handleNavigateQuestion(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  variant="outline"
                  size="sm"
                  className="space-x-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                <span className="text-xs text-muted-foreground font-medium">
                  {currentAttempt?.selected_option ? (
                    <span className="text-emerald-600 flex items-center space-x-1">
                      <CheckCircle2 className="h-3.5 w-3.5 inline" />
                      <span>Answer Saved</span>
                    </span>
                  ) : (
                    <span>Not Answered</span>
                  )}
                </span>

                {currentIndex < totalQuestions - 1 ? (
                  <Button
                    onClick={() => handleNavigateQuestion(currentIndex + 1)}
                    size="sm"
                    className="space-x-1.5"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowSubmitModal(true)}
                    size="sm"
                    className="space-x-1.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <span>Finish Exam</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Question Palette Grid & Summary */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Question Palette</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click any number to navigate immediately.
                </p>
              </div>

              {/* Palette Grid */}
              <div className="grid grid-cols-5 gap-2">
                {exam.questions.map((q, idx) => {
                  const att = attempts[q.id];
                  const isAnswered = att?.selected_option !== null && att?.selected_option !== undefined;
                  const isMarked = att?.is_marked_for_review;
                  const isCurrent = idx === currentIndex;

                  let bgClass = "bg-white text-slate-700 border-slate-200 hover:border-slate-400";
                  if (isAnswered && isMarked) {
                    bgClass = "bg-amber-100 text-amber-900 border-amber-400 font-bold";
                  } else if (isAnswered) {
                    bgClass = "bg-primary text-primary-foreground border-primary font-bold";
                  } else if (isMarked) {
                    bgClass = "bg-amber-50 text-amber-700 border-amber-300 font-medium";
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleNavigateQuestion(idx)}
                      className={`h-10 rounded-lg border-2 flex items-center justify-center text-xs relative transition-all ${bgClass} ${
                        isCurrent ? "ring-2 ring-indigo-500 ring-offset-2 scale-105 z-10" : ""
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {isMarked && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full border border-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Palette Legend */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded bg-primary" />
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded bg-amber-100 border border-amber-400" />
                  <span>Marked for Review ({markedCount})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded bg-white border border-slate-300" />
                  <span>Unattempted ({unansweredCount})</span>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                <span className="font-semibold text-slate-700">Completion</span>
                <span className="font-bold text-slate-900">
                  {Math.round((answeredCount / totalQuestions) * 100)}% ({answeredCount}/{totalQuestions})
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-full bg-indigo-50 text-indigo-700">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Ready to Submit Exam?</h3>
                <p className="text-xs text-muted-foreground">Your diagnostic post-mortem will be computed.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Total Questions:</span>
                <span className="font-semibold">{totalQuestions}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Questions Answered:</span>
                <span className="font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Marked for Review:</span>
                <span className="font-bold">{markedCount}</span>
              </div>
              {unansweredCount > 0 && (
                <div className="flex justify-between text-rose-700 font-semibold">
                  <span>Unanswered Questions:</span>
                  <span>{unansweredCount}</span>
                </div>
              )}
            </div>

            {unansweredCount > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                You still have {unansweredCount} unanswered question(s). Are you sure you wish to submit now?
              </p>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
              >
                Continue Exam
              </Button>
              <Button
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                size="sm"
                className="bg-primary font-bold"
              >
                {isSubmitting ? "Scoring & Diagnosing..." : "Confirm & Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
