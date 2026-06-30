import { useEffect, useState, useRef } from "react";
import localforage from "localforage";

// Initialize localforage store for summaries
const summaryCache = localforage.createInstance({
  name: "annotation_console",
  storeName: "task_summaries",
});

export interface UseAiSummaryResult {
  summary: string;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
}

export function useAiSummary(taskId: string | null): UseAiSummaryResult {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const summaryAccumulatorRef = useRef<string>("");

  useEffect(() => {
    if (!taskId) {
      setSummary("");
      setIsLoading(false);
      setIsStreaming(false);
      setError(null);
      return;
    }

    let isCancelled = false;
    summaryAccumulatorRef.current = "";

    // Step 1: Check cache in IndexedDB
    setIsLoading(true);
    setError(null);
    setSummary("");

    summaryCache
      .getItem<string>(`summary_${taskId}`)
      .then((cached) => {
        if (isCancelled) return;

        if (cached) {
          console.log(`[SSE] Loaded summary for ${taskId} from IndexedDB cache`);
          setSummary(cached);
          setIsLoading(false);
          setIsStreaming(false);
        } else {
          // Step 2: Connect to SSE stream
          console.log(`[SSE] Summary not cached. Subscribing to stream for task ${taskId}...`);
          setIsStreaming(true);
          setIsLoading(false);

          const url = `http://localhost:4000/api/tasks/${taskId}/summary`;
          const es = new EventSource(url);
          eventSourceRef.current = es;

          es.onmessage = (event) => {
            if (isCancelled) return;
            try {
              const chunk = JSON.parse(event.data);
              if (typeof chunk === "string") {
                summaryAccumulatorRef.current += chunk;
                setSummary(summaryAccumulatorRef.current);
              }
            } catch (err) {
              console.error("[SSE] Failed to parse message chunk:", err);
            }
          };

          // Listen for the custom "done" event emitted by the mock server
          es.addEventListener("done", () => {
            if (isCancelled) return;
            console.log(`[SSE] Stream complete for ${taskId}. Caching summary...`);
            setIsStreaming(false);
            
            const finalSummary = summaryAccumulatorRef.current;
            summaryCache.setItem(`summary_${taskId}`, finalSummary).catch((err) => {
              console.error("[SSE] Failed to write summary to IndexedDB cache:", err);
            });

            es.close();
          });

          es.onerror = (err) => {
            if (isCancelled) return;
            console.error("[SSE] Stream error:", err);
            setError("Failed to stream AI summary from server.");
            setIsStreaming(false);
            es.close();
          };
        }
      })
      .catch((err) => {
        console.error("[SSE] Failed to query IndexedDB summary cache:", err);
        setIsLoading(false);
        setError("Error loading cached summary.");
      });

    // Cleanup function: Closes the stream if the task changes or hook unmounts
    return () => {
      isCancelled = true;
      if (eventSourceRef.current) {
        console.log(`[SSE] Closing stream subscription for ${taskId} due to component update`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [taskId]);

  return { summary, isLoading, isStreaming, error };
}
