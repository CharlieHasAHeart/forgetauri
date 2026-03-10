import { type AgentState, type EffectResult, type Plan, type Task } from "../protocol/index.js";
import { canRunEffectCycle, runEffectCycle } from "./run-effect-cycle.js";
import { isAgentStateTerminal } from "./terminal.js";
import { cloneAgentState } from "./transition-engine.js";

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

  return runEffectCycle(state, plan, tasks, result);
}
