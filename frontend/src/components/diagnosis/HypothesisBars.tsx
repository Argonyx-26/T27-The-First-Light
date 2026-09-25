import React from "react";
import { motion } from "framer-motion";
import { Hypothesis } from "@/types";

interface HypothesisBarsProps {
  hypotheses: Hypothesis[];
  primaryId?: string;
}

export const HypothesisBars: React.FC<HypothesisBarsProps> = ({ hypotheses, primaryId }) => {
  if (!hypotheses || hypotheses.length === 0) return null;

  // Sort descending by probability
  const sorted = [...hypotheses].sort((a, b) => b.probability - a.probability);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
        <span>Analyzed Thinking Patterns</span>
        <span>Assessment Focus</span>
      </div>

      <div className="space-y-3">
        {sorted.map((h) => {
          const isPrimary = h.id === primaryId || (primaryId === undefined && h === sorted[0]);
          const barWidth = isPrimary ? 85 : Math.max(25, Math.round(h.probability * 100));

          return (
            <div key={h.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className={isPrimary ? "font-semibold text-slate-900" : "text-slate-600 font-medium"}>
                  {h.label}
                </span>
                <span className="flex-shrink-0">
                  {isPrimary ? (
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                      Primary Candidate
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      Alternative Concept
                    </span>
                  )}
                </span>
              </div>

              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    isPrimary ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
