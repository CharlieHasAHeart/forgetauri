import { isEvidenceRefArray, type EvidenceRef } from "./evidence.js";
import { isFailureCategory, isFailureSource, type FailureCategory, type FailureSource } from "./failure-signal.js";
import { isRequestRef, type RequestRef } from "./request-ref.js";

export const RECOVERABLE_RUNTIME_BOUNDARIES = [
  "continueable",
  "waiting_for_repair",
  "waiting_for_replan",
  "hold_non_terminal_failure",
  "terminal_review_stop",
  "terminal_failure",
  "terminal_completed"
] as const;

export type RecoverableRuntimeBoundary = (typeof RECOVERABLE_RUNTIME_BOUNDARIES)[number];

export interface RecoverableRuntimeSummarySurface {
  must_survive: {
    progression: "continueable" | "hold_current_task" | "terminal";
    signal?: string;
    holdReason?: string;
    orchestration?: string;
  };
  rebuildable: {
    resultKind?: string;
    requestKind?: string;
    failureSummary?: string;
  };
}

export interface RecoverableFailureSignalSurface {
  category: FailureCategory;
  source: FailureSource;
  terminal: boolean;
  message?: string;
  summary?: string;
  request_ref?: RequestRef;
  evidence_refs?: EvidenceRef[];
}

export interface RecoverableRuntimeRestorationBoundary {
  boundary: RecoverableRuntimeBoundary;
  terminal: boolean;
  request_gated: boolean;
  can_prepare_request_without_new_result: boolean;
  requires_trigger?: "repair_recovery" | "replan_recovery";
}

export interface RecoverableRuntimeState {
  runtime: {
    run_id: string;
    status: string;
    goal: string;
    plan_id?: string;
    current_task_id?: string;
    current_milestone_id?: string;
    last_effect_request_kind?: string;
    last_effect_result_kind?: string;
  };
  summary?: RecoverableRuntimeSummarySurface;
  failure_signal?: RecoverableFailureSignalSurface;
  profile?: {
    name: string;
  };
  restoration: RecoverableRuntimeRestorationBoundary;
  intentionally_not_resumable_yet: string[];
}

export const INTENTIONALLY_NOT_RESUMABLE_YET: string[] = [
  "in_flight_shell_side_effects",
  "partial_file_write_operations",
  "external_review_sessions",
  "cross_process_live_handles",
  "non_protocol_temporary_context"
];

export function isRecoverableRuntimeBoundary(value: unknown): value is RecoverableRuntimeBoundary {
  return (
    typeof value === "string" &&
    RECOVERABLE_RUNTIME_BOUNDARIES.some((boundary) => boundary === value)
  );
}

function isRecoverableRuntimeSummarySurface(
  value: unknown
): value is RecoverableRuntimeSummarySurface {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const mustSurvive = Reflect.get(value, "must_survive");
  const rebuildable = Reflect.get(value, "rebuildable");
  if (typeof mustSurvive !== "object" || mustSurvive === null) {
    return false;
  }
  if (typeof rebuildable !== "object" || rebuildable === null) {
    return false;
  }

  const progression = Reflect.get(mustSurvive, "progression");
  const signal = Reflect.get(mustSurvive, "signal");
  const holdReason = Reflect.get(mustSurvive, "holdReason");
  const orchestration = Reflect.get(mustSurvive, "orchestration");
  const resultKind = Reflect.get(rebuildable, "resultKind");
  const requestKind = Reflect.get(rebuildable, "requestKind");
  const failureSummary = Reflect.get(rebuildable, "failureSummary");

  if (
    progression !== "continueable" &&
    progression !== "hold_current_task" &&
    progression !== "terminal"
  ) {
    return false;
  }

  return (
    (signal === undefined || typeof signal === "string") &&
    (holdReason === undefined || typeof holdReason === "string") &&
    (orchestration === undefined || typeof orchestration === "string") &&
    (resultKind === undefined || typeof resultKind === "string") &&
    (requestKind === undefined || typeof requestKind === "string") &&
    (failureSummary === undefined || typeof failureSummary === "string")
  );
}

