import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Target,
  Zap,
} from "lucide-react";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const SUGGESTED_TOPICS = [
  "Data Structures & Algorithms",
  "Linear Search",
  "Binary Search",
  "Arrays & Strings",
  "Sorting Algorithms",
  "Chemical Bonding",
];

const QUESTION_COUNTS = [6, 9, 12, 15, 18, 24];
const DURATIONS = [10, 15, 20, 30, 45, 60];

export const ExamSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(12);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(20);
  const [detectedWeaknesses, setDetectedWeaknesses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active student ID from local storage
  const activeStudentId = localStorage.getItem("mm_student_id") || "student_default";

  useEffect(() => {
    // Check for detected weaknesses in the student's history
    api.getDailyRevision(activeStudentId)
      .then((res) => {
        if (res && res.questions && res.questions.length > 0) {
          const weaknesses = res.questions
            .map((it) => it.target_misconception_label || it.question?.concept || it.question?.topic)
            .filter(Boolean) as string[];
          setDetectedWeaknesses(weaknesses.slice(0, 3));
        }
      })
      .catch(() => {
        // Non-blocking
      });
  }, [activeStudentId]);

  const easyCount = Math.floor(questionCount / 3);
  const hardCount = Math.floor(questionCount / 3);
  const mediumCount = questionCount - easyCount - hardCount;

  const handleStartExam = async () => {
    if (!topic.trim()) {
      setError("Please specify an exam topic.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.createExam({
        topic: topic.trim(),
        question_count: questionCount,
        time_limit_minutes: timeLimitMinutes,
        student_id: activeStudentId,
      });
      navigate(`/exam/${res.exam_id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to initialize exam session.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <GraduationCap className="h-4 w-4" />
          <span>Competitive Exam &amp; PYQ Simulation</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Adaptive Exam Mode
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
          Take a strict, server-timed exam with authentic Past Year Questions (PYQs). 
          Questions are equally partitioned into <strong className="text-slate-800">Easy, Medium, and Difficult</strong> tiers, 
          and targeted specifically to your diagnosed conceptual weaknesses.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Weakness Alert if Student Has Prior Learning History */}
      {detectedWeaknesses.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 text-amber-950 space-y-1.5">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-900">
            <Target className="w-4 h-4 text-amber-600" />
            <span>Weakness-Targeted Diagnostics Active</span>
          </div>
          <p className="text-xs text-amber-900">
            Based on your past practice sessions, the exam generator will prioritize questions testing your active cognitive root causes:{" "}
            <strong>{detectedWeaknesses.join(", ")}</strong>.
          </p>
        </div>
      )}

      {/* Step 1: Topic Input */}
      <Card className="border border-border/80 shadow-2xs bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </div>
            <CardTitle className="text-base font-bold text-slate-900">Enter Exam Topic</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Type any topic or select a suggested domain to generate tailored PYQs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Search for a topic to take a quiz"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
            autoFocus
          />

          <div className="flex items-center flex-wrap gap-2 pt-1">
            <span className="text-xs text-muted-foreground font-semibold">Suggestions:</span>
            {SUGGESTED_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${
                  topic.toLowerCase() === t.toLowerCase()
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Question Count & Difficulty Partition */}
      <Card className="border border-border/80 shadow-2xs bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              2
            </div>
            <CardTitle className="text-base font-bold text-slate-900">Number of Questions</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Questions are equally distributed across difficulty tiers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {QUESTION_COUNTS.map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setQuestionCount(cnt)}
                className={`py-3 px-2 rounded-xl text-center border font-bold transition text-sm ${
                  questionCount === cnt
                    ? "bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cnt} Qs
              </button>
            ))}
          </div>

          {/* Equal Difficulty Breakdown Badge */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Equally Balanced PYQ Distribution:
            </span>
            <div className="flex items-center space-x-2 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                {easyCount} Easy
              </span>
              <span>+</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                {mediumCount} Medium
              </span>
              <span>+</span>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold border border-rose-200">
                {hardCount} Difficult
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Duration Selector */}
      <Card className="border border-border/80 shadow-2xs bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              3
            </div>
            <CardTitle className="text-base font-bold text-slate-900">Exam Duration</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Server-authoritative timer. Test terminates automatically when time expires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {DURATIONS.map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setTimeLimitMinutes(dur)}
                className={`py-3 px-2 rounded-xl text-center border font-bold transition text-sm flex items-center justify-center gap-1 ${
                  timeLimitMinutes === dur
                    ? "bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{dur} min</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strict Protocol & Start Button */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <Card className="lg:col-span-2 border-slate-200 shadow-2xs bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center space-x-2 text-slate-900">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              <span>Strict Exam Environment</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Zero answer revelation or mid-exam correctness feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-700">
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Blind Testing:</strong> No scores, answers, or solution hints will be shown during the exam.
              </span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Post-Mortem Diagnostics:</strong> Upon submission, you will receive an in-depth breakdown of your score, difficulty-tier mastery, and full multi-modal remediation (visual artifacts &amp; Feynman breakdowns) for any missed questions.
              </span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Longitudinal Recovery:</strong> Answering questions correctly will mark previously detected misconceptions as resolved in your learner profile!
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Start Button Card */}
        <Card className="border-slate-200 shadow-2xs bg-white flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">Summary</CardTitle>
            <CardDescription className="text-xs">Review parameters before beginning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Topic:</span>
                <span className="font-bold text-slate-900 truncate max-w-[140px]">{topic}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Questions:</span>
                <span className="font-bold text-slate-900">{questionCount} Qs</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Time:</span>
                <span className="font-bold text-slate-900">{timeLimitMinutes} mins</span>
              </div>
            </div>

            <Button
              onClick={handleStartExam}
              disabled={isLoading || !topic.trim()}
              className="w-full font-bold flex items-center justify-center space-x-2 py-5 text-sm bg-primary hover:bg-primary/90 text-white"
            >
              <span>{isLoading ? "Generating PYQ Exam..." : "Start Timed Exam"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
