import React from "react";
import { motion } from "framer-motion";
import { SameScoreDemoResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowDown,
  RotateCcw,
  ShieldAlert,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoComparisonViewProps {
  demoData: SameScoreDemoResponse;
}

export const DemoComparisonView: React.FC<DemoComparisonViewProps> = ({ demoData }) => {
  const { title, subtitle, initial_question, shared_result, student_a, student_b, key_takeaway } =
    demoData;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
          Core Hackathon Demonstration
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Level 1: Shared Initial Assessment & Identical Score */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20 text-xs">
                  {initial_question.topic}
                </Badge>
                <Badge variant="outline" className="text-slate-300 border-slate-700 text-xs">
                  {initial_question.concept}
                </Badge>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {initial_question.id}
              </span>
            </div>
            <p className="text-base sm:text-lg font-medium text-slate-100 mt-3 leading-relaxed">
              {initial_question.question_text}
            </p>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 bg-slate-50/60 border-t border-border/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(initial_question.options).map(([key, text]) => {
                const isCorrect = key === initial_question.correct_option;
                return (
                  <div
                    key={key}
                    className={cn(
                      "p-3 rounded-lg border flex items-start gap-2",
                      isCorrect
                        ? "border-emerald-300 bg-emerald-50/80 text-emerald-950 font-medium"
                        : "border-border/60 bg-white text-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center font-bold shrink-0 text-[11px]",
                        isCorrect ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {key}
                    </span>
                    <span className="flex-1">{text}</span>
                    {isCorrect && (
                      <span className="text-[10px] text-emerald-700 font-bold shrink-0">
                        (Correct Answer)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Shared Grading Box */}
            <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-black text-lg">
                  {shared_result.score}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Traditional MCQ Evaluation: Both Students Scored 0
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                    {shared_result.summary}
                  </div>
                </div>
              </div>

              <div className="text-center sm:text-right shrink-0">
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  Divergent Cognitive Pathways ↓
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Branching Divider */}
      <div className="flex items-center justify-center relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-dashed border-indigo-200" />
        </div>
        <div className="relative bg-white px-4 py-1.5 rounded-full border border-indigo-200 text-xs font-bold text-indigo-700 shadow-xs flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5" />
          <span>Diagnostic Engine Branches Evidence</span>
        </div>
      </div>

      {/* Level 2: Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student A Column */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
        >
          {/* Student Header */}
          <Card className="border-t-4 border-t-indigo-600 border-border/80 shadow-subtle bg-card">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Case Study Alpha
                </span>
                <Badge variant="outline" className="text-xs">
                  {student_a.student_id}
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 mt-1">
                {student_a.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4 text-xs">
              {/* Step 1: Initial Answer */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">1. Initial Answer & Confidence</span>
                  <Badge variant="destructive" className="text-[10px]">
                    Incorrect
                  </Badge>
                </div>
                <p className="text-slate-700">
                  Selected: <strong>Option {student_a.initial_attempt.selected_option}</strong> (
                  {student_a.initial_attempt.selected_text})
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                    Confidence: {student_a.initial_attempt.confidence}/5
                  </span>
                  <span className="text-muted-foreground italic">
                    {student_a.initial_attempt.observation}
                  </span>
                </div>
              </div>

              {/* Step 2: Diagnostic Probe */}
              <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-200/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900">2. Targeted Diagnostic Probe</span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Evidence Signal</span>
                </div>
                <p className="text-slate-800 leading-snug">
                  {student_a.diagnostic_probe.question_text}
                </p>
                <div className="p-2 rounded bg-white border border-indigo-100 text-slate-800">
                  Chose <strong>Option {student_a.diagnostic_probe.selected_option}</strong>: &quot;
                  {student_a.diagnostic_probe.selected_text}&quot;
                </div>
                <p className="text-muted-foreground italic pt-0.5">
                  Observation: {student_a.diagnostic_probe.observation}
                </p>
              </div>

              {/* Step 3: Confirmed Diagnosis */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Isolated Root Misconception
                  </span>
                  <span className="text-xs font-extrabold text-indigo-300">
                    {Math.round(student_a.diagnosis.probability * 100)}% Fit
                  </span>
                </div>
                <div className="text-base font-bold text-white">
                  {student_a.diagnosis.label}
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {student_a.diagnosis.reasoning}
                </p>
              </div>

              {/* Step 4: Targeted Remediation */}
              <div className="p-3.5 rounded-lg bg-white border border-border/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. Specific Remediation Provided</span>
                </div>
                <div className="font-semibold text-slate-800 text-xs">
                  {student_a.remediation.title}
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {student_a.remediation.text}
                </p>
                <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-700 italic">
                  Takeaway: {student_a.remediation.key_takeaway}
                </div>
              </div>

              {/* Step 5: Verification Outcome */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    4. Post-Remediation Verification
                  </span>
                  <Badge variant="secondary" className="bg-emerald-600 text-white font-bold text-xs uppercase">
                    RESOLVED
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  {student_a.verification.explanation}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Student B Column */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
        >
          {/* Student Header */}
          <Card className="border-t-4 border-t-amber-600 border-border/80 shadow-subtle bg-card">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  Case Study Beta
                </span>
                <Badge variant="outline" className="text-xs">
                  {student_b.student_id}
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 mt-1">
                {student_b.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4 text-xs">
              {/* Step 1: Initial Answer */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">1. Initial Answer & Confidence</span>
                  <Badge variant="destructive" className="text-[10px]">
                    Incorrect
                  </Badge>
                </div>
                <p className="text-slate-700">
                  Selected: <strong>Option {student_b.initial_attempt.selected_option}</strong> (
                  {student_b.initial_attempt.selected_text})
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                    Confidence: {student_b.initial_attempt.confidence}/5
                  </span>
                  <span className="text-muted-foreground italic">
                    {student_b.initial_attempt.observation}
                  </span>
                </div>
              </div>

              {/* Step 2: Diagnostic Probe */}
              <div className="p-3.5 rounded-lg bg-amber-50/50 border border-amber-200/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900">2. Targeted Diagnostic Probe</span>
                  <span className="text-[10px] text-amber-700 font-semibold">Evidence Signal</span>
                </div>
                <p className="text-slate-800 leading-snug">
                  {student_b.diagnostic_probe.question_text}
                </p>
                <div className="p-2 rounded bg-white border border-amber-100 text-slate-800">
                  Chose <strong>Option {student_b.diagnostic_probe.selected_option}</strong>: &quot;
                  {student_b.diagnostic_probe.selected_text}&quot;
                </div>
                <p className="text-muted-foreground italic pt-0.5">
                  Observation: {student_b.diagnostic_probe.observation}
                </p>
              </div>

              {/* Step 3: Confirmed Diagnosis */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Isolated Root Misconception
                  </span>
                  <span className="text-xs font-extrabold text-amber-300">
                    {Math.round(student_b.diagnosis.probability * 100)}% Fit
                  </span>
                </div>
                <div className="text-base font-bold text-white">
                  {student_b.diagnosis.label}
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {student_b.diagnosis.reasoning}
                </p>
              </div>

              {/* Step 4: Targeted Remediation */}
              <div className="p-3.5 rounded-lg bg-white border border-border/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>3. Specific Remediation Provided</span>
                </div>
                <div className="font-semibold text-slate-800 text-xs">
                  {student_b.remediation.title}
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {student_b.remediation.text}
                </p>
                <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-700 italic">
                  Takeaway: {student_b.remediation.key_takeaway}
                </div>
              </div>

              {/* Step 5: Verification Outcome */}
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    4. Post-Remediation Verification
                  </span>
                  <Badge variant="destructive" className="bg-rose-600 text-white font-bold text-xs uppercase">
                    PERSISTENT
                  </Badge>
                </div>
                <p className="text-[11px] text-rose-900 leading-relaxed">
                  {student_b.verification.explanation}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pedagogical Takeaway Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="p-5 rounded-2xl bg-indigo-900 text-white shadow-card flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-300" />
            <span>The Diagnostic Thesis</span>
          </div>
          <p className="text-sm sm:text-base font-semibold text-white max-w-2xl leading-relaxed">
            {key_takeaway}
          </p>
        </div>

        <div className="shrink-0">
          <span className="px-3.5 py-1.5 rounded-lg bg-indigo-800/80 border border-indigo-400/40 text-xs font-bold text-indigo-200">
            A wrong answer is evidence, not a diagnosis.
          </span>
        </div>
      </motion.div>
    </div>
  );
};
