import type { AgentPolicy } from "../contracts/policy.js";
import type { AgentState } from "../contracts/state.js";
import type { LlmPort } from "../contracts/llm.js";
import type { Planner, PlanChangeRequestV2, PlanPatchOperation, PlanTask, PlanV1 } from "../contracts/planning.js";
import { summarizeState } from "./state_summary.js";
import { setStateError } from "./errors.js";
import { recordPlanChange } from "./recorder.js";
import type { AgentTurnAuditCollector } from "./audit.js";
import { interpretPlanChangeReview } from "./plan_change_review.js";
import type { AgentEvent } from "./events.js";
import type { PlanChangeReviewFn } from "./contracts.js";
import { PLAN_INSTRUCTIONS } from "../contracts/planning.js";

const evaluatePlanChange = (args: {
  request: PlanChangeRequestV2;
  policy: AgentPolicy;
}): { status: "needs_user_review" | "denied"; reason: string; guidance?: string } => {
  if (!Array.isArray(args.request.patch) || args.request.patch.length === 0) {
    return { status: "denied", reason: "Plan change patch is empty", guidance: "Provide at least one patch operation." };
  }

  for (const op of args.request.patch) {
    if ((op.action === "acceptance.update" && args.policy.acceptance.locked) || (op.action === "techStack.update" && args.policy.tech_stack_locked)) {
      return {
        status: "denied",
        reason: `Patch action ${op.action} is not allowed by policy lock`,
        guidance: "Avoid changing locked acceptance or tech stack fields."
      };
    }
  }

  return { status: "needs_user_review", reason: "Plan change requires user review" };
};

const moveTask = (tasks: PlanTask[], taskId: string, afterTaskId?: string): PlanTask[] => {
  const idx = tasks.findIndex((task) => task.id === taskId);
  if (idx < 0) return tasks;
  const [task] = tasks.splice(idx, 1);
  if (!afterTaskId) {
    tasks.unshift(task);
    return tasks;
  }
  const afterIdx = tasks.findIndex((item) => item.id === afterTaskId);
  if (afterIdx < 0) {
    tasks.push(task);
  } else {
    tasks.splice(afterIdx + 1, 0, task);
  }
  return tasks;
};

const applyPlanChangePatch = (plan: PlanV1, request: PlanChangeRequestV2): PlanV1 => {
  const tasks = [...plan.tasks];

  for (const op of request.patch) {
    if (op.action === "tasks.add") {
      const next = { ...op.task, dependencies: [...(op.task.dependencies ?? [])], success_criteria: [...(op.task.success_criteria ?? [])] };
      if (!op.after_task_id) {
        tasks.unshift(next);
      } else {
        const afterIdx = tasks.findIndex((task) => task.id === op.after_task_id);
        if (afterIdx < 0) tasks.push(next);
        else tasks.splice(afterIdx + 1, 0, next);
      }
      continue;
    }
    if (op.action === "tasks.remove") {
      const idx = tasks.findIndex((task) => task.id === op.task_id);
      if (idx >= 0) tasks.splice(idx, 1);
      continue;
    }
    if (op.action === "tasks.update") {
      const idx = tasks.findIndex((task) => task.id === op.task_id);
      if (idx < 0) continue;
      tasks[idx] = {
        ...tasks[idx],
        ...(op.changes as Partial<PlanTask>),
        dependencies: Array.isArray((op.changes as Partial<PlanTask>).dependencies)
          ? [ ...((op.changes as Partial<PlanTask>).dependencies as string[]) ]
          : tasks[idx].dependencies,
        success_criteria: Array.isArray((op.changes as Partial<PlanTask>).success_criteria)
          ? [ ...((op.changes as Partial<PlanTask>).success_criteria as PlanTask["success_criteria"]) ]
          : tasks[idx].success_criteria
      };
      continue;
    }
    if (op.action === "tasks.reorder") {
      moveTask(tasks, op.task_id, op.after_task_id);
      continue;
    }
  }

  return {
    ...plan,
    tasks
  };
};

