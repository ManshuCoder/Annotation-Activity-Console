/**
 * TaskStatus Enum
 * Standardizes the status field of annotation tasks
 */
export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  QA = "qa",
  DONE = "done",
  BLOCKED = "blocked",
  UNKNOWN = "unknown",
}

/**
 * Assignee Interface
 * Information about the user currently assigned to the task
 */
export interface Assignee {
  id: string;
  name: string;
}

/**
 * Base Task Interface
 * Contains fields common to all annotation task types
 */
export interface BaseTask {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: Assignee | null;
  annotationCount: number;
  updatedAt: number; // Normalized to Unix epoch milliseconds
  meta: Record<string, unknown>;
}

/**
 * Image Annotation Task
 */
export interface ImageTask extends BaseTask {
  type: "image";
}

/**
 * Audio Annotation Task
 */
export interface AudioTask extends BaseTask {
  type: "audio";
}

/**
 * Text Annotation Task
 */
export interface TextTask extends BaseTask {
  type: "text";
}

/**
 * Unknown Annotation Task
 * Used as a fallback for unsupported task types like "video"
 */
export interface UnknownTask extends BaseTask {
  type: "unknown";
}

/**
 * Task Union Type
 * Discriminated on the 'type' field
 */
export type Task = ImageTask | AudioTask | TextTask | UnknownTask;

/**
 * Raw Task payload from API before normalization
 */
export interface RawTask {
  id?: unknown;
  title?: unknown;
  type?: unknown;
  status?: unknown;
  assignee?: unknown;
  annotationCount?: unknown;
  updatedAt?: unknown;
  meta?: unknown;
}
