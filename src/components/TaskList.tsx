import React, { useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RootState } from "../store";
import {
  selectFilteredAndSortedTasks,
  selectFilterType,
  selectFilterStatus,
  selectSearchQuery,
  selectSortBy,
  selectSortOrder,
  selectSelectedTaskId,
} from "../store/selectors";
import {
  setFilterType,
  setFilterStatus,
  setSearchQuery,
  setSortBy,
  setSortOrder,
  setSelectedTaskId,
  resetFilters,
} from "../store/uiSlice";
import { setCurrentPage } from "../store/tasksSlice";
import { StatusBadge, TypeBadge } from "./UI/Badge";
import { TaskListSkeleton } from "./UI/Skeleton";
import { 
  Search, 
  ArrowUpDown, 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Database,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Task } from "../types";

interface TaskListProps {
  isWsConnected: boolean;
  isApiLoading: boolean;
  isApiError: boolean;
}

export function TaskList({ isWsConnected, isApiLoading, isApiError }: TaskListProps) {
  const dispatch = useDispatch();
  
  // Redux Selectors
  const tasks = useSelector(selectFilteredAndSortedTasks);
  const filterType = useSelector(selectFilterType);
  const filterStatus = useSelector(selectFilterStatus);
  const searchQuery = useSelector(selectSearchQuery);
  const sortBy = useSelector(selectSortBy);
  const sortOrder = useSelector(selectSortOrder);
  const selectedTaskId = useSelector(selectSelectedTaskId);
  
  const currentPage = useSelector((state: RootState) => state.tasks.currentPage);
  const totalCount = useSelector((state: RootState) => state.tasks.totalCount);
  const pageSize = useSelector((state: RootState) => state.tasks.pageSize);
  const isStale = useSelector((state: RootState) => state.tasks.isStale);
  const isLoadingFromCache = useSelector((state: RootState) => state.tasks.isLoadingFromCache);
  const customError = useSelector((state: RootState) => state.tasks.error);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Virtualization ref
  const parentRef = useRef<HTMLDivElement>(null);

  // TanStack Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92, // Approximate height in pixels for each task card
    overscan: 8,
  });

  // Event Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(e.target.value));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setFilterType(e.target.value));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setFilterStatus(e.target.value));
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setSortBy(e.target.value as "updatedAt" | "annotationCount"));
  };

  const toggleSortOrder = () => {
    dispatch(setSortOrder(sortOrder === "asc" ? "desc" : "asc"));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      dispatch(setCurrentPage(newPage));
    }
  };

  const handleSelectTask = (taskId: string) => {
    dispatch(setSelectedTaskId(taskId === selectedTaskId ? null : taskId));
  };

  const handleResetFilters = () => {
    dispatch(resetFilters());
  };

  const showLoader = isLoadingFromCache && isApiLoading && tasks.length === 0;

  return (
    <div className="flex flex-col h-full bg-slate-950/20 border-r border-slate-900 overflow-hidden font-sans">
      {/* Top Banner: Connection & Synchronization Status */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900 bg-slate-950/45 text-xs text-slate-400">
        <div className="flex items-center space-x-4">
          {/* WebSocket Status */}
          <div className="flex items-center space-x-1.5">
            {isWsConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-medium">Real-time Stream Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-slate-400">WS Reconnecting...</span>
              </>
            )}
          </div>

          {/* IndexedDB Cache Status */}
          <div className="flex items-center space-x-1.5 border-l border-slate-800 pl-4">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            {isStale ? (
              <span className="flex items-center space-x-1 text-amber-400 font-medium">
                <AlertTriangle className="h-3 w-3 animate-pulse" />
                <span>Showing Cached Data (Refreshing...)</span>
              </span>
            ) : isApiLoading ? (
              <span className="text-cyan-400 font-medium animate-pulse">Syncing...</span>
            ) : (
              <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                <span>Synchronized</span>
              </span>
            )}
          </div>
        </div>

        {/* Global Record Counter */}
        <div className="hidden sm:block text-slate-500 font-mono text-[10px]">
          TOTAL RECORDS: {totalCount}
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="p-4 space-y-3 bg-slate-950/30 border-b border-slate-900">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by ID, title, or assignee..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all"
            id="task-search-input"
          />
        </div>

        {/* Filters and Sorting selectors */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={handleTypeChange}
            className="bg-slate-900 border border-slate-800 text-slate-350 text-xs rounded-lg p-2 outline-none focus:border-cyan-500/50"
            aria-label="Filter by task type"
          >
            <option value="all">All Types</option>
            <option value="image">Image</option>
            <option value="audio">Audio</option>
            <option value="text">Text</option>
            <option value="unknown">Unknown (Video)</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={handleStatusChange}
            className="bg-slate-900 border border-slate-800 text-slate-350 text-xs rounded-lg p-2 outline-none focus:border-cyan-500/50"
            aria-label="Filter by task status"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="qa">QA Review</option>
            <option value="done">Completed</option>
            <option value="blocked">Blocked</option>
          </select>

          {/* Sort Field */}
          <select
            value={sortBy}
            onChange={handleSortByChange}
            className="bg-slate-900 border border-slate-800 text-slate-350 text-xs rounded-lg p-2 outline-none focus:border-cyan-500/50"
            aria-label="Sort tasks by"
          >
            <option value="updatedAt">Updated Time</option>
            <option value="annotationCount">Annotations</option>
          </select>

          {/* Sort Direction Toggle */}
          <button
            onClick={toggleSortOrder}
            className="flex items-center justify-between bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg p-2 hover:bg-slate-850 hover:text-slate-100 transition-colors"
            title="Toggle sort direction"
          >
            <span className="truncate">Order: {sortOrder.toUpperCase()}</span>
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
          </button>
        </div>

        {/* Filters Reset Row */}
        {(filterType !== "all" || filterStatus !== "all" || searchQuery) && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">
              Filtered results: {tasks.length} / {tasks.length === 0 ? "0" : tasks.length}
            </span>
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Tasks List Content */}
      <div className="flex-1 overflow-hidden relative">
        {showLoader ? (
          <TaskListSkeleton />
        ) : isApiError && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 p-6 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-rose-500 animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-250">Load Failure</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                {customError || "We were unable to load annotation tasks from the servers."}
              </p>
            </div>
            <button
              onClick={() => handlePageChange(currentPage)}
              className="text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 rounded-lg hover:text-slate-100 font-medium"
            >
              Retry Revalidation
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 p-6 text-center text-slate-500 space-y-2">
            <span className="text-2xl">🔍</span>
            <p className="text-xs font-medium">No tasks match your search or filter settings.</p>
          </div>
        ) : (
          /* Virtualized Scroll Container */
          <div
            ref={parentRef}
            className="w-full h-full overflow-y-auto"
            style={{ contain: "strict" }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const task = tasks[virtualRow.index];
                if (!task) return null;
                const isSelected = task.id === selectedTaskId;
                
                return (
                  <div
                    key={task.id}
                    onClick={() => handleSelectTask(task.id)}
                    className={`absolute top-0 left-0 w-full p-4 border-b border-slate-900/60 cursor-pointer flex justify-between items-start transition-all hover:bg-slate-900/40 select-none ${
                      isSelected 
                        ? "bg-slate-900/80 border-l-2 border-l-cyan-500/80 shadow-md" 
                        : "bg-transparent border-l-2 border-l-transparent"
                    }`}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-slate-500 shrink-0 select-text">
                          {task.id}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-200 truncate select-text">
                          {task.title}
                        </h4>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-slate-400">
                        <span className="truncate max-w-[120px]" title={task.assignee?.name}>
                          Assignee: <span className="text-slate-300 font-medium">{task.assignee ? task.assignee.name : "Unassigned"}</span>
                        </span>
                        <span className="text-slate-700">•</span>
                        <span>
                          Count: <span className="text-slate-300 font-mono font-medium">{task.annotationCount}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1.5 shrink-0">
                      <StatusBadge status={task.status} />
                      <TypeBadge type={task.type} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-900 bg-slate-950/45 flex items-center justify-between text-xs text-slate-400">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isApiLoading}
          className="flex items-center px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-30 disabled:hover:bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-slate-100 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Previous</span>
        </button>

        <span className="font-medium text-slate-300">
          Page <span className="font-mono text-cyan-400">{currentPage}</span> of <span className="font-mono">{totalPages}</span>
        </span>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isApiLoading}
          className="flex items-center px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-30 disabled:hover:bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-slate-100 disabled:cursor-not-allowed transition-colors"
          aria-label="Next Page"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
