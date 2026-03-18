import {
  hasEffectResultFailureSignal,
  isEffectResult,
  type AgentState,
  type EffectResult,
  type Plan,
  type Task
} from "../protocol/index.js";
import { canRunEffectCycle, runEffectCycle } from "./run-effect-cycle.js";
import { isAgentStateTerminal } from "./terminal.js";
import { cloneAgentState } from "./transition-engine.js";

export type RuntimeStepProgression = "continueable" | "hold_current_task" | "terminal";

export interface CoreRuntimeSummary {
  progression: RuntimeStepProgression;
  resultKind?: string;
  requestKind?: string;
  failureSummary?: string;
}

export function readCoreRuntimeSummary(state: AgentState): CoreRuntimeSummary | undefined {
  if (typeof state.failure !== "object" || state.failure === null) {
    return undefined;
  }

  const value = Reflect.get(state.failure, "runtimeSummary");
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const progression = Reflect.get(value, "progression");
  const resultKind = Reflect.get(value, "resultKind");
  const requestKind = Reflect.get(value, "requestKind");
  const failureSummary = Reflect.get(value, "failureSummary");

  if (
    progression !== "continueable" &&
    progression !== "hold_current_task" &&
    progression !== "terminal"
  ) {
    return undefined;
  }

  return {
    progression,
    resultKind: typeof resultKind === "string" ? resultKind : undefined,
    requestKind: typeof requestKind === "string" ? requestKind : undefined,
    failureSummary: typeof failureSummary === "string" ? failureSummary : undefined
  };
}

export function writeCoreRuntimeSummary(
  state: AgentState,
  summary: CoreRuntimeSummary
): AgentState {
  const baseFailure =
    typeof state.failure === "object" && state.failure !== null ? state.failure : {};

  return {
    ...state,
    failure: {
      ...baseFailure,
      runtimeSummary: summary
    }
  };
}

export function extractStepFailureSummary(
  state: AgentState,
  result: EffectResult
): string | undefined {
  if (hasEffectResultFailureSignal(result)) {
    return result.failure_signal.summary ?? result.failure_signal.message;
  }

  const stateFailureSummary =
    typeof state.failure === "object" && state.failure !== null
      ? Reflect.get(state.failure, "summary")
      : undefined;
  if (typeof stateFailureSummary === "string") {
    return stateFailureSummary;
  }

  const stateFailureMessage =
    typeof state.failure === "object" && state.failure !== null
      ? Reflect.get(state.failure, "message")
      : undefined;
  if (typeof stateFailureMessage === "string") {
    return stateFailureMessage;
  }

  return undefined;
}

export function buildCoreRuntimeSummaryFromStep(
  state: AgentState,
  result: EffectResult,
  progression: RuntimeStepProgression
): CoreRuntimeSummary {
  const previous = readCoreRuntimeSummary(state);

  return {
    progression,
    resultKind: result.kind,
    requestKind: previous?.requestKind,
    failureSummary: extractStepFailureSummary(state, result)
  };
}

export function resolveRuntimeStepProgression(
  result: EffectResult | undefined
): RuntimeStepProgression {
  if (!result) {
    return "continueable";
  }

  if (result.kind === "review_result") {
    if (result.payload.next_action === "stop") {
      return "terminal";
    }

    if (result.payload.next_action === "repair") {
      return "hold_current_task";
    }

    if (result.payload.next_action === "replan") {
      return "hold_current_task";
    }

    return "continueable";
  }

  if (result.success) {
    return "continueable";
  }

  if (hasEffectResultFailureSignal(result) && result.failure_signal.terminal) {
    return "terminal";
  }

  return "continueable";
}

export function applyRuntimeStepResult(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[],
  result: EffectResult | undefined
): AgentState {
  if (isAgentStateTerminal(state)) {
    return cloneAgentState(state);
  }

  if (!canRunEffectCycle(state, plan, tasks, result)) {
    return cloneAgentState(state);
  }

  const nextState = runEffectCycle(state, plan, tasks, result);

  if (!result || !isEffectResult(result)) {
    return nextState;
  }

  const progression = resolveRuntimeStepProgression(result);
  const summary = buildCoreRuntimeSummaryFromStep(nextState, result, progression);

  return writeCoreRuntimeSummary(nextState, summary);
}
