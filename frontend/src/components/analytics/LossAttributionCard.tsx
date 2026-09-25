import React from "react";
import { LossAttributionResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Brain, Flame, FileSpreadsheet, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

interface LossAttributionCardProps {
  data: LossAttributionResponse;
  title?: string;
  description?: string;
}

export const LossAttributionCard: React.FC<LossAttributionCardProps> = ({
  data,
  title = "Why You're Losing Marks (Longitudinal)",
  description = "Aggregated cognitive error attribution across all practice sessions and exams.",
}) => {
  const whyLost = data.why_you_lost_marks || {};
  const conceptualCount = whyLost["conceptual"] ?? data.conceptual ?? 0;
  const overconfidenceCount = whyLost["overconfidence_errors"] ?? data.overconfidence_errors ?? 0;
  const formulaCount = whyLost["formula_confusion"] ?? data.formula_confusion ?? 0;
  const slipCount = whyLost["calculation_slips"] ?? data.calculation_slips ?? 0;

  const pct = data.percentages || {};
  const conceptualPct = pct["conceptual"] ?? 0;
  const overconfidencePct = pct["overconfidence_errors"] ?? 0;
  const formulaPct = pct["formula_confusion"] ?? 0;
  const slipPct = pct["calculation_slips"] ?? 0;

  return (
    <Card className="border border-border/80 shadow-subtle bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-1.5 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-0.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Cognitive Error Attribution</span>
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">{title}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {description}
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs px-2.5 py-1">
              {data.total_losses} Lost Marks / {data.total_evaluated_attempts} Questions
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {data.total_losses === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Zero Cognitive Losses</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No incorrect answers recorded across evaluated assessments. Excellent conceptual stability!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Conceptual Misconceptions */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                    <Brain className="w-3.5 h-3.5" /> Conceptual
                  </span>
                  <Badge variant="persistent" className="text-[10px] py-0 px-1.5 font-bold">
                    {conceptualPct}%
                  </Badge>
                </div>
                <div className="text-2xl font-black text-rose-950 mt-1">{conceptualCount}</div>
                <p className="text-[11px] text-rose-800 leading-snug mt-1">
                  Flawed mental models where intuitive thinking contradicted physical laws.
                </p>
              </div>
            </div>

            {/* 2. Overconfidence Traps */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> Overconfidence
                  </span>
                  <Badge variant="developing" className="text-[10px] py-0 px-1.5 font-bold">
                    {overconfidencePct}%
                  </Badge>
                </div>
                <div className="text-2xl font-black text-amber-950 mt-1">{overconfidenceCount}</div>
                <p className="text-[11px] text-amber-800 leading-snug mt-1">
                  Wrong choices submitted with level 4 or 5 conviction — uncalibrated certainty.
                </p>
              </div>
            </div>

            {/* 3. Formula Confusion */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Formula Confusion
                  </span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold bg-indigo-100 text-indigo-800 border-indigo-200">
                    {formulaPct}%
                  </Badge>
                </div>
                <div className="text-2xl font-black text-indigo-950 mt-1">{formulaCount}</div>
                <p className="text-[11px] text-indigo-800 leading-snug mt-1">
                  Swapping vector/scalar definitions, inversions, or applying formulas out of bounds.
                </p>
              </div>
            </div>

            {/* 4. Calculation Slips */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Slips / Guesses
                  </span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold bg-slate-200 text-slate-800 border-slate-300">
                    {slipPct}%
                  </Badge>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">{slipCount}</div>
                <p className="text-[11px] text-slate-600 leading-snug mt-1">
                  Arithmetic mistakes or low-confidence guesses without deeper misconceptions.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
