import { type EffectRequest, type EffectResult } from "../protocol/index.js";

export function buildRunReviewEffectResult(request: EffectRequest): EffectResult {
  return {
    kind: "review_result",
    success: true,
    payload: {
      decision: "approved",
      next_action: "continue",
      summary: `review accepted for ${request.kind}`
    },
    context: {
      handled: true
    }
  };
}
