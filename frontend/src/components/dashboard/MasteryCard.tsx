import React from "react";
import { ShieldCheck, Award, Target, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";

interface MasteryCardProps {
  masteryRate: number;
  totalAttempts: number;
  accuracyRate: number;
  resolvedCount: number;
  identifiedCount: number;
}

export const MasteryCard: React.FC<MasteryCardProps> = ({
  masteryRate,
  totalAttempts,
  accuracyRate,
  resolvedCount,
  identifiedCount,
}) => {
  const masteryPercent = Math.round(masteryRate * 100);
  const accuracyPercent = Math.round(accuracyRate * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Overall Mastery */}
      <Card className="border border-border/70 shadow-xs bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Mastery
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{masteryPercent}%</span>
            <span className="text-xs text-muted-foreground">overall</span>
          </div>
          <div className="mt-3">
            <Progress value={masteryPercent} indicatorClassName="bg-emerald-600" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Questions Attempted */}
      <Card className="border border-border/70 shadow-xs bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Questions Solved
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalAttempts}</span>
            <span className="text-xs text-muted-foreground">attempts</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Accuracy: <strong className="text-slate-800 font-semibold">{accuracyPercent}%</strong>
          </p>
        </CardContent>
      </Card>

      {/* 3. Misconceptions Identified */}
      <Card className="border border-border/70 shadow-xs bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gaps Identified
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{identifiedCount}</span>
            <span className="text-xs text-muted-foreground">root causes</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Targeted for diagnosis
          </p>
        </CardContent>
      </Card>

      {/* 4. Misconceptions Resolved */}
      <Card className="border border-border/70 shadow-xs bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gaps Resolved
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-800">{resolvedCount}</span>
            <span className="text-xs text-muted-foreground">verified</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Successfully repaired
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
