import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "./index";
import { tasksAdapter } from "./tasksSlice";

// Root-level selectors for slicing state
const selectTasksState = (state: RootState) => state.tasks;
const selectUiState = (state: RootState) => state.ui;

// Get adapter selectors to fetch normalized records
const adapterSelectors = tasksAdapter.getSelectors(selectTasksState);

export const selectAllTasks = adapterSelectors.selectAll;
export const selectTaskEntities = adapterSelectors.selectEntities;
export const selectTaskById = adapterSelectors.selectById;

// UI Filter Selectors
export const selectFilterType = createSelector(selectUiState, (ui) => ui.filterType);
export const selectFilterStatus = createSelector(selectUiState, (ui) => ui.filterStatus);
export const selectSearchQuery = createSelector(selectUiState, (ui) => ui.searchQuery);
export const selectSortBy = createSelector(selectUiState, (ui) => ui.sortBy);
export const selectSortOrder = createSelector(selectUiState, (ui) => ui.sortOrder);
export const selectSelectedTaskId = createSelector(selectUiState, (ui) => ui.selectedTaskId);

// Select currently highlighted task object
export const selectSelectedTask = createSelector(
  [selectTaskEntities, selectSelectedTaskId],
  (entities, selectedId) => (selectedId ? entities[selectedId] || null : null)
);

// Memoized filter, search, and sort selector
export const selectFilteredAndSortedTasks = createSelector(
  [
    selectAllTasks,
    selectFilterType,
    selectFilterStatus,
    selectSearchQuery,
    selectSortBy,
    selectSortOrder,
  ],
  (tasks, filterType, filterStatus, searchQuery, sortBy, sortOrder) => {
    let result = [...tasks];

    // 1. Filter by Task Type
    if (filterType && filterType !== "all") {
      result = result.filter((t) => t.type === filterType);
    }

    // 2. Filter by Task Status
    if (filterStatus && filterStatus !== "all") {
      result = result.filter((t) => t.status === filterStatus);
    }

    // 3. Filter by Search (Case-insensitive matching of Title, ID, or Assignee Name)
    if (searchQuery) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.id.toLowerCase().includes(query) ||
          (t.assignee && t.assignee.name.toLowerCase().includes(query))
      );
    }

    // 4. Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "annotationCount") {
        comparison = a.annotationCount - b.annotationCount;
      } else {
        // Fallback or explicit updatedAt
        comparison = a.updatedAt - b.updatedAt;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }
);

// Derived Metric Selector: Counts tasks by status for Recharts usage
export const selectTasksPerStatus = createSelector(
  [selectAllTasks],
  (tasks) => {
    const counts: Record<string, number> = {
      todo: 0,
      in_progress: 0,
      qa: 0,
      done: 0,
      blocked: 0,
      unknown: 0,
    };

    tasks.forEach((t) => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      } else {
        counts.unknown++;
      }
    });

    const statusLabels: Record<string, string> = {
      todo: "To Do",
      in_progress: "In Progress",
      qa: "QA Review",
      done: "Completed",
      blocked: "Blocked",
      unknown: "Unknown",
    };

    return Object.entries(counts).map(([status, count]) => ({
      statusName: statusLabels[status] || "Unknown",
      count,
    }));
  }
);
