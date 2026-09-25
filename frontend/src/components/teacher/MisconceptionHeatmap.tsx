import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeatmapData, HeatmapCell } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Users, Info, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MisconceptionHeatmapProps {
  heatmapData: HeatmapData;
  onSelectCell?: (cell: HeatmapCell) => void;
}

export const MisconceptionHeatmap: React.FC<MisconceptionHeatmapProps> = ({
  heatmapData,
  onSelectCell,
}) => {
  const navigate = useNavigate();
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);

  const { concepts, misconception_categories, cells } = heatmapData;

  const getCell = (concept: string, category: string): HeatmapCell | undefined => {
    return cells.find((c) => c.concept === concept && c.category === category);
  };

  const getCellBgClass = (count: number) => {
    if (count === 0) return "bg-slate-50 text-slate-400 hover:bg-slate-100/70 border-slate-100";
    if (count === 1) return "bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/80 border-indigo-200/50 font-medium";
    if (count === 2) return "bg-indigo-100/80 text-indigo-900 hover:bg-indigo-200/80 border-indigo-300 font-semibold";
    return "bg-indigo-200 text-indigo-950 hover:bg-indigo-300 border-indigo-400 font-bold shadow-xs";
  };

  const handleCellClick = (cell?: HeatmapCell) => {
    if (!cell) return;
    setSelectedCell(cell);
    if (onSelectCell) onSelectCell(cell);
  };

  return (
    <Card className="border border-border/80 shadow-card bg-card overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Class Misconception Heatmap</span>
              <Badge variant="outline" className="text-xs font-normal">
                {concepts.length} Concepts × {misconception_categories.length} Cognitive Models
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Displays student density across specific conceptual misconceptions. Darker cells represent higher prevalence.
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded bg-slate-100 border border-slate-200" /> 0
            <span className="inline-block w-3 h-3 rounded bg-indigo-50 border border-indigo-200" /> 1
            <span className="inline-block w-3 h-3 rounded bg-indigo-100 border border-indigo-300" /> 2
            <span className="inline-block w-3 h-3 rounded bg-indigo-200 border border-indigo-400" /> 3+
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[620px]">
            <thead>
              <tr>
                <th className="p-3 text-xs font-semibold text-slate-500 bg-slate-50/50 rounded-tl-lg w-1/4">
                  Concept / Topic
                </th>
                {misconception_categories.map((cat) => (
                  <th
                    key={cat}
                    className="p-3 text-center text-xs font-semibold text-slate-600 bg-slate-50/50 border-l border-border/40"
                  >
                    <div className="truncate max-w-[130px] mx-auto" title={cat}>
                      {cat}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {concepts.map((concept) => (
                <tr key={concept} className="border-t border-border/50">
                  <td className="p-3 text-sm font-semibold text-slate-800 bg-slate-50/30">
                    {concept}
                  </td>
                  {misconception_categories.map((cat) => {
                    const cell = getCell(concept, cat);
                    const count = cell ? cell.student_count : 0;
                    const isSelected = selectedCell?.concept === concept && selectedCell?.category === cat;

                    return (
                      <td key={cat} className="p-2 text-center border-l border-border/40">
                        <button
                          type="button"
                          onClick={() => handleCellClick(cell)}
                          className={cn(
                            "w-full h-11 rounded-lg border transition-all flex flex-col items-center justify-center cursor-pointer",
                            getCellBgClass(count),
                            isSelected && "ring-2 ring-primary ring-offset-1 scale-[1.03]"
                          )}
                          title={`${concept} • ${cat}: ${count} students`}
                        >
                          <span className="text-sm font-bold leading-none">{count}</span>
                          <span className="text-[10px] text-muted-foreground/80 mt-0.5">
                            {count === 1 ? "student" : "students"}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Cell Detail Drawer */}
        {selectedCell && (
          <div className="p-4 rounded-xl bg-slate-50 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Inspecting Focus Area:
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {selectedCell.concept} — {selectedCell.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {selectedCell.student_count} student{selectedCell.student_count === 1 ? "" : "s"} exhibiting this misconception pattern (
                  {Math.round(selectedCell.frequency * 100)}% of cohort).
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCell(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/teacher/students")}
                className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                View Students
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-slate-50/50 p-3 rounded-lg border border-border/50">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <span>
            Click on any cell to inspect the specific students mapped to that cognitive hypothesis. Use this view to plan targeted small-group pedagogical interventions.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
