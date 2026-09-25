import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, RotateCcw, ArrowRight, BarChart3, HelpCircle } from "lucide-react";
import { VerifyResponse } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ResolutionBadgeProps {
  result: VerifyResponse;
  misconceptionLabel?: string;
  onRetry?: () => void;
}

export const ResolutionBadge: React.FC<ResolutionBadgeProps> = ({
  result,
  misconceptionLabel,
}) => {
  const isResolved = result.status === "resolved";

  return (
    <Card className="border border-border/80 shadow-card bg-card overflow-hidden">
      <CardHeader
        className={
          isResolved
            ? "bg-emerald-900 text-white p-6 sm:p-8"
            : "bg-slate-900 text-white p-6 sm:p-8"
        }
      >
        <div className="flex items-center space-x-2 text-xs font-semibold tracking-wider uppercase mb-2">
          {isResolved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">Verification Complete</span>
            </>
          ) : (
            <>
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300">Verification Feedback</span>
            </>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {isResolved ? "Concept verified." : "Not quite yet."}
        </h2>
        <p className="text-sm mt-1 max-w-xl text-slate-300">
          {isResolved
            ? "You successfully applied the scientific principle in a new, different context."
            : "Your response suggests this concept may still need a little more work. That is completely normal in mastery learning."}
        </p>

        <div className="mt-4 inline-flex items-center">
          <Badge
            variant={isResolved ? "resolved" : "persistent"}
            className="text-xs px-3 py-1 font-semibold uppercase tracking-wider"
          >
            {isResolved ? "Status: RESOLVED ✓" : "Status: PERSISTENT !"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-4">
        {misconceptionLabel && (
          <div className="text-xs text-muted-foreground">
            Diagnosed Concept:{" "}
            <strong className="text-slate-900 font-semibold">{misconceptionLabel}</strong>
          </div>
        )}

        <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-border/80 text-sm sm:text-base text-slate-800 leading-relaxed">
          {result.explanation}
        </div>
      </CardContent>

      <CardFooter className="p-6 sm:p-8 bg-slate-50/50 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3">
        {isResolved ? (
          <>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <BarChart3 className="w-4 h-4 mr-2" />
                <span>View Dashboard</span>
              </Button>
            </Link>

            <Link to="/topic" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-semibold">
                <span>Continue learning</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Link to="/remediation" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <RotateCcw className="w-4 h-4 mr-2" />
                <span>Review Explanation</span>
              </Button>
            </Link>

            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-primary text-white font-semibold">
                <span>View Learning Gaps</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </>
        )}
      </CardFooter>
    </Card>
  );
};
