import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectTasksPerStatus } from "../store/selectors";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// HSL aligned HEX status colors mapping to badge indicators
const STATUS_COLORS: Record<string, string> = {
  "To Do": "#2563eb",       // Blue
  "In Progress": "#d97706", // Amber
  "QA Review": "#7c3aed",   // Purple
  "Completed": "#059669",   // Emerald
  "Blocked": "#e11d48",     // Rose
  "Unknown": "#4b5563",     // Slate
};

export function TasksChart() {
  const [isMounted, setIsMounted] = useState(false);
  const data = useSelector(selectTasksPerStatus);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-44 w-full flex items-center justify-center text-xs text-slate-500 font-sans">
        Loading dashboard analytics...
      </div>
    );
  }

  // Filter out status slots with 0 count to keep chart clean and high-fidelity
  const activeData = data.filter((d) => d.count > 0);

  if (activeData.length === 0) {
    return (
      <div className="h-44 w-full flex items-center justify-center text-xs text-slate-500 border border-slate-900 rounded-xl bg-slate-950/20 font-sans">
        No task statistics to display.
      </div>
    );
  }

  return (
    <div className="bg-slate-950/25 border border-slate-900/80 rounded-xl p-4 flex flex-col space-y-2 h-full font-sans">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 select-none">
        Workload by Status
      </h4>
      <div className="flex-1 min-h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={activeData}
            margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
          >
            <XAxis
              dataKey="statusName"
              stroke="#475569"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#94a3b8" }}
            />
            <YAxis
              stroke="#475569"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fill: "#94a3b8" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                borderColor: "#1e293b",
                borderRadius: "10px",
                color: "#f8fafc",
                fontSize: "11px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
              }}
              labelStyle={{ color: "#64748b", fontWeight: "bold", marginBottom: "4px" }}
              itemStyle={{ color: "#38bdf8", padding: "0" }}
              cursor={{ fill: "rgba(30, 41, 59, 0.2)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {activeData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.statusName] || "#4b5563"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
