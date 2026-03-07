// Protocol-layer standardized effect result object; keep it serializable across boundaries.
export const EFFECT_RESULT_KINDS = ["action_results", "review_result"] as const;

export type EffectResultKind = (typeof EFFECT_RESULT_KINDS)[number];

export interface EffectResult {
  kind: EffectResultKind;
  payload: unknown;
  success: boolean;
  context?: unknown;
}

export function isEffectResultKind(value: unknown): value is EffectResultKind {
  return (
    typeof value === "string" && EFFECT_RESULT_KINDS.some((kind) => kind === value)
  );
}

export function isEffectResult(value: unknown): value is EffectResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const kind = Reflect.get(value, "kind");
  const success = Reflect.get(value, "success");

  return (
    isEffectResultKind(kind) && typeof success === "boolean" && Reflect.has(value, "payload")
  );
}

export function isSuccessfulEffectResult(result: EffectResult): boolean {
  return result.success === true;
}

export function isFailedEffectResult(result: EffectResult): boolean {
  return result.success === false;
}
