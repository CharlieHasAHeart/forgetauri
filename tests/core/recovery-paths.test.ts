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

function enterWaiting(
  branch: "repair" | "replan"
): ReturnType<typeof runRuntimeTick> {
  const bootstrap = runRuntimeTick(
    minimalAgentState,
    branch === "repair" ? minimalPlan : replanPlan,
    branch === "repair" ? minimalTasks : replanTasks,
    undefined
  );

  const waitingResult: EffectResult = {
    kind: "review_result",
    success: false,
    payload: {
      decision: "changes_requested",
      next_action: branch,
      summary: `needs ${branch}`
    }
  };

  const waitingTick = runRuntimeTick(
    bootstrap.state,
    branch === "repair" ? minimalPlan : replanPlan,
    branch === "repair" ? minimalTasks : replanTasks,
    waitingResult
  );

  expect(waitingTick.tickSummary).toMatchObject({
    progression: "hold_current_task",
    signal: branch === "repair" ? "hold_for_repair" : "hold_for_replan",
    holdReason: branch,
    orchestration: branch === "repair" ? "waiting_for_repair" : "waiting_for_replan",
    resultKind: "review_result",
    requestKind: undefined,
    failureSummary:
      branch === "repair"
        ? "review_result requested repair"
        : "review_result requested replan"
  });
  expect(waitingTick.request).toBeUndefined();
  expect(readCoreRuntimeSummary(waitingTick.state)).toMatchObject(waitingTick.tickSummary);

  return waitingTick;
}

describe("recovery paths", () => {
  it("repair path: waiting -> no trigger gating -> recovered re-entry", () => {
    const waitingTick = enterWaiting("repair");

    const blockedTick = runRuntimeTick(
      waitingTick.state,
      minimalPlan,
      minimalTasks,
      undefined
    );
    expect(blockedTick.request).toBeUndefined();
    expect(blockedTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_repair",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      resultKind: "review_result",
      requestKind: undefined,
      failureSummary: "review_result requested repair"
    });

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

    expect(recoveredTick.state.currentTaskId).toBe(waitingTick.state.currentTaskId);
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
    expect(readCoreRuntimeSummary(recoveredTick.state)).toMatchObject(
      recoveredTick.tickSummary
    );
  });

  it("replan path: waiting -> no trigger gating -> recovered re-entry with pointer update", () => {
    const waitingTick = enterWaiting("replan");

    const blockedTick = runRuntimeTick(
      waitingTick.state,
      replanPlan,
      replanTasks,
      undefined
    );
    expect(blockedTick.request).toBeUndefined();
    expect(blockedTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_replan",
      holdReason: "replan",
      orchestration: "waiting_for_replan",
      resultKind: "review_result",
      requestKind: undefined,
      failureSummary: "review_result requested replan"
    });

    const recoveredResult: EffectResult = {
      kind: "replan_recovery",
      success: true,
      payload: {
        status: "recovered",
        next_task_id: "task-2",
        summary: "replan applied"
      }
    };

    const recoveredTick = runRuntimeTick(
      waitingTick.state,
      replanPlan,
      replanTasks,
      recoveredResult
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
    expect(recoveredTick.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "replan_recovered",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "replan_recovery",
      requestKind: "execute_actions",
      failureSummary: "replan applied"
    });
    expect(readCoreRuntimeSummary(recoveredTick.state)).toMatchObject(
      recoveredTick.tickSummary
    );
  });

  it("repair recovery failure remains non-terminal and keeps waiting branch coherent", () => {
    const waitingTick = enterWaiting("repair");
    const failedResult: EffectResult = {
      kind: "repair_recovery",
      success: false,
      payload: {
        status: "failed",
        summary: "repair check failed"
      }
    };

    const failedTick = runRuntimeTick(
      waitingTick.state,
      minimalPlan,
      minimalTasks,
      failedResult
    );

    expect(failedTick.state.status).toBe("running");
    expect(failedTick.state.failure).toMatchObject({
      category: "runtime",
      source: "core",
      terminal: false
    });
    expect(failedTick.request).toBeUndefined();
    expect(failedTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "repair_recovery_failed",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      resultKind: "repair_recovery",
      requestKind: undefined,
      failureSummary: "repair check failed"
    });
  });

  it("replan recovery failure remains non-terminal and keeps waiting branch coherent", () => {
    const waitingTick = enterWaiting("replan");
    const failedResult: EffectResult = {
      kind: "replan_recovery",
      success: false,
      payload: {
        status: "failed",
        summary: "replan check failed"
      }
    };

    const failedTick = runRuntimeTick(
      waitingTick.state,
      replanPlan,
      replanTasks,
      failedResult
    );

    expect(failedTick.state.status).toBe("running");
    expect(failedTick.state.failure).toMatchObject({
      category: "runtime",
      source: "core",
      terminal: false
    });
    expect(failedTick.request).toBeUndefined();
    expect(failedTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "replan_recovery_failed",
      holdReason: "replan",
      orchestration: "waiting_for_replan",
      resultKind: "replan_recovery",
      requestKind: undefined,
      failureSummary: "replan check failed"
    });
  });
});
