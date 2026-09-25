import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, GitPullRequest } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ResolutionBadge } from "@/components/verification/ResolutionBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const VerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    verificationQuestion,
    currentQuestion,
    latestDiagnosis,
    latestVerification,
    submitVerification,
    isLoading,
  } = useSession();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Use verification question or fallback to current question
  const activeQuestion = verificationQuestion || currentQuestion;

  if (!activeQuestion || !latestDiagnosis) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h3 className="text-xl font-bold text-slate-800">No verification pending</h3>
        <p className="text-sm text-muted-foreground">
          Complete a diagnostic session and remediation to verify conceptual repair.
        </p>
        <Button onClick={() => navigate("/quiz")}>
          <span>Go to Assessment</span>
        </Button>
      </div>
    );
  }

  const handleVerify = async () => {
    if (!selectedOption) return;
    try {
      await submitVerification(selectedOption);
    } catch (err) {
      console.error("Verification failed:", err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-2 space-y-6">
      {/* If already verified, show the Resolution / Persistence Result */}
      {latestVerification ? (
        <ResolutionBadge
          result={latestVerification}
          misconceptionLabel={latestDiagnosis.primary_misconception.name}
          onRetry={() => setSelectedOption(null)}
        />
      ) : (
        <div className="space-y-6">
          {/* Header Banner */}
          <Card className="border border-border/70 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-xl shadow-subtle">
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold tracking-wider uppercase mb-1">
              <GitPullRequest className="w-4 h-4" />
              <span>Transfer &amp; Verification</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Let&apos;s see if it clicked.
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Different physical scenario. Same underlying scientific concept.
            </p>
            <div className="mt-3">
              <Badge variant="secondary" className="bg-slate-800/80 text-indigo-300 border-slate-700 text-xs">
                Testing: {latestDiagnosis.primary_misconception.name}
              </Badge>
            </div>
          </Card>

          {/* Verification Question Card */}
          <QuestionCard
            question={activeQuestion}
            selectedOption={selectedOption}
            onSelectOption={setSelectedOption}
            disabled={isLoading}
          />

          {/* Verification CTA */}
          <div className="flex justify-end pt-2">
            <Button
              size="lg"
              onClick={handleVerify}
              disabled={!selectedOption || isLoading}
              className="w-full sm:w-auto px-8 font-semibold text-white bg-primary hover:bg-primary/90 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Verifying Conceptual Repair...</span>
                </>
              ) : (
                <>
                  <span>Verify Understanding</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
