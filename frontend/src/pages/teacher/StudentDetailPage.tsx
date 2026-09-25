import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Flame,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export const StudentDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["studentDetail", studentId],
    queryFn: () => api.getTeacherStudentDetail(studentId!),
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 py-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Student Profile Not Found</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message || `No diagnostic records found for student ${studentId}.`}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/teacher/students")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Student Roster
          </Button>
        </div>
      </div>
    );
  }

  const activeMisconceptions = profile.misconceptions.filter(
    (m) => m.status === "candidate" || m.status === "confirmed" || m.status === "persistent"
  );
  const resolvedMisconceptions = profile.misconceptions.filter((m) => m.status === "resolved");

  return (
    <div className="space-y-8 py-4 max-w-4xl mx-auto">
      {/* Top Navigation */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/teacher/students")}
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5 -ml-2 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students Roster</span>
        </Button>

        {/* Profile Header Banner */}
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {profile.name}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {profile.student_id}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Primary Assessment Domain: <strong>{profile.topic}</strong> • Last Active: {profile.last_active}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-none mb-1">
                Mastery
              </span>
              <span className="text-xl font-extrabold text-slate-900">
                {Math.round(profile.mastery_score * 100)}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-none mb-1">
                Accuracy
              </span>
              <span className="text-xl font-extrabold text-slate-900">
                {Math.round(profile.accuracy_rate * 100)}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-none mb-1">
                Calibration
              </span>
              <span className="text-xs font-bold text-slate-800 block mt-1">
                {profile.calibration_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Concept Breakdown */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Domain Mastery Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profile.concept_breakdown.map((concept, idx) => (
            <Card key={idx} className="border border-border/80 bg-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">{concept.concept}</span>
                  <Badge
                    variant={
                      concept.status === "mastered"
                        ? "secondary"
                        : concept.status === "developing"
                        ? "outline"
                        : "destructive"
                    }
                    className="capitalize text-[10px]"
                  >
                    {concept.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Knowledge State Probability</span>
                    <span className="font-bold">{Math.round(concept.mastery_score * 100)}%</span>
                  </div>
                  <Progress value={Math.round(concept.mastery_score * 100)} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Active & Persistent Misconceptions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Diagnosed Mental Models & Misconceptions</span>
            <Badge variant="outline" className="text-xs">
              {profile.misconceptions.length} Tracked
            </Badge>
          </h2>
          <span className="text-xs text-muted-foreground italic">
            Grounded in step-by-step evidence
          </span>
        </div>

        {profile.misconceptions.length === 0 ? (
          <Card className="border border-dashed border-2 py-8 text-center">
            <CardContent className="space-y-2 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-900">No Active Misconceptions</p>
              <p className="text-xs">Student has demonstrated consistent mental models across attempts.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {profile.misconceptions.map((misc, idx) => {
              const isPersistent = misc.status === "persistent";
              const isResolved = misc.status === "resolved";

              return (
                <Card
                  key={idx}
                  className={cn(
                    "border transition-all overflow-hidden",
                    isPersistent
                      ? "border-rose-300 bg-rose-50/10 shadow-xs"
                      : isResolved
                      ? "border-emerald-300 bg-emerald-50/10"
                      : "border-border/80 bg-card"
                  )}
                >
                  <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-slate-900">
                            {misc.label}
                          </span>
                          <Badge
                            variant={
                              isPersistent
                                ? "destructive"
                                : isResolved
                                ? "secondary"
                                : "outline"
                            }
                            className="capitalize text-xs font-semibold"
                          >
                            {misc.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Target Concept: {misc.concept} • Evidence Points: {misc.evidence_count}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Posterior Probability:</span>
                        <span className="text-sm font-black text-indigo-700">
                          {Math.round(misc.probability * 100)}%
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
                    {/* Supporting Evidence Chain */}
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block">
                        Why does the system diagnose this? (Supporting Evidence):
                      </span>
                      <ul className="space-y-1 pl-4 list-disc text-slate-700">
                        {misc.supporting_evidence.length > 0 ? (
                          misc.supporting_evidence.map((ev, eIdx) => (
                            <li key={eIdx} className="leading-relaxed">
                              {ev}
                            </li>
                          ))
                        ) : (
                          <li className="text-muted-foreground italic">
                            Initial distractor match registered.
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Remediation & Verification Outcome */}
                    {(misc.remediation_title || misc.verification_outcome) && (
                      <div className="pt-2 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {misc.remediation_title && (
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                              Targeted Remediation Delivered:
                            </span>
                            <span className="font-semibold text-slate-900 block">
                              {misc.remediation_title}
                            </span>
                            {misc.grounded_source && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-emerald-700 font-medium">
                                <Sparkles className="w-3 h-3 text-emerald-500" />
                                {misc.grounded_source}
                              </span>
                            )}
                          </div>
                        )}

                        {misc.verification_outcome && (
                          <div
                            className={cn(
                              "p-2.5 rounded-lg border",
                              isResolved
                                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                : "bg-rose-50 border-rose-200 text-rose-900"
                            )}
                          >
                            <span className="text-[10px] font-bold uppercase block">
                              Verification Evaluation:
                            </span>
                            <span className="font-bold capitalize">
                              {misc.verification_outcome}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Attempt History Timeline */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Step-by-Step Diagnostic Timeline</h2>
        <Card className="border border-border/80 shadow-subtle bg-card">
          <CardContent className="p-0 divide-y divide-border/60">
            {profile.attempts_timeline.map((att) => (
              <div key={att.step_index} className="p-4 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      Step {att.step_index}
                    </span>
                    <span className="font-mono text-muted-foreground">({att.question_id})</span>
                    <Badge
                      variant={att.is_correct ? "secondary" : "destructive"}
                      className="text-[10px]"
                    >
                      {att.is_correct ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>

                  <p className="text-slate-800 font-medium leading-relaxed">
                    {att.question_text}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground pt-1">
                    <span>
                      Selected: <strong>Option {att.selected_option}</strong>
                    </span>
                    <span>•</span>
                    <span>Confidence: <strong>{att.confidence} / 5</strong></span>
                    {att.matched_misconception && (
                      <>
                        <span>•</span>
                        <span className="text-rose-600 font-semibold">
                          Signal: {att.matched_misconception}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right text-[10px] text-muted-foreground shrink-0 font-mono">
                  {att.timestamp}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
