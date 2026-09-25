import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import {
  Users,
  Award,
  AlertOctagon,
  AlertTriangle,
  Target,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronRight,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";
import { MisconceptionHeatmap } from "@/components/teacher/MisconceptionHeatmap";
import { TeacherCalibrationMatrix } from "@/components/teacher/TeacherCalibrationMatrix";

export const TeacherDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    data: overview,
    isLoading: loadingOverview,
    error: overviewError,
  } = useQuery({
    queryKey: ["teacherOverview"],
    queryFn: () => api.getTeacherOverview(),
  });

  const {
    data: miscData,
    isLoading: loadingMisc,
    error: miscError,
  } = useQuery({
    queryKey: ["teacherMisconceptions"],
    queryFn: () => api.getTeacherMisconceptions(),
  });

  if (loadingOverview || loadingMisc) {
    return (
      <div className="space-y-6 py-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (overviewError || miscError || !overview) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>Failed to load Teacher Dashboard</AlertTitle>
        <AlertDescription>
          {(overviewError as Error)?.message || (miscError as Error)?.message || "Server error occurred."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 py-4">
      {/* Page Header & Demo Showcase Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Classroom Diagnostic Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Teacher Learning Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time cohort insights, root cognitive misconception tracking, and metacognitive calibration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/teacher/demo">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm gap-2 shadow-sm">
              <Layers className="w-4 h-4" />
              <span>Same-Score Demo</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Showcase Callout Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Interactive Pedagogical Proof</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            &quot;Two students can make the exact same mistake for completely different reasons.&quot;
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            See how the deterministic diagnostic engine branches two identical wrong answers (0/1 score) into distinct cognitive hypotheses, targeted remediations, and verification outcomes.
          </p>
        </div>

        <Link to="/teacher/demo" className="shrink-0 w-full md:w-auto">
          <Button variant="secondary" size="sm" className="w-full md:w-auto font-bold text-xs gap-1.5">
            Launch Comparative Demo
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Top Level Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="bg-card border-border/80">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              Learners
            </span>
            <div className="text-2xl font-bold text-slate-900">
              {overview.total_students}
            </div>
            <p className="text-[10px] text-muted-foreground">Active cohort size</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              Avg Mastery
            </span>
            <div className="text-2xl font-bold text-slate-900">
              {Math.round(overview.average_mastery * 100)}%
            </div>
            <p className="text-[10px] text-emerald-600 font-medium">BKT weighted</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              Class Accuracy
            </span>
            <div className="text-2xl font-bold text-slate-900">
              {Math.round(overview.class_accuracy * 100)}%
            </div>
            <p className="text-[10px] text-muted-foreground">Attempt correctness</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Active Gaps
            </span>
            <div className="text-2xl font-bold text-amber-700">
              {overview.active_knowledge_gaps}
            </div>
            <p className="text-[10px] text-muted-foreground">Developing models</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
              Persistent
            </span>
            <div className="text-2xl font-bold text-rose-700">
              {overview.persistent_misconceptions}
            </div>
            <p className="text-[10px] text-rose-600 font-medium">Needs intervention</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Calibration
            </span>
            <div className="text-2xl font-bold text-indigo-900">
              {Math.round(overview.confidence_calibration.calibration_index * 100)}%
            </div>
            <p className="text-[10px] text-muted-foreground">Confidence alignment</p>
          </CardContent>
        </Card>
      </div>

      {/* Misconception Heatmap */}
      {miscData && (
        <section>
          <MisconceptionHeatmap heatmapData={miscData.heatmap} />
        </section>
      )}

      {/* Confidence Calibration Matrix */}
      <section>
        <TeacherCalibrationMatrix calibration={overview.confidence_calibration} />
      </section>

      {/* Split Section: Students Requiring Attention & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Learners */}
        <Card className="border border-border/80 shadow-subtle bg-card">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>Learners Requiring Attention</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Prioritized by persistent misconceptions or mastery below 50%.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/teacher/students")}
                className="text-xs text-indigo-600 hover:text-indigo-700 gap-1"
              >
                <span>All Students</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-border/60">
            {overview.students_requiring_attention.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No students currently flagged for critical attention.
              </div>
            ) : (
              overview.students_requiring_attention.map((student) => (
                <div
                  key={student.student_id}
                  onClick={() => navigate(`/teacher/students/${student.student_id}`)}
                  className="p-3.5 px-5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-2">
                      <span>{student.name}</span>
                      <span className="text-xs font-normal text-muted-foreground font-mono">
                        ({student.student_id})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{student.topic}</span>
                      <span>•</span>
                      <span>Mastery: {Math.round(student.mastery_score * 100)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {student.persistent_misconceptions > 0 ? (
                      <Badge variant="destructive" className="text-xs font-semibold">
                        {student.persistent_misconceptions} Persistent
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50">
                        At Risk
                      </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Diagnostic Activity */}
        <Card className="border border-border/80 shadow-subtle bg-card">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Recent Diagnostic Stream</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Live evidence probes, confirmed diagnoses, and verification events.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-border/60">
            {overview.recent_activity.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No recent activity recorded.
              </div>
            ) : (
              overview.recent_activity.map((act) => (
                <div key={act.id} className="p-3.5 px-5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-800">
                      {act.student_name}{" "}
                      <span className="font-normal text-muted-foreground">({act.topic})</span>
                    </div>
                    <p className="text-muted-foreground">{act.detail}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {act.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
