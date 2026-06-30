import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import tasksReducer from "../src/store/tasksSlice";
import uiReducer from "../src/store/uiSlice";
import { apiSlice } from "../src/store/apiSlice";
import { TaskList } from "../src/components/TaskList";
import { TaskStatus, Task } from "../src/types";

// Mock TanStack Virtualizer to render all items synchronously in JSDOM tests
jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 92,
        size: 92,
        key: index,
      })),
    getTotalSize: () => count * 92,
  }),
}));

describe("TaskList Component Interaction", () => {
  const mockTasks: Task[] = [
    {
      id: "t1",
      title: "Audio Accent Verification",
      type: "audio",
      status: TaskStatus.IN_PROGRESS,
      assignee: null,
      annotationCount: 10,
      updatedAt: 1719600000000,
      meta: {},
    },
    {
      id: "t2",
      title: "Image Border Labeling",
      type: "image",
      status: TaskStatus.TODO,
      assignee: null,
      annotationCount: 5,
      updatedAt: 1719600037000,
      meta: {},
    },
    {
      id: "t3",
      title: "Text Grammar Parsing",
      type: "text",
      status: TaskStatus.DONE,
      assignee: null,
      annotationCount: 20,
      updatedAt: 1719600074000,
      meta: {},
    },
  ];

  // Helper to create a store pre-populated with mock tasks
  const createMockStore = () => {
    return configureStore({
      reducer: {
        tasks: tasksReducer,
        ui: uiReducer,
        [apiSlice.reducerPath]: apiSlice.reducer,
      },
      preloadedState: {
        tasks: {
          ids: ["t1", "t2", "t3"],
          entities: {
            t1: mockTasks[0],
            t2: mockTasks[1],
            t3: mockTasks[2],
          },
          isStale: false,
          isLoadingFromCache: false,
          totalCount: 3,
          currentPage: 1,
          pageSize: 20,
          error: null,
        },
        ui: {
          filterType: "all",
          filterStatus: "all",
          searchQuery: "",
          sortBy: "updatedAt",
          sortOrder: "desc",
          selectedTaskId: null,
        },
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }).concat(
          apiSlice.middleware
        ),
    });
  };

  it("should render initial tasks list correctly", () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <TaskList isWsConnected={true} isApiLoading={false} isApiError={false} />
      </Provider>
    );

    // Verify all mock tasks render titles
    expect(screen.getByText("Audio Accent Verification")).toBeInTheDocument();
    expect(screen.getByText("Image Border Labeling")).toBeInTheDocument();
    expect(screen.getByText("Text Grammar Parsing")).toBeInTheDocument();
  });

  it("should update displayed rows when changing task type filter", () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <TaskList isWsConnected={true} isApiLoading={false} isApiError={false} />
      </Provider>
    );

    // Verify initial count is 3
    expect(screen.getByText("Audio Accent Verification")).toBeInTheDocument();
    expect(screen.getByText("Image Border Labeling")).toBeInTheDocument();
    expect(screen.getByText("Text Grammar Parsing")).toBeInTheDocument();

    // Select the task type filter dropdown
    const typeSelect = screen.getByLabelText("Filter by task type");
    
    // Change type filter option to "Audio"
    fireEvent.change(typeSelect, { target: { value: "audio" } });

    // Assert that only the audio task is displayed, others are removed
    expect(screen.getByText("Audio Accent Verification")).toBeInTheDocument();
    expect(screen.queryByText("Image Border Labeling")).not.toBeInTheDocument();
    expect(screen.queryByText("Text Grammar Parsing")).not.toBeInTheDocument();
  });

  it("should update displayed rows when changing task status filter", () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <TaskList isWsConnected={true} isApiLoading={false} isApiError={false} />
      </Provider>
    );

    // Select the status filter dropdown
    const statusSelect = screen.getByLabelText("Filter by task status");
    
    // Change status filter option to "Completed"
    fireEvent.change(statusSelect, { target: { value: "done" } });

    // Assert that only the Completed task (Text Grammar Parsing, status: done) is displayed
    expect(screen.getByText("Text Grammar Parsing")).toBeInTheDocument();
    expect(screen.queryByText("Audio Accent Verification")).not.toBeInTheDocument();
    expect(screen.queryByText("Image Border Labeling")).not.toBeInTheDocument();
  });
});
