import { type EffectRequest, type EffectResult } from "../protocol/index.js";

const REVIEW_NEXT_ACTIONS = ["continue", "repair", "replan", "stop"] as const;
type ReviewNextAction = (typeof REVIEW_NEXT_ACTIONS)[number];

function isReviewNextAction(value: unknown): value is ReviewNextAction {
  return (
    typeof value === "string" &&
    REVIEW_NEXT_ACTIONS.some((action) => action === value)
  );
}

function resolveRequestedReviewAction(request: EffectRequest): ReviewNextAction {
  if (typeof request.payload !== "object" || request.payload === null) {
    return "continue";
  }

  const requested = Reflect.get(request.payload, "decision_override");
  if (isReviewNextAction(requested)) {
    return requested;
  }

  return "continue";
}

function resolveReviewSummary(request: EffectRequest, nextAction: ReviewNextAction): string {
  if (typeof request.payload === "object" && request.payload !== null) {
    const reviewRequest = Reflect.get(request.payload, "review_request");
    if (typeof reviewRequest === "object" && reviewRequest !== null) {
      const summary = Reflect.get(reviewRequest, "summary");
      if (typeof summary === "string" && summary.trim().length > 0) {
        if (nextAction === "continue") {
          return `review approved: ${summary}`;
        }

        return `review rejected (${nextAction}): ${summary}`;
      }
    }
  }

  if (nextAction === "continue") {
    return `review accepted for ${request.kind}`;
  }

  return `review rejected for ${request.kind} (${nextAction})`;
}

export function buildRunReviewEffectResult(request: EffectRequest): EffectResult {
  const nextAction = resolveRequestedReviewAction(request);
  const summary = resolveReviewSummary(request, nextAction);
  const success = nextAction === "continue";
  const requestRef = request.request_ref;

  return {
    kind: "review_result",
    success,
    ...(success
      ? {}
      : {
          failure_signal: {
            category: "review" as const,
            source: "shell" as const,
            terminal: nextAction === "stop",
            summary,
            ...(requestRef ? { request_ref: requestRef } : {}),
            evidence_refs: [
              {
                kind: "review",
                source: "shell",
                outcome:
                  nextAction === "stop"
                    ? "review_stop"
                    : nextAction === "repair"
                      ? "review_repair"
                      : "review_replan",
                requestKind: request.kind,
                summary
              }
            ]
          }
        }),
    evidence_refs: [
      {
        kind: "review",
        source: "shell",
        outcome:
          nextAction === "continue"
            ? "review_continue"
            : nextAction === "repair"
              ? "review_repair"
              : nextAction === "replan"
                ? "review_replan"
                : "review_stop",
        requestKind: request.kind,
        summary
      }
    ],
    ...(requestRef ? { request_ref: requestRef } : {}),
    payload: {
      decision: success ? "approved" : "changes_requested",
      next_action: nextAction,
      summary
    },
    context: {
      ...(requestRef ? { request_ref: requestRef } : {}),
      handled: true
    }
  };
}
