import { describe, expect, it } from "vitest";
import { readCoreRuntimeSummary } from "../../src/core/apply-runtime-step-result.ts";
import { readRecoverableRuntimeState } from "../../src/core/read-recoverable-runtime-state.ts";
import { restoreRuntimeStateFromRecoverable } from "../../src/core/restore-runtime-state.ts";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import { DEFAULT_PROFILE, resetActiveAgentProfile, setActiveAgentProfile } from "../../src/profiles/default-profile.ts";
import { STRICT_PROFILE } from "../../src/profiles/strict-profile.ts";
import { makeAgentState, makePlan, makeTask, minimalAgentState } from "../shared/minimal-runtime-fixtures.ts";

function buildRepairWaitingPath() {
  const plan = makePlan({ taskIds: ["task-1"] });
  const tasks = [makeTask({ id: "task-1", summary: "plain task" })];
  const boot = runRuntimeTick(minimalAgentState, plan, tasks, undefined);
  const waiting = runRuntimeTick(boot.state, plan, tasks, {
    kind: "review_result",
    success: false,
    payload: {
      decision: "changes_requested",
      next_action: "repair"
    }
  });

  return { plan, tasks, waiting };
}

function buildReplanWaitingPath() {
  const plan = makePlan({ taskIds: ["task-1", "task-2"] });
  const tasks = [
    makeTask({ id: "task-1", summary: "plain task" }),
    makeTask({ id: "task-2", title: "follow-up", status: "ready" })
  ];
  const boot = runRuntimeTick(minimalAgentState, plan, tasks, undefined);
  const waiting = runRuntimeTick(boot.state, plan, tasks, {
    kind: "review_result",
    success: false,
    payload: {
      decision: "changes_requested",
      next_action: "replan"
    }
  });

  return { plan, tasks, waiting };
}

function restoreFromSurface(input: ReturnType<typeof readRecoverableRuntimeState>) {
  const persisted = JSON.parse(JSON.stringify(input));
  return restoreRuntimeStateFromRecoverable(persisted, {
    expectedProfileName: input.profile?.name
  });
}

