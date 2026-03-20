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
    expect(tick.tickSummary.signal).toBeUndefined();
    expect(tick.tickSummary.orchestration).toBeUndefined();
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
      signal: "continue",
      resultKind: "action_results",
      requestKind: "execute_actions"
    });
    expect(tick.tickSummary.orchestration).toBeUndefined();
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });

  it("keeps non-terminal action failure on hold-because-non-terminal-failure", () => {
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
    expect(tick.request).toBeUndefined();
    expect(tick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_because_non_terminal_failure",
      holdReason: "non_terminal_failure",
      orchestration: undefined,
      resultKind: "action_results",
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
      signal: "terminal_failure",
      orchestration: undefined,
      resultKind: "action_results",
      failureSummary: "fatal action failure"
    });
    expect(tick.tickSummary.holdReason).toBeUndefined();
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
      signal: "continue",
      resultKind: "review_result",
      requestKind: "execute_actions"
    });
    expect(tick.tickSummary.holdReason).toBeUndefined();
    expect(tick.tickSummary.orchestration).toBeUndefined();
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });

  it("enters waiting-for-repair orchestration and does not emit next request", () => {
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
      signal: "hold_for_repair",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      resultKind: "review_result",
      failureSummary: "review_result requested repair"
    });
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });

  it("enters waiting-for-replan orchestration and does not emit next request", () => {
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
      signal: "hold_for_replan",
      holdReason: "replan",
      orchestration: "waiting_for_replan",
      resultKind: "review_result",
      failureSummary: "review_result requested replan"
    });
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });

  it("treats review stop path as review-rejected run-level terminal and blocks further request generation", () => {
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
      signal: "review_rejected_run_terminal",
      orchestration: undefined,
      resultKind: "review_result",
      failureSummary: "review_result requested stop (review_rejected_run_terminal)"
    });
    expect(tick.tickSummary.holdReason).toBeUndefined();
    expect((tick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      tick.tickSummary
    );
  });

  it("keeps waiting-for-repair orchestration on next tick without incoming result", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const reviewRepair: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "repair"
      }
    };

    const firstTick = runRuntimeTick(runningState, minimalPlan, minimalTasks, reviewRepair);
    const secondTick = runRuntimeTick(firstTick.state, minimalPlan, minimalTasks, undefined);

    expect(secondTick.request).toBeUndefined();
    expect(secondTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_repair",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      resultKind: "review_result",
      failureSummary: "review_result requested repair"
    });
    expect((secondTick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      secondTick.tickSummary
    );
  });

  it("keeps waiting-for-replan orchestration on next tick without incoming result", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const reviewReplan: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "replan"
      }
    };

    const firstTick = runRuntimeTick(runningState, minimalPlan, minimalTasks, reviewReplan);
    const secondTick = runRuntimeTick(firstTick.state, minimalPlan, minimalTasks, undefined);

    expect(secondTick.request).toBeUndefined();
    expect(secondTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_replan",
      holdReason: "replan",
      orchestration: "waiting_for_replan",
      resultKind: "review_result",
      failureSummary: "review_result requested replan"
    });
    expect((secondTick.state.failure as { runtimeSummary?: unknown }).runtimeSummary).toMatchObject(
      secondTick.tickSummary
    );
  });
});
