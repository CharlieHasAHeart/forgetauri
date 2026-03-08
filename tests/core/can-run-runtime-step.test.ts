import { describe, expect, it } from "vitest";
import { type EffectResult } from "../../src/protocol/index.ts";
import { canRunRuntimeStep } from "../../src/core/can-run-runtime-step.ts";
import { canRunShellRuntimeStep } from "../../src/shell/run-shell-runtime.ts";
import {
  makeAgentState,
  minimalAgentState,
  minimalPlan,
  minimalTasks
} from "../shared/minimal-runtime-fixtures.ts";

describe("canRunRuntimeStep", () => {
  it("returns true for current minimal runnable input", () => {
    expect(canRunRuntimeStep(minimalAgentState, minimalPlan, minimalTasks, undefined)).toBe(true);
  });

  it("returns false for terminal state", () => {
    const doneState = makeAgentState({ status: "done" });
    const failedState = makeAgentState({ status: "failed" });

    expect(canRunRuntimeStep(doneState, minimalPlan, minimalTasks, undefined)).toBe(false);
    expect(canRunRuntimeStep(failedState, minimalPlan, minimalTasks, undefined)).toBe(false);
  });

  it("returns false when plan is missing", () => {
    expect(canRunRuntimeStep(minimalAgentState, undefined, minimalTasks, undefined)).toBe(false);
  });

  it("returns false when tasks are empty under current minimal logic", () => {
    expect(canRunRuntimeStep(minimalAgentState, minimalPlan, [], undefined)).toBe(false);
  });

  it("matches canRunShellRuntimeStep behavior for current gate scenarios", () => {
    const validResult: EffectResult = {
      kind: "action_results",
      success: true,
      payload: { count: 0, results: [] },
      context: { handled: true }
    };

    const cases = [
      { state: minimalAgentState, plan: minimalPlan, tasks: minimalTasks, incoming: undefined },
      { state: makeAgentState({ status: "done" }), plan: minimalPlan, tasks: minimalTasks, incoming: undefined },
      { state: minimalAgentState, plan: undefined, tasks: minimalTasks, incoming: undefined },
      { state: minimalAgentState, plan: minimalPlan, tasks: [], incoming: undefined },
      { state: minimalAgentState, plan: undefined, tasks: minimalTasks, incoming: validResult }
    ] as const;

    for (const item of cases) {
      expect(canRunRuntimeStep(item.state, item.plan, item.tasks, item.incoming)).toBe(
        canRunShellRuntimeStep(item.state, item.plan, item.tasks, item.incoming)
      );
    }
  });
});
