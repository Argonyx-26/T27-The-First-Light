import React from "react";
import { CalibrationTrendPoint } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, Target } from "lucide-react";

interface CalibrationTrendChartProps {
  points: CalibrationTrendPoint[];
}

export const CalibrationTrendChart: React.FC<CalibrationTrendChartProps> = ({ points }) => {
  const chartData = points.map((p) => ({
    label: p.date || p.label,
    calibration: Math.round(p.calibration_index * 100),
    accuracy: Math.round(p.accuracy * 100),
    topic: p.topic,
  }));

  const latestPoint = points[points.length - 1];
  const isImproving =
    points.length >= 2 &&
    points[points.length - 1].calibration_index >= points[0].calibration_index;

  return (
    <Card className="border border-border/80 shadow-subtle bg-white overflow-hidden">
      <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 bg-slate-50/50">
        <div>
          <div className="flex items-center space-x-1.5 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-0.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Metacognitive Trajectory</span>
          </div>
          <CardTitle className="text-base font-bold text-slate-900">
            Calibration Trend Over Time
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Tracking alignment between subjective conviction and objective correctness across sessions.
          </CardDescription>
        </div>

        {latestPoint && (
          <div className="flex items-center space-x-2">
            <Badge
              variant={isImproving ? "resolved" : "developing"}
              className="text-xs px-2.5 py-1 font-semibold"
            >
              {isImproving ? "Calibration Improving ↗" : "Stable Alignment ◐"}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {points.length < 2 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Target className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Calibration Baseline Established</h4>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Complete more diagnostic or revision sessions to render your longitudinal calibration trajectory.
            </p>
          </div>
        ) : (
          <div className="w-full h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value}%`,
                    name === "calibration" ? "Calibration Index" : "Actual Accuracy",
                  ]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(value) =>
                    value === "calibration" ? "Calibration Index" : "Accuracy Rate"
                  }
                />
                <Line
                  type="monotone"
                  dataKey="calibration"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 1.5, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: "#6366f1", strokeWidth: 1, stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
