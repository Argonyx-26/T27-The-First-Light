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
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOption,
  onSelectOption,
  disabled = false,
}) => {
  const isDiagnostic = question.question_type === "diagnostic" || question.id.includes("diag");

  return (
    <Card className="border border-border/80 shadow-subtle overflow-hidden bg-card">
      <CardHeader className="bg-slate-50/50 border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="font-medium text-xs bg-white border border-border">
              {question.concept}
            </Badge>
            {isDiagnostic ? (
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

        {isDiagnostic && (
          <p className="text-xs text-indigo-700 mt-2 font-medium bg-indigo-50/70 p-2 rounded border border-indigo-100/60">
            One more question to understand your reasoning. Your answer helps us isolate the underlying mental model.
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Question Text */}
        <p className="text-lg font-medium text-slate-900 leading-relaxed">
          {question.question_text}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {Object.entries(question.options).map(([key, text]) => {
            const isSelected = selectedOption === key;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onSelectOption(key)}
                className={cn(
                  "w-full flex items-start text-left p-4 rounded-xl border transition-all select-none",
                  isSelected
                    ? "border-primary bg-primary/[0.03] ring-2 ring-primary/20 shadow-sm"
                    : "border-border/80 bg-white hover:border-slate-300 hover:bg-slate-50/50",
                  disabled && "cursor-not-allowed opacity-60"
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold mr-3.5 mt-0.5 transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  )}
                >
                  {key}
                </div>
                <div className="flex-1 text-sm sm:text-base text-slate-800 pt-0.5 leading-snug">
                  {text}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
