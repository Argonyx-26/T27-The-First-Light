import React from "react";
import { cn } from "@/lib/utils";

interface ConfidenceControlProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

const levels = [
  { val: 1, label: "Guessing", desc: "Just taking a guess" },
  { val: 2, label: "Unsure", desc: "Mild intuition" },
  { val: 3, label: "Moderate", desc: "Somewhat sure" },
  { val: 4, label: "Confident", desc: "Fairly certain" },
  { val: 5, label: "Very Confident", desc: "Absolute conviction" },
];

export const ConfidenceControl: React.FC<ConfidenceControlProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800">
          How confident are you in this answer?
        </label>
        <span className="text-xs text-muted-foreground">
          Evidence weighting factor
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
        {levels.map((lvl) => {
          const isSelected = value === lvl.val;
          return (
            <button
              key={lvl.val}
              type="button"
              disabled={disabled}
              onClick={() => onChange(lvl.val)}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-lg border transition-all text-center select-none",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                  : "border-border bg-card hover:bg-slate-100/80 text-slate-700",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="text-base font-bold">{lvl.val}</span>
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-medium mt-0.5 line-clamp-1",
                  isSelected ? "text-primary-foreground/90" : "text-muted-foreground"
                )}
              >
                {lvl.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        We use your confidence to evaluate how strong the evidence is, not as a psychological test.
      </p>
    </div>
  );
};
