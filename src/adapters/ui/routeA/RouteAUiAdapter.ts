import { createRouteAUI } from "../../../cli/ui/routeA.js";
import type { HumanReviewPort } from "../../../ports/HumanReviewPort.js";

export const createRouteAUiAdapter = (args: {
  goal: string;
  maxTurns: number;
  maxPatches: number;
  maxReplans: number;
  autoApprove: boolean;
}): HumanReviewPort => {
  const ui = createRouteAUI(args);
  return {
    humanReview: ui.humanReview,
    requestPlanChangeReview: ui.requestPlanChangeReview,
    onEvent: ui.onEvent
  };
};
