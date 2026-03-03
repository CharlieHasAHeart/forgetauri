import type { AgentPolicy } from "../../runtime/policy/policy.js";
import type { AgentState } from "../../types.js";
import type { ToolRunContext, ToolSpec, ToolResult } from "../../tools/types.js";
import type { AgentEvent } from "../../runtime/events.js";

export type HumanReviewFn = (args: { reason: string; patchPaths: string[]; phase: AgentState["status"] }) => Promise<boolean>;

export type ToolCallContext = {
  call: { name: string; input: unknown };
  registry: Record<string, ToolSpec<any>>;
  ctx: ToolRunContext;
  state: AgentState;
  policy: AgentPolicy;
  humanReview?: HumanReviewFn;
  onEvent?: (event: AgentEvent) => void;
  tool?: ToolSpec<any>;
  parsedInput?: unknown;
  toolRunResult?: ToolResult;
  runtimePaths?: { repoRoot: string; appDir: string; tauriDir: string };
  evidenceCallId?: string;
};

export type ToolCallResult = {
  ok: boolean;
  note?: string;
  touchedPaths: string[];
  resultData?: unknown;
  toolName: string;
};
