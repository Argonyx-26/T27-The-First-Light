import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ConfidenceControl } from "@/components/quiz/ConfidenceControl";
import { ProgressIndicator } from "@/components/quiz/ProgressIndicator";
import { AnswerFeedback } from "@/components/quiz/AnswerFeedback";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";

export const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    sessionId,
    currentQuestion,
    evidenceCount,
    masteryLevel,
    isLoading,
    error,
    submitAnswer,
  } = useSession();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(3);
  const [answeredState, setAnsweredState] = useState<{
    submitted: boolean;
    isCorrect: boolean;
    confirmed: boolean;
  } | null>(null);

  if (!sessionId || !currentQuestion) {
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

  const handleSubmit = async () => {
    if (!selectedOption) return;

    try {
      const res = await submitAnswer(selectedOption, confidence);

      if (res.status === "confirmed") {
        setAnsweredState({
          submitted: true,
          isCorrect: false,
          confirmed: true,
        });
        // Transition directly to signature diagnosis screen
        navigate("/diagnosis");
      } else {
        setAnsweredState({
          submitted: true,
          isCorrect: res.evaluation === "correct",
          confirmed: false,
        });
      }
    } catch (err) {
      console.error("Submission failed:", err);
    }
  };

  const handleNextQuestion = () => {
    setAnsweredState(null);
    setSelectedOption(null);
    setConfidence(3);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Dynamic Adaptive Progress Indicator */}
      <ProgressIndicator
        evidenceCount={evidenceCount}
        masteryLevel={masteryLevel}
        isDiagnosing={currentQuestion.question_type === "diagnostic" || currentQuestion.id.includes("diag")}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
            onSelectOption={(opt) => !answeredState?.submitted && setSelectedOption(opt)}
            disabled={answeredState?.submitted || isLoading}
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
                className="w-full sm:w-auto px-8 font-semibold text-white bg-primary hover:bg-primary/90 shadow-sm"
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

      {/* Answer Feedback Transition */}
      {answeredState?.submitted && !answeredState.confirmed && (
        <AnswerFeedback
          isCorrect={answeredState.isCorrect}
          onContinue={handleNextQuestion}
        />
      )}
    </div>
  );
};
