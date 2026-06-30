import React, { useEffect, useState } from "react";

type Task = { id: string; title: string; updatedAt: number };

export function TaskTicker({ apiBase }: { apiBase: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Bug A Fix: Use functional state update to prevent stale closures on 'tick'.
  useEffect(() => {
    const id = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Bug B Fix: 
  // 1. Guard against null selectedId.
  // 2. Include apiBase in dependency array.
  // 3. Prevent duplicate task insertion.
  // 4. Implement state active flag to prevent out-of-order race conditions.
  useEffect(() => {
    if (!selectedId) return;

    let active = true;

    fetch(`${apiBase}/api/tasks/${selectedId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Network error");
        return r.json();
      })
      .then((t) => {
        if (!active) return;
        setTasks((prev) => {
          // If task already exists, update it; otherwise append it safely
          const exists = prev.some((x) => x.id === t.id);
          if (exists) {
            return prev.map((x) => (x.id === t.id ? t : x));
          }
          // Safely return a new array (no push mutations)
          return [...prev, t];
        });
      })
      .catch((err) => {
        console.error("Failed to fetch task ticker details:", err);
      });

    return () => {
      active = false;
    };
  }, [selectedId, apiBase]);

  // Bug C Fix: Create a shallow copy [...tasks] before calling sorting to prevent in-place state mutation in render loop.
  const sorted = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <ul className="space-y-2 p-4 bg-slate-950 border border-slate-900 rounded-xl max-w-sm">
      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
        Ticker Updates (Clock tick: {tick}s)
      </div>
      {sorted.map((t) => (
        <li
          key={t.id}
          onClick={() => setSelectedId(t.id)}
          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
            selectedId === t.id
              ? "bg-cyan-950/20 border-cyan-800/40 text-cyan-400"
              : "bg-slate-900 border-slate-850 text-slate-300 hover:text-slate-100"
          }`}
        >
          <div className="font-semibold">{t.title}</div>
          <div className="text-[10px] text-slate-550 mt-0.5">
            updated {Math.max(0, Math.floor((Date.now() - t.updatedAt) / 1000))}s ago
          </div>
        </li>
      ))}
      {tasks.length === 0 && (
        <div className="text-xs text-slate-500 py-4 text-center">
          No items ticked. Click elements to stream.
        </div>
      )}
    </ul>
  );
}
