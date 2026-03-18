import { describe, expect, it } from "vitest";
import { type EffectResult } from "../../src/protocol/index.ts";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import {
  makeAgentState,
  minimalAgentState,
  minimalPlan,
  minimalTasks
} from "../shared/minimal-runtime-fixtures.ts";

describe("runRuntimeTick", () => {
  it("returns clone-equivalent state and no request for terminal input", () => {
    const terminalState = makeAgentState({ status: "done" });

    const tick = runRuntimeTick(terminalState, minimalPlan, minimalTasks, undefined);

    expect(tick.state).toEqual(terminalState);
    expect(tick.state).not.toBe(terminalState);
    expect(tick.request).toBeUndefined();
  });

  it("produces runnable state and request when no incoming result is provided", () => {
    const tick = runRuntimeTick(minimalAgentState, minimalPlan, minimalTasks, undefined);

    expect(tick.state).toMatchObject({
      status: "running",
      currentTaskId: "task-1"
    });
    expect(tick.request).toBeDefined();
    expect(tick.request?.kind).toBe("execute_actions");
  });

  it("consumes successful incoming result and continues to produce request", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const successfulResult: EffectResult = {
      kind: "action_results",
      success: true,
      payload: { count: 1, results: [] },
      context: { handled: true }
    };

    const tick = runRuntimeTick(runningState, minimalPlan, minimalTasks, successfulResult);

    expect(tick.state).toMatchObject({
      status: "running",
      lastEffectResultKind: "action_results",
      currentTaskId: undefined
    });
    expect(tick.request).toBeDefined();
    expect(tick.request?.kind).toBe("execute_actions");
  });

  it("consumes failed incoming action_results and keeps run progressing", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const failedResult: EffectResult = {
      kind: "action_results",
      success: false,
      payload: { reason: "failed" },
      context: { handled: false }
    };

    const tick = runRuntimeTick(runningState, minimalPlan, minimalTasks, failedResult);

    expect(tick.state).toMatchObject({
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "action_results"
    });
    expect(tick.request).toBeDefined();
    expect(tick.request?.kind).toBe("execute_actions");
  });
});
