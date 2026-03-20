import {
  INTENTIONALLY_NOT_RESUMABLE_YET,
  isRecoverableRuntimeState,
  type AgentState,
  type RecoverableRuntimeState
} from "../protocol/index.js";
import { type CoreRuntimeSummary } from "./apply-runtime-step-result.js";

export type RestoreRuntimeStateErrorCode =
  | "invalid_recoverable_state"
  | "unsupported_resume_boundary"
  | "profile_mismatch";

export interface RestoreRuntimeStateFailure {
  restored: false;
  errorCode: RestoreRuntimeStateErrorCode;
  message: string;
}

export interface RestoreRuntimeStateSuccess {
  restored: true;
  state: AgentState;
  profileName?: string;
}

export type RestoreRuntimeStateResult =
  | RestoreRuntimeStateSuccess
  | RestoreRuntimeStateFailure;

export interface RestoreRuntimeStateOptions {
  expectedProfileName?: string;
}

function buildRuntimeSummaryFromRecoverable(
  recoverable: RecoverableRuntimeState
): CoreRuntimeSummary | undefined {
  if (!recoverable.summary) {
    return undefined;
  }

  return {
    progression: recoverable.summary.must_survive.progression,
    signal: recoverable.summary.must_survive.signal as CoreRuntimeSummary["signal"],
    holdReason: recoverable.summary.must_survive.holdReason as CoreRuntimeSummary["holdReason"],
    orchestration: recoverable.summary.must_survive
      .orchestration as CoreRuntimeSummary["orchestration"],
    resultKind: recoverable.summary.rebuildable.resultKind,
    requestKind: recoverable.summary.rebuildable.requestKind,
    failureSummary: recoverable.summary.rebuildable.failureSummary
  };
}

function validateSupportedRestoreBoundary(
  recoverable: RecoverableRuntimeState
): RestoreRuntimeStateFailure | undefined {
  const boundary = recoverable.restoration.boundary;
  const summary = recoverable.summary?.must_survive;

  if (boundary === "waiting_for_repair") {
    if (
      recoverable.restoration.terminal ||
      !recoverable.restoration.request_gated ||
      recoverable.restoration.can_prepare_request_without_new_result ||
      recoverable.restoration.requires_trigger !== "repair_recovery"
    ) {
      return {
        restored: false,
        errorCode: "unsupported_resume_boundary",
        message: "unsupported waiting_for_repair restoration boundary semantics"
      };
    }

    if (
      !summary ||
      summary.progression !== "hold_current_task" ||
      summary.orchestration !== "waiting_for_repair"
    ) {
      return {
        restored: false,
        errorCode: "unsupported_resume_boundary",
        message: "waiting_for_repair resume requires hold_current_task + waiting_for_repair summary"
      };
    }

    return undefined;
  }

  if (boundary === "waiting_for_replan") {
    if (
      recoverable.restoration.terminal ||
      !recoverable.restoration.request_gated ||
      recoverable.restoration.can_prepare_request_without_new_result ||
      recoverable.restoration.requires_trigger !== "replan_recovery"
    ) {
      return {
        restored: false,
        errorCode: "unsupported_resume_boundary",
        message: "unsupported waiting_for_replan restoration boundary semantics"
      };
    }

    if (
      !summary ||
      summary.progression !== "hold_current_task" ||
      summary.orchestration !== "waiting_for_replan"
    ) {
      return {
        restored: false,
        errorCode: "unsupported_resume_boundary",
        message: "waiting_for_replan resume requires hold_current_task + waiting_for_replan summary"
      };
    }

    return undefined;
  }

  if (
    boundary === "terminal_review_stop" ||
    boundary === "terminal_failure" ||
    boundary === "terminal_completed"
  ) {
    if (
      !recoverable.restoration.terminal ||
      !recoverable.restoration.request_gated ||
      recoverable.restoration.can_prepare_request_without_new_result
    ) {
      return {
        restored: false,
        errorCode: "unsupported_resume_boundary",
        message: `unsupported ${boundary} restoration boundary semantics`
      };
    }

    if (summary && summary.progression !== "terminal") {
      return {
        restored: false,
        errorCode: "unsupported_resume_boundary",
        message: `${boundary} restore expects terminal progression when summary exists`
      };
    }

    return undefined;
  }

  return {
    restored: false,
    errorCode: "unsupported_resume_boundary",
    message: `unsupported resume boundary: ${boundary}`
  };
}

function hasInvalidNotResumableScope(recoverable: RecoverableRuntimeState): boolean {
  return recoverable.intentionally_not_resumable_yet.some(
    (entry) => !INTENTIONALLY_NOT_RESUMABLE_YET.includes(entry)
  );
}

export function restoreRuntimeStateFromRecoverable(
  value: unknown,
  options?: RestoreRuntimeStateOptions
): RestoreRuntimeStateResult {
  if (!isRecoverableRuntimeState(value)) {
    return {
      restored: false,
      errorCode: "invalid_recoverable_state",
      message: "invalid recoverable runtime state"
    };
  }

  if (hasInvalidNotResumableScope(value)) {
    return {
      restored: false,
      errorCode: "invalid_recoverable_state",
      message: "recoverable state contains unknown non-resumable scope markers"
    };
  }

  const boundaryError = validateSupportedRestoreBoundary(value);
  if (boundaryError) {
    return boundaryError;
  }

  const surfaceProfileName = value.profile?.name;
  if (
    options?.expectedProfileName &&
    surfaceProfileName &&
    options.expectedProfileName !== surfaceProfileName
  ) {
    return {
      restored: false,
      errorCode: "profile_mismatch",
      message: `profile mismatch: expected ${options.expectedProfileName}, got ${surfaceProfileName}`
    };
  }

  const runtimeSummary = buildRuntimeSummaryFromRecoverable(value);
  const baseFailure = value.failure_signal ? { ...value.failure_signal } : {};
  const failure =
    runtimeSummary || Object.keys(baseFailure).length > 0
      ? {
          ...baseFailure,
          ...(runtimeSummary ? { runtimeSummary } : {})
        }
      : undefined;

  const state: AgentState = {
    runId: value.runtime.run_id,
    status: value.runtime.status,
    goal: value.runtime.goal,
    planId: value.runtime.plan_id,
    currentTaskId: value.runtime.current_task_id,
    currentMilestoneId: value.runtime.current_milestone_id,
    lastEffectRequestKind: value.runtime.last_effect_request_kind,
    lastEffectResultKind: value.runtime.last_effect_result_kind,
    failure
  };

  return {
    restored: true,
    state,
    profileName: surfaceProfileName ?? options?.expectedProfileName
  };
}
