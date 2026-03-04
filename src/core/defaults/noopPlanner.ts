import type { Planner } from "../contracts/planning.js";

export const noopPlanner: Planner = {
  async proposePlan(args) {
    return {
      plan: {
        version: "v1",
        goal: args.goal,
        tasks: []
      },
      raw: "noopPlanner: empty plan"
    };
  },
  async proposeToolCallsForTask() {
    return {
      toolCalls: [],
      raw: "noopPlanner: no tool calls"
    };
  },
  async proposePlanChange() {
    return {
      changeRequest: {
        version: "v2",
        reason: "noopPlanner",
        change_type: "none",
        impact: {},
        patch: []
      },
      raw: "noopPlanner: no plan change"
    };
  }
};
