import React from "react";
import { ConfidenceCalibration } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { AlertCircle, HelpCircle, CheckCircle, Flame } from "lucide-react";

interface Props {
  calibration: ConfidenceCalibration;
}

export const ConfidenceCalibrationChart: React.FC<Props> = ({ calibration }) => {
  const total =
    calibration.high_confidence_correct +
    calibration.high_confidence_incorrect +
    calibration.low_confidence_correct +
    calibration.low_confidence_incorrect || 1;

  const hiIncPercent = Math.round((calibration.high_confidence_incorrect / total) * 100);
  const loIncPercent = Math.round((calibration.low_confidence_incorrect / total) * 100);
  const hiCorrPercent = Math.round((calibration.high_confidence_correct / total) * 100);
  const loCorrPercent = Math.round((calibration.low_confidence_correct / total) * 100);

  return (
    <Card className="border border-border/80 shadow-subtle bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Response &amp; Confidence Calibration</CardTitle>
        <CardDescription className="text-xs">
          Analyzes alignment between your perceived certainty and actual accuracy.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* High Confidence Incorrect (Overconfident Misconception Risk) */}
          <div className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/50 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 flex-shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-900 block">
                High-Certainty Errors
              </span>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-xl font-bold text-rose-950">
                  {calibration.high_confidence_incorrect}
                </span>
                <span className="text-xs text-rose-700/80">({hiIncPercent}%)</span>
              </div>
              <p className="text-[11px] text-rose-800/80 mt-1 leading-snug">
                Indicates entrenched misconceptions requiring targeted conceptual repair.
              </p>
            </div>
          </div>

          {/* Low Confidence Incorrect (Hesitant Guessing) */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-slate-200 text-slate-700 flex-shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 block">
                Low-Certainty Errors
              </span>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-xl font-bold text-slate-900">
                  {calibration.low_confidence_incorrect}
                </span>
                <span className="text-xs text-slate-600">({loIncPercent}%)</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                Represents uncertain guesses or missing prerequisite facts.
              </p>
            </div>
          </div>

          {/* High Confidence Correct */}
          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 flex-shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900 block">
                Calibrated Mastery
              </span>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-xl font-bold text-emerald-950">
                  {calibration.high_confidence_correct}
                </span>
                <span className="text-xs text-emerald-700/80">({hiCorrPercent}%)</span>
              </div>
              <p className="text-[11px] text-emerald-800/80 mt-1 leading-snug">
                Solid understanding with justified certainty.
              </p>
            </div>
          </div>

          {/* Low Confidence Correct */}
          <div className="p-3.5 rounded-xl border border-border bg-slate-50/40 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600 flex-shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                Tentative Correct
              </span>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-xl font-bold text-slate-800">
                  {calibration.low_confidence_correct}
                </span>
                <span className="text-xs text-slate-500">({loCorrPercent}%)</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                Lucky guesses or emerging intuition that needs reinforcement.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
