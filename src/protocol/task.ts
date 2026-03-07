// Protocol-layer standardized task object; keep it serializable across boundaries.
export const TASK_STATUSES = [
  "pending",
  "ready",
  "in_progress",
  "completed",
  "failed"
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  summary?: string;
  successCriteria?: unknown[];
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && TASK_STATUSES.some((status) => status === value);
}

export function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const id = Reflect.get(value, "id");
  const title = Reflect.get(value, "title");
  const status = Reflect.get(value, "status");
  const summary = Reflect.get(value, "summary");
  const successCriteria = Reflect.get(value, "successCriteria");

  if (typeof id !== "string" || typeof title !== "string" || !isTaskStatus(status)) {
    return false;
  }

  return (
    (summary === undefined || typeof summary === "string") &&
    (successCriteria === undefined || Array.isArray(successCriteria))
  );
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === "completed" || status === "failed";
}
