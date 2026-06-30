import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { normalizeTask } from "../utils/normalize";
import { Task, Assignee } from "../types";
import { setTasksLoaded, setError } from "./tasksSlice";
import localforage from "localforage";

// Initialize localforage for IndexedDB caching
localforage.config({
  name: "annotation_console",
  storeName: "tasks_cache",
});

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:4000" }),
  endpoints: (builder) => ({
    // Fetch a paginated list of tasks
    getTasks: builder.query<
      { page: number; pageSize: number; total: number; items: Task[] },
      { page: number; pageSize: number }
    >({
      query: ({ page, pageSize }) => `/api/tasks?page=${page}&pageSize=${pageSize}`,
      async onQueryStarted({ page, pageSize }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          
          // Normalize messy raw data defensively
          const normalizedItems = data.items.map((item) => normalizeTask(item));
          const result = {
            page: data.page,
            pageSize: data.pageSize,
            total: data.total,
            items: normalizedItems,
          };

          // Store normalized tasks in the Redux store
          dispatch(setTasksLoaded(result));

          // Cache page data in IndexedDB (non-blocking write)
          localforage.setItem(`tasks_page_${page}`, result).catch((err) => {
            console.error("Failed to write tasks page cache to IndexedDB:", err);
          });
        } catch (err: any) {
          console.error("Error in getTasks query lifecycle:", err);
          dispatch(setError(err?.error?.message || "Failed to load tasks"));
        }
      },
    }),

    // Fetch a single task by ID (for websocket updates where the task is not yet loaded)
    getTaskById: builder.query<Task, string>({
      query: (id) => `/api/tasks/${id}`,
      transformResponse: (response: unknown) => normalizeTask(response),
    }),

    // Simulated task assignment mutation
    // Since mock server has no assign handler, we use a custom queryFn
    // that delays 800ms and fails ~20% of the time to test client rollback.
    assignTask: builder.mutation<Task, { id: string; assignee: Assignee | null }>({
      async queryFn({ id, assignee }) {
        // Simulate network latency
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Fail 20% of the time to demonstrate rollback logic
        const shouldFail = Math.random() < 0.2;
        if (shouldFail) {
          return {
            error: {
              status: 500,
              statusText: "Internal Server Error",
              data: { message: "Database update timed out. Assignment rolled back." },
            },
          };
        }

        // Return a mock normalized Task
        const mockTask: Task = {
          id,
          title: `Task ${id.replace("t", "")}`,
          type: "unknown",
          status: "in_progress" as any,
          assignee,
          annotationCount: 0,
          updatedAt: Date.now(),
          meta: {},
        };

        return { data: mockTask };
      },
    }),
  }),
});

export const { useGetTasksQuery, useLazyGetTaskByIdQuery, useAssignTaskMutation } = apiSlice;
