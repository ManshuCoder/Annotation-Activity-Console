import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UiState {
  filterType: string;
  filterStatus: string;
  searchQuery: string;
  sortBy: "updatedAt" | "annotationCount";
  sortOrder: "asc" | "desc";
  selectedTaskId: string | null;
}

const initialState: UiState = {
  filterType: "all",
  filterStatus: "all",
  searchQuery: "",
  sortBy: "updatedAt",
  sortOrder: "desc",
  selectedTaskId: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setFilterType(state, action: PayloadAction<string>) {
      state.filterType = action.payload;
    },
    setFilterStatus(state, action: PayloadAction<string>) {
      state.filterStatus = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setSortBy(state, action: PayloadAction<"updatedAt" | "annotationCount">) {
      state.sortBy = action.payload;
    },
    setSortOrder(state, action: PayloadAction<"asc" | "desc">) {
      state.sortOrder = action.payload;
    },
    setSelectedTaskId(state, action: PayloadAction<string | null>) {
      state.selectedTaskId = action.payload;
    },
    resetFilters(state) {
      state.filterType = "all";
      state.filterStatus = "all";
      state.searchQuery = "";
    },
  },
});

export const {
  setFilterType,
  setFilterStatus,
  setSearchQuery,
  setSortBy,
  setSortOrder,
  setSelectedTaskId,
  resetFilters,
} = uiSlice.actions;

export default uiSlice.reducer;
