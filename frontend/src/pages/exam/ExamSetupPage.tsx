import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BookOpen,
  Atom,
  Flame,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

interface Preset {
  id: string;
  name: string;
  questionCount: 10 | 12 | 15;
  timeLimitMinutes: number;
  description: string;
  badge?: string;
  recommended?: boolean;
}

const PRESETS: Preset[] = [
  {
    id: "quick",
    name: "Quick Assessment",
    questionCount: 10,
    timeLimitMinutes: 15,
    description: "Rapid diagnostic calibration. Ideal for a quick self-check.",
    badge: "15 Min",
  },
  {
    id: "standard",
    name: "Standard Prelims",
    questionCount: 12,
    timeLimitMinutes: 20,
    description: "Balanced competitive prelims format with deep distractor discrimination.",
    badge: "Recommended",
    recommended: true,
  },
  {
    id: "deep",
    name: "Comprehensive Prelims",
    questionCount: 15,
    timeLimitMinutes: 30,
    description: "Thorough multi-concept assessment across all core curriculum subdomains.",
    badge: "30 Min",
  },
];

const TOPICS = [
  {
    id: "Comprehensive Science",
    name: "Comprehensive Science",
    desc: "Evenly samples from Newton's Laws, Kinematics, and Chemical Bonding.",
    icon: Sparkles,
    badge: "Multi-Topic",
  },
  {
    id: "Newton's Laws",
    name: "Newton's Laws of Motion",
    desc: "Forces, inertia, action-reaction, friction, and elevator dynamics.",
    icon: Atom,
  },
  {
    id: "Kinematics",
    name: "Classical Kinematics",
    desc: "Velocity vs acceleration, projectile symmetry, and free fall under gravity.",
    icon: BookOpen,
  },
  {
    id: "Chemical Bonding",
    name: "Chemical Bonding & Molecular Structure",
    desc: "Ionic/covalent nature, formal charge, octet exceptions, and dipole polarity.",
    icon: Flame,
  },
];

export const ExamSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<string>("Comprehensive Science");
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[1]);
  const [studentId, setStudentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartExam = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.createExam({
        topic: selectedTopic,
        question_count: selectedPreset.questionCount,
        time_limit_minutes: selectedPreset.timeLimitMinutes,
        student_id: studentId.trim() || undefined,
      });
      navigate(`/exam/${res.exam_id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to initialize exam session.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <GraduationCap className="h-4 w-4" />
          <span>Stage 6 — Competitive Prelims Simulation</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Exam Mode with Post-Mortem Diagnostics
        </h1>
        <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
          Experience real timed exam conditions with server-authoritative countdown timing, mark-for-review,
          and confidence tracking. When you finish, our deterministic engine conducts an instant diagnostic
          post-mortem answering: <strong className="text-slate-800">"Why did I lose these marks?"</strong>
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Topic Selection */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            1
          </div>
          <h2 className="text-lg font-bold text-slate-900">Select Exam Topic Domain</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOPICS.map((topic) => {
            const Icon = topic.icon;
            const isSelected = selectedTopic === topic.id;
            return (
              <div
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-indigo-50/40 ring-2 ring-primary/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2.5 rounded-lg ${
                        isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{topic.name}</h3>
                      {topic.badge && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          {topic.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
                </div>
                <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">{topic.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 2: Preset Format */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            2
          </div>
          <h2 className="text-lg font-bold text-slate-900">Choose Exam Format & Duration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRESETS.map((preset) => {
            const isSelected = selectedPreset.id === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => setSelectedPreset(preset)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-indigo-50/40 ring-2 ring-primary/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                      {preset.badge || `${preset.timeLimitMinutes} min`}
                    </span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{preset.name}</h3>
                  <div className="mt-1 text-xs font-medium text-slate-600 flex items-center space-x-2">
                    <span>{preset.questionCount} Questions</span>
                    <span>•</span>
                    <span>{preset.timeLimitMinutes} Minutes</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {preset.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 3: Student Identification & Exam Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center space-x-2 text-slate-900">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              <span>Exam Rules & Diagnostic Protocol</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Simulating standard prelims examination conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs text-slate-700">
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Server-Authoritative Timer:</strong> The countdown is verified by the backend.
                Refreshing or closing the page will not reset your remaining time.
              </span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Question Palette & Review:</strong> You may navigate between questions in any order
                and flag questions for review before submitting.
              </span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Confidence Rating (1–5):</strong> Calibrate how sure you feel about each answer.
                This distinguishes overconfidence and cognitive misconceptions from calculation slips or blind guesses.
              </span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Post-Mortem Analysis:</strong> No answers or solutions are revealed during the exam.
                Upon submission, you receive an immediate, detailed cognitive audit.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Start Card */}
        <Card className="border-slate-200 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Ready to Begin?</CardTitle>
            <CardDescription className="text-xs">
              Confirm your candidate details below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Candidate / Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. Alex Rivera or leave blank"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-[11px] text-muted-foreground block">
                Leave blank to generate an anonymous session identifier.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Topic:</span>
                <span className="font-semibold text-slate-900">{selectedTopic}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Questions:</span>
                <span className="font-semibold text-slate-900">{selectedPreset.questionCount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Time Limit:</span>
                <span className="font-semibold text-slate-900">{selectedPreset.timeLimitMinutes} minutes</span>
              </div>
            </div>

            <Button
              onClick={handleStartExam}
              disabled={isLoading}
              className="w-full font-bold flex items-center justify-center space-x-2 py-5 text-sm"
            >
              <span>{isLoading ? "Starting Exam..." : "Start Timed Exam"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
