import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Award,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Flame,
  Gauge,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
  ArrowRight,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "@/api/client";
import { ExamReportResponse, ExamMisconceptionItem, ExamQuestionReportDetail } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export const ExamReportPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ExamReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "incorrect" | "misconceptions">("all");

  useEffect(() => {
    if (!examId) return;

    let isMounted = true;
    api
      .getExamReport(examId)
      .then((data) => {
        if (!isMounted) return;
        setReport(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || "Failed to load exam diagnostic report.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [examId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Computing cognitive post-mortem analysis...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-lg mx-auto p-6 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-rose-900">Diagnostic Report Error</h2>
        <p className="text-sm text-rose-700">{error || "Report not found."}</p>
        <Button onClick={() => navigate("/exam")} variant="outline" className="mt-2">
          Return to Exam Setup
        </Button>
      </div>
    );
  }

  // Filtered questions
  const filteredQuestions = report.question_details.filter((q) => {
    if (filterMode === "incorrect") return !q.is_correct;
    if (filterMode === "misconceptions") return Boolean(q.detected_misconception_id);
    return true;
  });

  const minutesTaken = Math.floor(report.time_taken_seconds / 60);
  const secondsTaken = report.time_taken_seconds % 60;
  const timeFormatted = `${minutesTaken}m ${secondsTaken}s`;

  // Taxonomy counts
  const whyLost = report.why_you_lost_marks || {};
  const conceptualCount = whyLost["conceptual"] || 0;
  const overconfidenceCount = whyLost["overconfidence_errors"] || 0;
  const formulaCount = whyLost["formula_confusion"] || 0;
  const slipCount = whyLost["calculation_slips"] || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Top Banner: Score Hero */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-900/60 pb-5">
          <div>
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Compass className="h-4 w-4" />
              <span>Exam Post-Mortem Report</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Your score isn't the whole story.
            </h1>
            <p className="text-sm text-indigo-200/80 mt-1 max-w-xl">
              Traditional exams only count right and wrong. Misconception Mapper analyzes the reasoning behind your
              mistakes to reveal root cognitive blindspots.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-white/10 px-4 py-3 rounded-xl border border-white/10 backdrop-blur-sm self-stretch sm:self-auto justify-center">
            <div className="text-center">
              <span className="text-3xl sm:text-4xl font-black text-white">{report.score_percentage}%</span>
              <span className="block text-[11px] text-indigo-200 uppercase tracking-wider font-semibold">
                {report.correct_count} / {report.total_questions} Correct
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostic Metadata Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center space-x-2 text-indigo-300 mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-semibold">Time Taken</span>
            </div>
            <span className="text-base font-bold text-white">{timeFormatted}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center space-x-2 text-indigo-300 mb-1">
              <Brain className="h-3.5 w-3.5" />
              <span className="font-semibold">Avg. Confidence</span>
            </div>
            <span className="text-base font-bold text-white">{report.average_confidence} / 5</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center space-x-2 text-indigo-300 mb-1">
              <Gauge className="h-3.5 w-3.5" />
              <span className="font-semibold">Calibration Index</span>
            </div>
            <span className="text-base font-bold text-white">{report.calibration_index.toFixed(2)}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center space-x-2 text-indigo-300 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-semibold">Misconceptions</span>
            </div>
            <span className="text-base font-bold text-white">{report.identified_misconceptions.length} Flagged</span>
          </div>
        </div>
      </div>

      {/* Section 1: Why You Lost Marks (Taxonomy Breakdown) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Why You Lost Marks</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            A wrong answer is evidence, not a diagnosis. We classify errors by cognitive mechanism without overclaiming careless slips.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Conceptual Misconceptions */}
          <Card className="border-rose-200 bg-rose-50/40">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Cognitive Misconceptions</span>
                <span className="text-2xl font-black text-rose-900">{conceptualCount}</span>
              </div>
              <p className="text-xs text-rose-700 leading-snug">
                Flawed mental models where intuitive reasoning actively contradicted scientific laws.
              </p>
            </CardContent>
          </Card>

          {/* Overconfidence Errors */}
          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Overconfidence Traps</span>
                <span className="text-2xl font-black text-amber-900">{overconfidenceCount}</span>
              </div>
              <p className="text-xs text-amber-700 leading-snug">
                Wrong answers chosen with high conviction (Level 4 or 5) — the most dangerous learning trap.
              </p>
            </CardContent>
          </Card>

          {/* Formula Confusion */}
          <Card className="border-indigo-200 bg-indigo-50/40">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Formula / Distractor</span>
                <span className="text-2xl font-black text-indigo-900">{formulaCount}</span>
              </div>
              <p className="text-xs text-indigo-700 leading-snug">
                Confusing reciprocal definitions, vectors with scalars, or sign conventions.
              </p>
            </CardContent>
          </Card>

          {/* Calculation Slips */}
          <Card className="border-slate-200 bg-slate-50/60">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Slips / Blind Guesses</span>
                <span className="text-2xl font-black text-slate-900">{slipCount}</span>
              </div>
              <p className="text-xs text-slate-600 leading-snug">
                Arithmetic errors or low-confidence guesses without deeper conceptual distractor patterns.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2: Diagnosed Misconceptions & Targeted Remediation */}
      {report.identified_misconceptions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Diagnosed Misconceptions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Compounded evidence across exam questions confirms these specific reasoning flaws.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              {report.identified_misconceptions.length} Identified
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.identified_misconceptions.map((misc) => {
              const probPct = Math.round(misc.probability * 100);
              const isHigh = misc.probability >= 0.6;
              return (
                <Card key={misc.misconception_id} className="border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                          {isHigh ? "Confirmed Misconception" : "Developing Pattern"}
                        </span>
                        <CardTitle className="text-base font-bold text-slate-900 mt-1.5">
                          {misc.name}
                        </CardTitle>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-indigo-700">{probPct}%</span>
                        <span className="block text-[10px] text-muted-foreground">Confidence</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3.5">
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isHigh ? "bg-rose-500" : "bg-indigo-500"}`}
                        style={{ width: `${probPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Affected Questions:</span>
                      <div className="flex items-center space-x-1">
                        {misc.questions_failed.map((q) => (
                          <span key={q} className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-800">
                            {q}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">RAG Study Notes Available</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/revision")}
                        className="text-xs font-semibold space-x-1 text-indigo-600 hover:text-indigo-700"
                      >
                        <span>Targeted Remediation</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: Concept Breakdown */}
      {report.concept_breakdown.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Concept Mastery Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Performance breakdown across individual syllabus subdomains
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {report.concept_breakdown.map((cb) => (
                <div key={cb.concept} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-800">{cb.concept}</span>
                    <span className="text-slate-600">
                      {cb.correct_questions} / {cb.total_questions} ({cb.accuracy_percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        cb.accuracy_percentage >= 75
                          ? "bg-emerald-500"
                          : cb.accuracy_percentage >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${cb.accuracy_percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Question-by-Question Audit */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Question-by-Question Audit</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review every choice, confidence score, and pedagogical explanation.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={filterMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("all")}
              className="text-xs h-8"
            >
              All ({report.question_details.length})
            </Button>
            <Button
              variant={filterMode === "incorrect" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("incorrect")}
              className="text-xs h-8"
            >
              Incorrect Only ({report.incorrect_count})
            </Button>
            <Button
              variant={filterMode === "misconceptions" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("misconceptions")}
              className="text-xs h-8"
            >
              Misconceptions Only
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const isCorrect = q.is_correct;
            return (
              <Card
                key={q.question_id}
                className={`border-2 shadow-xs transition-all ${
                  isCorrect
                    ? "border-emerald-200 bg-emerald-50/20"
                    : q.detected_misconception_id
                    ? "border-rose-200 bg-rose-50/20"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md font-bold text-xs ${
                          isCorrect ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                        }`}
                      >
                        {q.order_index}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">{q.concept}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {q.confidence && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          Confidence: {q.confidence}/5
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                          isCorrect
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                    {q.question_text}
                  </p>

                  {/* Options List */}
                  <div className="space-y-2">
                    {Object.entries(q.options).map(([optKey, optText]) => {
                      const isChosen = q.selected_option === optKey;
                      const isRight = q.correct_option === optKey;

                      let optClass = "border-slate-200 bg-white text-slate-700";
                      if (isRight) {
                        optClass = "border-emerald-500 bg-emerald-50 text-emerald-950 font-medium";
                      } else if (isChosen && !isRight) {
                        optClass = "border-rose-500 bg-rose-50 text-rose-950 font-medium";
                      }

                      return (
                        <div
                          key={optKey}
                          className={`p-3 rounded-lg border flex items-center justify-between text-xs sm:text-sm ${optClass}`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="font-bold">{optKey}.</span>
                            <span>{optText}</span>
                          </div>
                          {isRight && (
                            <span className="text-[11px] font-bold text-emerald-700 uppercase">Correct Answer</span>
                          )}
                          {isChosen && !isRight && (
                            <span className="text-[11px] font-bold text-rose-700 uppercase">Your Choice</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Misconception Diagnostic Note */}
                  {q.detected_misconception_name && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-rose-800 font-bold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Identified Cognitive Misconception: {q.detected_misconception_name}</span>
                      </div>
                      <p className="text-rose-700 text-[11px]">
                        Distractor option {q.selected_option} directly targets this cognitive error pattern.
                      </p>
                    </div>
                  )}

                  {/* Multi-Modal Visual Artifact */}
                  {q.visual_artifact_svg && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        Visual Schematic: Misconception vs. Reality
                      </span>
                      <div
                        className="p-3 rounded-xl bg-white border border-slate-200 overflow-x-auto flex justify-center items-center shadow-inner"
                        dangerouslySetInnerHTML={{ __html: q.visual_artifact_svg }}
                      />
                    </div>
                  )}

                  {/* Feynman Explanation */}
                  {q.feynman_explanation && (
                    <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950 space-y-1">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-800 block">
                        Feynman Technique Intuitive Reframe:
                      </span>
                      <p className="leading-relaxed">{q.feynman_explanation}</p>
                    </div>
                  )}

                  {/* Pedagogical Explanation */}
                  {q.explanation && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                      <div className="flex items-center space-x-1 text-slate-900 font-semibold">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                        <span>Pedagogical Rationale</span>
                      </div>
                      <p className="leading-relaxed">{q.explanation}</p>
                    </div>
                  )}

                  {/* Status Change Indicator */}
                  {q.status_change && (
                    <div className="flex items-center space-x-2 pt-1 text-xs">
                      <span className="text-slate-500 font-medium">Concept Trajectory:</span>
                      <Badge
                        variant={q.is_correct ? "secondary" : "outline"}
                        className={`text-[10px] font-bold ${
                          q.is_correct
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-rose-50 text-rose-800 border-rose-300"
                        }`}
                      >
                        {q.status_change}
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button onClick={() => navigate("/exam")} variant="outline" className="space-x-2 w-full sm:w-auto">
          <RotateCcw className="h-4 w-4" />
          <span>Take Another Timed Exam</span>
        </Button>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full sm:w-auto">
            View Learning Dashboard
          </Button>
          <Button onClick={() => navigate("/revision")} className="w-full sm:w-auto font-bold">
            Targeted Revision List
          </Button>
        </div>
      </div>
    </div>
  );
};
