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
        <span>Hypothesis Narrowing</span>
        <span>Evidential Confidence</span>
      </div>

      <div className="space-y-3">
        {sorted.map((h) => {
          const isPrimary = h.id === primaryId || (primaryId === undefined && h === sorted[0]);
          const percent = Math.round(h.probability * 100);

          return (
            <div key={h.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className={isPrimary ? "font-semibold text-slate-900" : "text-slate-600 font-medium"}>
                  {h.label}
                  {isPrimary && (
                    <span className="ml-2 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-medium">
                      Dominant Pattern
                    </span>
                  )}
                </span>
                <span className={isPrimary ? "font-bold text-indigo-700" : "text-muted-foreground font-medium"}>
                  {percent}%
                </span>
              </div>

              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
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
