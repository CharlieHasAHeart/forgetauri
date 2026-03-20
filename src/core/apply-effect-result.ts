import {
  hasEffectResultFailureSignal,
  isEffectResult,
  isFailedEffectResult,
  isFailureSignal,
  isSuccessfulEffectResult,
  type ActionResultsEffectResult,
  type AgentState,
  type EffectResult,
  type FailureSignal,
  type RepairRecoveryEffectResult,
  type ReplanRecoveryEffectResult,
  type ReviewEffectResult
} from "../protocol/index.js";
import { isAgentStateTerminal } from "./terminal.js";
import { cloneAgentState, transitionAgentState } from "./transition-engine.js";

export type ReviewRuntimeSignal =
  | "continue"
  | "hold_for_repair"
  | "hold_for_replan"
  | "review_rejected_run_terminal";
export type RepairRecoveryRuntimeSignal = "repair_recovered" | "repair_recovery_failed";
export type ReplanRecoveryRuntimeSignal = "replan_recovered" | "replan_recovery_failed";

export function setLastEffectResultKind(
  state: AgentState,
  kind: string | undefined
): AgentState {
  return { ...state, lastEffectResultKind: kind };
}

export function clearCurrentTaskAfterEffect(state: AgentState): AgentState {
  return { ...state, currentTaskId: undefined };
}

export function setFailureSignal(
  state: AgentState,
  signal: FailureSignal
): AgentState {
  return { ...state, failure: signal };
}

export function extractFailureSignalFromResult(
  result: EffectResult
): FailureSignal | undefined {
  if (hasEffectResultFailureSignal(result)) {
    return result.failure_signal;
  }

  if (isFailureSignal(result.context)) {
    return result.context;
  }

  const contextFailureSignal =
    typeof result.context === "object" && result.context !== null
      ? Reflect.get(result.context, "failureSignal")
      : undefined;
  if (isFailureSignal(contextFailureSignal)) {
    return contextFailureSignal;
  }

  const contextFailureSignalSnake =
    typeof result.context === "object" && result.context !== null
      ? Reflect.get(result.context, "failure_signal")
      : undefined;
  if (isFailureSignal(contextFailureSignalSnake)) {
    return contextFailureSignalSnake;
  }

  return undefined;
}

export function resolveFailureSignalForResult(
  result: EffectResult
): FailureSignal | undefined {
  const providedSignal = extractFailureSignalFromResult(result);

  if (providedSignal) {
    return providedSignal;
  }

  if (isFailedEffectResult(result)) {
    return buildDefaultFailureSignalForResult(result);
  }

  if (result.kind === "review_result" && result.payload.next_action !== "continue") {
    return buildDefaultFailureSignalForResult(result);
  }

  return undefined;
}

export function buildDefaultFailureSignalForResult(
  result: EffectResult
): FailureSignal {
  const requestRef = result.request_ref;

  if (result.kind === "action_results") {
    return {
      category: "action",
      source: "shell",
      terminal: false,
      summary: "action_results reported failure",
      request_ref: requestRef,
      evidence_refs: [
        {
          kind: "failure",
          source: "core",
          outcome: "action_results_failed",
          requestKind: "execute_actions",
          summary: "action_results reported failure"
        }
      ]
    };
  }

  if (result.kind === "repair_recovery") {
    return {
      category: "runtime",
      source: "core",
      terminal: false,
      summary: "repair recovery failed",
      request_ref: requestRef,
      evidence_refs: [
        {
          kind: "recovery",
          source: "core",
          outcome: "repair_failed",
          summary: "repair recovery failed"
        }
      ]
    };
  }

  if (result.kind === "replan_recovery") {
    return {
      category: "runtime",
      source: "core",
      terminal: false,
      summary: "replan recovery failed",
      request_ref: requestRef,
      evidence_refs: [
        {
          kind: "recovery",
          source: "core",
          outcome: "replan_failed",
          summary: "replan recovery failed"
        }
      ]
    };
  }

  const reviewSignal = resolveReviewRuntimeSignal(result);

  if (reviewSignal === "review_rejected_run_terminal") {
    return {
      category: "review",
      source: "shell",
      terminal: true,
      summary: "review_result requested stop (review_rejected_run_terminal)",
      request_ref: requestRef,
      evidence_refs: [
        {
          kind: "review",
          source: "core",
          outcome: "review_stop",
          requestKind: "run_review",
          summary: "review_result requested stop (review_rejected_run_terminal)"
        }
      ]
    };
  }

  if (reviewSignal === "hold_for_repair") {
    return {
      category: "review",
      source: "shell",
      terminal: false,
      summary: "review_result requested repair",
      request_ref: requestRef,
      evidence_refs: [
        {
          kind: "review",
          source: "core",
          outcome: "review_repair",
          requestKind: "run_review",
          summary: "review_result requested repair"
        }
      ]
    };
  }

  return {
    category: "review",
    source: "shell",
    terminal: false,
    summary: "review_result requested replan",
    request_ref: requestRef,
    evidence_refs: [
      {
        kind: "review",
        source: "core",
        outcome: "review_replan",
        requestKind: "run_review",
        summary: "review_result requested replan"
      }
    ]
  };
}

export function resolveReviewRuntimeSignal(
  result: ReviewEffectResult
): ReviewRuntimeSignal {
  if (result.payload.next_action === "continue") {
    return "continue";
  }

  if (result.payload.next_action === "repair") {
    return "hold_for_repair";
  }

  if (result.payload.next_action === "replan") {
    return "hold_for_replan";
  }

  return "review_rejected_run_terminal";
}

export function absorbFailureSignal(
  state: AgentState,
  result: EffectResult
): AgentState {
  const signal = resolveFailureSignalForResult(result);

  if (!signal) {
    return state;
  }

  return setFailureSignal(state, signal);
}

