import type { PlanChangeRequestV2, GateResult } from "../../agent/plan/schema.js";
import type { AgentStatus } from "../../agent/types.js";

export type HumanReviewFn = (args: { reason: string; patchPaths: string[]; phase: AgentStatus }) => Promise<boolean>;

export type PlanChangeReviewContext = {
  request: PlanChangeRequestV2;
  gateResult: GateResult;
  policySummary: {
    acceptanceLocked: boolean;
    techStackLocked: boolean;
    allowedTools: string[];
  };
  promptHint?: string;
};

export type PlanChangeReviewFn = (ctx: PlanChangeReviewContext) => Promise<string>;
