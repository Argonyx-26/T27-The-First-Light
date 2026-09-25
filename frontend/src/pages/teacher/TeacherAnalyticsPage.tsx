import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { TrendingUp, AlertTriangle, PieChart, ShieldAlert, Award, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";
import { TeacherCalibrationMatrix } from "@/components/teacher/TeacherCalibrationMatrix";
import { Progress } from "@/components/ui/Progress";

export const TeacherAnalyticsPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teacherAnalytics"],
    queryFn: () => api.getTeacherAnalytics(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 py-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>Failed to load Teacher Analytics</AlertTitle>
        <AlertDescription>
          {(error as Error)?.message || "Server error occurred."}
        </AlertDescription>
      </Alert>
    );
  }

  const { total_students, overall_mastery, overall_accuracy, confidence_calibration, error_breakdown, concept_analytics } = data;

  const totalErrors =
    error_breakdown.conceptual +
    error_breakdown.calculation +
    error_breakdown.careless_reading +
    error_breakdown.overconfidence_errors || 1;

  const errPct = (val: number) => Math.round((val / totalErrors) * 100);

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="border-b border-border/70 pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
          <TrendingUp className="w-3.5 h-3.5" />
          Metacognitive & Error Distribution
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Cohort Learning Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deep diagnostic breakdown of root error taxonomies, metacognitive calibration, and domain growth.
        </p>
      </div>

      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/80">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase">
                Overall Cohort Mastery
              </span>
              <div className="text-2xl font-bold text-slate-900">
                {Math.round(overall_mastery * 100)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase">
                Cohort Accuracy Rate
              </span>
              <div className="text-2xl font-bold text-slate-900">
                {Math.round(overall_accuracy * 100)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase">
                High-Confidence Error Rate
              </span>
              <div className="text-2xl font-bold text-rose-700">
                {errPct(error_breakdown.overconfidence_errors)}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calibration Matrix */}
      <section>
        <TeacherCalibrationMatrix calibration={confidence_calibration} />
      </section>

      {/* Error Taxonomy Breakdown */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-indigo-600" />
          <span>Error Taxonomy Distribution</span>
        </h2>
        <Card className="border border-border/80 shadow-subtle bg-card">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">
                    Conceptual Misconceptions (Alternative Mental Models)
                  </span>
                  <span className="font-bold text-indigo-700">
                    {error_breakdown.conceptual} ({errPct(error_breakdown.conceptual)}%)
                  </span>
                </div>
                <Progress value={errPct(error_breakdown.conceptual)} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">
                    Overconfidence Slips (Wrong Answer with Max Conviction)
                  </span>
                  <span className="font-bold text-rose-700">
                    {error_breakdown.overconfidence_errors} ({errPct(error_breakdown.overconfidence_errors)}%)
                  </span>
                </div>
                <Progress value={errPct(error_breakdown.overconfidence_errors)} className="h-2 bg-slate-100" />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">
                    Computational / Procedural Lapses
                  </span>
                  <span className="font-bold text-slate-700">
                    {error_breakdown.calculation} ({errPct(error_breakdown.calculation)}%)
                  </span>
                </div>
                <Progress value={errPct(error_breakdown.calculation)} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">
                    Careless Reading / Low Confidence Guessing
                  </span>
                  <span className="font-bold text-slate-600">
                    {error_breakdown.careless_reading} ({errPct(error_breakdown.careless_reading)}%)
                  </span>
                </div>
                <Progress value={errPct(error_breakdown.careless_reading)} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
