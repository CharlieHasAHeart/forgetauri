export type RequestRefKind = "execute_actions" | "run_review";

// Minimal replay-friendly request reference.
// Keep it small and stable: enough to locate where a request/result/failure happened.
export interface RequestRef {
  run_id: string;
  plan_id: string;
  task_id: string;
  request_kind: RequestRefKind;
}

export function isRequestRef(value: unknown): value is RequestRef {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const runId = Reflect.get(value, "run_id");
  const planId = Reflect.get(value, "plan_id");
  const taskId = Reflect.get(value, "task_id");
  const requestKind = Reflect.get(value, "request_kind");

  return (
    typeof runId === "string" &&
    runId.trim().length > 0 &&
    typeof planId === "string" &&
    planId.trim().length > 0 &&
    typeof taskId === "string" &&
    taskId.trim().length > 0 &&
    (requestKind === "execute_actions" || requestKind === "run_review")
  );
}
