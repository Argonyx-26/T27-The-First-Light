import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Grid, AlertTriangle, Layers, CheckCircle2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";
import { MisconceptionHeatmap } from "@/components/teacher/MisconceptionHeatmap";

export const TeacherMisconceptionsPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teacherMisconceptionsPage"],
    queryFn: () => api.getTeacherMisconceptions(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 py-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>Failed to load Misconceptions Matrix</AlertTitle>
        <AlertDescription>
          {(error as Error)?.message || "Server error occurred."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="border-b border-border/70 pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
          <Grid className="w-3.5 h-3.5" />
          Cross-Concept Matrix
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Misconceptions & Heatmap Analysis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cohort-wide aggregation of isolated cognitive models, frequency distributions, and resolution rates.
        </p>
      </div>

      {/* Heatmap Section */}
      <section>
        <MisconceptionHeatmap heatmapData={data.heatmap} />
      </section>

      {/* Concept Status Cards */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Concept-Level Diagnostic Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {data.concepts.map((concept, idx) => (
            <Card key={idx} className="border border-border/80 shadow-subtle bg-card">
              <CardHeader className="p-4 pb-2 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {concept.topic}
                  </Badge>
                  <Badge
                    variant={
                      concept.status === "mastered"
                        ? "secondary"
                        : concept.status === "developing"
                        ? "outline"
                        : "destructive"
                    }
                    className="capitalize text-xs"
                  >
                    {concept.status.replace("_", " ")}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-slate-900 mt-1">
                  {concept.concept}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                      Mastery
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {Math.round(concept.mastery * 100)}%
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                      Accuracy
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {Math.round(concept.accuracy * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/50">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {concept.resolved_count} Resolved
                  </span>
                  <span className="flex items-center gap-1 text-rose-700 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {concept.persistent_count} Persistent
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Misconceptions Inventory Table */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Catalogued Misconceptions Inventory</h2>
        <Card className="border border-border/80 shadow-subtle bg-card overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-border/60 bg-slate-50/60 text-xs font-semibold text-slate-500">
                    <th className="p-3.5 pl-6">Cognitive Misconception</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Associated Concept</th>
                    <th className="p-3.5 text-center">Affected Students</th>
                    <th className="p-3.5 text-center">Resolved</th>
                    <th className="p-3.5 text-center">Persistent</th>
                    <th className="p-3.5 pr-6 text-right">Avg Fit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-xs">
                  {data.misconceptions.map((m) => (
                    <tr key={m.misconception_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-6 font-bold text-slate-900">
                        {m.label}
                        <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                          {m.misconception_id}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">{m.category}</td>
                      <td className="p-3.5 text-slate-700">{m.concept}</td>
                      <td className="p-3.5 text-center font-bold text-slate-900">
                        {m.affected_students_count}
                      </td>
                      <td className="p-3.5 text-center text-emerald-700 font-semibold">
                        {m.resolved_count}
                      </td>
                      <td className="p-3.5 text-center text-rose-700 font-semibold">
                        {m.persistent_count}
                      </td>
                      <td className="p-3.5 pr-6 text-right font-black text-indigo-700">
                        {Math.round(m.average_probability * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
