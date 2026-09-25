import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { StudentsTable } from "@/components/teacher/StudentsTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";
import { AlertTriangle, Users } from "lucide-react";

export const TeacherStudentsPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teacherStudents"],
    queryFn: () => api.getTeacherStudents(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 py-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>Failed to load student cohort</AlertTitle>
        <AlertDescription>
          {(error as Error)?.message || "Server error occurred."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="border-b border-border/70 pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
          <Users className="w-3.5 h-3.5" />
          Roster Diagnostics
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Student Diagnostic Cohort
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detailed cognitive state, active knowledge gaps, and confidence calibration for all enrolled learners.
        </p>
      </div>

      <StudentsTable students={data.students} />
    </div>
  );
};
