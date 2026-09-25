import React from "react";
import { AlternativeHypothesis } from "@/types";

interface AlternativeHypothesesProps {
  alternatives: AlternativeHypothesis[];
}

export const AlternativeHypotheses: React.FC<AlternativeHypothesesProps> = ({ alternatives }) => {
  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div className="space-y-2.5 pt-2">
      <h4 className="text-xs uppercase font-semibold tracking-wider text-slate-500">
        Other possibilities we considered
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {alternatives.map((alt, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-white text-xs"
          >
            <span className="text-slate-700 font-medium truncate mr-2">{alt.name}</span>
            <span className="text-slate-500 font-medium flex-shrink-0 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
              Ruled Out / Secondary
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
