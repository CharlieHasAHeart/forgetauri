import type { LlmPort } from "../../contracts/llm.js";
import type { PlanChangeRequestV2, PlanPatchOperation } from "../../contracts/planning.js";
import type { ContextPacket } from "../../contracts/context.js";

export type GateResult = {
  status: "needs_user_review" | "denied";
  reason: string;
  guidance?: string;
  suggested_patch?: PlanPatchOperation[];
};

export type PlanChangeReviewOutcome =
  | { decision: "approved"; reason: string; patch: PlanPatchOperation[] }
  | { decision: "denied"; reason: string; guidance: string };

export const interpretPlanChangeReview = async (args: {
  provider: LlmPort;
  request: PlanChangeRequestV2;
  gateResult: GateResult;
  policySummary: {
    acceptanceLocked: boolean;
    techStackLocked: boolean;
    allowedTools: string[];
  };
  userInput: string;
  context?: ContextPacket;
  previousResponseId?: string;
}): Promise<{ outcome: PlanChangeReviewOutcome; attempts: number; raw: string; responseId?: string }> => {
  // Intentionally not using `provider` in the core microkernel implementation.
  // Plugin/app layers can replace this interpreter with model-backed behavior.
  void args.provider;
  void args.context;
  const lowered = args.userInput.trim().toLowerCase();
  const denied =
    lowered.includes("deny") ||
    lowered.includes("reject") ||
    lowered.includes("not approve") ||
    lowered.includes("disapprove");

  if (denied) {
    return {
      outcome: {
        decision: "denied",
        reason: "Rejected by user natural-language feedback",
        guidance: args.userInput.trim() || "Provide an alternative plan change."
      },
      attempts: 1,
      raw: args.userInput
    };
  }

  return {
    outcome: {
      decision: "approved",
      reason: "Approved by user natural-language feedback",
      patch: args.request.patch
    },
    attempts: 1,
    raw: args.userInput
  };
};
