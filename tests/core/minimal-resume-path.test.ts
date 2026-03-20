import { describe, expect, it } from "vitest";
import { readCoreRuntimeSummary } from "../../src/core/apply-runtime-step-result.ts";
import { readRecoverableRuntimeState } from "../../src/core/read-recoverable-runtime-state.ts";
import { restoreRuntimeStateFromRecoverable } from "../../src/core/restore-runtime-state.ts";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import { DEFAULT_PROFILE, resetActiveAgentProfile, setActiveAgentProfile } from "../../src/profiles/default-profile.ts";
import { STRICT_PROFILE } from "../../src/profiles/strict-profile.ts";
import { makePlan, makeTask, minimalAgentState } from "../shared/minimal-runtime-fixtures.ts";

function buildWaitingForRepairState() {
  const plan = makePlan({ taskIds: ["task-1"] });
  const tasks = [makeTask({ id: "task-1", summary: "plain task" })];
  const bootstrap = runRuntimeTick(minimalAgentState, plan, tasks, undefined);
  const waiting = runRuntimeTick(bootstrap.state, plan, tasks, {
    kind: "review_result",
    success: false,
    payload: {
      decision: "changes_requested",
      next_action: "repair"
    }
  });

  return { plan, tasks, waiting };
}

describe("minimal resume path (waiting_for_repair)", () => {
  it("restores from minimal persisted recoverable form and supports JSON round-trip", () => {
    const { waiting } = buildWaitingForRepairState();
    const recoverable = readRecoverableRuntimeState(waiting.state, {
      profileName: DEFAULT_PROFILE.name
    });
    const persisted = JSON.parse(JSON.stringify(recoverable));
    const restored = restoreRuntimeStateFromRecoverable(persisted, {
      expectedProfileName: DEFAULT_PROFILE.name
    });

    expect(restored.restored).toBe(true);
    if (!restored.restored) {
      return;
    }
    expect(restored.state).toMatchObject({
      runId: "run-1",
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "review_result"
    });
    expect(readCoreRuntimeSummary(restored.state)).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_repair",
      holdReason: "repair",
      orchestration: "waiting_for_repair"
    });
  });

  it("keeps waiting_for_repair gated after restore, then resumes via repair_recovery trigger", () => {
    const { plan, tasks, waiting } = buildWaitingForRepairState();
    const recoverable = readRecoverableRuntimeState(waiting.state, {
      profileName: DEFAULT_PROFILE.name
    });
    const restored = restoreRuntimeStateFromRecoverable(recoverable, {
      expectedProfileName: DEFAULT_PROFILE.name
    });
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
      orchestration: "waiting_for_repair"
    });

    const resumed = runRuntimeTick(restored.state, plan, tasks, {
      kind: "repair_recovery",
      success: true,
      payload: {
        status: "recovered",
        summary: "repair done"
      }
    });
    expect(resumed.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "repair_recovered",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "repair_recovery",
      requestKind: "execute_actions",
      failureSummary: "repair done"
    });
    expect(resumed.request?.kind).toBe("execute_actions");
  });

  it("preserves must-survive summary fields and keeps rebuildable fields coherent after restore", () => {
    const { waiting } = buildWaitingForRepairState();
    const beforeSummary = readCoreRuntimeSummary(waiting.state);
    const recoverable = readRecoverableRuntimeState(waiting.state);
    const restored = restoreRuntimeStateFromRecoverable(recoverable);
    expect(restored.restored).toBe(true);
    if (!restored.restored) {
      return;
    }
    const afterSummary = readCoreRuntimeSummary(restored.state);

    expect(afterSummary).toMatchObject({
      progression: beforeSummary?.progression,
      signal: beforeSummary?.signal,
      holdReason: beforeSummary?.holdReason,
      orchestration: beforeSummary?.orchestration
    });
    expect(afterSummary?.resultKind).toBe(beforeSummary?.resultKind);
    expect(afterSummary?.requestKind).toBe(beforeSummary?.requestKind);
    expect(afterSummary?.failureSummary).toBe(beforeSummary?.failureSummary);
  });

  it("keeps profile identity consistent after restore and does not silently drift", () => {
    resetActiveAgentProfile();
    setActiveAgentProfile(STRICT_PROFILE);

    const { plan, tasks, waiting } = buildWaitingForRepairState();
    const recoverable = readRecoverableRuntimeState(waiting.state, {
      profileName: STRICT_PROFILE.name
    });
    const restored = restoreRuntimeStateFromRecoverable(recoverable, {
      expectedProfileName: STRICT_PROFILE.name
    });

    expect(restored.restored).toBe(true);
    if (!restored.restored) {
      return;
    }
    expect(restored.profileName).toBe(STRICT_PROFILE.name);

    setActiveAgentProfile(STRICT_PROFILE);
    const resumed = runRuntimeTick(restored.state, plan, tasks, {
      kind: "repair_recovery",
      success: true,
      payload: {
        status: "recovered"
      }
    });
    expect(resumed.request?.kind).toBe("execute_actions");

    resetActiveAgentProfile();
  });

  it("rejects unsupported restore boundaries and profile mismatch explicitly", () => {
    const continueableTick = runRuntimeTick(minimalAgentState, makePlan(), [makeTask()], undefined);
    const continueableSurface = readRecoverableRuntimeState(continueableTick.state, {
      profileName: DEFAULT_PROFILE.name
    });
    const unsupported = restoreRuntimeStateFromRecoverable(continueableSurface, {
      expectedProfileName: DEFAULT_PROFILE.name
    });
    expect(unsupported).toMatchObject({
      restored: false,
      errorCode: "unsupported_resume_boundary"
    });

    const { waiting } = buildWaitingForRepairState();
    const mismatchSurface = readRecoverableRuntimeState(waiting.state, {
      profileName: STRICT_PROFILE.name
    });
    const mismatch = restoreRuntimeStateFromRecoverable(mismatchSurface, {
      expectedProfileName: DEFAULT_PROFILE.name
    });
    expect(mismatch).toMatchObject({
      restored: false,
      errorCode: "profile_mismatch"
    });
  });

  it("rejects tampered unsupported scope markers instead of silently restoring", () => {
    const { waiting } = buildWaitingForRepairState();
    const recoverable = readRecoverableRuntimeState(waiting.state);
    const tampered = {
      ...recoverable,
      intentionally_not_resumable_yet: [
        ...recoverable.intentionally_not_resumable_yet,
        "attempt_resume_in_flight_shell_side_effect"
      ]
    };
    const restored = restoreRuntimeStateFromRecoverable(tampered);

    expect(restored).toMatchObject({
      restored: false,
      errorCode: "invalid_recoverable_state"
    });
  });
});
