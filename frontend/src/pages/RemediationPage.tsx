import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { RemediationCard } from "@/components/remediation/RemediationCard";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Loader2 } from "lucide-react";

export const RemediationPage: React.FC = () => {
  const navigate = useNavigate();
  const { latestRemediation, latestDiagnosis, fetchRemediation, isLoading } = useSession();

  useEffect(() => {
    // If diagnosis exists but remediation hasn't been fetched yet, fetch automatically
    if (latestDiagnosis && !latestRemediation && !isLoading) {
      fetchRemediation().catch((e) => console.error(e));
    }
  }, [latestDiagnosis, latestRemediation, isLoading]);

  if (isLoading && !latestRemediation) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
        <h3 className="text-lg font-bold text-slate-900">Synthesizing Targeted Remediation...</h3>
        <p className="text-xs text-muted-foreground">
          Unpacking root cognitive causes and building an intuitive reframing.
        </p>
      </div>
    );
  }

  if (!latestRemediation) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h3 className="text-xl font-bold text-slate-800">No remediation available</h3>
        <p className="text-sm text-muted-foreground">
          Please complete a diagnostic quiz to trigger targeted conceptual remediation.
        </p>
        <Button onClick={() => navigate("/quiz")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to Assessment</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-2 space-y-6">
      <RemediationCard
        remediation={latestRemediation}
        onProceedToVerification={() => navigate("/verification")}
      />
    </div>
  );
};
