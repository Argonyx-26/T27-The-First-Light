import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { api } from "@/api/client";
import { DashboardResponse, LossAttributionResponse, CalibrationTrendPoint } from "@/types";
import { MasteryCard } from "@/components/dashboard/MasteryCard";
import { ConfidenceCalibrationChart } from "@/components/dashboard/ConfidenceCalibrationChart";
import { CalibrationTrendChart } from "@/components/dashboard/CalibrationTrendChart";
import { LossAttributionCard } from "@/components/analytics/LossAttributionCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { GitFork, BookOpen, ArrowRight, Compass } from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { sessionId, topic } = useSession();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [lossData, setLossData] = useState<LossAttributionResponse | null>(null);
  const [trendPoints, setTrendPoints] = useState<CalibrationTrendPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [dashRes, lossRes, trendRes] = await Promise.all([
          api.getDashboard(sessionId),
          api.getLossAttribution(sessionId).catch(() => null),
          api.getCalibrationTrend(sessionId).catch(() => null),
        ]);
        setData(dashRes);
        setLossData(lossRes);
        if (trendRes?.points) {
          setTrendPoints(trendRes.points);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h3 className="text-xl font-bold text-slate-800">No active student session</h3>
        <p className="text-sm text-muted-foreground">
          Begin an assessment to generate your personalized learning gap dashboard.
        </p>
        <Link to="/topic">
          <Button className="font-semibold">
            <span>Start Diagnostic</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center text-rose-700 bg-rose-50 p-6 rounded-xl border border-rose-200">
        <p className="text-sm font-semibold">{error || "Unable to display analytics."}</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header Profile Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border/80 shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="font-medium text-xs">
              {topic || "Physics Assessment"}
            </Badge>
            <span className="text-xs text-muted-foreground">• Session #{sessionId.slice(-6)}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Student Learning Analytics
          </h2>
          <p className="text-xs text-slate-600">
            Real-time cognitive profile tracking evidence-weighted hypothesis convergence.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link to="/knowledge-gaps">
            <Button variant="outline" size="sm">
              <GitFork className="w-4 h-4 mr-1.5 text-indigo-600" />
              <span>Knowledge Graph</span>
            </Button>
          </Link>
          <Link to="/revision">
            <Button size="sm" className="bg-primary text-white">
              <BookOpen className="w-4 h-4 mr-1.5" />
              <span>Priority Revision</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Mastery and Metric Cards */}
      <MasteryCard
        masteryRate={data.overall_mastery}
        totalAttempts={data.total_questions_attempted}
        accuracyRate={data.accuracy_rate}
        resolvedCount={data.misconceptions_resolved}
        identifiedCount={data.misconceptions_identified}
      />

      {/* Longitudinal Loss Attribution Breakdown */}
      {lossData && (
        <LossAttributionCard
          data={lossData}
          title="Why You're Losing Marks (Longitudinal)"
          description="Cognitive error taxonomy aggregated across all practice attempts and competitive exams."
        />
      )}

      {/* Calibration and Focus Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Confidence Calibration */}
        <div className="lg:col-span-2">
          <ConfidenceCalibrationChart calibration={data.confidence_calibration} />
        </div>

        {/* Focus & Priority Widget */}
        <Card className="border border-border/80 shadow-subtle bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center">
              <Compass className="w-4 h-4 mr-2 text-indigo-600" />
              Recommended Focus
            </CardTitle>
            <CardDescription className="text-xs">
              Algorithmic learning recommendation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-border/70 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Target Concept
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                {topic || "Newton's First Law"}
              </h4>
              <p className="text-xs text-slate-600 leading-snug">
                {data.misconceptions_resolved > 0
                  ? "Great job resolving foundational gaps! Keep practicing new transfer problems to maintain mastery."
                  : "Focus on distinguishing continuous force from acceleration. Remember net force changes speed, not maintains it."}
              </p>
            </div>

            <Link to="/topic" className="block w-full">
              <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2.5">
                <span>Continue Practice</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Longitudinal Metacognitive Calibration Trajectory */}
      {trendPoints.length > 0 && (
        <CalibrationTrendChart points={trendPoints} />
      )}
    </div>
  );
};
