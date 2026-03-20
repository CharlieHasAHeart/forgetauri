import { describe, expect, it } from "vitest";
import { readCoreRuntimeSummary } from "../../src/core/apply-runtime-step-result.ts";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import { type EffectResult, type Plan, type Task } from "../../src/protocol/index.ts";
import {
  minimalAgentState,
  minimalPlan,
  minimalTasks
} from "../shared/minimal-runtime-fixtures.ts";

const replanPlan: Plan = {
  ...minimalPlan,
  taskIds: ["task-1", "task-2"]
};

const replanTasks: Task[] = [
  ...minimalTasks,
  {
    id: "task-2",
    title: "follow-up",
    status: "ready"
  }
];

function enterWaitingForReplan() {
  const bootstrap = runRuntimeTick(minimalAgentState, replanPlan, replanTasks, undefined);
  const reviewReplan: EffectResult = {
    kind: "review_result",
    success: false,
    payload: {
      decision: "changes_requested",
      next_action: "replan",
      summary: "needs replan"
    }
  };

  const waitingTick = runRuntimeTick(
    bootstrap.state,
    replanPlan,
    replanTasks,
    reviewReplan
  );

  expect(waitingTick.tickSummary).toMatchObject({
    progression: "hold_current_task",
    holdReason: "replan",
    orchestration: "waiting_for_replan",
    resultKind: "review_result"
  });

  return waitingTick;
}

describe("replan recovery entry", () => {
  it("keeps existing waiting_for_replan entry semantics", () => {
    enterWaitingForReplan();
  });

  it("blocks request emission while waiting_for_replan without recovery trigger", () => {
    const waitingTick = enterWaitingForReplan();

    const blockedTick = runRuntimeTick(
      waitingTick.state,
      replanPlan,
      replanTasks,
      undefined
    );

    expect(blockedTick.request).toBeUndefined();
    expect(blockedTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      orchestration: "waiting_for_replan"
    });
  });

  it("recovers from waiting_for_replan on explicit replan_recovery recovered trigger", () => {
    const waitingTick = enterWaitingForReplan();

    const recoveryResult: EffectResult = {
      kind: "replan_recovery",
      success: true,
      payload: {
        status: "recovered",
        summary: "replan completed"
      }
    };

    const recoveredTick = runRuntimeTick(
      waitingTick.state,
      replanPlan,
      replanTasks,
      recoveryResult
    );

    expect(recoveredTick.state.status).toBe("running");
    expect(recoveredTick.request?.kind).toBe("execute_actions");
    expect(recoveredTick.tickSummary).toMatchObject({
      progression: "continueable",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "replan_recovery",
      requestKind: "execute_actions",
      failureSummary: "replan completed"
    });

    const runtimeSummary = readCoreRuntimeSummary(recoveredTick.state);
    expect(runtimeSummary).toMatchObject({
      progression: "continueable",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "replan_recovery",
      requestKind: "execute_actions",
      failureSummary: "replan completed"
    });
  });

  it("applies minimal pointer update on successful replan recovery", () => {
    const waitingTick = enterWaitingForReplan();

    const recoveryResult: EffectResult = {
      kind: "replan_recovery",
      success: true,
      payload: {
        status: "recovered",
        next_task_id: "task-2",
        summary: "replan completed with task pointer update"
      }
    };

    const recoveredTick = runRuntimeTick(
      waitingTick.state,
      replanPlan,
      replanTasks,
      recoveryResult
    );

    expect(recoveredTick.state.currentTaskId).toBe("task-2");
    expect(recoveredTick.request).toMatchObject({
      kind: "execute_actions",
      payload: {
        taskId: "task-2"
      },
      context: {
        currentTaskId: "task-2",
        planId: replanPlan.id
      }
    });
    expect(recoveredTick.state.planId).toBe(waitingTick.state.planId);
  });

  it("keeps waiting_for_replan and normalizes failure when replan recovery cannot proceed", () => {
    const waitingTick = enterWaitingForReplan();

    const failedRecoveryResult: EffectResult = {
      kind: "replan_recovery",
      success: false,
      payload: {
        status: "failed",
        summary: "replan validation failed"
      }
    };

    const failedTick = runRuntimeTick(
      waitingTick.state,
      replanPlan,
      replanTasks,
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
      holdReason: "replan",
      orchestration: "waiting_for_replan",
      resultKind: "replan_recovery",
      requestKind: undefined,
      failureSummary: "replan validation failed"
    });

    const runtimeSummary = readCoreRuntimeSummary(failedTick.state);
    expect(runtimeSummary).toMatchObject({
      progression: "hold_current_task",
      holdReason: "replan",
      orchestration: "waiting_for_replan",
      resultKind: "replan_recovery",
      requestKind: undefined,
      failureSummary: "replan validation failed"
    });
  });
});

