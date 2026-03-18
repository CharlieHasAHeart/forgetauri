import {
  isEffectResult,
  isFailedEffectResult,
  isSuccessfulEffectResult,
  type ActionResultsEffectResult,
  type AgentState,
  type EffectResult,
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

export function applyActionResultsEffectResult(
  state: AgentState,
  result: ActionResultsEffectResult
): AgentState {
  const withKind = setLastEffectResultKind(state, result.kind);

  if (isSuccessfulEffectResult(result)) {
    return clearCurrentTaskAfterEffect(withKind);
  }

  return withKind;
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
    return withKind;
  }

  if (nextAction === "replan") {
    return withKind;
  }

  if (nextAction === "stop") {
    return transitionAgentState(withKind, "failed");
  }

  return withKind;
}

export function applySuccessfulEffectResult(
  state: AgentState,
  result: EffectResult
): AgentState {
  if (result.kind === "action_results") {
    return applyActionResultsEffectResult(state, result);
  }

  if (result.kind === "review_result") {
    return applyReviewEffectResult(state, result);
  }

  return setLastEffectResultKind(state, result.kind);
}

export function applyFailedEffectResult(
  state: AgentState,
  result: EffectResult
): AgentState {
  if (result.kind === "action_results") {
    return applyActionResultsEffectResult(state, result);
  }

  if (result.kind === "review_result") {
    return applyReviewEffectResult(state, result);
  }

  return setLastEffectResultKind(state, result.kind);
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
