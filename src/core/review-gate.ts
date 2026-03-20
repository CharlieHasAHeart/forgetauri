import {
  hasEffectResultFailureSignal,
  isPlan,
  isTask,
  type AgentState,
  type EffectRequest,
  type EffectResult,
  type Plan,
  type Task
} from "../protocol/index.js";
import {
  resolveReviewPreExecutionMode,
  shouldEscalateFindTextNotFound,
  shouldEscalatePolicyPathOutsideBoundary
} from "../profiles/index.js";
import {
  buildRunReviewRequest,
  type ReviewGateSource
} from "./build-effect-request.js";
import { selectNextTask } from "./select-next-task.js";

export const PRE_EXECUTION_REVIEW_TAG =
  "[review_gate:pre_execution_controlled_single_file_text_modification]";

function selectReviewTask(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[]
): { plan: Plan; task: Task } | undefined {
  if (!plan || !isPlan(plan)) {
    return undefined;
  }

  const validTasks = tasks.filter((task): task is Task => isTask(task));
  const task = selectNextTask(state, plan, validTasks);

  if (!task) {
    return undefined;
  }

  return { plan, task };
}

export function shouldRequirePreExecutionReview(task: Task): boolean {
  const mode = resolveReviewPreExecutionMode(undefined);

  if (mode === "disabled") {
    return false;
  }

  if (mode === "always") {
    return true;
  }

  return typeof task.summary === "string" && task.summary.includes(PRE_EXECUTION_REVIEW_TAG);
}

export function isReviewEscalationFailureResult(result: EffectResult | undefined): boolean {
  if (!result || result.kind !== "action_results" || result.success) {
    return false;
  }

  if (!hasEffectResultFailureSignal(result)) {
    return false;
  }

  const message = result.failure_signal.message ?? "";
  if (
    shouldEscalatePolicyPathOutsideBoundary(undefined) &&
    message.startsWith("policy_refused: target path outside allowed boundary")
  ) {
    return true;
  }

  if (
    shouldEscalateFindTextNotFound(undefined) &&
    message.startsWith("execution_failed: find_text not found")
  ) {
    return true;
  }

  return false;
}

function buildReviewGateSummary(source: ReviewGateSource, task: Task): string {
  if (source === "pre_execution") {
    return `review required before executing controlled_single_file_text_modification for ${task.id}`;
  }

  return `review required after escalated failure for ${task.id}`;
}

export function maybeBuildReviewGateRequest(
  state: AgentState,
  plan: Plan | undefined,
  tasks: Task[],
  result?: EffectResult
): EffectRequest | undefined {
  const selected = selectReviewTask(state, plan, tasks);
  if (!selected) {
    return undefined;
  }

  if (isReviewEscalationFailureResult(result)) {
    return buildRunReviewRequest(
      state,
      selected.plan,
      selected.task,
      "failure_escalation",
      buildReviewGateSummary("failure_escalation", selected.task)
    );
  }

  // Stage 3.2 keeps pre-execution gate minimal and explicit:
  // only tagged tasks are forced through review before first action execution.
  if (
    !result &&
    state.lastEffectResultKind === undefined &&
    shouldRequirePreExecutionReview(selected.task)
  ) {
    return buildRunReviewRequest(
      state,
      selected.plan,
      selected.task,
      "pre_execution",
      buildReviewGateSummary("pre_execution", selected.task)
    );
  }

  return undefined;
}
