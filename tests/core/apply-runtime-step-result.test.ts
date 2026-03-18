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
      currentTaskId: undefined,
      failure: {
        runtimeSummary: {
          progression: "continueable",
          signal: "continue",
          orchestration: undefined,
          resultKind: "action_results"
        }
      }
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
      lastEffectResultKind: "action_results",
      failure: {
        runtimeSummary: {
          progression: "continueable",
          signal: "continue_after_failure",
          orchestration: undefined,
          resultKind: "action_results",
          failureSummary: "action_results reported failure"
        }
      }
    });
  });

  it("keeps step continue-able for non-terminal failure signal while holding current task", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const failedResult: EffectResult = {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        summary: "tool command failed"
      },
      payload: { reason: "failed" },
      context: { handled: false }
    };

    const result = applyRuntimeStepResult(runningState, minimalPlan, minimalTasks, failedResult);

    expect(result).toMatchObject({
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "action_results",
      failure: {
        category: "action",
        source: "shell",
        terminal: false,
        runtimeSummary: {
          progression: "hold_current_task",
          signal: "hold_because_non_terminal_failure",
          holdReason: "non_terminal_failure",
          orchestration: undefined,
          resultKind: "action_results",
          failureSummary: "tool command failed"
        }
      }
    });
  });

  it("returns terminal step state for terminal failure signal in action_results", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const failedResult: EffectResult = {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "runtime",
        source: "shell",
        terminal: true,
        summary: "terminal action failure"
      },
      payload: { reason: "failed" },
      context: { handled: false }
    };

    const result = applyRuntimeStepResult(runningState, minimalPlan, minimalTasks, failedResult);

    expect(result).toMatchObject({
      status: "failed",
      currentTaskId: "task-1",
      lastEffectResultKind: "action_results",
      failure: {
        category: "runtime",
        source: "shell",
        terminal: true,
        runtimeSummary: {
          progression: "terminal",
          signal: "terminal_failure",
          orchestration: undefined,
          resultKind: "action_results",
          failureSummary: "terminal action failure"
        }
      }
    });
  });

  it("enters waiting-for-repair minimal orchestration for review_result repair", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const reviewRepair: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "repair"
      }
    };

    const result = applyRuntimeStepResult(runningState, minimalPlan, minimalTasks, reviewRepair);

    expect(result).toMatchObject({
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "review_result",
      failure: {
        category: "review",
        terminal: false,
        runtimeSummary: {
          progression: "hold_current_task",
          signal: "hold_for_repair",
          holdReason: "repair",
          orchestration: "waiting_for_repair",
          resultKind: "review_result",
          failureSummary: "review_result requested repair"
        }
      }
    });
  });

  it("enters waiting-for-replan minimal orchestration for review_result replan", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const reviewReplan: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "replan"
      }
    };

    const result = applyRuntimeStepResult(runningState, minimalPlan, minimalTasks, reviewReplan);

    expect(result).toMatchObject({
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "review_result",
      failure: {
        category: "review",
        terminal: false,
        runtimeSummary: {
          progression: "hold_current_task",
          signal: "hold_for_replan",
          holdReason: "replan",
          orchestration: "waiting_for_replan",
          resultKind: "review_result",
          failureSummary: "review_result requested replan"
        }
      }
    });
  });

  it("returns run-level terminal step state for review_result stop (review-rejected)", () => {
    const runningState = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const reviewStop: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "stop"
      }
    };

    const result = applyRuntimeStepResult(runningState, minimalPlan, minimalTasks, reviewStop);

    expect(result).toMatchObject({
      status: "failed",
      currentTaskId: "task-1",
      lastEffectResultKind: "review_result",
      failure: {
        category: "review",
        terminal: true,
        runtimeSummary: {
          progression: "terminal",
          signal: "review_rejected_run_terminal",
          orchestration: undefined,
          resultKind: "review_result",
          failureSummary: "review_result requested stop (review_rejected_run_terminal)"
        }
      }
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

    expect(fromTick).toMatchObject({
      status: direct.status,
      currentTaskId: direct.currentTaskId,
      lastEffectResultKind: direct.lastEffectResultKind
    });
    const directSummary = (
      direct.failure as { runtimeSummary?: { progression?: string; resultKind?: string } } | undefined
    )?.runtimeSummary;
    const tickSummary = (
      fromTick.failure as { runtimeSummary?: { progression?: string; resultKind?: string } } | undefined
    )?.runtimeSummary;
    expect(tickSummary).toMatchObject({
      progression: directSummary?.progression,
      resultKind: directSummary?.resultKind
    });
    expect(
      (
        fromTick.failure as { runtimeSummary?: { requestKind?: string } } | undefined
      )?.runtimeSummary?.requestKind
    ).toBe("execute_actions");
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

    expect(fromTick).toMatchObject({
      status: direct.status,
      currentTaskId: direct.currentTaskId,
      lastEffectResultKind: direct.lastEffectResultKind,
      failure: {
        category: "action",
        source: "shell",
        terminal: false
      }
    });
    const directSummary = (
      direct.failure as {
        runtimeSummary?: { progression?: string; resultKind?: string; failureSummary?: string };
      } | undefined
    )?.runtimeSummary;
    const tickSummary = (
      fromTick.failure as {
        runtimeSummary?: { progression?: string; resultKind?: string; failureSummary?: string };
      } | undefined
    )?.runtimeSummary;
    expect(tickSummary).toMatchObject({
      progression: directSummary?.progression,
      resultKind: directSummary?.resultKind,
      failureSummary: directSummary?.failureSummary
    });
    expect(
      (
        fromTick.failure as { runtimeSummary?: { requestKind?: string } } | undefined
      )?.runtimeSummary?.requestKind
    ).toBe("execute_actions");
  });
});
