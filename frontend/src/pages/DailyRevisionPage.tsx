import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Target,
  ShieldAlert,
  Loader2,
  Calendar,
  Award,
} from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { api } from "@/api/client";
import { DailyRevisionResponse, DailyRevisionQuestionItem, RemediationResponse } from "@/types";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ConfidenceControl } from "@/components/quiz/ConfidenceControl";
import { RemediationCard } from "@/components/remediation/RemediationCard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";

interface QuestionResult {
  questionId: string;
  revisionType: string;
  isCorrect: boolean;
  confidence: number;
}

export const DailyRevisionPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId, topic } = useSession();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [revisionData, setRevisionData] = useState<DailyRevisionResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(3);
  const [feedback, setFeedback] = useState<{
    submitted: boolean;
    isCorrect: boolean;
    remediation?: RemediationResponse | null;
    loadingRemediation: boolean;
  } | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [completed, setCompleted] = useState<boolean>(false);

  useEffect(() => {
    if (!sessionId) {
      navigate("/");
      return;
    }

    const loadDailyRevision = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getDailyRevision(sessionId);
        setRevisionData(data);
      } catch (err: any) {
        setError(err.message || "Failed to generate daily revision set.");
      } finally {
        setLoading(false);
      }
    };

    loadDailyRevision();
  }, [sessionId, navigate]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-6">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-4 w-96 mx-auto" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !revisionData || revisionData.questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Revision Set Unavailable</AlertTitle>
          <AlertDescription>{error || "No revision items available for this session."}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/revision")} variant="outline" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Back to Revision Queue
        </Button>
      </div>
    );
  }

  const currentItem: DailyRevisionQuestionItem = revisionData.questions[currentIndex];
  const currentQuestion = currentItem.question;
  const isLastQuestion = currentIndex === revisionData.questions.length - 1;

  const handleSubmit = async () => {
    if (!selectedOption) return;

    const isCorrect = selectedOption === currentQuestion.correct_option;
    const newResult: QuestionResult = {
      questionId: currentQuestion.id,
      revisionType: currentItem.revision_type,
      isCorrect,
      confidence,
    };
    setResults((prev) => [...prev, newResult]);

    if (isCorrect) {
      setFeedback({
        submitted: true,
        isCorrect: true,
        loadingRemediation: false,
      });
    } else {
      // Re-use existing /remediate endpoint for wrong answers
      setFeedback({
        submitted: true,
        isCorrect: false,
        loadingRemediation: true,
      });

      try {
        const miscId =
          currentItem.target_misconception_id ||
          currentQuestion.verified_misconception_id ||
          currentQuestion.distractor_misconceptions[selectedOption] ||
          "conceptual_misunderstanding";

        const rem = await api.getRemediation(sessionId!, miscId, true);
        setFeedback({
          submitted: true,
          isCorrect: false,
          remediation: rem,
          loadingRemediation: false,
        });
      } catch (remErr) {
        console.warn("Remediation fetch failed in revision:", remErr);
        setFeedback({
          submitted: true,
          isCorrect: false,
          remediation: null,
          loadingRemediation: false,
        });
      }
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setConfidence(3);
      setFeedback(null);
    }
  };

  // Render Completed Summary
  if (completed) {
    const correctCount = results.filter((r) => r.isCorrect).length;
    const totalCount = results.length;
    const accuracy = Math.round((correctCount / totalCount) * 100);

    const persistentResolved = results.filter(
      (r) => r.revisionType === "persistent_misconception" && r.isCorrect
    ).length;
    const spacedRetained = results.filter(
      (r) => r.revisionType === "spaced_recheck" && r.isCorrect
    ).length;

    return (
      <div className="max-w-3xl mx-auto py-8 space-y-8">
        <Card className="border-border/80 shadow-lg overflow-hidden bg-card">
          <div className="bg-slate-900 text-white p-8 text-center space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Award className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Daily 10-Minute Revision Complete!
            </h1>
            <p className="text-slate-300 max-w-lg mx-auto text-sm">
              Your memory retrieval pathways in <strong>{topic}</strong> were tested across persistent gaps, spaced retention, and confidence calibration.
            </p>
          </div>

          <CardContent className="p-8 space-y-6">
            {/* KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Accuracy</p>
                <p className="text-3xl font-bold text-foreground mt-1">{accuracy}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">{correctCount} of {totalCount} correct</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Persistent Gaps Addressed</p>
                <p className="text-3xl font-bold text-rose-600 mt-1">{persistentResolved} / 2</p>
                <p className="text-xs text-muted-foreground mt-0.5">reinforced today</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Spaced Retention Verified</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{spacedRetained} / 2</p>
                <p className="text-xs text-muted-foreground mt-0.5">retained from past 7 days</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/revision")}
                className="w-full sm:w-auto gap-2"
              >
                <Calendar className="w-4 h-4" />
                Back to Revision Queue
              </Button>
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="w-full sm:w-auto font-semibold gap-2"
              >
                <span>View Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Question Category Pill Configuration
  const getRevisionBadge = (type: string) => {
    switch (type) {
      case "persistent_misconception":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1.5 py-1 px-2.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Top Persistent Misconception
          </Badge>
        );
      case "spaced_recheck":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 py-1 px-2.5">
            <Calendar className="w-3.5 h-3.5" />
            Spaced Retention Check (Past 7 Days)
          </Badge>
        );
      case "confidence_calibration":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1.5 py-1 px-2.5">
            <Target className="w-3.5 h-3.5" />
            Confidence Calibration Probe
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            Adaptive Revision
          </Badge>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Top Progress & Context Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>Daily 10-Minute Cognitive Revision</span>
          </div>
          <span className="text-xs font-bold text-foreground">
            Question {currentIndex + 1} of {revisionData.questions.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / revisionData.questions.length) * 100}%` }}
          />
        </div>

        {/* Question Type & Rationale */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
          <div>{getRevisionBadge(currentItem.revision_type)}</div>
          <p className="text-xs text-muted-foreground italic max-w-md text-right">
            {currentItem.reason_description}
          </p>
        </div>
      </div>

      {/* Main Question Card with Smooth Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <QuestionCard
            question={currentQuestion}
            selectedOption={selectedOption}
            onSelectOption={(opt) => !feedback?.submitted && setSelectedOption(opt)}
            disabled={feedback?.submitted}
          />

          {/* Confidence Slider */}
          {!feedback?.submitted && (
            <div className="bg-card p-5 rounded-xl border border-border/80 shadow-xs">
              <ConfidenceControl
                value={confidence}
                onChange={setConfidence}
              />
            </div>
          )}

          {/* Submit Action */}
          {!feedback?.submitted && (
            <div className="flex justify-end pt-2">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={!selectedOption}
                className="w-full sm:w-auto px-8 font-semibold text-white bg-primary hover:bg-primary/90 shadow-sm"
              >
                <span>Check Answer</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Feedback Section */}
      {feedback?.submitted && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {feedback.isCorrect ? (
            /* Positive Feedback Card */
            <Card className="border-emerald-200 bg-emerald-50/70 p-6 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 mt-0.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-emerald-950">
                    Correct! Concept Confirmed
                  </h3>
                  <p className="text-sm text-emerald-800 leading-relaxed">
                    {currentQuestion.explanation || "You demonstrated sound conceptual understanding on this item."}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="lg"
                  onClick={handleNext}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <span>{isLastQuestion ? "Finish Revision" : "Continue to Next Question"}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          ) : (
            /* Incorrect Answer -> Grounded Remediation Card */
            <div className="space-y-4">
              <Alert variant="destructive" className="border-rose-300 bg-rose-50/80">
                <XCircle className="w-4 h-4 text-rose-600" />
                <AlertTitle className="text-rose-950 font-bold">Incorrect Selection</AlertTitle>
                <AlertDescription className="text-rose-900 text-xs sm:text-sm">
                  The distractor you selected indicates an active misconception. Let&apos;s review the grounded conceptual explanation below.
                </AlertDescription>
              </Alert>

              {feedback.loadingRemediation ? (
                <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground font-medium">
                    Retrieving grounded study material and textbook notes...
                  </p>
                </div>
              ) : feedback.remediation ? (
                /* Reused RemediationCard Component */
                <RemediationCard
                  remediation={feedback.remediation}
                  onProceedToVerification={handleNext}
                />
              ) : (
                <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
                  <h4 className="font-semibold text-sm">Explanation</h4>
                  <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  size="lg"
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold"
                >
                  <span>{isLastQuestion ? "Finish Revision" : "Next Question"}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
