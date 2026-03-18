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

  it("consumes review_result continue and allows next request", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const reviewContinue: EffectResult = {
      kind: "review_result",
      success: true,
      payload: {
        decision: "approved",
        next_action: "continue"
      },
      context: { handled: true }
    };

    const tick = runRuntimeTick(runningState, minimalPlan, minimalTasks, reviewContinue);

    expect(tick.state).toMatchObject({
      status: "running",
      currentTaskId: undefined,
      lastEffectResultKind: "review_result"
    });
    expect(tick.request).toBeDefined();
    expect(tick.request?.kind).toBe("execute_actions");
  });

  it("consumes review_result repair and keeps current task without new request", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const reviewRepair: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "repair"
      },
      context: { handled: true }
    };

    const tick = runRuntimeTick(runningState, minimalPlan, minimalTasks, reviewRepair);

    expect(tick.state).toMatchObject({
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "review_result"
    });
    expect(tick.request).toBeUndefined();
  });

  it("consumes review_result replan and keeps current task without new request", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const reviewReplan: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "replan"
      },
      context: { handled: true }
    };

    const tick = runRuntimeTick(runningState, minimalPlan, minimalTasks, reviewReplan);

    expect(tick.state).toMatchObject({
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "review_result"
    });
    expect(tick.request).toBeUndefined();
  });

  it("consumes review_result stop and blocks further request generation", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const reviewStop: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "stop"
      },
      context: { handled: true }
    };

    const tick = runRuntimeTick(runningState, minimalPlan, minimalTasks, reviewStop);

    expect(tick.state).toMatchObject({
      status: "failed",
      currentTaskId: "task-1",
      lastEffectResultKind: "review_result"
    });
    expect(tick.request).toBeUndefined();
  });
});
