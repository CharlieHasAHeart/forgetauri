import { describe, expect, it } from "vitest";
import { type EffectRequest } from "../../src/protocol/index.ts";
import { buildRunReviewEffectResult } from "../../src/shell/build-run-review-effect-result.ts";
import { executeEffectRequest } from "../../src/shell/execute-effect-request.ts";

describe("buildRunReviewEffectResult", () => {
  it("returns stable review_result for minimal valid run_review request", () => {
    const request: EffectRequest = {
      kind: "run_review",
      payload: {}
    };

    const result = buildRunReviewEffectResult(request);

    expect(result).toMatchObject({
      kind: "review_result",
      success: true,
      payload: {
        decision: "approved",
        next_action: "continue",
        summary: "review accepted for run_review"
      },
      context: {
        handled: true
      }
    });
  });

  it("keeps stable result shape when payload contains extra fields", () => {
    const request: EffectRequest = {
      kind: "run_review",
      payload: {
        criteria: { strict: true },
        notes: "ignored by current minimal review builder"
      }
    };

    const result = buildRunReviewEffectResult(request);

    expect(result).toMatchObject({
      kind: "review_result",
      success: true,
      evidence_refs: [
        {
          kind: "review",
          source: "shell",
          outcome: "review_continue"
        }
      ],
      payload: {
        decision: "approved",
        next_action: "continue",
        summary: "review accepted for run_review"
      },
      context: {
        handled: true
      }
    });
  });

  it("matches current executeEffectRequest output for run_review path", () => {
    const request: EffectRequest = {
      kind: "run_review",
      payload: {
        evidenceRefs: ["ev-1"]
      }
    };

    const directResult = buildRunReviewEffectResult(request);
    const entryResult = executeEffectRequest(request);

    expect(entryResult).toEqual(directResult);
  });

  it("supports explicit review reject stop decision as governance-visible terminal outcome", () => {
    const request: EffectRequest = {
      kind: "run_review",
      payload: {
        decision_override: "stop",
        review_request: {
          kind: "task",
          target: "task-1",
          summary: "policy escalation requires review"
        }
      }
    };

    const result = buildRunReviewEffectResult(request);

    expect(result).toMatchObject({
      kind: "review_result",
      success: false,
      failure_signal: {
        category: "review",
        source: "shell",
        terminal: true,
        evidence_refs: [
          {
            kind: "review",
            source: "shell",
            outcome: "review_stop"
          }
        ]
      },
      evidence_refs: [
        {
          kind: "review",
          source: "shell",
          outcome: "review_stop"
        }
      ],
      payload: {
        decision: "changes_requested",
        next_action: "stop"
      },
      context: {
        handled: true
      }
    });
  });

  it("supports explicit review repair/replan decisions", () => {
    const repairRequest: EffectRequest = {
      kind: "run_review",
      payload: {
        decision_override: "repair",
        review_request: {
          kind: "task",
          target: "task-1",
          summary: "needs repair"
        }
      }
    };
    const replanRequest: EffectRequest = {
      kind: "run_review",
      payload: {
        decision_override: "replan",
        review_request: {
          kind: "task",
          target: "task-1",
          summary: "needs replan"
        }
      }
    };

    const repair = buildRunReviewEffectResult(repairRequest);
    const replan = buildRunReviewEffectResult(replanRequest);

    expect(repair).toMatchObject({
      kind: "review_result",
      success: false,
      failure_signal: {
        terminal: false,
        evidence_refs: [
          {
            kind: "review",
            source: "shell"
          }
        ]
      },
      payload: {
        decision: "changes_requested",
        next_action: "repair"
      }
    });
    expect(replan).toMatchObject({
      kind: "review_result",
      success: false,
      failure_signal: {
        terminal: false
      },
      payload: {
        decision: "changes_requested",
        next_action: "replan"
      }
    });
  });

  it("propagates request_ref for replay-friendly review boundaries", () => {
    const request: EffectRequest = {
      kind: "run_review",
      request_ref: {
        run_id: "run-1",
        plan_id: "plan-1",
        task_id: "task-1",
        request_kind: "run_review"
      },
      payload: {
        decision_override: "stop",
        review_request: {
          kind: "task",
          target: "task-1",
          summary: "manual stop"
        }
      }
    };

    const result = buildRunReviewEffectResult(request);

    expect(result).toMatchObject({
      request_ref: request.request_ref,
      context: {
        handled: true,
        request_ref: request.request_ref
      },
      failure_signal: {
        request_ref: request.request_ref
      }
    });
  });
});
