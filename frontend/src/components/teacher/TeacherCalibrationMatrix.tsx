import React from "react";
import { ConfidenceCalibration } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlertCircle, CheckCircle2, HelpCircle, ShieldAlert, Sparkles } from "lucide-react";

interface TeacherCalibrationMatrixProps {
  calibration: ConfidenceCalibration;
  totalAttempts?: number;
}

export const TeacherCalibrationMatrix: React.FC<TeacherCalibrationMatrixProps> = ({
  calibration,
  totalAttempts,
}) => {
  const {
    high_confidence_correct,
    high_confidence_incorrect,
    low_confidence_correct,
    low_confidence_incorrect,
    calibration_index,
  } = calibration;

  const total =
    totalAttempts ||
    high_confidence_correct +
      high_confidence_incorrect +
      low_confidence_correct +
      low_confidence_incorrect ||
    1;

  const pct = (val: number) => Math.round((val / total) * 100);

  return (
    <Card className="border border-border/80 shadow-card bg-card overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Class Confidence Calibration</span>
              <Badge variant="outline" className="text-xs font-normal">
                Metacognitive Index: {Math.round(calibration_index * 100)}%
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Evaluates how well student confidence reflects actual correctness. Highlights overconfidence vs hesitation.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* 4 Quadrants Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Top-Right equivalent: High Confidence + Correct */}
          <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 space-y-1.5 transition-all hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Calibrated Mastery
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {pct(high_confidence_correct)}%
              </span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-950">
              {high_confidence_correct}{" "}
              <span className="text-xs font-medium text-emerald-700">responses</span>
            </div>
            <p className="text-xs text-emerald-900/80 leading-relaxed">
              <strong>Correct + High Confidence (4–5):</strong> Concepts solidly internalized with justified epistemic certainty.
            </p>
          </div>

          {/* Critical: High Confidence + Incorrect */}
          <div className="p-4 rounded-xl border border-rose-200/80 bg-rose-50/50 space-y-1.5 transition-all hover:border-rose-300 ring-1 ring-rose-200/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Deep Misconception Zone
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                {pct(high_confidence_incorrect)}%
              </span>
            </div>
            <div className="text-2xl font-extrabold text-rose-950">
              {high_confidence_incorrect}{" "}
              <span className="text-xs font-medium text-rose-700">responses</span>
            </div>
            <p className="text-xs text-rose-900/80 leading-relaxed">
              <strong>Incorrect + High Confidence (4–5):</strong> High-yield diagnostic signal. Student is certain of an invalid mental model, not merely guessing.
            </p>
          </div>

          {/* Low Confidence + Correct */}
          <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 space-y-1.5 transition-all hover:border-amber-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                Hesitant Understanding
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {pct(low_confidence_correct)}%
              </span>
            </div>
            <div className="text-2xl font-extrabold text-amber-950">
              {low_confidence_correct}{" "}
              <span className="text-xs font-medium text-amber-700">responses</span>
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              <strong>Correct + Low Confidence (1–2):</strong> Lucky guesses or fragile intuition requiring reinforcement to build conviction.
            </p>
          </div>

          {/* Low Confidence + Incorrect */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-1.5 transition-all hover:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                Recognized Knowledge Gap
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                {pct(low_confidence_incorrect)}%
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {low_confidence_incorrect}{" "}
              <span className="text-xs font-medium text-slate-600">responses</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Incorrect + Low Confidence (1–2):</strong> Aware ignorance. Student knows they do not know; receptive to fundamental instruction.
            </p>
          </div>
        </div>

        {/* Pedagogical Callout Banner */}
        <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
          <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <span>
            <strong>Key Product Principle:</strong> Confidence is evidence, not a diagnosis. A high-confidence incorrect answer triggers targeted diagnostic probes to isolate whether the error is driven by an underlying intuitive misconception or a minor procedural lapse.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
