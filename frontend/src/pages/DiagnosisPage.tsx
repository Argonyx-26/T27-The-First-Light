import React from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export const DiagnosisPage: React.FC = () => {
  const navigate = useNavigate();
  const { latestDiagnosis, activeHypotheses, fetchRemediation } = useSession();

  if (!latestDiagnosis) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h3 className="text-xl font-bold text-slate-800">No active diagnosis</h3>
        <p className="text-sm text-muted-foreground">
          Continue your assessment to let the engine isolate cognitive patterns.
        </p>
        <Button onClick={() => navigate("/quiz")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Return to Quiz</span>
        </Button>
      </div>
    );
  }

  const handleStartRemediation = async () => {
    try {
      await fetchRemediation();
      navigate("/remediation");
    } catch (err) {
      console.error("Failed to load remediation:", err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-2 space-y-6">
      <DiagnosisCard
        diagnosis={latestDiagnosis}
        activeHypotheses={activeHypotheses}
        onStartRemediation={handleStartRemediation}
      />
    </div>
  );
};
