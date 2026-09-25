import React from "react";
import { Question } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HelpCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: Question;
  selectedOption: string | null;
  onSelectOption: (optionKey: string) => void;
  disabled?: boolean;
  isSubmitted?: boolean;
  isCorrect?: boolean;
  correctOption?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOption,
  onSelectOption,
  disabled = false,
  isSubmitted = false,
  isCorrect = false,
  correctOption,
}) => {
  const isDiagnostic = question.question_type === "diagnostic" || question.id.includes("diag");
  const isFollowUp = question.question_type === "followup";
  const resolvedCorrectOption = correctOption || question.correct_option;

  return (
    <Card className={cn("border shadow-subtle overflow-hidden bg-card", isFollowUp ? "border-indigo-300 ring-1 ring-indigo-200" : "border-border/80")}>
      <CardHeader className={cn("border-b pb-4", isFollowUp ? "bg-indigo-50/40 border-indigo-100" : "bg-slate-50/50 border-border/50")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="font-medium text-xs bg-white border border-border">
              {question.concept}
            </Badge>
            {isFollowUp ? (
              <Badge variant="diagnostic" className="flex items-center space-x-1 bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200">
                <Sparkles className="w-3 h-3" />
                <span className="font-bold">Follow-Up Question</span>
              </Badge>
            ) : isDiagnostic ? (
              <Badge variant="diagnostic" className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Diagnostic Evidence Probe</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs uppercase tracking-wider text-muted-foreground">
                {question.difficulty}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex items-center">
            <HelpCircle className="w-3.5 h-3.5 mr-1" />
            Select one answer
          </span>
        </div>

        {isFollowUp ? (
          <p className="text-sm text-indigo-800 mt-3 font-semibold bg-indigo-100/70 p-3 rounded-md border border-indigo-200">
            Based on your previous answer, please answer this follow-up question to help us pinpoint your mental model.
          </p>
        ) : isDiagnostic ? (
          <p className="text-xs text-indigo-700 mt-2 font-medium bg-indigo-50/70 p-2 rounded border border-indigo-100/60">
            Targeted diagnostic question to test specific mental models and isolate any misconceptions.
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Question Text */}
        <p className="text-lg font-medium text-slate-900 leading-relaxed">
          {question.question_text}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {Object.entries(question.options)
            .filter(([key]) => ["A", "B", "C", "D"].includes(key.trim().toUpperCase()))
            .map(([key, text]) => {
            const isSelected = selectedOption === key;
            const isThisCorrect = isSubmitted && resolvedCorrectOption === key;
            const isThisIncorrectSelection = isSubmitted && isSelected && !isCorrect;

            let optionStyle = "border-border/80 bg-white hover:border-slate-300 hover:bg-slate-50/50";
            let badgeStyle = "bg-slate-100 text-slate-700 border border-slate-200";

            if (isSubmitted) {
              if (isSelected && isCorrect) {
                optionStyle = "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20";
                badgeStyle = "bg-emerald-600 text-white border-emerald-600";
              } else if (isThisIncorrectSelection) {
                optionStyle = "border-rose-400 bg-rose-50/80 ring-2 ring-rose-400/20";
                badgeStyle = "bg-rose-600 text-white border-rose-600";
              } else if (isThisCorrect) {
                optionStyle = "border-emerald-400 bg-emerald-50/40 border-dashed";
                badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
              } else {
                optionStyle = "border-slate-200 bg-slate-50/40 opacity-70";
              }
            } else if (isSelected) {
              optionStyle = "border-primary bg-primary/[0.03] ring-2 ring-primary/20 shadow-sm";
              badgeStyle = "bg-primary text-primary-foreground";
            }

            return (
              <button
                key={key}
                type="button"
                disabled={disabled || isSubmitted}
                onClick={() => onSelectOption(key)}
                className={cn(
                  "w-full flex items-start text-left p-4 rounded-xl border transition-all select-none",
                  optionStyle,
                  (disabled || isSubmitted) && "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold mr-3.5 mt-0.5 transition-colors",
                    badgeStyle
                  )}
                >
                  {key}
                </div>
                <div className="flex-1 text-sm sm:text-base text-slate-800 pt-0.5 leading-snug">
                  {text}
                  {isThisCorrect && !isSelected && (
                    <span className="ml-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Correct Answer
                    </span>
                  )}
                  {isThisIncorrectSelection && (
                    <span className="ml-2 text-xs font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      Your Selection
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
