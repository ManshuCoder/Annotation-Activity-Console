"use client";

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTaskFeed } from "../hooks/useTaskFeed";
import { useGetTasksQuery } from "../store/apiSlice";
import { RootState } from "../store";
import { setTasksLoaded, setLoadingFromCache, setStale } from "../store/tasksSlice";
import { TaskList } from "../components/TaskList";
import { DetailPanel } from "../components/DetailPanel";
import { TasksChart } from "../components/TasksChart";
import { selectSelectedTaskId } from "../store/selectors";
import { LayoutGrid, Layers, RefreshCw } from "lucide-react";
import localforage from "localforage";

export default function DashboardPage() {
  const dispatch = useDispatch();
  
  // Read current page context
  const currentPage = useSelector((state: RootState) => state.tasks.currentPage);
  const selectedTaskId = useSelector(selectSelectedTaskId);
  const isStale = useSelector((state: RootState) => state.tasks.isStale);

  // Subscribe to live WebSocket feed
  const { isConnected: isWsConnected } = useTaskFeed();

  // Fetch paginated tasks from API via RTK Query
  const { 
    isLoading: isApiLoading, 
    isFetching: isApiFetching,
    isError: isApiError 
  } = useGetTasksQuery({ page: currentPage, pageSize: 20 });

  // Read from IndexedDB cache immediately when currentPage transitions
  useEffect(() => {
    let isCancelled = false;
    
    // Set loading indicator
    dispatch(setLoadingFromCache(true));
    
    localforage.getItem(`tasks_page_${currentPage}`)
      .then((cachedData: any) => {
        if (isCancelled) return;

        if (cachedData) {
          console.log(`[Dashboard] Quick rendering page ${currentPage} from IndexedDB cache`);
          // Render cached page immediately
          dispatch(
            setTasksLoaded({
              items: cachedData.items,
              total: cachedData.total,
              page: cachedData.page,
            })
          );
          // Flag state as stale so UI knows it's pending server revalidation
          dispatch(setStale(true));
        } else {
          dispatch(setLoadingFromCache(false));
        }
      })
      .catch((err) => {
        console.error("[Dashboard] Error loading cached page from IndexedDB:", err);
        if (!isCancelled) {
          dispatch(setLoadingFromCache(false));
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentPage, dispatch]);

  return (
    <main className="flex flex-col h-screen w-screen bg-[#070b19] text-slate-100 overflow-hidden select-none">
      {/* Header Dashboard Banner */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-900 shadow-lg shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-600 text-slate-950 rounded-xl shadow-md flex items-center justify-center">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Annotation Activity Console
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Real-time B2B Task Monitoring
            </p>
          </div>
        </div>

        {/* Revalidation Spinner indicator */}
        {(isApiLoading || isApiFetching) && (
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin text-cyan-400" />
            <span className="hidden sm:inline">Fetching updates...</span>
          </div>
        )}
      </header>

      {/* Main Panel Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Task list & Analytics (Desktop split) */}
        <div
          className={`flex-col h-full ${
            selectedTaskId ? "hidden md:flex md:w-1/2 lg:w-2/5 xl:w-1/3" : "flex w-full md:w-1/2 lg:w-2/5 xl:w-1/3"
          }`}
        >
          {/* Task list list views */}
          <div className="flex-1 overflow-hidden">
            <TaskList 
              isWsConnected={isWsConnected} 
              isApiLoading={isApiLoading || isApiFetching} 
              isApiError={isApiError} 
            />
          </div>
          
          {/* Analytics Chart Block */}
          <div className="p-4 border-t border-slate-900 bg-slate-950/40 shrink-0">
            <TasksChart />
          </div>
        </div>

        {/* Right Column: Task detail inspection view */}
        <div
          className={`flex-col h-full flex-1 ${
            selectedTaskId ? "flex w-full md:w-1/2 lg:w-3/5 xl:w-2/3" : "hidden md:flex md:w-1/2 lg:w-3/5 xl:w-2/3"
          }`}
        >
          <DetailPanel />
        </div>
      </div>
    </main>
  );
}
