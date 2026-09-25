import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { DemoComparisonView } from "@/components/teacher/DemoComparisonView";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";
import { AlertTriangle } from "lucide-react";

export const TeacherDemoPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["sameScoreDemo"],
    queryFn: () => api.getSameScoreDemo(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 py-6 max-w-5xl mx-auto">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Failed to load Showcase Demo</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message || "Could not retrieve demo story dataset."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-4">
      <DemoComparisonView demoData={data} />
    </div>
  );
};
