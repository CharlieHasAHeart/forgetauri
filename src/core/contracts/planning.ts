import type { AgentPolicy } from "./policy.js";
import type { LlmPort } from "./llm.js";
import type { ToolSpec } from "./tools.js";

export type SuccessCriterion =
  | { type: "tool_result"; tool_name: string; expected_ok?: boolean }
  | { type: "file_exists"; path: string }
  | { type: "file_contains"; path: string; contains: string }
  | { type: "command"; cmd: string; args?: string[]; cwd?: string; expect_exit_code?: number };

export type PlanTask = {
  id: string;
  title: string;
  description?: string;
  dependencies: string[];
  success_criteria: SuccessCriterion[];
};

export type PlanV1 = {
  version: "v1";
  goal: string;
  tasks: PlanTask[];
};

export type ToolCall = { name: string; input: unknown; on_fail?: "stop" | "continue" };

export type PlanPatchOperation =
  | { action: "tasks.add"; task: PlanTask; after_task_id?: string }
  | { action: "tasks.remove"; task_id: string }
  | { action: "tasks.update"; task_id: string; changes: Partial<PlanTask> }
  | { action: "tasks.reorder"; task_id: string; after_task_id?: string }
  | { action: "acceptance.update"; changes: Record<string, unknown> }
  | { action: "techStack.update"; changes: Record<string, unknown> };

export type PlanChangeRequestV2 = {
  version: "v2";
  reason: string;
  change_type: string;
  impact?: Record<string, unknown>;
  patch: PlanPatchOperation[];
};

export type Planner = {
  proposePlan: (args: {
    goal: string;
    provider: LlmPort;
    registry: Record<string, ToolSpec<any>>;
    stateSummary: unknown;
    policy: AgentPolicy;
    maxToolCallsPerTurn: number;
    instructions: string;
    previousResponseId?: string;
    truncation?: "auto" | "disabled";
    contextManagement?: Array<{ type: "compaction"; compactThreshold?: number }>;
  }) => Promise<{ plan: PlanV1; raw: string; responseId?: string; usage?: unknown; previousResponseIdSent?: string }>;
  proposeToolCallsForTask?: (args: {
    goal: string;
    provider: LlmPort;
    policy: AgentPolicy;
    task: PlanTask;
    planSummary: unknown;
    stateSummary: unknown;
    registry: Record<string, ToolSpec<any>>;
    recentFailures: string[];
    maxToolCallsPerTurn: number;
    previousResponseId?: string;
    truncation?: "auto" | "disabled";
    contextManagement?: Array<{ type: "compaction"; compactThreshold?: number }>;
  }) => Promise<{ toolCalls: ToolCall[]; raw: string; responseId?: string; usage?: unknown; previousResponseIdSent?: string }>;
  proposePlanChange?: (args: {
    provider: LlmPort;
    goal: string;
    currentPlan: PlanV1;
    policy: AgentPolicy;
    stateSummary: unknown;
    failureEvidence: string[];
    previousResponseId?: string;
    instructions: string;
    truncation?: "auto" | "disabled";
    contextManagement?: Array<{ type: "compaction"; compactThreshold?: number }>;
  }) => Promise<{ changeRequest: PlanChangeRequestV2; raw: string; responseId?: string; usage?: unknown; previousResponseIdSent?: string }>;
};

export const PLAN_INSTRUCTIONS =
  "Generate a deterministic plan-first response. Use concise, machine-checkable tasks and stable IDs.";
