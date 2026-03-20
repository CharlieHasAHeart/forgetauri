import { isFailureSignal, type FailureSignal } from "./failure-signal.js";
import { isEvidenceRefArray, type EvidenceRef } from "./evidence.js";
import { isRequestRef, type RequestRef } from "./request-ref.js";

// Protocol-layer standardized effect result object; keep it serializable across boundaries.
export const EFFECT_RESULT_KINDS = [
  "action_results",
  "review_result",
  "repair_recovery",
  "replan_recovery"
] as const;

export type EffectResultKind = (typeof EFFECT_RESULT_KINDS)[number];

export const REVIEW_DECISIONS = ["approved", "changes_requested"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const REVIEW_NEXT_ACTIONS = ["continue", "repair", "replan", "stop"] as const;
export type ReviewNextAction = (typeof REVIEW_NEXT_ACTIONS)[number];
export const REPAIR_RECOVERY_STATUSES = ["recovered", "failed"] as const;
export type RepairRecoveryStatus = (typeof REPAIR_RECOVERY_STATUSES)[number];
export const REPLAN_RECOVERY_STATUSES = ["recovered", "failed"] as const;
export type ReplanRecoveryStatus = (typeof REPLAN_RECOVERY_STATUSES)[number];

// Minimal review contract for runtime progression while keeping protocol payload serializable.
export interface ReviewResultPayload {
  decision: ReviewDecision;
  next_action: ReviewNextAction;
  summary?: string;
}

// Minimal Stage-2 repair recovery trigger payload.
export interface RepairRecoveryPayload {
  status: RepairRecoveryStatus;
  summary?: string;
}

// Minimal Stage-2 replan recovery trigger payload.
// Optional next_task_id is the narrow pointer update surface for re-entry.
export interface ReplanRecoveryPayload {
  status: ReplanRecoveryStatus;
  next_task_id?: string;
  summary?: string;
}

interface BaseEffectResult {
  kind: EffectResultKind;
  success: boolean;
  failure_signal?: FailureSignal;
  evidence_refs?: EvidenceRef[];
  request_ref?: RequestRef;
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

export interface RepairRecoveryEffectResult extends BaseEffectResult {
  kind: "repair_recovery";
  payload: RepairRecoveryPayload;
}

export interface ReplanRecoveryEffectResult extends BaseEffectResult {
  kind: "replan_recovery";
  payload: ReplanRecoveryPayload;
}

export type EffectResult =
  | ActionResultsEffectResult
  | ReviewEffectResult
  | RepairRecoveryEffectResult
  | ReplanRecoveryEffectResult;
export type FailedEffectResult = EffectResult & { success: false };

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

export function isRepairRecoveryStatus(value: unknown): value is RepairRecoveryStatus {
  return (
    typeof value === "string" &&
    REPAIR_RECOVERY_STATUSES.some((status) => status === value)
  );
}

export function isRepairRecoveryPayload(value: unknown): value is RepairRecoveryPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const status = Reflect.get(value, "status");
  const summary = Reflect.get(value, "summary");

  return (
    isRepairRecoveryStatus(status) &&
    (summary === undefined || typeof summary === "string")
  );
}

export function isReplanRecoveryStatus(value: unknown): value is ReplanRecoveryStatus {
  return (
    typeof value === "string" &&
    REPLAN_RECOVERY_STATUSES.some((status) => status === value)
  );
}

export function isReplanRecoveryPayload(value: unknown): value is ReplanRecoveryPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const status = Reflect.get(value, "status");
  const nextTaskId = Reflect.get(value, "next_task_id");
  const summary = Reflect.get(value, "summary");

  if (!isReplanRecoveryStatus(status)) {
    return false;
  }

  if (nextTaskId !== undefined) {
    if (typeof nextTaskId !== "string" || nextTaskId.trim().length === 0) {
      return false;
    }
  }

  return summary === undefined || typeof summary === "string";
}

export function isEffectResult(value: unknown): value is EffectResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const kind = Reflect.get(value, "kind");
  const success = Reflect.get(value, "success");
  const payload = Reflect.get(value, "payload");
  const failureSignal = Reflect.get(value, "failure_signal");
  const evidenceRefs = Reflect.get(value, "evidence_refs");
  const requestRef = Reflect.get(value, "request_ref");

  if (!isEffectResultKind(kind) || typeof success !== "boolean" || !Reflect.has(value, "payload")) {
    return false;
  }

  if (failureSignal !== undefined && !isFailureSignal(failureSignal)) {
    return false;
  }
  if (evidenceRefs !== undefined && !isEvidenceRefArray(evidenceRefs)) {
    return false;
  }
  if (requestRef !== undefined && !isRequestRef(requestRef)) {
    return false;
  }

  if (kind === "review_result") {
    return isReviewResultPayload(payload);
  }

  if (kind === "repair_recovery") {
    return isRepairRecoveryPayload(payload);
  }

  if (kind === "replan_recovery") {
    return isReplanRecoveryPayload(payload);
  }

  return true;
}

export function isSuccessfulEffectResult(result: EffectResult): boolean {
  return result.success === true;
}

export function isFailedEffectResult(result: EffectResult): result is FailedEffectResult {
  return result.success === false;
}

export function hasEffectResultFailureSignal(
  result: EffectResult
): result is EffectResult & { failure_signal: FailureSignal } {
  return isFailureSignal(result.failure_signal);
}

export function extractEffectResultFailureSignal(
  result: EffectResult
): FailureSignal | undefined {
  return hasEffectResultFailureSignal(result) ? result.failure_signal : undefined;
}
