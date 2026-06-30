import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { RootState } from "../store";
import { selectSelectedTask } from "../store/selectors";
import { setSelectedTaskId } from "../store/uiSlice";
import { optimisticAssign, rollbackAssign } from "../store/tasksSlice";
import { useAssignTaskMutation } from "../store/apiSlice";
import { StatusBadge, TypeBadge } from "./UI/Badge";
import { AiSummaryRenderer } from "./AiSummaryRenderer";
import { useAiSummary } from "../hooks/useAiSummary";
import { DetailPanelSkeleton } from "./UI/Skeleton";
import { 
  X, 
  User, 
  Calendar, 
  Layers, 
  Activity, 
  Tag, 
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";

// Mock current logged-in user context
const CURRENT_USER = { id: "u2", name: "Ben" };

export function DetailPanel() {
  const dispatch = useDispatch();
  const task = useSelector(selectSelectedTask);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // SSE Summary Streaming Hook
  const { summary, isLoading: isSummaryLoading, isStreaming, error: summaryError } = useAiSummary(
    task ? task.id : null
  );

  // RTK Query Mutation for Assignment
  const [triggerAssign, { isLoading: isAssignMutating }] = useAssignTaskMutation();

  const handleClose = () => {
    dispatch(setSelectedTaskId(null));
  };

  const handleAssignToMe = async () => {
    if (!task) return;
    
    // Save original assignee for rollback in case of error
    const originalAssignee = task.assignee;

    // Step 1: Dispatch Optimistic Update Action
    dispatch(optimisticAssign({ id: task.id, assignee: CURRENT_USER }));
    showToast("Assigning task to you...", "success");

    try {
      // Step 2: Trigger RTK Query Request
      await triggerAssign({ id: task.id, assignee: CURRENT_USER }).unwrap();
      showToast("Successfully assigned task to you!", "success");
    } catch (err: any) {
      // Step 3: Rollback on failure
      console.error("[Mutation] Assignment failed. Rolling back...", err);
      dispatch(rollbackAssign({ id: task.id, originalAssignee }));
      
      const errorMsg = err?.data?.message || "Server error: Assignment failed.";
      showToast(errorMsg, "error");
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Check if task is already assigned to currently logged in user
  const isAssignedToMe = task?.assignee?.id === CURRENT_USER.id;

  return (
    <div className="h-full relative overflow-hidden">
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`absolute top-4 left-4 right-4 z-50 p-3 rounded-lg border shadow-lg flex items-center space-x-2.5 backdrop-blur ${
              toast.type === "error"
                ? "bg-rose-950/80 border-rose-900/60 text-rose-200"
                : "bg-cyan-950/80 border-cyan-900/60 text-cyan-200"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="h-4.5 w-4.5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle className="h-4.5 w-4.5 text-cyan-400 shrink-0 animate-bounce" />
            )}
            <span className="text-xs md:text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!task ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500 font-sans"
          >
            <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-full mb-4">
              <Layers className="h-8 w-8 text-slate-650" />
            </div>
            <h3 className="text-sm font-semibold text-slate-400 mb-1">No Task Selected</h3>
            <p className="text-xs text-slate-555 max-w-xs leading-relaxed">
              Choose a task from the activity console to inspect metadata, stream the AI summary, and manage assignments.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={task.id}
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="h-full bg-slate-950/15 flex flex-col overflow-hidden font-sans border-l border-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-950/30 border-b border-slate-900 shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="text-xs font-mono text-cyan-500 bg-cyan-950/30 border border-cyan-900/40 px-2 py-0.5 rounded shrink-0">
                  {task.id}
                </span>
                <h3 className="text-base font-bold text-slate-200 truncate pr-4">
                  {task.title}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition-colors shrink-0"
                aria-label="Close panel"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable details view */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status and Type badge row */}
              <div className="flex flex-wrap gap-2.5 items-center">
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Status</span>
                  <StatusBadge status={task.status} />
                </div>
                <div className="h-8 w-px bg-slate-850 mx-1.5 self-end" />
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Task Type</span>
                  <TypeBadge type={task.type} />
                </div>
              </div>

              <div className="h-px bg-slate-900" />

              {/* Grid Metadata Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Assignee Box */}
                <div className="p-3 bg-slate-900/20 border border-slate-900 rounded-xl flex items-center space-x-3">
                  <div className="p-2 bg-slate-950/40 border border-slate-850 text-slate-400 rounded-lg shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-wider">Assignee</span>
                    <span className="text-sm font-semibold text-slate-350 truncate block">
                      {task.assignee ? task.assignee.name : "Unassigned"}
                    </span>
                  </div>
                </div>

                {/* Annotation Count Box */}
                <div className="p-3 bg-slate-900/20 border border-slate-900 rounded-xl flex items-center space-x-3">
                  <div className="p-2 bg-slate-950/40 border border-slate-850 text-slate-400 rounded-lg shrink-0">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-wider">Annotations</span>
                    <span className="text-sm font-semibold text-slate-350 block font-mono">
                      {task.annotationCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date Card */}
              <div className="p-3.5 bg-slate-900/25 border border-slate-900 rounded-xl flex items-center space-x-3 text-xs text-slate-450">
                <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                <span>
                  Last modified:{" "}
                  <strong className="text-slate-300 font-medium">
                    {new Date(task.updatedAt).toLocaleString()}
                  </strong>
                </span>
              </div>

              {/* Custom Meta Properties */}
              {Object.keys(task.meta).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                    <Tag className="h-3 w-3" />
                    <span>Free-form Metadata</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl">
                    {Object.entries(task.meta).map(([key, val]) => (
                      <span
                        key={key}
                        className="inline-flex items-center px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono"
                      >
                        <span className="text-slate-500 mr-1">{key}:</span>
                        <span className="font-semibold text-cyan-400">{String(val)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Optimistic UI Actions */}
              <div className="pt-2">
                <button
                  onClick={handleAssignToMe}
                  disabled={isAssignedToMe || isAssignMutating}
                  className={`w-full py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all flex items-center justify-center space-x-2 focus:ring-1 focus:ring-cyan-500/20 outline-none ${
                    isAssignedToMe
                      ? "bg-slate-900/30 border-slate-850 text-slate-500 cursor-not-allowed"
                      : "bg-cyan-950/30 hover:bg-cyan-950/50 border-cyan-800/40 hover:border-cyan-700/60 text-cyan-400 hover:text-cyan-300 active:scale-[0.98]"
                  }`}
                >
                  {isAssignMutating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Syncing Assignment...</span>
                    </>
                  ) : isAssignedToMe ? (
                    <span>Assigned to You</span>
                  ) : (
                    <span>Assign Task to Me</span>
                  )}
                </button>
              </div>

              <div className="h-px bg-slate-900" />

              {/* Streaming AI Summary Block */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300">AI Context Analysis</h4>
                
                {isSummaryLoading ? (
                  <DetailPanelSkeleton />
                ) : summaryError ? (
                  <div className="p-4 bg-rose-950/20 border border-rose-900/30 text-rose-350 rounded-xl flex items-start space-x-2 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{summaryError}</span>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/50 border border-slate-900/80 rounded-xl shadow-inner min-h-[160px]">
                    <AiSummaryRenderer markdown={summary} isStreaming={isStreaming} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
