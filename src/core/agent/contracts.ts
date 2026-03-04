import type { AgentStatus } from "../contracts/state.js";
import type { PlanChangeRequestV2 } from "../contracts/planning.js";

export type HumanReviewFn = (input: {
  reason: string;
  patchPaths: string[];
  phase: AgentStatus;
}) => Promise<boolean>;

export type PlanChangeReviewContext = {
  request: PlanChangeRequestV2;
  gateResult: {
    status: "needs_user_review" | "denied";
    reason: string;
    guidance?: string;
    suggested_patch?: Array<Record<string, unknown>>;
  };
  policySummary: {
    acceptanceLocked: boolean;
    techStackLocked: boolean;
    allowedTools: string[];
  };
  promptHint?: string;
};

export type PlanChangeReviewFn = (context: PlanChangeReviewContext) => Promise<string>;

export type HumanReviewPort = {
  humanReview?: HumanReviewFn;
  requestPlanChangeReview?: PlanChangeReviewFn;
  onEvent?: (event: import("./telemetry/events.js").AgentEvent) => void;
};