export const handleReplan = async (args: {
  provider: LlmPort;
  planner: Planner;
  state: AgentState;
  policy: AgentPolicy;
  failedTaskId: string;
  failures: string[];
  replans: number;
  audit: AgentTurnAuditCollector;
  turn: number;
  requestPlanChangeReview: PlanChangeReviewFn;
  onEvent?: (event: AgentEvent) => void;
}): Promise<{ ok: boolean; replans: number }> => {
  const { provider, planner, state, policy } = args;
  const currentPlan = state.planData;
  if (!currentPlan) {
    setStateError(state, "Config", "Missing current plan during replan");
    state.status = "failed";
    return { ok: false, replans: args.replans };
  }

  if (!planner.proposePlanChange) {
    state.status = "failed";
    setStateError(state, "Config", "Planner does not support plan changes.");
    return { ok: false, replans: args.replans };
  }

  state.status = "replanning";
  const changeProposal = await planner.proposePlanChange({
    provider,
    goal: state.goal,
    currentPlan,
    policy,
    stateSummary: {
      ...(summarizeState(state) as Record<string, unknown>),
      failedTask: args.failedTaskId,
      failures: args.failures
    },
    failureEvidence: args.failures,
    previousResponseId: state.lastResponseId,
    instructions: PLAN_INSTRUCTIONS,
    truncation: state.flags.truncation,
    contextManagement:
      typeof state.flags.compactionThreshold === "number"
        ? [{ type: "compaction", compactThreshold: state.flags.compactionThreshold }]
        : undefined
  });

  args.onEvent?.({ type: "replan_proposed" });
  state.lastResponseId = changeProposal.responseId ?? state.lastResponseId;
  state.planHistory?.push({ type: "change_request", request: changeProposal.changeRequest });

  const gateResult = evaluatePlanChange({
    request: changeProposal.changeRequest,
    policy
  });

  recordPlanChange({
    audit: args.audit,
    turn: args.turn,
    llmRaw: changeProposal.raw,
    previousResponseIdSent: changeProposal.previousResponseIdSent,
    responseId: changeProposal.responseId,
    usage: changeProposal.usage,
    gateResult
  });

  state.planHistory?.push({ type: "change_gate_result", gateResult });
  args.onEvent?.({
    type: "replan_gate",
    status: gateResult.status,
    reason: gateResult.reason,
    guidance: gateResult.guidance
  });

  if (gateResult.status === "denied") {
    state.status = "failed";
    setStateError(state, "Config", `Plan change denied: ${gateResult.reason}. Guidance: ${gateResult.guidance}`);
    return { ok: false, replans: args.replans };
  }

  const policySummary = {
    acceptanceLocked: policy.acceptance.locked,
    techStackLocked: policy.tech_stack_locked,
    allowedTools: policy.safety.allowed_tools
  };

  const userText = await args.requestPlanChangeReview({
    request: changeProposal.changeRequest,
    gateResult,
    policySummary,
    promptHint: "Use natural language: approve/reject this plan change. If rejecting, provide specific fix direction."
  });

  state.planHistory?.push({ type: "change_user_review_text", text: userText });
  args.onEvent?.({ type: "replan_review_text", text: userText.length > 240 ? `${userText.slice(0, 240)}...` : userText });

  const interpreted = await interpretPlanChangeReview({
    provider,
    request: changeProposal.changeRequest,
    gateResult,
    policySummary,
    userInput: userText,
    previousResponseId: state.lastResponseId,
    truncation: state.flags.truncation,
    contextManagement:
      typeof state.flags.compactionThreshold === "number"
        ? [{ type: "compaction", compactThreshold: state.flags.compactionThreshold }]
        : undefined
  });

  state.lastResponseId = interpreted.responseId ?? state.lastResponseId;
  state.planHistory?.push({ type: "change_review_outcome", outcome: interpreted.outcome });

  if (interpreted.outcome.decision === "denied") {
    state.status = "failed";
    setStateError(
      state,
      "Config",
      `Plan change denied by user review: ${interpreted.outcome.reason}. Guidance: ${interpreted.outcome.guidance}`
    );
    return { ok: false, replans: args.replans };
  }

  if (args.replans >= policy.budgets.max_replans) {
    state.status = "failed";
    setStateError(state, "Config", `Replan budget exceeded: ${args.replans} >= ${policy.budgets.max_replans}`);
    return { ok: false, replans: args.replans };
  }

  if (!interpreted.outcome.patch || interpreted.outcome.patch.length === 0) {
    state.status = "failed";
    setStateError(state, "Config", "Approved plan review outcome did not provide a patch.");
    return { ok: false, replans: args.replans };
  }

  const approvedPatchRequest: PlanChangeRequestV2 = {
    ...changeProposal.changeRequest,
    patch: interpreted.outcome.patch as PlanPatchOperation[]
  };

  state.planData = applyPlanChangePatch(currentPlan, approvedPatchRequest);
  state.planVersion = (state.planVersion ?? 1) + 1;
  state.planHistory?.push({ type: "change_applied", version: state.planVersion, patch: approvedPatchRequest.patch });
  args.onEvent?.({ type: "replan_applied", newVersion: state.planVersion });
  return { ok: true, replans: args.replans + 1 };
};
