import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, Pause, StopCircle, Trophy, BarChart3, RotateCcw } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ConfidenceControl } from "@/components/quiz/ConfidenceControl";
import { ProgressIndicator } from "@/components/quiz/ProgressIndicator";
import { AnswerFeedback } from "@/components/quiz/AnswerFeedback";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";

export const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    sessionId,
    topic,
    sessionLength,
    currentQuestionIndex,
    currentQuestion,
    evidenceCount,
    masteryLevel,
    isLoading,
    error,
    submitAnswer,
    pauseSession,
    endSession,
    clearSession,
  } = useSession();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(3);
  const [pausing, setPausing] = useState(false);
  const [ending, setEnding] = useState(false);

  // Probing loop state
  const [inProbingLoop, setInProbingLoop] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);

  // Snapshot of the question being answered for post-submission feedback
  const [displayedQuestion, setDisplayedQuestion] = useState(currentQuestion);
  const [nextPendingQuestion, setNextPendingQuestion] = useState<any>(null);

  const [answeredState, setAnsweredState] = useState<{
    submitted: boolean;
    isCorrect: boolean;
    confirmed: boolean;
    wasProbing: boolean;
    followUpNumber: number;
    explanation?: string;
  } | null>(null);

  // Keep displayed question synced when not in submitted state
  React.useEffect(() => {
    if (!answeredState && currentQuestion) {
      setDisplayedQuestion(currentQuestion);
    }
  }, [currentQuestion, answeredState]);

  // If question count reached in fixed session, display completion summary
  if (sessionLength !== null && currentQuestionIndex > sessionLength) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-6">
        <Card className="border border-border/80 shadow-md bg-white text-center">
          <CardContent className="p-8 space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Session Complete!
              </h2>
              <p className="text-sm text-slate-600">
                You completed all {sessionLength} questions in this practice run on{" "}
                <span className="font-semibold text-slate-800">{topic}</span>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Mastery</div>
                <div className="text-2xl font-black text-slate-900">
                  {Math.round(masteryLevel * 100)}%
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Evidence Pieces</div>
                <div className="text-2xl font-black text-slate-900">{evidenceCount}</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  clearSession();
                  navigate("/topic");
                }}
                className="w-full font-semibold"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Practice Another Topic
              </Button>
              <Button
                onClick={() => {
                  clearSession();
                  navigate("/dashboard");
                }}
                className="w-full font-semibold text-white bg-primary hover:bg-primary/90"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Insights & Map
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeQ = displayedQuestion || currentQuestion;

  if (!sessionId || !activeQ) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-40 w-full" />
        <p className="text-sm text-muted-foreground">
          No active session detected. Please select a topic to begin.
        </p>
        <Button onClick={() => navigate("/topic")} className="font-semibold">
          Select Topic
        </Button>
      </div>
    );
  }

  const handlePause = async () => {
    setPausing(true);
    try {
      await pauseSession();
      navigate("/topic");
    } catch (err) {
      console.error("Pause failed:", err);
      setPausing(false);
    }
  };

  const handleEnd = async () => {
    setEnding(true);
    try {
      await endSession();
      navigate("/dashboard");
    } catch (err) {
      console.error("End session failed:", err);
      setEnding(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption) return;

    try {
      const res = await submitAnswer(selectedOption, confidence);
      const isCorrect = res.evaluation === "correct";
      const isConfirmed = res.status === "confirmed";

      setNextPendingQuestion(res.next_question || null);

      if (isCorrect) {
        setAnsweredState({
          submitted: true,
          isCorrect: true,
          confirmed: false,
          wasProbing: inProbingLoop,
          followUpNumber: followUpCount,
        });
      } else {
        // Incorrect answer
        if (!inProbingLoop) {
          // Initiate 2-question follow-up probing loop
          setInProbingLoop(true);
          setFollowUpCount(1);
          setAnsweredState({
            submitted: true,
            isCorrect: false,
            confirmed: isConfirmed,
            wasProbing: false,
            followUpNumber: 1,
          });
        } else {
          // Already in probing loop
          const reachedLimit = followUpCount >= 2;
          const confirmedMisconception = isConfirmed || reachedLimit;

          setAnsweredState({
            submitted: true,
            isCorrect: false,
            confirmed: confirmedMisconception,
            wasProbing: true,
            followUpNumber: followUpCount,
          });

          if (!confirmedMisconception) {
            setFollowUpCount((prev) => prev + 1);
          }
        }
      }
    } catch (err) {
      console.error("Submission failed:", err);
    }
  };

  const handleAdvance = () => {
    if (answeredState?.isCorrect && inProbingLoop) {
      // Correct follow-up answer clears probing mode and resumes regular questions
      setInProbingLoop(false);
      setFollowUpCount(0);
    }

    if (nextPendingQuestion) {
      setDisplayedQuestion(nextPendingQuestion);
    } else if (currentQuestion) {
      setDisplayedQuestion(currentQuestion);
    }

    setAnsweredState(null);
    setSelectedOption(null);
    setConfidence(3);
    setNextPendingQuestion(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Session Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Topic: <span className="text-slate-800 font-bold">{topic}</span>
          </span>
          {inProbingLoop && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              Diagnostic Follow-up Probing ({followUpCount}/2)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePause}
            disabled={pausing || ending || isLoading}
            className="text-xs font-medium h-8 px-3 text-slate-700 cursor-pointer"
          >
            {pausing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Pause className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span>Pause</span>
          </Button>

          {sessionLength === null && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnd}
              disabled={pausing || ending || isLoading}
              className="text-xs font-medium h-8 px-3 text-rose-700 border-rose-200 hover:bg-rose-50 cursor-pointer"
            >
              {ending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <StopCircle className="w-3.5 h-3.5 mr-1.5" />
              )}
              <span>End Session</span>
            </Button>
          )}
        </div>
      </div>

      {/* Dynamic Adaptive Progress Indicator */}
      <ProgressIndicator
        evidenceCount={evidenceCount}
        masteryLevel={masteryLevel}
        isDiagnosing={inProbingLoop || activeQ.question_type === "diagnostic"}
        sessionLength={sessionLength}
        currentIndex={currentQuestionIndex}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Question Card with Smooth Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeQ.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <QuestionCard
            question={activeQ}
            selectedOption={selectedOption}
            onSelectOption={(opt) => !answeredState?.submitted && setSelectedOption(opt)}
            disabled={answeredState?.submitted || isLoading}
            isSubmitted={answeredState?.submitted}
            isCorrect={answeredState?.isCorrect}
            correctOption={activeQ.correct_option}
          />

          {/* Confidence Slider / Segmented Control */}
          {!answeredState?.submitted && (
            <div className="bg-white p-5 rounded-xl border border-border/80 shadow-xs">
              <ConfidenceControl
                value={confidence}
                onChange={setConfidence}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Submit Action */}
          {!answeredState?.submitted && (
            <div className="flex justify-end pt-2">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={!selectedOption || isLoading}
                className="w-full sm:w-auto px-8 font-semibold text-white bg-primary hover:bg-primary/90 shadow-sm cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Evaluating Evidence...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Answer</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Immediate Correctness & Follow-up Probing Banner */}
      {answeredState?.submitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="w-full"
        >
          {answeredState.isCorrect ? (
            /* Correct Answer Banner */
            <div className="p-5 rounded-xl border border-emerald-200/90 bg-emerald-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                  <span>Correct!</span>
                </h4>
                <p className="text-sm text-emerald-800 mt-1">
                  {answeredState.wasProbing
                    ? "Great job! You answered this follow-up question correctly. That clarifies the concept and rules out the suspected misunderstanding. Resuming regular practice questions."
                    : "Excellent reasoning. Let's see what you can tackle next."}
                </p>
              </div>
              <Button
                onClick={handleAdvance}
                className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          ) : answeredState.confirmed ? (
            /* Confirmed Misconception Banner -> Route to Remediation */
            <div className="p-6 rounded-xl border border-purple-300 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold tracking-wider text-purple-700 block">
                  Misconception Confirmed
                </span>
                <h4 className="text-lg font-bold text-slate-900">
                  We found the pattern in your reasoning.
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
                  Across these diagnostic questions, an intuitive misconception was identified.
                  Let&apos;s master this concept right now using a Feynman breakdown, a visual schematic, and curated video clips.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => navigate("/diagnosis")}
                  className="font-medium text-xs border-indigo-200 hover:bg-indigo-50"
                >
                  View Details
                </Button>
                <Button
                  onClick={() => navigate("/remediation")}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white font-semibold shadow-sm cursor-pointer"
                >
                  <span>Go to Remediation</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          ) : (
            /* Incorrect Answer -> Prompting Follow-up Probing */
            <div className="p-5 rounded-xl border border-indigo-200/90 bg-indigo-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-indigo-950 flex items-center gap-2">
                  <span>Not quite right.</span>
                </h4>
                <p className="text-sm text-indigo-900/90 mt-1 max-w-xl">
                  {!answeredState.wasProbing
                    ? "One mistake doesn't explain your thinking. We're launching up to 2 targeted follow-up questions from the hypothesis pool to isolate any misconception. If you answer one correctly, normal practice resumes!"
                    : `Follow-up question ${answeredState.followUpNumber} of 2. Let's test this alternative scenario to narrow down the misconception.`}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => navigate("/diagnosis")}
                  className="font-medium text-xs border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                >
                  View Diagnosis
                </Button>
                <Button
                  onClick={handleAdvance}
                  className="w-full sm:w-auto bg-indigo-700 hover:bg-indigo-800 text-white font-semibold cursor-pointer"
                >
                  <span>
                    {!answeredState.wasProbing
                      ? "Start Follow-up Probing (1/2)"
                      : `Next Follow-up (${answeredState.followUpNumber + 1}/2)`}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

