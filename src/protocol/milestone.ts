// Protocol-layer standardized milestone object; keep it serializable across boundaries.
export const MILESTONE_STATUSES = [
  "pending",
  "ready",
  "in_progress",
  "completed",
  "failed"
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export interface Milestone {
  id: string;
  title: string;
  status: MilestoneStatus;
  summary?: string;
  taskIds?: string[];
  successCriteria?: unknown[];
}

export function isMilestoneStatus(value: unknown): value is MilestoneStatus {
  return (
    typeof value === "string" && MILESTONE_STATUSES.some((status) => status === value)
  );
}

export function isMilestone(value: unknown): value is Milestone {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const id = Reflect.get(value, "id");
  const title = Reflect.get(value, "title");
  const status = Reflect.get(value, "status");
  const summary = Reflect.get(value, "summary");
  const taskIds = Reflect.get(value, "taskIds");
  const successCriteria = Reflect.get(value, "successCriteria");

  if (typeof id !== "string" || typeof title !== "string" || !isMilestoneStatus(status)) {
    return false;
  }

  return (
    (summary === undefined || typeof summary === "string") &&
    (taskIds === undefined || (Array.isArray(taskIds) && taskIds.every((id) => typeof id === "string"))) &&
    (successCriteria === undefined || Array.isArray(successCriteria))
  );
}

export function isTerminalMilestoneStatus(status: MilestoneStatus): boolean {
  return status === "completed" || status === "failed";
}
