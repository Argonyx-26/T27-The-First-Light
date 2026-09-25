import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/api/client";
import { TeacherExamSummary, TeacherExamsResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const TeacherExamsPage: React.FC = () => {
  const [data, setData] = useState<TeacherExamsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");

  useEffect(() => {
    let isMounted = true;
    api
      .getTeacherExams()
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || "Failed to load cohort exam submissions.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading cohort exam assessments...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto p-6 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-rose-900">Cohort Exam Data Error</h2>
        <p className="text-sm text-rose-700">{error || "Failed to load."}</p>
      </div>
    );
  }

  const exams = data.exams || [];

  const filteredExams = exams.filter((ex) => {
    const matchesSearch =
      ex.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = selectedTopic === "all" || ex.topic === selectedTopic;
    return matchesSearch && matchesTopic;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <GraduationCap className="h-4 w-4" />
          <span>Stage 6 — Cohort Exam Diagnostics</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Exam Mode Submissions & Post-Mortems
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Monitor completed timed assessments across the cohort. Drill down into any student's individual
          diagnostic post-mortem to analyze underlying cognitive misconceptions.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Exams Completed
              </span>
              <h3 className="text-2xl font-black text-slate-900">{data.total_exams}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Average Cohort Score
              </span>
              <h3 className="text-2xl font-black text-slate-900">{data.average_score}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Diagnostic Mode
              </span>
              <h3 className="text-base font-bold text-slate-900">Deterministic Engine</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search candidate name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Topics</option>
            <option value="Newton's Laws">Newton's Laws</option>
            <option value="Kinematics">Kinematics</option>
            <option value="Chemical Bonding">Chemical Bonding</option>
            <option value="Comprehensive Science">Comprehensive Science</option>
          </select>
        </div>
      </div>

      {/* Exams Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Candidate</th>
                <th className="py-3.5 px-4">Topic</th>
                <th className="py-3.5 px-4">Score</th>
                <th className="py-3.5 px-4">Primary Misconceptions Flagged</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                    No completed exam submissions found.
                  </td>
                </tr>
              ) : (
                filteredExams.map((ex) => (
                  <tr key={ex.exam_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-semibold text-slate-900">{ex.student_name}</div>
                      <div className="text-xs text-muted-foreground">{ex.student_id}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {ex.topic}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-extrabold text-slate-900">
                        {ex.percentage}% ({ex.score}/{ex.total})
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {ex.primary_misconceptions.length > 0 ? (
                          ex.primary_misconceptions.map((m) => (
                            <span
                              key={m}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200"
                            >
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">None confirmed</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link to={`/exam/${ex.exam_id}/report`}>
                        <Button size="sm" variant="outline" className="text-xs font-semibold space-x-1">
                          <span>Post-Mortem</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
