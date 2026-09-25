import React from "react";
import { Link } from "react-router-dom";
import { Lightbulb, BookOpen, Key, ArrowRight, HelpCircle, Sparkles, FileText, CheckCircle2 } from "lucide-react";
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

  return (
    <Card className="border border-border/80 shadow-card bg-card overflow-hidden">
      <CardHeader className="bg-slate-900 text-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold tracking-wider uppercase">
            <Lightbulb className="w-4 h-4" />
            <span>Targeted Remediation</span>
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
          Let&apos;s fix this.
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
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Textbook &amp; Course Citation</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                {remediation.grounded_source || (primarySource ? `${primarySource.document_name} — Page ${primarySource.page_number}` : "Course Notes")}
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
