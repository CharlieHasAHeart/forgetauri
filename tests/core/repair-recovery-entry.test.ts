import { describe, expect, it } from "vitest";
import { readCoreRuntimeSummary } from "../../src/core/apply-runtime-step-result.ts";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import { type EffectResult } from "../../src/protocol/index.ts";
import {
  minimalAgentState,
  minimalPlan,
  minimalTasks
} from "../shared/minimal-runtime-fixtures.ts";

function enterWaitingForRepair() {
  const bootstrap = runRuntimeTick(minimalAgentState, minimalPlan, minimalTasks, undefined);
  const reviewRepair: EffectResult = {
    kind: "review_result",
    success: false,
    payload: {
      decision: "changes_requested",
      next_action: "repair",
      summary: "needs repair"
    }
  };

  const waitingTick = runRuntimeTick(
    bootstrap.state,
    minimalPlan,
    minimalTasks,
    reviewRepair
  );

  expect(waitingTick.tickSummary).toMatchObject({
    progression: "hold_current_task",
    holdReason: "repair",
    orchestration: "waiting_for_repair",
    resultKind: "review_result"
  });

  return waitingTick;
}

describe("repair recovery entry", () => {
  it("keeps existing waiting_for_repair entry semantics", () => {
    enterWaitingForRepair();
  });

  it("blocks request emission while waiting_for_repair without recovery trigger", () => {
    const waitingTick = enterWaitingForRepair();

    const blockedTick = runRuntimeTick(
      waitingTick.state,
      minimalPlan,
      minimalTasks,
      undefined
    );

    expect(blockedTick.request).toBeUndefined();
    expect(blockedTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      orchestration: "waiting_for_repair"
    });
  });

  it("recovers from waiting_for_repair on explicit repair_recovery recovered trigger", () => {
    const waitingTick = enterWaitingForRepair();
    const waitingTaskId = waitingTick.state.currentTaskId;

    const recoveryResult: EffectResult = {
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
      recoveryResult
    );

    expect(recoveredTick.state.status).toBe("running");
    expect(recoveredTick.state.currentTaskId).toBe(waitingTaskId);
    expect(recoveredTick.request?.kind).toBe("execute_actions");
    expect(recoveredTick.tickSummary).toMatchObject({
      progression: "continueable",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "repair_recovery",
      requestKind: "execute_actions",
      failureSummary: "repair completed"
    });

    const runtimeSummary = readCoreRuntimeSummary(recoveredTick.state);
    expect(runtimeSummary).toMatchObject({
      progression: "continueable",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "repair_recovery",
      requestKind: "execute_actions",
      failureSummary: "repair completed"
    });
  });

  it("keeps waiting_for_repair and normalizes failure when repair recovery cannot proceed", () => {
    const waitingTick = enterWaitingForRepair();

    const failedRecoveryResult: EffectResult = {
      kind: "repair_recovery",
      success: false,
      payload: {
        status: "failed",
        summary: "repair validation failed"
      }
    };

    const failedTick = runRuntimeTick(
      waitingTick.state,
      minimalPlan,
      minimalTasks,
      failedRecoveryResult
    );

    expect(failedTick.state.status).toBe("running");
    expect(failedTick.request).toBeUndefined();
    expect(failedTick.state.failure).toMatchObject({
      category: "runtime",
      source: "core",
      terminal: false
    });
    expect(failedTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      resultKind: "repair_recovery",
      requestKind: undefined,
      failureSummary: "repair validation failed"
    });

    const runtimeSummary = readCoreRuntimeSummary(failedTick.state);
    expect(runtimeSummary).toMatchObject({
      progression: "hold_current_task",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      resultKind: "repair_recovery",
      requestKind: undefined,
      failureSummary: "repair validation failed"
    });
  });
});

