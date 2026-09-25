import React from "react";
import { Activity, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/Progress";

interface ProgressIndicatorProps {
  evidenceCount: number;
  masteryLevel: number;
  isDiagnosing?: boolean;
  sessionLength?: number | null;
  currentIndex?: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  evidenceCount,
  masteryLevel,
  isDiagnosing = false,
  sessionLength,
  currentIndex,
}) => {
  // Calculate progress based on question limit if set, or evidence pieces gathered
  const calculatedProgress = sessionLength
    ? Math.min(100, Math.max(10, ((currentIndex || 1) / sessionLength) * 100))
    : Math.min(100, Math.max(15, (evidenceCount / 3) * 100));

  return (
    <div className="w-full space-y-2 bg-white p-3.5 rounded-xl border border-border/70 shadow-xs">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
          <Activity className="w-3.5 h-3.5 text-indigo-600" />
          <span>{isDiagnosing ? "Diagnostic Focus Active" : "Adaptive Assessment"}</span>
        </div>
        <div className="flex items-center space-x-2 text-muted-foreground">
          {sessionLength ? (
            <span className="font-semibold text-slate-800">
              Q{currentIndex || 1} of {sessionLength}
            </span>
          ) : (
            <span className="font-semibold text-slate-800">
              Q{currentIndex || 1} (Unlimited)
            </span>
          )}
          <span>•</span>
          <span>Evidence: <strong className="text-slate-800 font-semibold">{evidenceCount}</strong></span>
          <span>•</span>
          <span className="flex items-center text-emerald-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 mr-0.5 inline" />
            Mastery: {Math.round(masteryLevel * 100)}%
          </span>
        </div>
      </div>

      <Progress value={calculatedProgress} indicatorClassName={isDiagnosing ? "bg-indigo-600" : "bg-primary"} />
    </div>
  );
};
