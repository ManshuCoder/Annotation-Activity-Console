import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store";
import {
  taskUpdatedFromWs,
  taskAssignedFromWs,
  annotationCreatedFromWs,
  addNewTask,
} from "../store/tasksSlice";
import { normalizeStatus, normalizeAssignee, normalizeTask } from "../utils/normalize";
import { useLazyGetTaskByIdQuery } from "../store/apiSlice";
import { TaskStatus } from "../types";

interface WsMessage {
  kind: "task.updated" | "task.assigned" | "annotation.created";
  payload: any;
}

export function useTaskFeed(url = "ws://localhost:4000/ws") {
  const dispatch = useDispatch<AppDispatch>();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [triggerGetTask] = useLazyGetTaskByIdQuery();

  // Read pagination context from store to handle out-of-bounds events
  const currentPage = useSelector((state: RootState) => state.tasks.currentPage);
  const pageSize = useSelector((state: RootState) => state.tasks.pageSize);
  const taskEntities = useSelector((state: RootState) => state.tasks.entities);

  // A ref to keep latest pagination variables accessible in websocket callbacks
  const paginationRef = useRef({ currentPage, pageSize, taskEntities });
  useEffect(() => {
    paginationRef.current = { currentPage, pageSize, taskEntities };
  }, [currentPage, pageSize, taskEntities]);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isMounted = true;

    function connect() {
      if (wsRef.current) {
        wsRef.current.close();
      }

      console.log(`[WS] Connecting to ${url}...`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        console.log("[WS] Connected successfully.");
        setIsConnected(true);
      };

      ws.onmessage = async (event) => {
        if (!isMounted) return;
        try {
          const data: WsMessage = JSON.parse(event.data);
          const { kind, payload } = data;

          if (!payload) return;

          // Determine the target task ID
          const taskId = payload.id || payload.taskId;
          if (!taskId) return;

          const { currentPage: currPage, pageSize: pSize, taskEntities: entities } = paginationRef.current;
          const exists = !!entities[taskId];

          // Determine if we should process or fetch this task based on pagination context
          // Mock server task IDs look like "t1", "t2", ... "t137"
          const taskIdMatch = String(taskId).match(/^t(\d+)$/);
          const taskNum = taskIdMatch ? parseInt(taskIdMatch[1], 10) : null;

          let isWithinPage = false;
          if (taskNum !== null) {
            const startRange = (currPage - 1) * pSize + 1;
            const endRange = currPage * pSize;
            isWithinPage = taskNum >= startRange && taskNum <= endRange;
          }

          if (!exists) {
            if (isWithinPage) {
              // Task is on current page but not loaded in Redux yet (e.g. network latency delay), let's fetch it
              console.log(`[WS] Target task ${taskId} is within current page range but missing in store. Fetching...`);
              try {
                const fetched = await triggerGetTask(taskId).unwrap();
                dispatch(addNewTask(fetched));
              } catch (err) {
                console.error(`[WS] Failed to fetch missing task ${taskId}:`, err);
              }
            } else {
              // Task is outside current page boundary - ignore to save resources
              console.log(`[WS] Ignored event for task ${taskId} (outside page range: page=${currPage}, size=${pSize})`);
              return;
            }
          }

          // Task exists in store (or was just fetched), proceed with dispatching granular actions
          switch (kind) {
            case "task.updated": {
              const status = normalizeStatus(payload.status);
              const updatedAt = typeof payload.updatedAt === "number" ? payload.updatedAt : Date.now();
              dispatch(taskUpdatedFromWs({ id: taskId, status, updatedAt }));
              break;
            }
            case "task.assigned": {
              const assignee = normalizeAssignee(payload.assignee);
              dispatch(taskAssignedFromWs({ id: taskId, assignee }));
              break;
            }
            case "annotation.created": {
              const updatedAt = typeof payload.at === "number" ? payload.at : Date.now();
              dispatch(annotationCreatedFromWs({ taskId, updatedAt }));
              break;
            }
            default:
              console.warn("[WS] Unrecognized socket message kind:", kind);
          }
        } catch (err) {
          console.error("[WS] Error parsing WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        console.log("[WS] Disconnected. Reconnecting in 3s...");
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        if (!isMounted) return;
        console.warn("[WS] Error occurred:", error);
        ws.close();
      };
    }

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, dispatch, triggerGetTask]);

  return { isConnected };
}