describe("recoverability paths", () => {
  it("waiting_for_repair: restore keeps waiting and no-trigger gating, then resumes on recovery success", () => {
    const { plan, tasks, waiting } = buildRepairWaitingPath();
    const recoverable = readRecoverableRuntimeState(waiting.state, {
      profileName: DEFAULT_PROFILE.name
    });
    const restored = restoreFromSurface(recoverable);
    expect(restored.restored).toBe(true);
    if (!restored.restored) {
      return;
    }

    const blocked = runRuntimeTick(restored.state, plan, tasks, undefined);
    expect(blocked.request).toBeUndefined();
    expect(blocked.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_repair",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      requestKind: undefined
    });

    const resumed = runRuntimeTick(restored.state, plan, tasks, {
      kind: "repair_recovery",
      success: true,
      payload: {
        status: "recovered",
        summary: "repair resumed"
      }
    });
    expect(resumed.request?.kind).toBe("execute_actions");
    expect(resumed.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "repair_recovered",
      holdReason: undefined,
      orchestration: undefined,
      requestKind: "execute_actions"
    });
  });

  it("waiting_for_repair: restore then failed recovery keeps waiting/failure semantics and gating", () => {
    const { plan, tasks, waiting } = buildRepairWaitingPath();
    const restored = restoreFromSurface(
      readRecoverableRuntimeState(waiting.state, { profileName: DEFAULT_PROFILE.name })
    );
    expect(restored.restored).toBe(true);
    if (!restored.restored) {
      return;
    }

    const failed = runRuntimeTick(restored.state, plan, tasks, {
      kind: "repair_recovery",
      success: false,
      payload: {
        status: "failed",
        summary: "repair check failed"
      }
    });

    expect(failed.request).toBeUndefined();
    expect(failed.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "repair_recovery_failed",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      failureSummary: "repair check failed"
    });
    expect(failed.state.failure).toMatchObject({
      category: "runtime",
      source: "core",
      terminal: false
    });
  });

  it("waiting_for_replan: restore keeps waiting and no-trigger gating, then resumes with pointer update", () => {
    const { plan, tasks, waiting } = buildReplanWaitingPath();
    const restored = restoreFromSurface(
      readRecoverableRuntimeState(waiting.state, { profileName: DEFAULT_PROFILE.name })
    );
    expect(restored.restored).toBe(true);
    if (!restored.restored) {
      return;
    }

    const blocked = runRuntimeTick(restored.state, plan, tasks, undefined);
    expect(blocked.request).toBeUndefined();
    expect(blocked.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_replan",
      holdReason: "replan",
      orchestration: "waiting_for_replan"
    });

    const resumed = runRuntimeTick(restored.state, plan, tasks, {
      kind: "replan_recovery",
      success: true,
      payload: {
        status: "recovered",
        next_task_id: "task-2",
        summary: "replan resumed"
      }
    });
    expect(resumed.state.currentTaskId).toBe("task-2");
    expect(resumed.request).toMatchObject({
      kind: "execute_actions",
      payload: {
        taskId: "task-2"
      },
      context: {
        currentTaskId: "task-2",
        planId: plan.id
      }
    });
    expect(resumed.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "replan_recovered",
      requestKind: "execute_actions"
    });
  });

  it("waiting_for_replan: restore then failed recovery keeps waiting/failure semantics and gating", () => {
    const { plan, tasks, waiting } = buildReplanWaitingPath();
    const restored = restoreFromSurface(
      readRecoverableRuntimeState(waiting.state, { profileName: DEFAULT_PROFILE.name })
    );
    expect(restored.restored).toBe(true);
    if (!restored.restored) {
      return;
    }

    const failed = runRuntimeTick(restored.state, plan, tasks, {
      kind: "replan_recovery",
      success: false,
      payload: {
        status: "failed",
        summary: "replan check failed"
      }
    });

    expect(failed.request).toBeUndefined();
    expect(failed.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "replan_recovery_failed",
      holdReason: "replan",
      orchestration: "waiting_for_replan",
      failureSummary: "replan check failed"
    });
    expect(failed.state.failure).toMatchObject({
      category: "runtime",
      source: "core",
      terminal: false
    });
  });

  it("terminal states remain terminal after restore (review stop / terminal failure / completed)", () => {
    const baseState = makeAgentState({ status: "running", planId: "plan-1", currentTaskId: "task-1" });
    const plan = makePlan({ taskIds: ["task-1"] });
    const tasks = [makeTask({ id: "task-1" })];

    const reviewStop = runRuntimeTick(baseState, plan, tasks, {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "stop"
      }
    });
    const terminalFailure = runRuntimeTick(baseState, plan, tasks, {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "runtime",
        source: "shell",
        terminal: true,
        summary: "fatal"
      },
      payload: { count: 1, results: [] }
    });
    const completed = makeAgentState({ status: "done", planId: "plan-1", currentTaskId: "task-1" });

    const restoredStop = restoreFromSurface(readRecoverableRuntimeState(reviewStop.state));
    const restoredFail = restoreFromSurface(readRecoverableRuntimeState(terminalFailure.state));
    const restoredDone = restoreFromSurface(readRecoverableRuntimeState(completed));

    expect(restoredStop.restored).toBe(true);
    expect(restoredFail.restored).toBe(true);
    expect(restoredDone.restored).toBe(true);
    if (!restoredStop.restored || !restoredFail.restored || !restoredDone.restored) {
      return;
    }

    const stopTick = runRuntimeTick(restoredStop.state, plan, tasks, undefined);
    const failTick = runRuntimeTick(restoredFail.state, plan, tasks, undefined);
    const doneTick = runRuntimeTick(restoredDone.state, plan, tasks, undefined);

    expect(stopTick.request).toBeUndefined();
    expect(failTick.request).toBeUndefined();
    expect(doneTick.request).toBeUndefined();
    expect(stopTick.tickSummary.progression).toBe("terminal");
    expect(failTick.tickSummary.progression).toBe("terminal");
    expect(doneTick.tickSummary.progression).toBe("terminal");
  });

  it("profile consistency after restore: aligned profile restores, mismatch rejects", () => {
    resetActiveAgentProfile();
    setActiveAgentProfile(STRICT_PROFILE);
    const { waiting } = buildRepairWaitingPath();

    const strictSurface = readRecoverableRuntimeState(waiting.state, {
      profileName: STRICT_PROFILE.name
    });
    const strictRestored = restoreRuntimeStateFromRecoverable(strictSurface, {
      expectedProfileName: STRICT_PROFILE.name
    });
    expect(strictRestored).toMatchObject({
      restored: true,
      profileName: STRICT_PROFILE.name
    });

    const mismatch = restoreRuntimeStateFromRecoverable(strictSurface, {
      expectedProfileName: DEFAULT_PROFILE.name
    });
    expect(mismatch).toMatchObject({
      restored: false,
      errorCode: "profile_mismatch"
    });
    resetActiveAgentProfile();
  });

  it("must-survive vs rebuildable summary stays coherent after restore and post-resume rebuild", () => {
    const { plan, tasks, waiting } = buildRepairWaitingPath();
    const before = readCoreRuntimeSummary(waiting.state);
    const restored = restoreFromSurface(readRecoverableRuntimeState(waiting.state));
    expect(restored.restored).toBe(true);
    if (!restored.restored) {
      return;
    }

    const afterRestore = readCoreRuntimeSummary(restored.state);
    expect(afterRestore).toMatchObject({
      progression: before?.progression,
      signal: before?.signal,
      holdReason: before?.holdReason,
      orchestration: before?.orchestration,
      resultKind: before?.resultKind,
      requestKind: before?.requestKind,
      failureSummary: before?.failureSummary
    });

    const resumed = runRuntimeTick(restored.state, plan, tasks, {
      kind: "repair_recovery",
      success: true,
      payload: {
        status: "recovered",
        summary: "resume summary rebuild"
      }
    });
    const rebuilt = readCoreRuntimeSummary(resumed.state);
    expect(rebuilt).toMatchObject({
      progression: "continueable",
      signal: "repair_recovered",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "repair_recovery",
      requestKind: "execute_actions",
      failureSummary: "resume summary rebuild"
    });
  });
});
