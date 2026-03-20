import {
  isEffectRequest,
  isPlan,
  isTask,
  type ReviewNextAction,
  type AgentState,
  type EffectRequest,
  type Plan,
  type RequestRef,
  type Task
} from "../protocol/index.js";
import { selectNextTask } from "./select-next-task.js";
import { isAgentStateTerminal } from "./terminal.js";

export function buildTaskEffectPayload(
  state: AgentState,
  plan: Plan,
  task: Task
): Record<string, unknown> {
  return {
    runId: state.runId,
    goal: state.goal,
    planId: plan.id,
    taskId: task.id,
    taskTitle: task.title
  };
}

export function buildExecuteActionsRequest(
  state: AgentState,
  plan: Plan,
  task: Task
): EffectRequest {
  const requestRef: RequestRef = {
    run_id: state.runId,
    plan_id: plan.id,
    task_id: task.id,
    request_kind: "execute_actions"
  };

  return {
    kind: "execute_actions",
    payload: buildTaskEffectPayload(state, plan, task),
    request_ref: requestRef,
    context: {
      currentTaskId: task.id,
      planId: plan.id,
      request_ref: requestRef
    }
  };
}

export type ReviewGateSource = "pre_execution" | "failure_escalation";

export function buildRunReviewRequest(
  state: AgentState,
  plan: Plan,
  task: Task,
  source: ReviewGateSource,
  summary: string,
  decisionOverride?: ReviewNextAction
): EffectRequest {
  const requestRef: RequestRef = {
    run_id: state.runId,
    plan_id: plan.id,
    task_id: task.id,
    request_kind: "run_review"
  };

  return {
    kind: "run_review",
    payload: {
      review_request: {
        kind: "task",
        target: task.id,
        summary
      },
      gate: {
        source,
        capability: "controlled_single_file_text_modification"
      },
      decision_override: decisionOverride
    },
    request_ref: requestRef,
    context: {
      currentTaskId: task.id,
      planId: plan.id,
      request_ref: requestRef
    }
  };
}

export function buildNextEffectRequest(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[]
): EffectRequest | undefined {
  if (isAgentStateTerminal(state)) {
    return undefined;
  }

  if (!plan || !isPlan(plan)) {
    return undefined;
  }

  const validTasks = tasks.filter((task): task is Task => isTask(task));
  const nextTask = selectNextTask(state, plan, validTasks);

  if (!nextTask) {
    return undefined;
  }

  return buildExecuteActionsRequest(state, plan, nextTask);
}

export function hasEffectRequest(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[]
): boolean {
  return buildNextEffectRequest(state, plan, tasks) !== undefined;
}

export function ensureEffectRequest(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[]
): EffectRequest | undefined {
  const result = buildNextEffectRequest(state, plan, tasks);

  if (result && !isEffectRequest(result)) {
    return undefined;
  }

  return result;
}
