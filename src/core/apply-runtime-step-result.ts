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
export type RuntimeStepHoldReason = "repair" | "replan" | "non_terminal_failure";
export type RuntimeStepOrchestrationState = "waiting_for_repair" | "waiting_for_replan";
export type RuntimeStepSignal =
  | "continue"
  | "hold_for_repair"
  | "hold_for_replan"
  | "review_rejected_run_terminal"
  | "continue_after_failure"
  | "hold_because_non_terminal_failure"
  | "terminal_failure";

export interface CoreRuntimeSummary {
  progression: RuntimeStepProgression;
  signal?: RuntimeStepSignal;
  holdReason?: RuntimeStepHoldReason;
  orchestration?: RuntimeStepOrchestrationState;
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
  const signal = Reflect.get(value, "signal");
  const holdReason = Reflect.get(value, "holdReason");
  const orchestration = Reflect.get(value, "orchestration");
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
    signal:
      signal === "continue" ||
      signal === "hold_for_repair" ||
      signal === "hold_for_replan" ||
      signal === "review_rejected_run_terminal" ||
      signal === "continue_after_failure" ||
      signal === "hold_because_non_terminal_failure" ||
      signal === "terminal_failure"
        ? signal
        : undefined,
    holdReason:
      holdReason === "repair" ||
      holdReason === "replan" ||
      holdReason === "non_terminal_failure"
        ? holdReason
        : undefined,
    orchestration:
      orchestration === "waiting_for_repair" || orchestration === "waiting_for_replan"
        ? orchestration
        : undefined,
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
    signal: resolveRuntimeStepSignal(result, progression),
    holdReason: resolveRuntimeStepHoldReason(result, progression),
    orchestration: resolveRuntimeStepOrchestrationState(result, progression),
    resultKind: result.kind,
    requestKind: previous?.requestKind,
    failureSummary: extractStepFailureSummary(state, result)
  };
}

export function resolveRuntimeStepSignal(
  result: EffectResult,
  progression: RuntimeStepProgression
): RuntimeStepSignal {
  if (result.kind === "review_result") {
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

  if (result.success) {
    return "continue";
  }

  if (progression === "terminal") {
    return "terminal_failure";
  }

  if (progression === "hold_current_task") {
    return "hold_because_non_terminal_failure";
  }

  return "continue_after_failure";
}

export function resolveRuntimeStepHoldReason(
  result: EffectResult,
  progression: RuntimeStepProgression
): RuntimeStepHoldReason | undefined {
  if (progression !== "hold_current_task") {
    return undefined;
  }

  if (result.kind === "review_result") {
    if (result.payload.next_action === "repair") {
      return "repair";
    }

    if (result.payload.next_action === "replan") {
      return "replan";
    }
  }

  return "non_terminal_failure";
}

export function resolveRuntimeStepOrchestrationState(
  result: EffectResult,
  progression: RuntimeStepProgression
): RuntimeStepOrchestrationState | undefined {
  if (progression !== "hold_current_task" || result.kind !== "review_result") {
    return undefined;
  }

  if (result.payload.next_action === "repair") {
    return "waiting_for_repair";
  }

  if (result.payload.next_action === "replan") {
    return "waiting_for_replan";
  }

  return undefined;
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

  if (hasEffectResultFailureSignal(result)) {
    return "hold_current_task";
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
