// Protocol-layer standardized success criterion object; keep it serializable across boundaries.
export const SUCCESS_CRITERION_KINDS = ["artifact", "state", "review", "system"] as const;

export type SuccessCriterionKind = (typeof SUCCESS_CRITERION_KINDS)[number];

export interface SuccessCriterion {
  kind: SuccessCriterionKind;
  description: string;
  target?: string;
  details?: unknown;
}

export function isSuccessCriterionKind(value: unknown): value is SuccessCriterionKind {
  return (
    typeof value === "string" && SUCCESS_CRITERION_KINDS.some((kind) => kind === value)
  );
}

export function isSuccessCriterion(value: unknown): value is SuccessCriterion {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const kind = Reflect.get(value, "kind");
  const description = Reflect.get(value, "description");
  const target = Reflect.get(value, "target");

  if (!isSuccessCriterionKind(kind) || typeof description !== "string") {
    return false;
  }

  return target === undefined || typeof target === "string";
}
