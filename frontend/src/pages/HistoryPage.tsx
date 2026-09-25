import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  ChevronDown,
  ChevronUp,
  Award,
  Calendar,
  Layers,
  BookOpen,
  ArrowRight,
  RefreshCw,
  GraduationCap,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { api } from "@/api/client";
import { StudentHistoryResponse, TopicHistoryGroup, ExamHistoryItem } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export const HistoryPage: React.FC = () => {
  const [historyData, setHistoryData] = useState<StudentHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"practice" | "exams">("practice");

  const studentId = localStorage.getItem("mm_student_id") || "student_default";

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHistory(studentId);
      setHistoryData(data);
      // Auto-expand all topics by default
      const initialExpanded: Record<string, boolean> = {};
      data.topics.forEach((t) => {
        initialExpanded[t.topic] = true;
      });
      setExpandedTopics(initialExpanded);
    } catch (err: any) {
      console.error("Failed to load history:", err);
      setError(err.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [studentId]);

  const toggleTopic = (topicName: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topicName]: !prev[topicName],
    }));
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const averageOverallScore =
    historyData && historyData.history.length > 0
      ? Math.round(
          historyData.history.reduce((acc, h) => acc + h.score, 0) /
            historyData.history.length
        )
      : 0;

  const examsList = historyData?.exams || [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center space-x-2.5">
            <History className="w-7 h-7 text-primary" />
            <span>Practice &amp; Quiz History</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review completed practice quizzes and timed exam attempts with post-mortem diagnostic reports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            disabled={loading}
            className="text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Link to="/topic">
            <Button size="sm" className="text-xs font-semibold text-white bg-primary hover:bg-primary/90">
              <span>Practice Topic</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center space-x-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("practice")}
          className={`pb-2.5 px-4 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === "practice"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Practice Quizzes ({historyData?.history.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("exams")}
          className={`pb-2.5 px-4 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === "exams"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Exam Attempts ({examsList.length})</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && !historyData && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {/* Error View */}
      {error && !loading && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm font-semibold text-rose-800">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchHistory}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loaded Content */}
      {historyData && (
        <>
          {/* Summary Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-border/80 bg-white shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    Total Assessments
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {historyData.total_completed}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-white shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    Topics Practiced
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {historyData.topics.length}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-white shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    Avg Practice Score
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {averageOverallScore}%
                  </p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TAB 1: PRACTICE SESSIONS */}
          {activeTab === "practice" && (
            <div>
              {historyData.topics.length === 0 ? (
                <Card className="border border-dashed border-border bg-slate-50/50 text-center">
                  <CardContent className="p-12 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <History className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">
                        No completed quizzes yet
                      </h3>
                      <p className="text-sm text-slate-600 max-w-sm mx-auto">
                        Practice a topic to identify cognitive root causes and build your mastery history.
                      </p>
                    </div>
                    <Link to="/topic">
                      <Button className="font-semibold text-white bg-primary hover:bg-primary/90 mt-2">
                        Start Practicing
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Practice Sessions by Topic ({historyData.topics.length})
                  </h2>

                  <div className="space-y-3">
                    {historyData.topics.map((group: TopicHistoryGroup) => {
                      const isExpanded = !!expandedTopics[group.topic];

                      return (
                        <Card
                          key={group.topic}
                          className="border border-border/80 bg-white overflow-hidden shadow-2xs hover:border-border transition"
                        >
                          <button
                            type="button"
                            onClick={() => toggleTopic(group.topic)}
                            className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center space-x-2.5 flex-wrap">
                                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                                  {group.topic}
                                </h3>
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200"
                                >
                                  {group.attempt_count} attempt{group.attempt_count !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                                <span>
                                  Average: <strong className="text-slate-800 font-semibold">{group.average_score}%</strong>
                                </span>
                                <span>•</span>
                                <span>Latest: {group.latest_date}</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 flex-shrink-0 text-slate-500">
                              <span className="text-xs font-medium hidden sm:inline">
                                {isExpanded ? "Hide Details" : "View Details"}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-slate-600" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-slate-600" />
                              )}
                            </div>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-border/60 bg-slate-50/30 px-4 sm:px-5 py-3 space-y-2"
                              >
                                <div className="grid grid-cols-1 divide-y divide-border/60">
                                  {group.attempts.map((attempt, idx) => (
                                    <div
                                      key={attempt.session_id || idx}
                                      className="py-2.5 flex items-center justify-between gap-4 text-xs sm:text-sm"
                                    >
                                      <div className="flex items-center space-x-3">
                                        <span className="font-semibold text-slate-700 min-w-[70px]">
                                          Attempt #{group.attempts.length - idx}
                                        </span>
                                        <span className="flex items-center text-muted-foreground">
                                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                          {attempt.date}
                                        </span>
                                        <span className="hidden sm:inline text-muted-foreground">•</span>
                                        <span className="hidden sm:inline text-slate-600">
                                          {attempt.question_count} questions
                                        </span>
                                      </div>

                                      <div className="flex items-center space-x-2 flex-shrink-0">
                                        <Badge
                                          variant="outline"
                                          className={`text-xs font-bold px-2 py-0.5 border ${getScoreBadgeColor(
                                            attempt.score
                                          )}`}
                                        >
                                          Score: {attempt.score}%
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXAM ATTEMPTS */}
          {activeTab === "exams" && (
            <div>
              {examsList.length === 0 ? (
                <Card className="border border-dashed border-border bg-slate-50/50 text-center">
                  <CardContent className="p-12 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">
                        No completed exams yet
                      </h3>
                      <p className="text-sm text-slate-600 max-w-sm mx-auto">
                        Take a timed, competitive prelims simulation with PYQs to get comprehensive post-mortem diagnostics.
                      </p>
                    </div>
                    <Link to="/exam">
                      <Button className="font-semibold text-white bg-primary hover:bg-primary/90 mt-2">
                        Start Timed Exam
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Completed Exam Attempts ({examsList.length})
                  </h2>

                  <div className="grid grid-cols-1 gap-4">
                    {examsList.map((exam: ExamHistoryItem) => (
                      <Card
                        key={exam.exam_id}
                        className="border border-border/80 bg-white shadow-2xs hover:border-border transition"
                      >
                        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <GraduationCap className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                              <h3 className="text-base font-bold text-slate-900">
                                {exam.topic}
                              </h3>
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                {exam.status}
                              </Badge>
                            </div>

                            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                              <span className="flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                {exam.date}
                              </span>
                              <span>•</span>
                              <span>{exam.total_questions} Questions</span>
                              {exam.time_taken_seconds > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center">
                                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                    {Math.floor(exam.time_taken_seconds / 60)}m {exam.time_taken_seconds % 60}s
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 flex-shrink-0">
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground block font-medium">Score</span>
                              <Badge
                                variant="outline"
                                className={`text-xs font-bold px-2 py-0.5 border ${getScoreBadgeColor(
                                  exam.percentage
                                )}`}
                              >
                                {exam.score}/{exam.total_questions} ({Math.round(exam.percentage)}%)
                              </Badge>
                            </div>

                            <Link to={`/exam/${exam.exam_id}/report`}>
                              <Button size="sm" variant="outline" className="text-xs font-semibold">
                                <FileText className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                                <span>View Report</span>
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
