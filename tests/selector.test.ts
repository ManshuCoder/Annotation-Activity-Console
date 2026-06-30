import { selectFilteredAndSortedTasks, selectTasksPerStatus } from "../src/store/selectors";
import { RootState } from "../src/store";
import { TaskStatus, Task } from "../src/types";

describe("Redux Selectors", () => {
  const mockTasks: Task[] = [
    {
      id: "t1",
      title: "Audio Check",
      type: "audio",
      status: TaskStatus.IN_PROGRESS,
      assignee: { id: "u2", name: "Ben" },
      annotationCount: 15,
      updatedAt: 1000,
      meta: {},
    },
    {
      id: "t2",
      title: "Image Classification",
      type: "image",
      status: TaskStatus.DONE,
      assignee: null,
      annotationCount: 5,
      updatedAt: 3000,
      meta: {},
    },
    {
      id: "t3",
      title: "Text Parsing",
      type: "text",
      status: TaskStatus.IN_PROGRESS,
      assignee: { id: "u1", name: "Asha" },
      annotationCount: 20,
      updatedAt: 2000,
      meta: {},
    },
  ];

  const createMockState = (uiOverride = {}): RootState => ({
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
      ...uiOverride,
    },
    api: {} as any, // Ignored in these selectors
  });

  describe("selectFilteredAndSortedTasks", () => {
    it("should return all tasks sorted by updatedAt descending by default", () => {
      const state = createMockState();
      const result = selectFilteredAndSortedTasks(state);
      expect(result.map((t) => t.id)).toEqual(["t2", "t3", "t1"]); // 3000, 2000, 1000
    });

    it("should filter tasks by type", () => {
      const state = createMockState({ filterType: "audio" });
      const result = selectFilteredAndSortedTasks(state);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("t1");
    });

    it("should filter tasks by status", () => {
      const state = createMockState({ filterStatus: "done" });
      const result = selectFilteredAndSortedTasks(state);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("t2");
    });

    it("should search tasks by title and assignee", () => {
      // Search by title match
      let state = createMockState({ searchQuery: "parsing" });
      let result = selectFilteredAndSortedTasks(state);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("t3");

      // Search by assignee name match
      state = createMockState({ searchQuery: "ben" });
      result = selectFilteredAndSortedTasks(state);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("t1");
    });

    it("should sort tasks by annotationCount ascending", () => {
      const state = createMockState({ sortBy: "annotationCount", sortOrder: "asc" });
      const result = selectFilteredAndSortedTasks(state);
      expect(result.map((t) => t.id)).toEqual(["t2", "t1", "t3"]); // 5, 15, 20
    });
  });

  describe("selectTasksPerStatus", () => {
    it("should correctly aggregate tasks count by status", () => {
      const state = createMockState();
      const counts = selectTasksPerStatus(state);
      
      const inProgressEntry = counts.find((c) => c.statusName === "In Progress");
      const doneEntry = counts.find((c) => c.statusName === "Completed");
      const todoEntry = counts.find((c) => c.statusName === "To Do");

      expect(inProgressEntry?.count).toBe(2);
      expect(doneEntry?.count).toBe(1);
      expect(todoEntry?.count).toBe(0);
    });
  });
});
