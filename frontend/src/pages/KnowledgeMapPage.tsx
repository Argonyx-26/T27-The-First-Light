import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { api } from "@/api/client";
import { KnowledgeMapResponse } from "@/types";
import { KnowledgeGraph } from "@/components/knowledge/KnowledgeGraph";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { GitFork, ArrowRight, ArrowLeft } from "lucide-react";

export const KnowledgeMapPage: React.FC = () => {
  const { sessionId, topic } = useSession();
  const [data, setData] = useState<KnowledgeMapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMap() {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.getKnowledgeMap(sessionId);
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load knowledge map.");
      } finally {
        setLoading(false);
      }
    }
    loadMap();
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h3 className="text-xl font-bold text-slate-800">No active diagnostic session</h3>
        <p className="text-sm text-muted-foreground">
          Start a diagnostic assessment to generate your personalized knowledge gap graph.
        </p>
        <Link to="/topic">
          <Button className="font-semibold">
            <span>Start Practice</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-1">
            <GitFork className="w-4 h-4" />
            <span>Interactive Concept Graph</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Knowledge-Gap Map
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Visualizes hierarchical concept dependencies and the resolution status of underlying mental models.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="resolved" className="text-xs">Resolved ✓</Badge>
          <Badge variant="developing" className="text-xs">Developing ◐</Badge>
          <Badge variant="persistent" className="text-xs">Persistent !</Badge>
        </div>
      </div>

      {/* Main Graph Component */}
      <Card className="border border-border/80 shadow-card bg-white overflow-hidden p-2">
        {data && data.nodes ? (
          <KnowledgeGraph nodesData={data.nodes} topic={data.topic || topic || "Core Concept"} />
        ) : (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No concept gaps logged yet. Answer diagnostic questions to map misconceptions.
          </div>
        )}
      </Card>

      {/* Bottom Guidance */}
      <div className="p-4 rounded-xl bg-slate-50 border border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
        <span>
          Persistent nodes represent deep-seated misconceptions verified through contradictory responses.
        </span>
        <Link to="/topic" className="flex-shrink-0">
          <Button size="sm" variant="outline">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            <span>Back to Practice</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
