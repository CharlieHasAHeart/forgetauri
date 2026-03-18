import {
  isEffectResult,
  type AgentState,
  type EffectRequest,
  type EffectResult,
  type Plan,
  type Task
} from "../protocol/index.js";
import { prepareEffectCycle } from "./run-effect-cycle.js";
import { isAgentStateTerminal } from "./terminal.js";

export type RuntimeStepRequestOrchestrationState =
  | "waiting_for_repair"
  | "waiting_for_replan";

export function readRequestOrchestrationState(
  state: AgentState
): RuntimeStepRequestOrchestrationState | undefined {
  if (typeof state.failure !== "object" || state.failure === null) {
    return undefined;
  }

  const runtimeSummary = Reflect.get(state.failure, "runtimeSummary");
  if (typeof runtimeSummary !== "object" || runtimeSummary === null) {
    return undefined;
  }

  const orchestration = Reflect.get(runtimeSummary, "orchestration");
  if (orchestration === "waiting_for_repair" || orchestration === "waiting_for_replan") {
    return orchestration;
  }

  return undefined;
}

export function canPrepareRuntimeStepRequestAfterResult(
  result: EffectResult | undefined
): boolean {
  if (!result || !isEffectResult(result)) {
    return true;
  }

  if (result.kind === "action_results") {
    if (result.success) {
      return true;
    }

    // Keep current narrow behavior explicit: failed action results may continue
    // with the current task context, but are not treated as success.
    return true;
  }

  const nextAction = result.payload.next_action;

  if (nextAction === "continue") {
    return true;
  }

  if (nextAction === "repair") {
    return false;
  }

  if (nextAction === "replan") {
    return false;
  }

  if (nextAction === "stop") {
    return false;
  }

  return false;
}

export function prepareRuntimeStepRequest(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[],
  result?: EffectResult
): EffectRequest | undefined {
  if (isAgentStateTerminal(state)) {
    return undefined;
  }

  // Minimal orchestration policy: when runtime is explicitly waiting for repair/replan,
  // do not emit a next execution request until a new result changes the waiting state.
  if (readRequestOrchestrationState(state)) {
    return undefined;
  }

  if (!canPrepareRuntimeStepRequestAfterResult(result)) {
    return undefined;
  }

  return prepareEffectCycle(state, plan, tasks);
}
