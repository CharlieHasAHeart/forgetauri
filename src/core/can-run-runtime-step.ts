import { type AgentState, type EffectResult, type Plan, type Task } from "../protocol/index.js";
import { canRunRuntimeTick } from "./run-runtime-tick.js";

export function canRunRuntimeStep(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[],
  incomingResult: EffectResult | undefined
): boolean {
  return canRunRuntimeTick(state, plan, tasks, incomingResult);
}