export function hasTerminalFailureSignal(result: EffectResult): boolean {
  const signal = resolveFailureSignalForResult(result);
  return signal?.terminal === true;
}

export function applyActionResultsEffectResult(
  state: AgentState,
  result: ActionResultsEffectResult
): AgentState {
  const withKind = setLastEffectResultKind(state, result.kind);

  if (isSuccessfulEffectResult(result)) {
    return clearCurrentTaskAfterEffect(withKind);
  }

  const withFailure = absorbFailureSignal(withKind, result);

  if (hasTerminalFailureSignal(result)) {
    return transitionAgentState(withFailure, "failed");
  }

  return withFailure;
}

export function applyReviewEffectResult(
  state: AgentState,
  result: ReviewEffectResult
): AgentState {
  const withKind = setLastEffectResultKind(state, result.kind);
  const reviewSignal = resolveReviewRuntimeSignal(result);

  if (reviewSignal === "continue") {
    return clearCurrentTaskAfterEffect(withKind);
  }

  if (reviewSignal === "hold_for_repair") {
    const withFailure = absorbFailureSignal(withKind, result);

    if (hasTerminalFailureSignal(result)) {
      return transitionAgentState(withFailure, "failed");
    }

    return withFailure;
  }

  if (reviewSignal === "hold_for_replan") {
    const withFailure = absorbFailureSignal(withKind, result);

    if (hasTerminalFailureSignal(result)) {
      return transitionAgentState(withFailure, "failed");
    }

    return withFailure;
  }

  if (reviewSignal === "review_rejected_run_terminal") {
    const withFailure = absorbFailureSignal(withKind, result);
    return transitionAgentState(withFailure, "failed");
  }

  return withKind;
}

export function resolveRepairRecoveryRuntimeSignal(
  result: RepairRecoveryEffectResult
): RepairRecoveryRuntimeSignal {
  if (result.payload.status === "recovered") {
    return "repair_recovered";
  }

  return "repair_recovery_failed";
}

export function applyRepairRecoveryEffectResult(
  state: AgentState,
  result: RepairRecoveryEffectResult
): AgentState {
  const withKind = setLastEffectResultKind(state, result.kind);
  const signal = resolveRepairRecoveryRuntimeSignal(result);

  if (signal === "repair_recovered") {
    return withKind;
  }

  const withFailure = absorbFailureSignal(withKind, result);
  if (hasTerminalFailureSignal(result)) {
    return transitionAgentState(withFailure, "failed");
  }

  return withFailure;
}

export function resolveReplanRecoveryRuntimeSignal(
  result: ReplanRecoveryEffectResult
): ReplanRecoveryRuntimeSignal {
  if (result.payload.status === "recovered") {
    return "replan_recovered";
  }

  return "replan_recovery_failed";
}

export function applyReplanRecoveryPointer(
  state: AgentState,
  result: ReplanRecoveryEffectResult
): AgentState {
  if (result.payload.next_task_id === undefined) {
    return state;
  }

  return {
    ...state,
    currentTaskId: result.payload.next_task_id
  };
}

export function applyReplanRecoveryEffectResult(
  state: AgentState,
  result: ReplanRecoveryEffectResult
): AgentState {
  const withKind = setLastEffectResultKind(state, result.kind);
  const signal = resolveReplanRecoveryRuntimeSignal(result);

  if (signal === "replan_recovered") {
    return applyReplanRecoveryPointer(withKind, result);
  }

  const withFailure = absorbFailureSignal(withKind, result);
  if (hasTerminalFailureSignal(result)) {
    return transitionAgentState(withFailure, "failed");
  }

  return withFailure;
}

export function applySuccessfulEffectResult(
  state: AgentState,
  result: EffectResult
): AgentState {
  const withKind = setLastEffectResultKind(state, result.kind);

  if (result.kind === "action_results") {
    return applyActionResultsEffectResult(state, result);
  }

  if (result.kind === "review_result") {
    return applyReviewEffectResult(state, result);
  }

  if (result.kind === "repair_recovery") {
    return applyRepairRecoveryEffectResult(state, result);
  }

  if (result.kind === "replan_recovery") {
    return applyReplanRecoveryEffectResult(state, result);
  }

  return withKind;
}

export function applyFailedEffectResult(
  state: AgentState,
  result: EffectResult
): AgentState {
  const withKind = setLastEffectResultKind(state, result.kind);

  if (result.kind === "action_results") {
    return applyActionResultsEffectResult(withKind, result);
  }

  if (result.kind === "review_result") {
    return applyReviewEffectResult(withKind, result);
  }

  if (result.kind === "repair_recovery") {
    return applyRepairRecoveryEffectResult(withKind, result);
  }

  if (result.kind === "replan_recovery") {
    return applyReplanRecoveryEffectResult(withKind, result);
  }

  return absorbFailureSignal(withKind, result);
}

export function applyEffectResult(
  state: AgentState,
  result: EffectResult | undefined
): AgentState {
  if (isAgentStateTerminal(state)) {
    return cloneAgentState(state);
  }

  if (!result || !isEffectResult(result)) {
    return cloneAgentState(state);
  }

  if (isSuccessfulEffectResult(result)) {
    return applySuccessfulEffectResult(state, result);
  }

  if (isFailedEffectResult(result)) {
    return applyFailedEffectResult(state, result);
  }

  return cloneAgentState(state);
}

export function hasApplicableEffectResult(
  state: AgentState,
  result: EffectResult | undefined
): boolean {
  if (isAgentStateTerminal(state)) {
    return false;
  }

  if (!result) {
    return false;
  }

  return isEffectResult(result);
}
