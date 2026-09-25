import React from "react";
import { Check, ShieldAlert, Cpu } from "lucide-react";
import { EvidenceItem } from "@/types";

interface EvidenceListProps {
  evidence: EvidenceItem[];
}

export const EvidenceList: React.FC<EvidenceListProps> = ({ evidence }) => {
  if (!evidence || evidence.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Evidence based on distractor pattern observation.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs uppercase font-semibold tracking-wider text-slate-500">
        Why we think this (Recorded Evidence Trail)
      </h4>

      <ul className="space-y-2.5">
        {evidence.map((item, idx) => {
          const isSimulation = item.signal.includes("consistency");
          const isDistractor = item.signal.includes("distractor") || item.signal.includes("reinforcement");

          return (
            <li
              key={idx}
              className="flex items-start text-xs sm:text-sm text-slate-800 bg-slate-50/70 p-3 rounded-lg border border-border/60"
            >
              <div className="flex-shrink-0 mt-0.5 mr-2.5">
                {isSimulation ? (
                  <div className="p-1 rounded bg-indigo-100 text-indigo-700">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                ) : isDistractor ? (
                  <div className="p-1 rounded bg-emerald-100 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="p-1 rounded bg-slate-200 text-slate-700">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <div className="flex-1 leading-snug">
                <span>{item.observation}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
