// Protocol-layer standardized effect result object; keep it serializable across boundaries.
export const EFFECT_RESULT_KINDS = ["action_results", "review_result"] as const;

export type EffectResultKind = (typeof EFFECT_RESULT_KINDS)[number];

export const REVIEW_DECISIONS = ["approved", "changes_requested"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const REVIEW_NEXT_ACTIONS = ["continue", "repair", "replan", "stop"] as const;
export type ReviewNextAction = (typeof REVIEW_NEXT_ACTIONS)[number];

// Minimal review contract for runtime progression while keeping protocol payload serializable.
export interface ReviewResultPayload {
  decision: ReviewDecision;
  next_action: ReviewNextAction;
  summary?: string;
}

interface BaseEffectResult {
  kind: EffectResultKind;
  success: boolean;
  context?: unknown;
}

export interface ActionResultsEffectResult extends BaseEffectResult {
  kind: "action_results";
  payload: unknown;
}

export interface ReviewEffectResult extends BaseEffectResult {
  kind: "review_result";
  payload: ReviewResultPayload;
}

export type EffectResult = ActionResultsEffectResult | ReviewEffectResult;

export function isEffectResultKind(value: unknown): value is EffectResultKind {
  return (
    typeof value === "string" && EFFECT_RESULT_KINDS.some((kind) => kind === value)
  );
}

export function isReviewDecision(value: unknown): value is ReviewDecision {
  return (
    typeof value === "string" &&
    REVIEW_DECISIONS.some((decision) => decision === value)
  );
}

export function isReviewNextAction(value: unknown): value is ReviewNextAction {
  return (
    typeof value === "string" &&
    REVIEW_NEXT_ACTIONS.some((action) => action === value)
  );
}

export function isReviewResultPayload(value: unknown): value is ReviewResultPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const decision = Reflect.get(value, "decision");
  const nextAction = Reflect.get(value, "next_action");
  const summary = Reflect.get(value, "summary");

  return (
    isReviewDecision(decision) &&
    isReviewNextAction(nextAction) &&
    (summary === undefined || typeof summary === "string")
  );
}

export function isEffectResult(value: unknown): value is EffectResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const kind = Reflect.get(value, "kind");
  const success = Reflect.get(value, "success");
  const payload = Reflect.get(value, "payload");

  if (!isEffectResultKind(kind) || typeof success !== "boolean" || !Reflect.has(value, "payload")) {
    return false;
  }

  if (kind === "review_result") {
    return isReviewResultPayload(payload);
  }

  return true;
}

export function isSuccessfulEffectResult(result: EffectResult): boolean {
  return result.success === true;
}

export function isFailedEffectResult(result: EffectResult): boolean {
  return result.success === false;
}
