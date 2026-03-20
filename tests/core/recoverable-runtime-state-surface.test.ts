import { describe, expect, it } from "vitest";
import { readRecoverableRuntimeState } from "../../src/core/read-recoverable-runtime-state.ts";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import { isRecoverableRuntimeState, type EffectResult } from "../../src/protocol/index.ts";
import {
  makeAgentState,
  minimalAgentState,
  minimalPlan,
  minimalTasks
} from "../shared/minimal-runtime-fixtures.ts";

function runningTaskState() {
  return makeAgentState({
    status: "running",
    planId: "plan-1",
    currentTaskId: "task-1"
  });
}

describe("recoverable runtime state surface", () => {
  it("builds explicit, serializable recoverable state surface shape", () => {
    const tick = runRuntimeTick(minimalAgentState, minimalPlan, minimalTasks, undefined);
    const recoverable = readRecoverableRuntimeState(tick.state, {
      profileName: "default"
    });

    expect(recoverable).toMatchObject({
      runtime: {
        run_id: "run-1",
        status: "running",
        goal: "ship feature",
        current_task_id: "task-1"
      },
      restoration: {
        boundary: "continueable",
        terminal: false,
        request_gated: false,
        can_prepare_request_without_new_result: true
      },
      profile: {
        name: "default"
      }
    });
    expect(isRecoverableRuntimeState(recoverable)).toBe(true);
    expect(() => JSON.stringify(recoverable)).not.toThrow();
  });

  it("keeps must-survive pointers and request-gating related fields", () => {
    const result: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "repair"
      }
    };
    const tick = runRuntimeTick(runningTaskState(), minimalPlan, minimalTasks, result);
    const recoverable = readRecoverableRuntimeState(tick.state);

    expect(recoverable.runtime).toMatchObject({
      run_id: "run-1",
      plan_id: "plan-1",
      current_task_id: "task-1",
      last_effect_result_kind: "review_result"
    });
    expect(recoverable.summary).toMatchObject({
      must_survive: {
        progression: "hold_current_task",
        signal: "hold_for_repair",
        holdReason: "repair",
        orchestration: "waiting_for_repair"
      },
      rebuildable: {
        resultKind: "review_result",
        requestKind: undefined
      }
    });
    expect(recoverable.restoration).toMatchObject({
      boundary: "waiting_for_repair",
      request_gated: true,
      can_prepare_request_without_new_result: false,
      requires_trigger: "repair_recovery"
    });
  });

  it("tracks summary restoration boundary: must-survive vs rebuildable fields", () => {
    const result: EffectResult = {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        summary: "lint failed"
      },
      payload: { count: 1, results: [] }
    };
    const tick = runRuntimeTick(runningTaskState(), minimalPlan, minimalTasks, result);
    const recoverable = readRecoverableRuntimeState(tick.state);

    expect(recoverable.summary?.must_survive).toEqual({
      progression: "hold_current_task",
      signal: "hold_because_non_terminal_failure",
      holdReason: "non_terminal_failure",
      orchestration: undefined
    });
    expect(recoverable.summary?.rebuildable).toEqual({
      resultKind: "action_results",
      requestKind: undefined,
      failureSummary: "lint failed"
    });
    expect(recoverable.restoration).toMatchObject({
      boundary: "hold_non_terminal_failure",
      terminal: false,
      request_gated: false,
      can_prepare_request_without_new_result: true
    });
  });

  it("defines waiting/stop/failure restoration boundaries explicitly", () => {
    const waitingRepair = readRecoverableRuntimeState(
      runRuntimeTick(
        runningTaskState(),
        minimalPlan,
        minimalTasks,
        {
          kind: "review_result",
          success: false,
          payload: { decision: "changes_requested", next_action: "repair" }
        }
      ).state
    );
    const waitingReplan = readRecoverableRuntimeState(
      runRuntimeTick(
        runningTaskState(),
        minimalPlan,
        minimalTasks,
        {
          kind: "review_result",
          success: false,
          payload: { decision: "changes_requested", next_action: "replan" }
        }
      ).state
    );
    const reviewStop = readRecoverableRuntimeState(
      runRuntimeTick(
        runningTaskState(),
        minimalPlan,
        minimalTasks,
        {
          kind: "review_result",
          success: false,
          payload: { decision: "changes_requested", next_action: "stop" }
        }
      ).state
    );
    const terminalFailure = readRecoverableRuntimeState(
      runRuntimeTick(
        runningTaskState(),
        minimalPlan,
        minimalTasks,
        {
          kind: "action_results",
          success: false,
          failure_signal: {
            category: "runtime",
            source: "shell",
            terminal: true,
            summary: "fatal"
          },
          payload: { count: 1, results: [] }
        }
      ).state
    );

    expect(waitingRepair.restoration).toMatchObject({
      boundary: "waiting_for_repair",
      request_gated: true,
      requires_trigger: "repair_recovery"
    });
    expect(waitingReplan.restoration).toMatchObject({
      boundary: "waiting_for_replan",
      request_gated: true,
      requires_trigger: "replan_recovery"
    });
    expect(reviewStop.restoration).toMatchObject({
      boundary: "terminal_review_stop",
      terminal: true,
      request_gated: true
    });
    expect(terminalFailure.restoration).toMatchObject({
      boundary: "terminal_failure",
      terminal: true,
      request_gated: true
    });
  });

  it("keeps request_ref in recoverable failure surface and declares intentionally-not-resumable scope", () => {
    const tick = runRuntimeTick(runningTaskState(), minimalPlan, minimalTasks, {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "execution_failed",
        request_ref: {
          run_id: "run-1",
          plan_id: "plan-1",
          task_id: "task-1",
          request_kind: "execute_actions"
        }
      },
      payload: { count: 1, results: [] }
    });
    const recoverable = readRecoverableRuntimeState(tick.state);

    expect(recoverable.failure_signal).toMatchObject({
      category: "action",
      source: "shell",
      terminal: false,
      request_ref: {
        run_id: "run-1",
        plan_id: "plan-1",
        task_id: "task-1",
        request_kind: "execute_actions"
      }
    });
    expect(recoverable.intentionally_not_resumable_yet).toEqual(
      expect.arrayContaining([
        "in_flight_shell_side_effects",
        "partial_file_write_operations",
        "external_review_sessions",
        "cross_process_live_handles",
        "non_protocol_temporary_context"
      ])
    );
  });
});
