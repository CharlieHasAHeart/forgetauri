import { type AgentState, type Plan, type Task } from "../protocol/index.js";
import { driveCoreRun } from "./drive-core-run.js";
import { isAgentStateTerminal } from "./terminal.js";
import { cloneAgentState } from "./transition-engine.js";

export function prepareRuntimeStepState(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[]
): AgentState {
  if (isAgentStateTerminal(state)) {
    return cloneAgentState(state);
  }

  return driveCoreRun(state, plan, tasks);
}
