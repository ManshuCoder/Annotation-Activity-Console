import { Task, TaskStatus, Assignee, RawTask } from "../types";

/**
 * Normalizes task statuses from inconsistent casings and spellings.
 * In the mock backend, status could be: "in_progress", "InProgress", "done", "QA", "todo", "BLOCKED".
 */
export function normalizeStatus(rawStatus: unknown): TaskStatus {
  if (typeof rawStatus !== "string") {
    return TaskStatus.UNKNOWN;
  }

  const clean = rawStatus.trim().toLowerCase().replace(/[^a-z_]/g, "");

  switch (clean) {
    case "todo":
      return TaskStatus.TODO;
    case "done":
      return TaskStatus.DONE;
    case "qa":
      return TaskStatus.QA;
    case "blocked":
      return TaskStatus.BLOCKED;
    case "inprogress":
    case "in_progress":
      return TaskStatus.IN_PROGRESS;
    default:
      return TaskStatus.UNKNOWN;
  }
}

/**
 * Safely parses and normalizes annotation counts which may come as strings or numbers.
 */
export function normalizeAnnotationCount(rawCount: unknown): number {
  if (typeof rawCount === "number") {
    return isNaN(rawCount) ? 0 : Math.max(0, Math.floor(rawCount));
  }
  if (typeof rawCount === "string") {
    const parsed = parseInt(rawCount, 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }
  return 0;
}

/**
 * Normalizes timestamps which can be epoch ms numbers or ISO date strings.
 */
export function normalizeTimestamp(rawTime: unknown): number {
  if (typeof rawTime === "number") {
    if (isNaN(rawTime)) {
      return Date.now();
    }
    // Check if seconds instead of milliseconds (unlikely for our mock but safe)
    if (rawTime < 1000000000000) {
      return rawTime * 1000;
    }
    return rawTime;
  }

  if (typeof rawTime === "string") {
    const parsed = Date.parse(rawTime);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  return Date.now();
}

/**
 * Safely parses the assignee object, returning null if invalid or null.
 */
export function normalizeAssignee(rawAssignee: unknown): Assignee | null {
  if (!rawAssignee || typeof rawAssignee !== "object") {
    return null;
  }

  const obj = rawAssignee as Record<string, unknown>;
  const id = typeof obj.id === "string" || typeof obj.id === "number" ? String(obj.id) : "";
  const name = typeof obj.name === "string" ? obj.name : "";

  if (!id || !name) {
    return null;
  }

  return { id, name };
}

/**
 * Normalizes the meta object to a safe record.
 */
export function normalizeMeta(rawMeta: unknown): Record<string, unknown> {
  if (rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta)) {
    return rawMeta as Record<string, unknown>;
  }
  return {};
}

/**
 * Main normalization function. Converts any raw task object into a strictly typed Task.
 * Guaranteed not to crash on invalid structures.
 */
export function normalizeTask(raw: unknown): Task {
  if (!raw || typeof raw !== "object") {
    return {
      id: "unknown",
      title: "Unknown Task",
      type: "unknown",
      status: TaskStatus.UNKNOWN,
      assignee: null,
      annotationCount: 0,
      updatedAt: Date.now(),
      meta: {},
    };
  }

  const rawObj = raw as RawTask;

  const id = typeof rawObj.id === "string" || typeof rawObj.id === "number" ? String(rawObj.id) : "unknown";
  const title = typeof rawObj.title === "string" ? rawObj.title : `Task ${id}`;
  
  // Normalize types: "image" | "audio" | "text" | "unknown"
  let type: "image" | "audio" | "text" | "unknown" = "unknown";
  if (typeof rawObj.type === "string") {
    const rawType = rawObj.type.toLowerCase().trim();
    if (rawType === "image" || rawType === "audio" || rawType === "text") {
      type = rawType;
    }
  }

  const status = normalizeStatus(rawObj.status);
  const assignee = normalizeAssignee(rawObj.assignee);
  const annotationCount = normalizeAnnotationCount(rawObj.annotationCount);
  const updatedAt = normalizeTimestamp(rawObj.updatedAt);
  const meta = normalizeMeta(rawObj.meta);

  const base = {
    id,
    title,
    status,
    assignee,
    annotationCount,
    updatedAt,
    meta,
  };

  switch (type) {
    case "image":
      return { ...base, type: "image" };
    case "audio":
      return { ...base, type: "audio" };
    case "text":
      return { ...base, type: "text" };
    default:
      return { ...base, type: "unknown" };
  }
}
