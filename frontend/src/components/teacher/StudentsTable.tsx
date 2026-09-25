import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { StudentSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  Flame,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentsTableProps {
  students: StudentSummary[];
  title?: string;
  description?: string;
}

export const StudentsTable: React.FC<StudentsTableProps> = ({
  students,
  title = "Student Diagnostic Cohort",
  description = "Individual learner trajectories, active cognitive gaps, and calibration profiles.",
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"mastery" | "accuracy" | "gaps">("mastery");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredAndSortedStudents = useMemo(() => {
    return students
      .filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.topic.toLowerCase().includes(search.toLowerCase()) ||
          s.student_id.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;

        if (filterStatus === "overconfident") return s.calibration_status === "Overconfident";
        if (filterStatus === "underconfident") return s.calibration_status === "Underconfident";
        if (filterStatus === "persistent") return s.persistent_misconceptions > 0;
        if (filterStatus === "at_risk") return s.mastery_score < 0.5;

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === "mastery") diff = a.mastery_score - b.mastery_score;
        else if (sortBy === "accuracy") diff = a.accuracy_rate - b.accuracy_rate;
        else if (sortBy === "gaps") diff = a.active_gaps - b.active_gaps;

        return sortAsc ? diff : -diff;
      });
  }, [students, search, filterStatus, sortBy, sortAsc]);

  const toggleSort = (field: "mastery" | "accuracy" | "gaps") => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const getCalibrationBadge = (status: string) => {
    if (status === "Overconfident") {
      return (
        <Badge variant="destructive" className="text-xs font-semibold gap-1">
          <Flame className="w-3 h-3" />
          Overconfident
        </Badge>
      );
    }
    if (status === "Underconfident") {
      return (
        <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
          Underconfident
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs text-emerald-800 bg-emerald-50 border-emerald-200 gap-1">
        <ShieldCheck className="w-3 h-3" />
        Calibrated
      </Badge>
    );
  };

  return (
    <Card className="border border-border/80 shadow-card bg-card overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>{title}</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {filteredAndSortedStudents.length} of {students.length} Learners
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {description}
            </CardDescription>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or topic..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary w-40 sm:w-48"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="persistent">Persistent Misconception</option>
              <option value="overconfident">Overconfident Only</option>
              <option value="underconfident">Underconfident Only</option>
              <option value="at_risk">At Risk (Mastery &lt; 50%)</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-border/60 bg-slate-50/60 text-xs font-semibold text-slate-500">
                <th className="p-3.5 pl-6">Student</th>
                <th className="p-3.5">Topic</th>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => toggleSort("mastery")}
                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                  >
                    <span>Mastery</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => toggleSort("accuracy")}
                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                  >
                    <span>Accuracy</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => toggleSort("gaps")}
                    className="flex items-center justify-center gap-1 hover:text-slate-900 transition-colors w-full"
                  >
                    <span>Active Gaps</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3.5 text-center">Persistent</th>
                <th className="p-3.5">Calibration</th>
                <th className="p-3.5">Last Active</th>
                <th className="p-3.5 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-sm">
              {filteredAndSortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">
                    No students match the current filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedStudents.map((student) => {
                  const hasPersistent = student.persistent_misconceptions > 0;
                  return (
                    <tr
                      key={student.student_id}
                      onClick={() => navigate(`/teacher/students/${student.student_id}`)}
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors cursor-pointer group",
                        hasPersistent && "bg-rose-50/20"
                      )}
                    >
                      <td className="p-3.5 pl-6">
                        <div className="font-semibold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-2">
                          <span>{student.name}</span>
                          {hasPersistent && (
                            <span title="Persistent Misconception">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {student.student_id}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {student.topic}
                        </span>
                      </td>

                      <td className="p-3.5 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                student.mastery_score >= 0.7
                                  ? "bg-emerald-500"
                                  : student.mastery_score >= 0.5
                                  ? "bg-indigo-500"
                                  : "bg-rose-500"
                              )}
                              style={{ width: `${Math.round(student.mastery_score * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            {Math.round(student.mastery_score * 100)}%
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 text-xs text-slate-600 font-medium">
                        {Math.round(student.accuracy_rate * 100)}%
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold",
                            student.active_gaps > 0
                              ? "bg-amber-100/70 text-amber-800"
                              : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {student.active_gaps}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        {student.persistent_misconceptions > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            {student.persistent_misconceptions}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">0</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {getCalibrationBadge(student.calibration_status)}
                      </td>

                      <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {student.last_active}
                      </td>

                      <td className="p-3.5 pr-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-slate-600 group-hover:text-primary gap-1"
                        >
                          <span>Diagnose</span>
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
