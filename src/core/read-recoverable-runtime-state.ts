import {
  INTENTIONALLY_NOT_RESUMABLE_YET,
  isFailureSignal,
  type AgentState,
  type RecoverableFailureSignalSurface,
  type RecoverableRuntimeBoundary,
  type RecoverableRuntimeRestorationBoundary,
  type RecoverableRuntimeState,
  type RecoverableRuntimeSummarySurface
} from "../protocol/index.js";
import { readCoreRuntimeSummary } from "./apply-runtime-step-result.js";

export interface RecoverableRuntimeStateReadOptions {
  profileName?: string;
}

function readRecoverableFailureSignal(state: AgentState): RecoverableFailureSignalSurface | undefined {
  if (!isFailureSignal(state.failure)) {
    return undefined;
  }

  return {
    category: state.failure.category,
    source: state.failure.source,
    terminal: state.failure.terminal,
    message: state.failure.message,
    summary: state.failure.summary,
    request_ref: state.failure.request_ref,
    evidence_refs: state.failure.evidence_refs
  };
}

function readRecoverableSummary(state: AgentState): RecoverableRuntimeSummarySurface | undefined {
  const summary = readCoreRuntimeSummary(state);
  if (!summary) {
    return undefined;
  }

  return {
    must_survive: {
      progression: summary.progression,
      signal: summary.signal,
      holdReason: summary.holdReason,
      orchestration: summary.orchestration
    },
    rebuildable: {
      resultKind: summary.resultKind,
      requestKind: summary.requestKind,
      failureSummary: summary.failureSummary
    }
  };
}

function resolveRecoverableRuntimeBoundary(
  state: AgentState,
  summary: RecoverableRuntimeSummarySurface | undefined,
  failureSignal: RecoverableFailureSignalSurface | undefined
): RecoverableRuntimeBoundary {
  const signal = summary?.must_survive.signal;
  const orchestration = summary?.must_survive.orchestration;
  const holdReason = summary?.must_survive.holdReason;

  if (state.status === "done") {
    return "terminal_completed";
  }

  if (signal === "review_rejected_run_terminal") {
    return "terminal_review_stop";
  }

  if (state.status === "failed" || summary?.must_survive.progression === "terminal") {
    return "terminal_failure";
  }

  if (orchestration === "waiting_for_repair") {
    return "waiting_for_repair";
  }

  if (orchestration === "waiting_for_replan") {
    return "waiting_for_replan";
  }

  if (holdReason === "non_terminal_failure" || signal === "hold_because_non_terminal_failure") {
    return "hold_non_terminal_failure";
  }

  if (failureSignal?.terminal) {
    return "terminal_failure";
  }

  return "continueable";
}

function buildRestorationBoundary(
  boundary: RecoverableRuntimeBoundary
): RecoverableRuntimeRestorationBoundary {
  if (boundary === "waiting_for_repair") {
    return {
      boundary,
      terminal: false,
      request_gated: true,
      can_prepare_request_without_new_result: false,
      requires_trigger: "repair_recovery"
    };
  }

  if (boundary === "waiting_for_replan") {
    return {
      boundary,
      terminal: false,
      request_gated: true,
      can_prepare_request_without_new_result: false,
      requires_trigger: "replan_recovery"
    };
  }

  if (
    boundary === "terminal_review_stop" ||
    boundary === "terminal_failure" ||
    boundary === "terminal_completed"
  ) {
    return {
      boundary,
      terminal: true,
      request_gated: true,
      can_prepare_request_without_new_result: false
    };
  }

  if (boundary === "hold_non_terminal_failure") {
    return {
      boundary,
      terminal: false,
      request_gated: false,
      can_prepare_request_without_new_result: true
    };
  }

  return {
    boundary: "continueable",
    terminal: false,
    request_gated: false,
    can_prepare_request_without_new_result: true
  };
}

export function readRecoverableRuntimeState(
  state: AgentState,
  options?: RecoverableRuntimeStateReadOptions
): RecoverableRuntimeState {
  const summary = readRecoverableSummary(state);
  const failureSignal = readRecoverableFailureSignal(state);
  const boundary = resolveRecoverableRuntimeBoundary(state, summary, failureSignal);

  return {
    runtime: {
      run_id: state.runId,
      status: state.status,
      goal: state.goal,
      plan_id: state.planId,
      current_task_id: state.currentTaskId,
      current_milestone_id: state.currentMilestoneId,
      last_effect_request_kind: state.lastEffectRequestKind,
      last_effect_result_kind: state.lastEffectResultKind
    },
    summary,
    failure_signal: failureSignal,
    profile: options?.profileName ? { name: options.profileName } : undefined,
    restoration: buildRestorationBoundary(boundary),
    intentionally_not_resumable_yet: [...INTENTIONALLY_NOT_RESUMABLE_YET]
  };
}
