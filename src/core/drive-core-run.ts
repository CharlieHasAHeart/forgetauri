import { type AgentState, type Plan, type Task } from "../protocol/index.js";
import { canRunSingleStep, runSingleStep } from "./run-single-step.js";
import { isAgentStateTerminal } from "./terminal.js";
import { cloneAgentState } from "./transition-engine.js";

export function driveCoreRunOnce(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[]
): AgentState {
  if (isAgentStateTerminal(state)) {
    return cloneAgentState(state);
  }

  return runSingleStep(state, plan, tasks);
}

export function shouldContinueCoreRun(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[]
): boolean {
  if (isAgentStateTerminal(state)) {
    return false;
  }

  return canRunSingleStep(state, plan, tasks);
}

export function driveCoreRun(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[]
): AgentState {
  if (isAgentStateTerminal(state)) {
    return cloneAgentState(state);
  }

  let currentState = state;

  for (let step = 0; step < 100; step += 1) {
    if (!shouldContinueCoreRun(currentState, plan, tasks)) {
      break;
    }

    currentState = driveCoreRunOnce(currentState, plan, tasks);
  }

  return currentState;
}

export function driveCoreRunSteps(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[],
  maxSteps: number
): AgentState {
  if (maxSteps <= 0) {
    return cloneAgentState(state);
  }

  if (isAgentStateTerminal(state)) {
    return cloneAgentState(state);
  }

  let currentState = state;

  for (let step = 0; step < maxSteps; step += 1) {
    if (!shouldContinueCoreRun(currentState, plan, tasks)) {
      break;
    }

    currentState = driveCoreRunOnce(currentState, plan, tasks);
  }

  return currentState;
}

export function isCoreRunStable(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[]
): boolean {
  if (isAgentStateTerminal(state)) {
    return true;
  }

  if (!canRunSingleStep(state, plan, tasks)) {
    return true;
  }

  return false;
}
