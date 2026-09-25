import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  BookOpen,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { useSession } from "../context/SessionContext";
import { api } from "../api/client";
import { RevisionItem } from "../types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/Alert";
import { Skeleton } from "../components/ui/Skeleton";

export const RevisionPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId, topic } = useSession();

  const [items, setItems] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      navigate("/");
      return;
    }

    const fetchRevisionList = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getRevisionList(sessionId);
        setItems(data.revision_items || []);
      } catch (err: any) {
        setError(err.message || "Failed to load revision queue.");
      } finally {
        setLoading(false);
      }
    };

    fetchRevisionList();
  }, [sessionId, navigate]);

  const highPriorityCount = items.filter((item) => item.status === "persistent").length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
            <Clock className="w-3.5 h-3.5" />
            Spaced Cognitive Intervals
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Targeted Revision Queue
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Concept items scheduled for reinforcement based on detected cognitive misconceptions in {topic}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/knowledge-gaps")}
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            Knowledge Graph
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Error Loading Revision Queue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Pending Topics</p>
                  <p className="text-xl font-bold text-foreground">{items.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">High Priority</p>
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                    {highPriorityCount}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Next Recommended Review</p>
                  <p className="text-xl font-bold text-foreground">
                    {highPriorityCount > 0 ? "In 24 Hours" : items.length > 0 ? "In 3 Days" : "None"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* List or Empty State */}
          {items.length === 0 ? (
            <Card className="text-center py-12 px-6 border-dashed border-2">
              <CardContent className="space-y-4 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Clear Revision Queue</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    No persistent cognitive misconceptions require immediate remediation for this session. Great job!
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <Button variant="outline" onClick={() => navigate("/topic")} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    New Assessment
                  </Button>
                  <Button onClick={() => navigate("/dashboard")}>
                    View Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <span>Prioritized Concept Review</span>
                <span className="text-xs font-normal text-muted-foreground">({items.length} items)</span>
              </h2>

              <div className="space-y-3">
                {items.map((item, idx) => {
                  const isHighPriority = item.status === "persistent";
                  return (
                    <Card
                      key={idx}
                      className="transition-all hover:border-primary/40 hover:shadow-sm"
                    >
                      <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {item.concept}
                            </span>
                            <Badge
                              variant={
                                isHighPriority
                                  ? "destructive"
                                  : item.status === "confirmed"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="capitalize text-xs"
                            >
                              {item.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Review in {item.recommended_review_in_days}{" "}
                              {item.recommended_review_in_days === 1 ? "day" : "days"}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-foreground">
                            {item.misconception}
                          </h3>

                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.summary}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate("/remediation")}
                            className="gap-2"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            Remediate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
