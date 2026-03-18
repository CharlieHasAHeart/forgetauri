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
  type ReviewEffectResult
} from "../protocol/index.js";
import { isAgentStateTerminal } from "./terminal.js";
import { cloneAgentState, transitionAgentState } from "./transition-engine.js";

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
  if (result.kind === "action_results") {
    return {
      category: "action",
      source: "shell",
      terminal: false,
      summary: "action_results reported failure"
    };
  }

  if (result.payload.next_action === "stop") {
    return {
      category: "review",
      source: "shell",
      terminal: true,
      summary: "review_result requested stop"
    };
  }

  if (result.payload.next_action === "repair") {
    return {
      category: "review",
      source: "shell",
      terminal: false,
      summary: "review_result requested repair"
    };
  }

  return {
    category: "review",
    source: "shell",
    terminal: false,
    summary: "review_result requested replan"
  };
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
  const nextAction = result.payload.next_action;

  if (nextAction === "continue") {
    return clearCurrentTaskAfterEffect(withKind);
  }

  if (nextAction === "repair") {
    const withFailure = absorbFailureSignal(withKind, result);

    if (hasTerminalFailureSignal(result)) {
      return transitionAgentState(withFailure, "failed");
    }

    return withFailure;
  }

  if (nextAction === "replan") {
    const withFailure = absorbFailureSignal(withKind, result);

    if (hasTerminalFailureSignal(result)) {
      return transitionAgentState(withFailure, "failed");
    }

    return withFailure;
  }

  if (nextAction === "stop") {
    const withFailure = absorbFailureSignal(withKind, result);
    return transitionAgentState(withFailure, "failed");
  }

  return withKind;
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
