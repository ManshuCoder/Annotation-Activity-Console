import React from "react";
import { TaskStatus } from "../../types";

export function StatusBadge({ status }: { status: TaskStatus }) {
  const styles: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: "bg-blue-950/50 text-blue-400 border-blue-900/40",
    [TaskStatus.IN_PROGRESS]: "bg-amber-950/50 text-amber-400 border-amber-900/40",
    [TaskStatus.QA]: "bg-purple-950/50 text-purple-400 border-purple-900/40",
    [TaskStatus.DONE]: "bg-emerald-950/50 text-emerald-400 border-emerald-900/40",
    [TaskStatus.BLOCKED]: "bg-rose-950/50 text-rose-400 border-rose-900/40",
    [TaskStatus.UNKNOWN]: "bg-slate-900/50 text-slate-400 border-slate-850",
  };

  const labels: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: "To Do",
    [TaskStatus.IN_PROGRESS]: "In Progress",
    [TaskStatus.QA]: "QA Review",
    [TaskStatus.DONE]: "Completed",
    [TaskStatus.BLOCKED]: "Blocked",
    [TaskStatus.UNKNOWN]: "Unknown",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm tracking-wide ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function TypeBadge({ type }: { type: "image" | "audio" | "text" | "unknown" }) {
  const styles = {
    image: "bg-cyan-950/50 text-cyan-400 border-cyan-900/40",
    audio: "bg-indigo-950/50 text-indigo-400 border-indigo-900/40",
    text: "bg-pink-950/50 text-pink-400 border-pink-900/40",
    unknown: "bg-slate-900/50 text-slate-400 border-slate-850",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm tracking-wide ${styles[type]}`}
    >
      {type.toUpperCase()}
    </span>
  );
}