function isRecoverableFailureSignalSurface(
  value: unknown
): value is RecoverableFailureSignalSurface {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const category = Reflect.get(value, "category");
  const source = Reflect.get(value, "source");
  const terminal = Reflect.get(value, "terminal");
  const message = Reflect.get(value, "message");
  const summary = Reflect.get(value, "summary");
  const requestRef = Reflect.get(value, "request_ref");
  const evidenceRefs = Reflect.get(value, "evidence_refs");

  return (
    isFailureCategory(category) &&
    isFailureSource(source) &&
    typeof terminal === "boolean" &&
    (message === undefined || typeof message === "string") &&
    (summary === undefined || typeof summary === "string") &&
    (requestRef === undefined || isRequestRef(requestRef)) &&
    (evidenceRefs === undefined || isEvidenceRefArray(evidenceRefs))
  );
}

function isRecoverableRuntimeRestorationBoundary(
  value: unknown
): value is RecoverableRuntimeRestorationBoundary {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const boundary = Reflect.get(value, "boundary");
  const terminal = Reflect.get(value, "terminal");
  const requestGated = Reflect.get(value, "request_gated");
  const canPrepare = Reflect.get(value, "can_prepare_request_without_new_result");
  const requiresTrigger = Reflect.get(value, "requires_trigger");

  return (
    isRecoverableRuntimeBoundary(boundary) &&
    typeof terminal === "boolean" &&
    typeof requestGated === "boolean" &&
    typeof canPrepare === "boolean" &&
    (requiresTrigger === undefined ||
      requiresTrigger === "repair_recovery" ||
      requiresTrigger === "replan_recovery")
  );
}

export function isRecoverableRuntimeState(value: unknown): value is RecoverableRuntimeState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const runtime = Reflect.get(value, "runtime");
  const summary = Reflect.get(value, "summary");
  const failureSignal = Reflect.get(value, "failure_signal");
  const profile = Reflect.get(value, "profile");
  const restoration = Reflect.get(value, "restoration");
  const notResumable = Reflect.get(value, "intentionally_not_resumable_yet");

  if (typeof runtime !== "object" || runtime === null) {
    return false;
  }

  const runId = Reflect.get(runtime, "run_id");
  const status = Reflect.get(runtime, "status");
  const goal = Reflect.get(runtime, "goal");
  const planId = Reflect.get(runtime, "plan_id");
  const currentTaskId = Reflect.get(runtime, "current_task_id");
  const currentMilestoneId = Reflect.get(runtime, "current_milestone_id");
  const lastRequestKind = Reflect.get(runtime, "last_effect_request_kind");
  const lastResultKind = Reflect.get(runtime, "last_effect_result_kind");

  if (
    typeof runId !== "string" ||
    typeof status !== "string" ||
    typeof goal !== "string" ||
    (planId !== undefined && typeof planId !== "string") ||
    (currentTaskId !== undefined && typeof currentTaskId !== "string") ||
    (currentMilestoneId !== undefined && typeof currentMilestoneId !== "string") ||
    (lastRequestKind !== undefined && typeof lastRequestKind !== "string") ||
    (lastResultKind !== undefined && typeof lastResultKind !== "string")
  ) {
    return false;
  }

  if (summary !== undefined && !isRecoverableRuntimeSummarySurface(summary)) {
    return false;
  }
  if (failureSignal !== undefined && !isRecoverableFailureSignalSurface(failureSignal)) {
    return false;
  }
  if (profile !== undefined) {
    if (typeof profile !== "object" || profile === null) {
      return false;
    }
    const name = Reflect.get(profile, "name");
    if (typeof name !== "string") {
      return false;
    }
  }
  if (!isRecoverableRuntimeRestorationBoundary(restoration)) {
    return false;
  }

  return Array.isArray(notResumable) && notResumable.every((entry) => typeof entry === "string");
}
