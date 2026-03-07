// Protocol-layer standardized plan patch object; keep it serializable across boundaries.
export const PLAN_PATCH_OPS = [
  "replace_plan",
  "add_task",
  "update_task",
  "remove_task",
  "add_milestone",
  "update_milestone",
  "remove_milestone"
] as const;

export type PlanPatchOp = (typeof PLAN_PATCH_OPS)[number];

export interface PlanPatch {
  op: PlanPatchOp;
  targetId?: string;
  payload?: unknown;
  reason?: string;
}

export function isPlanPatchOp(value: unknown): value is PlanPatchOp {
  return typeof value === "string" && PLAN_PATCH_OPS.some((op) => op === value);
}

export function isPlanPatch(value: unknown): value is PlanPatch {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const op = Reflect.get(value, "op");
  const targetId = Reflect.get(value, "targetId");
  const reason = Reflect.get(value, "reason");

  if (!isPlanPatchOp(op)) {
    return false;
  }

  return (
    (targetId === undefined || typeof targetId === "string") &&
    (reason === undefined || typeof reason === "string")
  );
}
