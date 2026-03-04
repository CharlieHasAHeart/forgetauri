import type { LlmPort } from "../../contracts/llm.js";
import type { PlanTask, PlanV1, Planner, ToolCall } from "../../contracts/planning.js";
import type { AgentPolicy } from "../../contracts/policy.js";
import type { RuntimePathsResolver } from "../../contracts/runtime.js";
import type { AgentState } from "../../contracts/state.js";
import type { ToolRunContext, ToolSpec } from "../../contracts/tools.js";
import type { KernelHooks } from "../../contracts/hooks.js";
import type { AgentTurnAuditCollector } from "../telemetry/audit.js";
import { executeActionPlan } from "../execution/executor.js";
import { setStateError } from "../execution/errors.js";
import type { AgentEvent } from "../telemetry/events.js";
import { recordTaskActionPlan } from "../telemetry/recorder.js";
import { summarizeState } from "../state/state_summary.js";
import { gateToolCalls } from "../policy/toolcall_gate.js";
import { summarizePlan } from "../util/util.js";
import type { HumanReviewFn } from "../contracts.js";

const PLANNER_OUTPUT_INVALID_RETRY_HINT =
  "PlannerOutputInvalid: toolCalls must be array of {name,input}. input must be a JSON value (not undefined). Fix and return valid tool calls.";

export const runTaskAttempt = async (args: {
  turn: number;
  goal: string;
  provider: LlmPort;
  planner: Planner;
  policy: AgentPolicy;
  task: PlanTask;
  currentPlan: PlanV1;
  completed: Set<string>;
  recentFailures: string[];
  state: AgentState;
  registry: Record<string, ToolSpec<any>>;
  ctx: ToolRunContext;
  maxToolCallsPerTurn: number;
  runtimePathsResolver: RuntimePathsResolver;
  hooks?: KernelHooks;
  audit: AgentTurnAuditCollector;
  humanReview?: HumanReviewFn;
  onEvent?: (event: AgentEvent) => void;
}): Promise<{
  ok: boolean;
  failures: string[];
  toolCalls: ToolCall[];
  turnAuditResults: Array<{ name: string; ok: boolean; error?: string; touchedPaths?: string[] }>;
}> => {
  const runtimePaths = args.runtimePathsResolver(args.ctx, args.state);
  args.ctx.memory.repoRoot = runtimePaths.repoRoot;
  args.ctx.memory.appDir = runtimePaths.appDir;
  args.ctx.memory.tauriDir = runtimePaths.tauriDir;
  args.ctx.memory.runtimePaths = runtimePaths;
  args.state.runtimePaths = runtimePaths;
  args.state.appDir = runtimePaths.appDir;

  const planSummary = summarizePlan(args.currentPlan);
  const stateSummary = {
    ...(summarizeState(args.state) as Record<string, unknown>),
    currentTask: args.task
  };

  let toolCalls: ToolCall[] = [];
  let plannerRaw = "";
  let plannerResponseId: string | undefined;
  let plannerUsage: unknown;
  let plannerPreviousResponseIdSent: string | undefined;
  const plannerRecentFailures = [...args.recentFailures];

  for (let planTry = 1; planTry <= 2; planTry += 1) {
    try {
      const proposal = args.planner.proposeToolCallsForTask
        ? await args.planner.proposeToolCallsForTask({
            goal: args.goal,
            provider: args.provider,
            policy: args.policy,
            task: args.task,
            planSummary,
            stateSummary,
            registry: args.registry,
            recentFailures: plannerRecentFailures,
            maxToolCallsPerTurn: args.maxToolCallsPerTurn,
            previousResponseId: args.state.lastResponseId,
            truncation: args.state.flags.truncation,
            contextManagement:
              typeof args.state.flags.compactionThreshold === "number"
                ? [{ type: "compaction", compactThreshold: args.state.flags.compactionThreshold }]
                : undefined
          })
        : { toolCalls: [], raw: "planner.proposeToolCallsForTask not implemented" };

      plannerRaw = proposal.raw;
      plannerResponseId = proposal.responseId;
      plannerUsage = proposal.usage;
      plannerPreviousResponseIdSent = proposal.previousResponseIdSent;
      args.state.lastResponseId = proposal.responseId ?? args.state.lastResponseId;

      const gated = gateToolCalls({
        toolCalls: proposal.toolCalls,
        maxToolCallsPerTurn: args.maxToolCallsPerTurn,
        policyMaxActionsPerTask: args.policy.budgets.max_actions_per_task
      });

      if (gated.ok) {
        toolCalls = gated.toolCalls;
        break;
      }

      plannerRecentFailures.push(PLANNER_OUTPUT_INVALID_RETRY_HINT);

      if (planTry >= 2) {
        args.state.status = "failed";
        setStateError(args.state, "Config", gated.details);
        return {
          ok: false,
          failures: [gated.details],
          toolCalls: [],
          turnAuditResults: []
        };
      }
    } catch (error) {
      const message = `Failed to propose tool calls for task '${args.task.id}': ${
        error instanceof Error ? error.message : "unknown error"
      }`;
      if (planTry >= 2) {
        args.state.status = "failed";
        setStateError(args.state, "Unknown", message);
        return {
          ok: false,
          failures: [message],
          toolCalls: [],
          turnAuditResults: []
        };
      }
      plannerRecentFailures.push(PLANNER_OUTPUT_INVALID_RETRY_HINT);
    }
  }

  const actionPlanActions = toolCalls.map((item) => ({ name: item.name }));
  args.state.status = "executing";

  const executed = await executeActionPlan({
    toolCalls,
    actionPlanActions,
    registry: args.registry,
    ctx: args.ctx,
    state: args.state,
    policy: args.policy,
    hooks: args.hooks,
    humanReview: args.humanReview,
    task: args.task,
    onEvent: args.onEvent
  });

  const nextRuntimePaths = args.runtimePathsResolver(args.ctx, args.state);
  args.ctx.memory.runtimePaths = nextRuntimePaths;
  args.state.runtimePaths = nextRuntimePaths;

  recordTaskActionPlan({
    audit: args.audit,
    turn: args.turn,
    taskId: args.task.id,
    llmRaw: plannerRaw,
    previousResponseIdSent: plannerPreviousResponseIdSent,
    responseId: plannerResponseId,
    usage: plannerUsage,
    toolCalls,
    toolResults: executed.turnAuditResults
  });

  return {
    ok: executed.criteria.ok,
    failures: executed.criteria.failures,
    toolCalls,
    turnAuditResults: executed.turnAuditResults
  };
};
