import { describe, expect, it } from "vitest";
import { readCoreRuntimeSummary } from "../../src/core/apply-runtime-step-result.ts";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import { type EffectResult } from "../../src/protocol/index.ts";
import {
  makeAgentState,
  minimalPlan,
  minimalTasks
} from "../shared/minimal-runtime-fixtures.ts";

function runningState() {
  return makeAgentState({ status: "running", currentTaskId: "task-1" });
}

function assertSummaryAligned(tick: ReturnType<typeof runRuntimeTick>) {
  const summary = readCoreRuntimeSummary(tick.state);
  expect(summary?.progression).toBe(tick.tickSummary.progression);
  expect(summary?.signal).toBe(tick.tickSummary.signal);
  expect(summary?.holdReason).toBe(tick.tickSummary.holdReason);
  expect(summary?.orchestration).toBe(tick.tickSummary.orchestration);
  expect(summary?.resultKind).toBe(tick.tickSummary.resultKind);
  expect(summary?.requestKind).toBe(tick.tickSummary.requestKind);
  expect(summary?.failureSummary).toBe(tick.tickSummary.failureSummary);
}

describe("runtime summary consistency", () => {
  it("keeps action success summary coherent between step and tick levels", () => {
    const result: EffectResult = {
      kind: "action_results",
      success: true,
      payload: { count: 1, results: [] }
    };

    const tick = runRuntimeTick(runningState(), minimalPlan, minimalTasks, result);

    expect(tick.request?.kind).toBe("execute_actions");
    expect(tick.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "continue",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "action_results",
      requestKind: "execute_actions",
      failureSummary: undefined
    });
    assertSummaryAligned(tick);
  });

  it("keeps non-terminal failure summary coherent and does not masquerade as waiting", () => {
    const result: EffectResult = {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        summary: "non-terminal failure"
      },
      payload: { reason: "failed" }
    };

    const tick = runRuntimeTick(runningState(), minimalPlan, minimalTasks, result);

    expect(tick.request).toBeUndefined();
    expect(tick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_because_non_terminal_failure",
      holdReason: "non_terminal_failure",
      orchestration: undefined,
      resultKind: "action_results",
      requestKind: undefined,
      failureSummary: "non-terminal failure"
    });
    assertSummaryAligned(tick);
  });

  it("keeps terminal failure summary coherent without waiting residue", () => {
    const result: EffectResult = {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "runtime",
        source: "shell",
        terminal: true,
        summary: "terminal failure"
      },
      payload: { reason: "failed" }
    };

    const tick = runRuntimeTick(runningState(), minimalPlan, minimalTasks, result);

    expect(tick.request).toBeUndefined();
    expect(tick.tickSummary).toMatchObject({
      progression: "terminal",
      signal: "terminal_failure",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "action_results",
      requestKind: undefined,
      failureSummary: "terminal failure"
    });
    assertSummaryAligned(tick);
  });

  it("keeps review stop summary distinct as terminal governance outcome", () => {
    const result: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "stop"
      }
    };

    const tick = runRuntimeTick(runningState(), minimalPlan, minimalTasks, result);

    expect(tick.request).toBeUndefined();
    expect(tick.tickSummary).toMatchObject({
      progression: "terminal",
      signal: "review_rejected_run_terminal",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "review_result",
      requestKind: undefined,
      failureSummary: "review_result requested stop (review_rejected_run_terminal)"
    });
    assertSummaryAligned(tick);
  });

  it("keeps waiting-for-repair gated until explicit recovery, then clears waiting semantics", () => {
    const waitingResult: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "repair"
      }
    };
    const waitingTick = runRuntimeTick(runningState(), minimalPlan, minimalTasks, waitingResult);

    expect(waitingTick.request).toBeUndefined();
    expect(waitingTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_repair",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      requestKind: undefined
    });
    assertSummaryAligned(waitingTick);

    const blockedWithoutTrigger = runRuntimeTick(
      waitingTick.state,
      minimalPlan,
      minimalTasks,
      undefined
    );
    expect(blockedWithoutTrigger.request).toBeUndefined();
    expect(blockedWithoutTrigger.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_repair",
      holdReason: "repair",
      orchestration: "waiting_for_repair"
    });
    assertSummaryAligned(blockedWithoutTrigger);

    const recoveredResult: EffectResult = {
      kind: "repair_recovery",
      success: true,
      payload: {
        status: "recovered",
        summary: "repair completed"
      }
    };
    const recoveredTick = runRuntimeTick(
      waitingTick.state,
      minimalPlan,
      minimalTasks,
      recoveredResult
    );
    expect(recoveredTick.request?.kind).toBe("execute_actions");
    expect(recoveredTick.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "repair_recovered",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "repair_recovery",
      requestKind: "execute_actions",
      failureSummary: "repair completed"
    });
    assertSummaryAligned(recoveredTick);
  });

  it("keeps waiting-for-replan coherent on failed recovery", () => {
    const waitingResult: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "replan"
      }
    };
    const waitingTick = runRuntimeTick(runningState(), minimalPlan, minimalTasks, waitingResult);

    expect(waitingTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_replan",
      holdReason: "replan",
      orchestration: "waiting_for_replan"
    });
    assertSummaryAligned(waitingTick);

    const failedRecovery: EffectResult = {
      kind: "replan_recovery",
      success: false,
      payload: {
        status: "failed",
        summary: "replan failed"
      }
    };
    const failedTick = runRuntimeTick(
      waitingTick.state,
      minimalPlan,
      minimalTasks,
      failedRecovery
    );

    expect(failedTick.request).toBeUndefined();
    expect(failedTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "replan_recovery_failed",
      holdReason: "replan",
      orchestration: "waiting_for_replan",
      resultKind: "replan_recovery",
      requestKind: undefined,
      failureSummary: "replan failed"
    });
    assertSummaryAligned(failedTick);
  });
});
