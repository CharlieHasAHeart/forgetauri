// Protocol-layer standardized effect request object; keep it serializable across boundaries.
export const EFFECT_REQUEST_KINDS = ["execute_actions", "run_review"] as const;

export type EffectRequestKind = (typeof EFFECT_REQUEST_KINDS)[number];

export interface EffectRequest {
  kind: EffectRequestKind;
  payload: unknown;
  context?: unknown;
}

export function isEffectRequestKind(value: unknown): value is EffectRequestKind {
  return (
    typeof value === "string" && EFFECT_REQUEST_KINDS.some((kind) => kind === value)
  );
}

export function isEffectRequest(value: unknown): value is EffectRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const kind = Reflect.get(value, "kind");

  return isEffectRequestKind(kind) && Reflect.has(value, "payload");
}
