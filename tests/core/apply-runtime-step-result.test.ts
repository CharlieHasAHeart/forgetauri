import { describe, expect, it } from "vitest";
import { type EffectResult } from "../../src/protocol/index.ts";
import { applyRuntimeStepResult } from "../../src/core/apply-runtime-step-result.ts";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import {
  makeAgentState,
  minimalAgentState,
  minimalPlan,
  minimalTasks
} from "../shared/minimal-runtime-fixtures.ts";

describe("applyRuntimeStepResult", () => {
  it("returns clone-equivalent state for terminal input", () => {
    const terminalState = makeAgentState({ status: "done" });

    const result = applyRuntimeStepResult(terminalState, minimalPlan, minimalTasks, undefined);

    expect(result).toEqual(terminalState);
    expect(result).not.toBe(terminalState);
  });

  it("keeps no-op behavior when result is not applicable", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });

    const result = applyRuntimeStepResult(runningState, minimalPlan, minimalTasks, undefined);

    expect(result).toEqual(runningState);
    expect(result).not.toBe(runningState);
  });

  it("preserves success-path state updates for successful result", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const successfulResult: EffectResult = {
      kind: "action_results",
      success: true,
      payload: { count: 1, results: [] },
      context: { handled: true }
    };

    const result = applyRuntimeStepResult(runningState, minimalPlan, minimalTasks, successfulResult);

    expect(result).toMatchObject({
      status: "running",
      lastEffectResultKind: "action_results",
      currentTaskId: undefined
    });
  });

  it("preserves failed-action path without forcing run-level failure", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const failedResult: EffectResult = {
      kind: "action_results",
      success: false,
      payload: { reason: "failed" },
      context: { handled: false }
    };

    const result = applyRuntimeStepResult(runningState, minimalPlan, minimalTasks, failedResult);

    expect(result).toMatchObject({
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "action_results"
    });
  });

  it("matches runRuntimeTick(...).state in corresponding successful-result scenario", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const successfulResult: EffectResult = {
      kind: "action_results",
      success: true,
      payload: { count: 1, results: [] },
      context: { handled: true }
    };

    const direct = applyRuntimeStepResult(runningState, minimalPlan, minimalTasks, successfulResult);
    const fromTick = runRuntimeTick(runningState, minimalPlan, minimalTasks, successfulResult).state;

    expect(direct).toEqual(fromTick);
  });

  it("matches runRuntimeTick(...).state in corresponding failure-result scenario", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const failedResult: EffectResult = {
      kind: "action_results",
      success: false,
      payload: { reason: "failed" },
      context: { handled: false }
    };

    const direct = applyRuntimeStepResult(runningState, minimalPlan, minimalTasks, failedResult);
    const fromTick = runRuntimeTick(runningState, minimalPlan, minimalTasks, failedResult).state;

    expect(direct).toEqual(fromTick);
  });
});
