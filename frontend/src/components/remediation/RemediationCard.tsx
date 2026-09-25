import React from "react";
import { Link } from "react-router-dom";
import { Lightbulb, BookOpen, Key, ArrowRight, HelpCircle, Sparkles, FileText, CheckCircle2, Image as ImageIcon, Video, Compass, Play, ExternalLink, GitFork, ArrowDown, Check, X } from "lucide-react";
import { RemediationResponse } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface RemediationCardProps {
  remediation: RemediationResponse;
  onProceedToVerification?: () => void;
}

export const RemediationCard: React.FC<RemediationCardProps> = ({
  remediation,
  onProceedToVerification,
}) => {
  const isGrounded = !!remediation.grounded;
  const primarySource = remediation.sources && remediation.sources.length > 0 ? remediation.sources[0] : null;
  const isImageSource = primarySource?.source_type === "image" || (remediation.grounded_source?.includes("Figure") ?? false);
  const defaultSourceLabel = primarySource
    ? `${primarySource.document_name} — ${primarySource.source_type === "image" ? `Figure, Page ${primarySource.page_number}` : `Page ${primarySource.page_number}`}`
    : "Course Notes";

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="border border-border/80 shadow-card bg-card overflow-hidden">
      <CardHeader className="bg-slate-900 text-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold tracking-wider uppercase">
            <Lightbulb className="w-4 h-4" />
            <span>Targeted Multi-Modal Remediation</span>
          </div>

          {isGrounded ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Grounded in your study material
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
              General explanation
            </span>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Let&apos;s master this concept.
        </h2>
        <p className="text-sm text-slate-300 mt-1 max-w-xl">
          {remediation.remediation_title || "Reframing the core conceptual principle"}
        </p>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Grounded Source Material Box */}
        {isGrounded && (remediation.grounded_source || primarySource) && (
          <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/70 border border-emerald-200/90 text-emerald-950 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                {isImageSource ? (
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                ) : (
                  <FileText className="w-4 h-4 text-emerald-600" />
                )}
                <span>{isImageSource ? "Diagram & Figure Citation" : "Textbook & Course Citation"}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                {remediation.grounded_source || defaultSourceLabel}
              </span>
            </div>

            {primarySource?.excerpt && (
              <blockquote className="pl-3 border-l-2 border-emerald-400 text-xs sm:text-sm text-emerald-900 italic bg-white/60 p-2.5 rounded-r-md">
                &ldquo;{primarySource.excerpt}&rdquo;
              </blockquote>
            )}

            <p className="text-[11px] text-emerald-700 font-medium">
              Anchored directly in your course notes, reflecting the definitions and principles taught in class.
            </p>
          </div>
        )}

        {/* Feynman Technique Simplified Breakdown */}
        {remediation.feynman_explanation && (
          <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-blue-50/60 border border-indigo-200/80 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>The Feynman Technique: Intuitive Breakdown (EL12)</span>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">
              {remediation.feynman_explanation}
            </p>
          </div>
        )}

        {/* Step-by-Step Decision Flowchart: Path to Correct Answer */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-50 via-white to-slate-50 border border-indigo-100/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/80">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
              <GitFork className="w-4 h-4 text-indigo-600" />
              <span>Step-by-Step Decision Flowchart: Path to Correct Answer</span>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              Visual Reasoning Flow
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Step 1: Given Problem Scenario */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Step 1 • Problem Context</span>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">
                    Analyze Problem Conditions &amp; Scenario Constraints
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded hidden sm:inline-block">
                Start Node
              </span>
            </div>

            {/* Connecting Decision Fork Arrow */}
            <div className="flex justify-center my-0.5">
              <div className="flex items-center space-x-1.5 text-slate-500 bg-slate-100 px-3 py-1 rounded-full text-[11px] font-semibold border border-slate-200">
                <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                <span>Evaluate Reasoning Strategy</span>
              </div>
            </div>

            {/* Step 2: The Decision Fork (Trap vs. Correct Logic) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Flawed Branch */}
              <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/70 space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                      <span>Intuitive Trap (Misconception)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900 border border-rose-300">
                      Wrong Path ✗
                    </span>
                  </div>
                  <p className="text-xs text-rose-950 leading-relaxed font-medium">
                    {remediation.differences && remediation.differences.length > 0 && remediation.differences[0]?.misconception_aspect
                      ? remediation.differences[0].misconception_aspect
                      : `Mistakenly assuming ${remediation.misconception_id.replace(/_/g, " ")} dictates this outcome.`}
                  </p>
                </div>
                <div className="pt-2 border-t border-rose-200 text-[11px] text-rose-800 flex items-center justify-between font-semibold">
                  <span>Consequence:</span>
                  <span className="text-rose-700 underline decoration-rose-400">Selected Incorrect Distractor</span>
                </div>
              </div>

              {/* Correct Branch */}
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/80 space-y-2 flex flex-col justify-between shadow-2xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      <span>Scientific / Algorithmic Rule</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 border border-emerald-300">
                      Correct Path ✓
                    </span>
                  </div>
                  <p className="text-xs text-emerald-950 leading-relaxed font-semibold">
                    {remediation.differences && remediation.differences.length > 0 && remediation.differences[0]?.reality_aspect
                      ? remediation.differences[0].reality_aspect
                      : "Apply the formal definition and fundamental scientific principle directly."}
                  </p>
                </div>
                <div className="pt-2 border-t border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between font-semibold">
                  <span>Consequence:</span>
                  <span className="text-emerald-900">Direct Path to Correct Answer</span>
                </div>
              </div>
            </div>

            {/* Connecting Arrow */}
            <div className="flex justify-center my-0.5">
              <div className="flex items-center space-x-1.5 text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full text-[11px] font-semibold border border-emerald-300">
                <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                <span>Arrive at Verified Solution</span>
              </div>
            </div>

            {/* Step 3: Verified Correct Answer & Takeaway */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Step 3 • Verified Correct Answer &amp; Master Rule
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                  Concept Mastered
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-950 font-medium pl-8">
                <span className="font-semibold text-emerald-800">Verified Path: </span>
                {remediation.differences && remediation.differences.length > 0 && remediation.differences[0]?.reality_aspect
                  ? `Apply: "${remediation.differences[0].reality_aspect}" to arrive at the true option.`
                  : "Follow the core conceptual definition to eliminate the distractor and confirm the right option."}
              </p>
            </div>
          </div>
        </div>

        {/* Visual Schematic Diagram Artifact */}
        {remediation.visual_artifact_svg && (
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-700 flex items-center">
              <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Visual Schematic: Misconception vs. Physical Reality
            </h4>
            <div
              className="p-4 rounded-xl bg-white border border-border shadow-inner overflow-x-auto flex justify-center items-center"
              dangerouslySetInnerHTML={{ __html: remediation.visual_artifact_svg }}
            />
          </div>
        )}

        {/* Curated / Dynamic Video Snippet */}
        {remediation.video_snippet && remediation.video_snippet.youtube_video_id && (
          <div className="p-5 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-400">
                <Video className="w-4 h-4" />
                <span>Video Tutorial: {remediation.video_snippet.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.youtube.com/watch?v=${remediation.video_snippet.youtube_video_id}&t=${remediation.video_snippet.start_seconds || 0}s`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-0.5 rounded-full bg-rose-600/30 text-rose-300 hover:bg-rose-600/50 border border-rose-500/40 flex items-center gap-1 transition-colors"
                >
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 font-mono">
                  <Play className="w-3 h-3 text-rose-400 fill-rose-400" />
                  {formatSeconds(remediation.video_snippet.start_seconds)} - {remediation.video_snippet.end_seconds ? formatSeconds(remediation.video_snippet.end_seconds) : "End"}
                </span>
              </div>
            </div>

            <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-slate-800 bg-black">
              <iframe
                title={remediation.video_snippet.title}
                src={`https://www.youtube-nocookie.com/embed/${remediation.video_snippet.youtube_video_id}?start=${remediation.video_snippet.start_seconds}${remediation.video_snippet.end_seconds ? `&end=${remediation.video_snippet.end_seconds}` : ""}&rel=0`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-slate-300">
              <span className="font-semibold text-rose-300">Target Focus: </span>
              {remediation.video_snippet.concept_summary}
            </p>
          </div>
        )}

        {/* Core Explanation */}
        <div className="space-y-2">
          <h4 className="text-xs uppercase font-bold tracking-wider text-indigo-900 flex items-center">
            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            What Happened &amp; Why
          </h4>
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-border/80 text-sm sm:text-base text-slate-800 leading-relaxed">
            {remediation.remediation_text}
          </div>
        </div>

        {/* Differences / Comparison Table */}
        {remediation.differences && remediation.differences.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="text-xs uppercase font-bold tracking-wider text-indigo-900 flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Misconception vs. Reality
            </h4>
            <div className="rounded-xl border border-border/80 overflow-hidden bg-white shadow-sm">
              <div className="grid grid-cols-2 bg-slate-100 border-b border-border/80 text-xs font-bold uppercase tracking-wider text-slate-700">
                <div className="p-3 border-r border-border/80 text-rose-700">What You Might Think</div>
                <div className="p-3 text-emerald-700">What Actually Happens</div>
              </div>
              <div className="divide-y divide-border/60">
                {remediation.differences.map((diff, idx) => (
                  <div key={idx} className="grid grid-cols-2 text-sm">
                    <div className="p-4 border-r border-border/80 bg-rose-50/30 text-rose-900">
                      {diff.misconception_aspect}
                    </div>
                    <div className="p-4 bg-emerald-50/30 text-emerald-900 font-medium">
                      {diff.reality_aspect}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Real-World Analogy / Example */}
        {remediation.example && (
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-600 flex items-center">
              <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Intuitive Example
            </h4>
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 text-sm text-amber-950 leading-relaxed">
              {remediation.example}
            </div>
          </div>
        )}

        {/* Key Takeaway */}
        {remediation.key_takeaway && (
          <div className="p-4 sm:p-5 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 mt-0.5">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block mb-0.5">
                  Key Takeaway
                </span>
                <p className="text-sm font-semibold text-indigo-950 leading-snug">
                  {remediation.key_takeaway}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Self-check for understanding */}
        {remediation.check_for_understanding && (
          <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-xs sm:text-sm text-slate-700 flex items-start space-x-2.5">
            <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block mb-0.5">Reflective Check</span>
              <p>{remediation.check_for_understanding}</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-6 sm:p-8 bg-slate-50/50 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground text-center sm:text-left">
          Now we test your understanding with a different question testing the same concept.
        </span>

        <Link to="/verification" className="w-full sm:w-auto" onClick={onProceedToVerification}>
          <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold">
            <span>Test my understanding</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
