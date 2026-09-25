import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { DiagnosisSummary, Hypothesis } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EvidenceList } from "./EvidenceList";
import { AlternativeHypotheses } from "./AlternativeHypotheses";
import { HypothesisBars } from "./HypothesisBars";
import { Separator } from "@/components/ui/Separator";

interface DiagnosisCardProps {
  diagnosis: DiagnosisSummary;
  activeHypotheses?: Hypothesis[];
  onStartRemediation?: () => void;
}

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({
  diagnosis,
  activeHypotheses = [],
  onStartRemediation,
}) => {
  const { confirmed, primary_misconception, evidence, alternatives } = diagnosis;
  const isConfirmed = confirmed !== false;
  const confidencePercent = Math.round(primary_misconception.confidence_score * 100);

  return (
    <Card className="border border-border/80 shadow-card bg-card overflow-hidden">
      <CardHeader className="bg-slate-900 text-white p-6 sm:p-8">
        <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold tracking-wider uppercase mb-2">
          <Sparkles className="w-4 h-4" />
          <span>{isConfirmed ? "Diagnostic Confirmation" : "Active Diagnostic Probing"}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {isConfirmed ? "We found the pattern." : "Analyzing Your Reasoning"}
        </h2>
        <p className="text-sm text-slate-300 mt-1 max-w-xl">
          {isConfirmed
            ? "Based on your choices and confidence across multiple questions, we have isolated the underlying mental model."
            : "We detected an interesting pattern in your answer. Here are the competing hypotheses and evidence evaluated so far."}
        </p>

        {/* Primary Misconception Banner */}
        <div className="mt-6 bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 block mb-1">
              {isConfirmed ? "Likely Misconception" : "Leading Hypothesis"}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {primary_misconception.name}
            </h3>
            {primary_misconception.description && (
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {primary_misconception.description}
              </p>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center bg-slate-900/90 px-4 py-2.5 rounded-lg border border-indigo-400/30">
            <ShieldCheck className="w-4 h-4 text-indigo-400 mr-2" />
            <div className="text-right">
              <span className="text-xs text-slate-400 block leading-none">Status</span>
              <span className="text-sm font-bold text-indigo-300">
                {isConfirmed ? "Confirmed Pattern" : "Active Focus"}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Hypothesis Comparison */}
        {activeHypotheses && activeHypotheses.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-50/60 border border-border/70">
            <HypothesisBars hypotheses={activeHypotheses} primaryId={primary_misconception.id} />
          </div>
        )}

        {/* Evidence List */}
        <EvidenceList evidence={evidence} />

        <Separator />

        {/* Alternative Possibilities */}
        <AlternativeHypotheses alternatives={alternatives} />
      </CardContent>

      <CardFooter className="p-6 sm:p-8 bg-slate-50/50 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground text-center sm:text-left">
          {isConfirmed
            ? "Targeted remediation will explain why this intuition occurs and how to fix it."
            : "Continue with the next targeted question to help verify or rule out this hypothesis."}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {!isConfirmed && (
            <Link to="/quiz" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold">
                <span>Continue Probing</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}

          <Link to="/remediation" className="w-full sm:w-auto" onClick={onStartRemediation}>
            <Button
              size="lg"
              variant={isConfirmed ? "default" : "outline"}
              className={`w-full sm:w-auto font-semibold ${
                isConfirmed
                  ? "bg-primary hover:bg-primary/90 text-white"
                  : "border-primary/40 text-primary hover:bg-primary/10"
              }`}
            >
              <span>{isConfirmed ? "Fix this misconception" : "Remediate now"}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};
