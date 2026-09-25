import React, { useState } from "react";
import { MisconceptionJourneyResponse, JourneyStageItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  CheckCircle,
  Clock,
  Sparkles,
  BookOpen,
  Dumbbell,
  ShieldCheck,
  Award,
  ChevronRight,
  ArrowRight,
  Info,
} from "lucide-react";

interface MisconceptionJourneyTimelineProps {
  journey: MisconceptionJourneyResponse;
  onClose?: () => void;
}

const STAGE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  diagnosed: Sparkles,
  learned: BookOpen,
  practiced: Dumbbell,
  verified: ShieldCheck,
  mastered: Award,
};

export const MisconceptionJourneyTimeline: React.FC<MisconceptionJourneyTimelineProps> = ({
  journey,
  onClose,
}) => {
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(
    journey.current_stage_index >= 0 ? journey.current_stage_index : 0
  );

  const selectedStage: JourneyStageItem =
    journey.stages[selectedStageIndex] || journey.stages[0];

  return (
    <Card className="border-2 border-indigo-200 shadow-md bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/70 to-purple-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>5-Stage Cognitive Progress Journey</span>
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">
              {journey.misconception_label}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Live lifecycle state tracking gap detection, grounding, practice, and mastery retention.
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <Badge
              variant={
                journey.current_stage === "Mastered"
                  ? "resolved"
                  : journey.current_stage === "Verified"
                  ? "resolved"
                  : "developing"
              }
              className="font-bold text-xs uppercase px-3 py-1"
            >
              Current Stage: {journey.current_stage}
            </Badge>
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Horizontal 5-Node Stepper */}
        <div className="relative pt-2 pb-2">
          {/* Connecting Line */}
          <div className="hidden sm:block absolute top-1/2 left-8 right-8 h-1 -translate-y-1/2 bg-slate-200 z-0" />

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-2 relative z-10">
            {journey.stages.map((stage, idx) => {
              const Icon = STAGE_ICONS[stage.stage_id] || Sparkles;
              const isCompleted = stage.status === "completed";
              const isCurrent = stage.status === "current";
              const isSelected = selectedStageIndex === idx;

              return (
                <button
                  key={stage.stage_id}
                  onClick={() => setSelectedStageIndex(idx)}
                  className={`flex flex-col items-center text-center p-3 rounded-xl transition-all ${
                    isSelected
                      ? "bg-indigo-50/80 border-2 border-indigo-500 shadow-sm"
                      : "bg-white border border-border/70 hover:border-indigo-300"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-transform ${
                      isCompleted
                        ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200"
                        : isCurrent
                        ? "bg-indigo-600 text-white shadow-md ring-4 ring-indigo-200 animate-pulse"
                        : "bg-slate-100 text-slate-400 border border-slate-300"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>

                  <span
                    className={`text-xs font-bold leading-tight ${
                      isCompleted
                        ? "text-emerald-900"
                        : isCurrent
                        ? "text-indigo-900 font-extrabold"
                        : "text-slate-500"
                    }`}
                  >
                    {stage.title}
                  </span>

                  <span className="text-[10px] uppercase font-semibold tracking-wider mt-1 text-muted-foreground">
                    {isCompleted ? "Done ✓" : isCurrent ? "Active ◐" : "Locked 🔒"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Detail Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Stage {selectedStageIndex + 1} of 5:
              </span>
              <h4 className="text-sm font-extrabold text-slate-900">{selectedStage.title}</h4>
            </div>

            {selectedStage.timestamp && (
              <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(selectedStage.timestamp).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            {selectedStage.detail}
          </p>

          {/* Action Recommendation */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-1.5 text-xs text-indigo-800 font-semibold">
              <Info className="w-3.5 h-3.5" />
              <span>
                {selectedStage.status === "completed"
                  ? "Milestone completed successfully. Concept demonstrated."
                  : selectedStage.status === "current"
                  ? "Current active learning objective. Engage to advance."
                  : "Next milestone in the personalized remediation path."}
              </span>
            </div>

            {selectedStageIndex < journey.stages.length - 1 && (
              <button
                onClick={() => setSelectedStageIndex((prev) => Math.min(prev + 1, journey.stages.length - 1))}
                className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <span>Next Milestone</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
