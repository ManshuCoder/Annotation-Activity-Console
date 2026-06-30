import { createSlice, createEntityAdapter, PayloadAction } from "@reduxjs/toolkit";
import { Task, Assignee, TaskStatus } from "../types";

// Create entity adapter for tasks, ordered by updatedAt descending by default
export const tasksAdapter = createEntityAdapter<Task>({
  sortComparer: (a, b) => b.updatedAt - a.updatedAt,
});

export interface TasksState {
  ids: string[];
  entities: Record<string, Task>;
  isStale: boolean;
  isLoadingFromCache: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  error: string | null;
}

const initialState: TasksState = tasksAdapter.getInitialState({
  isStale: false,
  isLoadingFromCache: true,
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,
  error: null,
});

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    // Loaded initial list (either from IndexedDB or API revalidation)
    setTasksLoaded(
      state,
      action: PayloadAction<{ items: Task[]; total: number; page: number }>
    ) {
      tasksAdapter.setAll(state, action.payload.items);
      state.totalCount = action.payload.total;
      state.currentPage = action.payload.page;
      state.isLoadingFromCache = false;
      state.isStale = false;
      state.error = null;
    },

    // Websocket: general task updates (status, updatedAt)
    taskUpdatedFromWs(
      state,
      action: PayloadAction<{ id: string; status: TaskStatus; updatedAt: number }>
    ) {
      const { id, status, updatedAt } = action.payload;
      const existing = state.entities[id];
      if (existing) {
        tasksAdapter.updateOne(state, {
          id,
          changes: { status, updatedAt },
        });
      }
    },

    // Websocket: assignee updates
    taskAssignedFromWs(
      state,
      action: PayloadAction<{ id: string; assignee: Assignee | null }>
    ) {
      const { id, assignee } = action.payload;
      const existing = state.entities[id];
      if (existing) {
        tasksAdapter.updateOne(state, {
          id,
          changes: { assignee },
        });
      }
    },

    // Websocket: annotation created (increments count and updates updatedAt)
    annotationCreatedFromWs(
      state,
      action: PayloadAction<{ taskId: string; updatedAt: number }>
    ) {
      const { taskId, updatedAt } = action.payload;
      const existing = state.entities[taskId];
      if (existing) {
        tasksAdapter.updateOne(state, {
          id: taskId,
          changes: {
            annotationCount: existing.annotationCount + 1,
            updatedAt,
          },
        });
      }
    },

    // Handle WebSocket sync for a task we haven't loaded yet
    addNewTask(state, action: PayloadAction<Task>) {
      tasksAdapter.addOne(state, action.payload);
      state.totalCount += 1;
    },

    setStale(state, action: PayloadAction<boolean>) {
      state.isStale = action.payload;
    },

    setLoadingFromCache(state, action: PayloadAction<boolean>) {
      state.isLoadingFromCache = action.payload;
    },

    setCurrentPage(state, action: PayloadAction<number>) {
      state.currentPage = action.payload;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoadingFromCache = false;
    },

    // Optimistic UI updates
    optimisticAssign(state, action: PayloadAction<{ id: string; assignee: Assignee }>) {
      const { id, assignee } = action.payload;
      const existing = state.entities[id];
      if (existing) {
        tasksAdapter.updateOne(state, {
          id,
          changes: { assignee },
        });
      }
    },

    // Rollback optimism on error
    rollbackAssign(state, action: PayloadAction<{ id: string; originalAssignee: Assignee | null }>) {
      const { id, originalAssignee } = action.payload;
      const existing = state.entities[id];
      if (existing) {
        tasksAdapter.updateOne(state, {
          id,
          changes: { assignee: originalAssignee },
        });
      }
    },
  },
});

export const {
  setTasksLoaded,
  taskUpdatedFromWs,
  taskAssignedFromWs,
  annotationCreatedFromWs,
  addNewTask,
  setStale,
  setLoadingFromCache,
  setCurrentPage,
  setError,
  optimisticAssign,
  rollbackAssign,
} = tasksSlice.actions;

export default tasksSlice.reducer;
