import {
  type AgentState,
  type EffectRequest,
  type EffectResult,
  type Plan,
  type Task
} from "../protocol/index.js";
import { isCoreRunStable } from "./drive-core-run.js";
import {
  applyRuntimeStepResult,
  readCoreRuntimeSummary,
  resolveRuntimeStepProgression,
  type CoreRuntimeSummary,
  type RuntimeStepProgression,
  writeCoreRuntimeSummary
} from "./apply-runtime-step-result.js";
import { canRunEffectCycle } from "./run-effect-cycle.js";
import { prepareRuntimeStepState } from "./prepare-runtime-step-state.js";
import {
  canPrepareRuntimeStepRequestAfterResult,
  prepareRuntimeStepRequest
} from "./prepare-runtime-step-request.js";
import { isAgentStateTerminal } from "./terminal.js";
import { cloneAgentState } from "./transition-engine.js";

export interface RuntimeTickOutput {
  state: AgentState;
  request?: EffectRequest;
  tickSummary: RuntimeTickSummary;
}

export type RuntimeTickProgression = RuntimeStepProgression;

export interface RuntimeTickSummary {
  progression: RuntimeTickProgression;
  holdReason?: string;
  orchestration?: string;
  resultKind?: string;
  requestKind?: string;
  failureSummary?: string;
}

export function prepareRuntimeTickState(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[]
): AgentState {
  return prepareRuntimeStepState(state, plan, tasks);
}

export function resolveRuntimeTickProgression(
  state: AgentState,
  result: EffectResult | undefined
): RuntimeTickProgression {
  if (isAgentStateTerminal(state)) {
    return "terminal";
  }

  const shared = readCoreRuntimeSummary(state);
  if (
    !result &&
    (shared?.orchestration === "waiting_for_repair" ||
      shared?.orchestration === "waiting_for_replan")
  ) {
    return "hold_current_task";
  }

  return resolveRuntimeStepProgression(result);
}

export function prepareRuntimeTickRequest(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[],
  result?: EffectResult
): EffectRequest | undefined {
  return prepareRuntimeStepRequest(state, plan, tasks, result);
}

export function applyRuntimeTickResult(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[],
  result: EffectResult | undefined
): AgentState {
  return applyRuntimeStepResult(state, plan, tasks, result);
}

export function extractRuntimeTickFailureSummary(
  state: AgentState,
  _result: EffectResult | undefined
): string | undefined {
  const summary = readCoreRuntimeSummary(state);
  if (summary?.failureSummary) {
    return summary.failureSummary;
  }

  return undefined;
}

export function buildRuntimeTickSummary(
  state: AgentState,
  result: EffectResult | undefined,
  request: EffectRequest | undefined,
  progression: RuntimeTickProgression
): RuntimeTickSummary {
  const shared = readCoreRuntimeSummary(state);

  return {
    progression: shared?.progression ?? progression,
    holdReason: shared?.holdReason,
    orchestration: shared?.orchestration,
    resultKind: shared?.resultKind,
    requestKind: request?.kind ?? shared?.requestKind,
    failureSummary: shared?.failureSummary ?? extractRuntimeTickFailureSummary(state, result)
  };
}

export function applyRuntimeTickRequestSummary(
  state: AgentState,
  request: EffectRequest | undefined,
  progression: RuntimeTickProgression
): AgentState {
  const shared = readCoreRuntimeSummary(state);
  if (!shared) {
    return state;
  }

  const summary: CoreRuntimeSummary = {
    progression: shared?.progression ?? progression,
    holdReason: shared?.holdReason,
    orchestration: shared?.orchestration,
    resultKind: shared?.resultKind,
    requestKind: request?.kind,
    failureSummary: shared?.failureSummary
  };

  return writeCoreRuntimeSummary(state, summary);
}

export function runRuntimeTick(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[],
  result: EffectResult | undefined
): RuntimeTickOutput {
  if (isAgentStateTerminal(state)) {
    const terminalState = cloneAgentState(state);
    return {
      state: terminalState,
      tickSummary: buildRuntimeTickSummary(terminalState, result, undefined, "terminal")
    };
  }

  const preparedState = prepareRuntimeTickState(state, plan, tasks);
  const appliedState = applyRuntimeTickResult(preparedState, plan, tasks, result);
  const progression = resolveRuntimeTickProgression(appliedState, result);
  const canPrepareRequest =
    progression === "continueable" && canPrepareRuntimeStepRequestAfterResult(result);
  const request = canPrepareRequest
    ? prepareRuntimeTickRequest(appliedState, plan, tasks, result)
    : undefined;
  const stateWithSummary = applyRuntimeTickRequestSummary(appliedState, request, progression);
  const tickSummary = buildRuntimeTickSummary(stateWithSummary, result, request, progression);

  return {
    state: stateWithSummary,
    request,
    tickSummary
  };
}

export function canRunRuntimeTick(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[],
  result: EffectResult | undefined
): boolean {
  if (isAgentStateTerminal(state)) {
    return false;
  }

  return !isCoreRunStable(state, plan, tasks) || canRunEffectCycle(state, plan, tasks, result);
}

export function peekRuntimeTickRequest(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[]
): EffectRequest | undefined {
  const preparedState = prepareRuntimeTickState(state, plan, tasks);
  return prepareRuntimeTickRequest(preparedState, plan, tasks);
}
