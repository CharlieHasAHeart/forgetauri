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
    expect(tick.tickSummary).toMatchObject({
      progression: "terminal"
    });
  });

  it("produces runnable state and request when no incoming result is provided", () => {
    const tick = runRuntimeTick(minimalAgentState, minimalPlan, minimalTasks, undefined);

    expect(tick.state).toMatchObject({
      status: "running",
      currentTaskId: "task-1"
    });
    expect(tick.request).toBeDefined();
    expect(tick.request?.kind).toBe("execute_actions");
    expect(tick.tickSummary).toMatchObject({
      progression: "continueable",
      requestKind: "execute_actions"
    });
    expect(tick.state.failure).toBeUndefined();
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
    expect(tick.tickSummary).toMatchObject({
      progression: "continueable",
      resultKind: "action_results",
      requestKind: "execute_actions"
    });
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });

  it("keeps non-terminal action failure continue-able while preserving current task", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const failedResult: EffectResult = {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        summary: "lint failed"
      },
      payload: { reason: "failed" },
      context: { handled: false }
    };

    const tick = runRuntimeTick(runningState, minimalPlan, minimalTasks, failedResult);

    expect(tick.state).toMatchObject({
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "action_results",
      failure: {
        category: "action",
        source: "shell",
        terminal: false
      }
    });
    expect(tick.request).toBeDefined();
    expect(tick.request?.kind).toBe("execute_actions");
    expect(tick.tickSummary).toMatchObject({
      progression: "continueable",
      resultKind: "action_results",
      requestKind: "execute_actions",
      failureSummary: "lint failed"
    });
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });

  it("treats terminal action failure signal as terminal tick path", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const failedResult: EffectResult = {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "runtime",
        source: "shell",
        terminal: true,
        summary: "fatal action failure"
      },
      payload: { reason: "failed" },
      context: { handled: false }
    };

    const tick = runRuntimeTick(runningState, minimalPlan, minimalTasks, failedResult);

    expect(tick.state).toMatchObject({
      status: "failed",
      currentTaskId: "task-1",
      lastEffectResultKind: "action_results",
      failure: {
        category: "runtime",
        source: "shell",
        terminal: true
      }
    });
    expect(tick.request).toBeUndefined();
    expect(tick.tickSummary).toMatchObject({
      progression: "terminal",
      resultKind: "action_results",
      failureSummary: "fatal action failure"
    });
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });

  it("keeps review continue path continue-able", () => {
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
    expect(tick.tickSummary).toMatchObject({
      progression: "continueable",
      resultKind: "review_result",
      requestKind: "execute_actions"
    });
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });

  it("keeps review repair path on hold/current-task without next request", () => {
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
      lastEffectResultKind: "review_result",
      failure: {
        category: "review",
        terminal: false
      }
    });
    expect(tick.request).toBeUndefined();
    expect(tick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      resultKind: "review_result",
      failureSummary: "review_result requested repair"
    });
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });

  it("keeps review replan path on hold/current-task without next request", () => {
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
      lastEffectResultKind: "review_result",
      failure: {
        category: "review",
        terminal: false
      }
    });
    expect(tick.request).toBeUndefined();
    expect(tick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      resultKind: "review_result",
      failureSummary: "review_result requested replan"
    });
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });

  it("treats review stop path as terminal and blocks further request generation", () => {
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
      lastEffectResultKind: "review_result",
      failure: {
        category: "review",
        terminal: true
      }
    });
    expect(tick.request).toBeUndefined();
    expect(tick.tickSummary).toMatchObject({
      progression: "terminal",
      resultKind: "review_result",
      failureSummary: "review_result requested stop"
    });
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });
});
