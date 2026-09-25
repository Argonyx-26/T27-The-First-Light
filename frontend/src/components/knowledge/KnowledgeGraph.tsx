import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  Position,
  Handle,
} from "reactflow";
import "reactflow/dist/style.css";
import { KnowledgeMapNode } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { BookOpen, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";

interface KnowledgeGraphProps {
  nodesData: KnowledgeMapNode[];
  topic: string;
  onSelectMisconception?: (nodeId: string, nodeLabel: string) => void;
  selectedMisconceptionId?: string | null;
}

// Custom Node for Concept
const ConceptNode = ({ data }: { data: { label: string; status: string } }) => {
  return (
    <div className="px-5 py-3.5 shadow-card rounded-xl bg-slate-900 border-2 border-indigo-500 text-white min-w-[200px] text-center">
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400" />
      <div className="flex items-center justify-center space-x-1.5 text-indigo-300 text-[11px] font-semibold uppercase tracking-wider mb-1">
        <BookOpen className="w-3.5 h-3.5" />
        <span>Core Concept</span>
      </div>
      <div className="font-bold text-sm tracking-tight">{data.label}</div>
    </div>
  );
};

// Custom Node for Misconceptions
const MisconceptionNode = ({ data }: { data: { label: string; status: string; isSelected?: boolean } }) => {
  const isResolved = data.status === "resolved";
  const isPersistent = data.status === "persistent";

  return (
    <div
      className={`px-4 py-3 shadow-subtle rounded-xl bg-white border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
        data.isSelected
          ? "border-indigo-600 ring-2 ring-indigo-400 shadow-md"
          : "border-border hover:border-indigo-300"
      } min-w-[220px] max-w-[260px]`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Gap Probe (Click for Journey)
        </span>
        <Badge
          variant={isResolved ? "resolved" : isPersistent ? "persistent" : "developing"}
          className="text-[10px] uppercase font-bold py-0.5 px-2"
        >
          {isResolved ? (
            <span className="flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" /> Resolved
            </span>
          ) : isPersistent ? (
            <span className="flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" /> Persistent
            </span>
          ) : (
            <span className="flex items-center">
              <HelpCircle className="w-3 h-3 mr-1" /> Developing
            </span>
          )}
        </Badge>
      </div>

      <div className="text-xs font-semibold text-slate-800 leading-snug">
        {data.label}
      </div>
    </div>
  );
};

const nodeTypes = {
  concept: ConceptNode,
  misconception: MisconceptionNode,
};

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  nodesData,
  topic,
  onSelectMisconception,
  selectedMisconceptionId,
}) => {
  const { flowNodes, flowEdges } = useMemo(() => {
    const conceptNodeItem = nodesData.find((n) => n.type === "concept") || {
      id: "concept_root",
      type: "concept",
      label: topic,
      status: "mastered",
    };

    const miscNodes = nodesData.filter((n) => n.type !== "concept");

    // Layout Root Concept at top center
    const nodes: Node[] = [
      {
        id: conceptNodeItem.id,
        type: "concept",
        position: { x: Math.max(100, (miscNodes.length * 280) / 2 - 100), y: 30 },
        data: { label: conceptNodeItem.label, status: conceptNodeItem.status },
      },
    ];

    const edges: Edge[] = [];

    // Position misconception nodes horizontally below the concept
    miscNodes.forEach((mn, index) => {
      const xPos = index * 270 + 40;
      const yPos = 170;

      nodes.push({
        id: mn.id,
        type: "misconception",
        position: { x: xPos, y: yPos },
        data: {
          label: mn.label,
          status: mn.status,
          isSelected: selectedMisconceptionId === mn.id,
        },
      });

      edges.push({
        id: `edge_${conceptNodeItem.id}_${mn.id}`,
        source: conceptNodeItem.id,
        target: mn.id,
        type: "smoothstep",
        animated: mn.status === "persistent",
        style: {
          stroke: mn.status === "resolved" ? "#10b981" : mn.status === "persistent" ? "#ef4444" : "#94a3b8",
          strokeWidth: 2,
        },
      });
    });

    return { flowNodes: nodes, flowEdges: edges };
  }, [nodesData, topic, selectedMisconceptionId]);

  return (
    <div className="w-full h-[400px] sm:h-[460px] rounded-xl border border-border/80 bg-slate-50/50 overflow-hidden relative shadow-inner">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodeClick={(_, node) => {
          if (node.type === "misconception" && onSelectMisconception) {
            onSelectMisconception(node.id, node.data.label);
          }
        }}
      >
        <Background color="#cbd5e1" gap={16} size={1} />
        <Controls showInteractive={false} className="bg-white border border-border shadow-xs rounded-lg" />
      </ReactFlow>
    </div>
  );
};
