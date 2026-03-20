import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PRE_EXECUTION_REVIEW_TAG } from "../../src/core/review-gate.ts";
import { readCoreRuntimeSummary } from "../../src/core/apply-runtime-step-result.ts";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import { type Action, type EffectRequest } from "../../src/protocol/index.ts";
import { executeShellRuntimeRequest } from "../../src/shell/execute-shell-runtime-request.ts";
import {
  makeAgentState,
  makePlan,
  makeTask
} from "../shared/minimal-runtime-fixtures.ts";
import {
  resetCapabilityWorkspaceFiles,
  setupCapabilityWorkspace,
  teardownCapabilityWorkspace,
  type CapabilityWorkspace
} from "../shared/capability-workspace-fixture.ts";

function buildCapabilityAction(
  workspace: CapabilityWorkspace,
  overrides: Partial<Action> = {}
): Action {
  return {
    kind: "capability",
    name: "controlled_single_file_text_modification",
    input: {
      target_path: workspace.primaryTargetPath,
      change: {
        kind: "replace_text",
        find_text: "before-one",
        replace_text: "after-one"
      }
    },
    ...overrides
  };
}

function buildExecuteActionsRequest(action: Action): EffectRequest {
  return {
    kind: "execute_actions",
    payload: {
      actions: [action]
    }
  };
}

describe("review / approval gate", () => {
  let workspace: CapabilityWorkspace;

  beforeAll(() => {
    workspace = setupCapabilityWorkspace();
  });

  beforeEach(() => {
    resetCapabilityWorkspaceFiles(workspace);
  });

  afterAll(() => {
    teardownCapabilityWorkspace(workspace);
  });

  it("routes pre-execution review-required task to run_review before execution", () => {
    const gatedTask = makeTask({
      id: "task-1",
      summary: PRE_EXECUTION_REVIEW_TAG
    });
    const plan = makePlan({ taskIds: ["task-1"] });
    const state = makeAgentState();

    const before = readFileSync(workspace.primaryTargetPath, "utf8");
    const tick = runRuntimeTick(state, plan, [gatedTask], undefined);
    const after = readFileSync(workspace.primaryTargetPath, "utf8");

    expect(tick.request?.kind).toBe("run_review");
    expect(tick.tickSummary).toMatchObject({
      progression: "continueable",
      requestKind: "run_review"
    });
    expect(readCoreRuntimeSummary(tick.state)).toBeUndefined();
    expect(after).toBe(before);
  });

  it("review continue re-enters execution path and allows real capability execution", () => {
    const gatedTask = makeTask({
      id: "task-1",
      summary: PRE_EXECUTION_REVIEW_TAG
    });
    const plan = makePlan({ taskIds: ["task-1"] });
    const state = makeAgentState();

    const firstTick = runRuntimeTick(state, plan, [gatedTask], undefined);
    expect(firstTick.request?.kind).toBe("run_review");

    const reviewRequest: EffectRequest = {
      ...(firstTick.request as EffectRequest),
      payload: {
        ...(firstTick.request?.payload as Record<string, unknown>),
        decision_override: "continue"
      }
    };
    const reviewResult = executeShellRuntimeRequest(reviewRequest);
    expect(reviewResult).toMatchObject({
      kind: "review_result",
      success: true,
      payload: {
        next_action: "continue"
      }
    });

    const continueTick = runRuntimeTick(firstTick.state, plan, [gatedTask], reviewResult);
    expect(continueTick.request?.kind).toBe("execute_actions");

    const actionResult = executeShellRuntimeRequest(
      buildExecuteActionsRequest(buildCapabilityAction(workspace))
    );
    expect(actionResult).toMatchObject({
      kind: "action_results",
      success: true
    });
    const absorbed = runRuntimeTick(continueTick.state, plan, [gatedTask], actionResult);
    expect(readFileSync(workspace.primaryTargetPath, "utf8")).toContain("after-one");
    expect(absorbed.tickSummary).toMatchObject({
      resultKind: "action_results"
    });
  });

  it("review stop becomes governance-visible terminal reject outcome", () => {
    const gatedTask = makeTask({
      id: "task-1",
      summary: PRE_EXECUTION_REVIEW_TAG
    });
    const plan = makePlan({ taskIds: ["task-1"] });
    const state = makeAgentState();

    const firstTick = runRuntimeTick(state, plan, [gatedTask], undefined);
    const reviewResult = executeShellRuntimeRequest({
      ...(firstTick.request as EffectRequest),
      payload: {
        ...(firstTick.request?.payload as Record<string, unknown>),
        decision_override: "stop"
      }
    });

    const stopTick = runRuntimeTick(firstTick.state, plan, [gatedTask], reviewResult);

    expect(stopTick.state).toMatchObject({
      status: "failed",
      failure: {
        category: "review",
        source: "shell",
        terminal: true
      }
    });
    expect(stopTick.request).toBeUndefined();
    expect(stopTick.tickSummary).toMatchObject({
      progression: "terminal",
      resultKind: "review_result",
      failureSummary: expect.stringContaining("review rejected (stop)")
    });
  });

  it("review repair enters waiting_for_repair and remains compatible with repair recovery", () => {
    const gatedTask = makeTask({
      id: "task-1",
      summary: PRE_EXECUTION_REVIEW_TAG
    });
    const plan = makePlan({ taskIds: ["task-1"] });
    const state = makeAgentState();

    const firstTick = runRuntimeTick(state, plan, [gatedTask], undefined);
    const reviewResult = executeShellRuntimeRequest({
      ...(firstTick.request as EffectRequest),
      payload: {
        ...(firstTick.request?.payload as Record<string, unknown>),
        decision_override: "repair"
      }
    });
    const repairTick = runRuntimeTick(firstTick.state, plan, [gatedTask], reviewResult);

    expect(repairTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      resultKind: "review_result"
    });
    expect(repairTick.request).toBeUndefined();

    const recoveredTick = runRuntimeTick(repairTick.state, plan, [gatedTask], {
      kind: "repair_recovery",
      success: true,
      payload: { status: "recovered" }
    });
    expect(recoveredTick.request?.kind).toBe("execute_actions");
  });

  it("review replan enters waiting_for_replan and remains compatible with replan recovery", () => {
    const gatedTask = makeTask({
      id: "task-1",
      summary: PRE_EXECUTION_REVIEW_TAG
    });
    const plan = makePlan({ taskIds: ["task-1"] });
    const state = makeAgentState();

    const firstTick = runRuntimeTick(state, plan, [gatedTask], undefined);
    const reviewResult = executeShellRuntimeRequest({
      ...(firstTick.request as EffectRequest),
      payload: {
        ...(firstTick.request?.payload as Record<string, unknown>),
        decision_override: "replan"
      }
    });
    const replanTick = runRuntimeTick(firstTick.state, plan, [gatedTask], reviewResult);

    expect(replanTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      holdReason: "replan",
      orchestration: "waiting_for_replan",
      resultKind: "review_result"
    });
    expect(replanTick.request).toBeUndefined();

    const recoveredTick = runRuntimeTick(replanTick.state, plan, [gatedTask], {
      kind: "replan_recovery",
      success: true,
      payload: { status: "recovered", next_task_id: "task-1" }
    });
    expect(recoveredTick.request?.kind).toBe("execute_actions");
  });

  it("escalates selected non-terminal failures into run_review while keeping non-escalated failures on old path", () => {
    const task = makeTask({ id: "task-1" });
    const plan = makePlan({ taskIds: ["task-1"] });
    const state = makeAgentState({ status: "running", currentTaskId: "task-1" });

    const escalatedTick = runRuntimeTick(state, plan, [task], {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "policy_refused: target path outside allowed boundary (scripts/outside.md)"
      },
      payload: {
        count: 1,
        results: []
      }
    });
    expect(escalatedTick.request?.kind).toBe("run_review");
    expect(escalatedTick.tickSummary).toMatchObject({
      progression: "continueable",
      resultKind: "action_results",
      requestKind: "run_review"
    });
    expect(readCoreRuntimeSummary(escalatedTick.state)).toMatchObject({
      progression: "continueable",
      resultKind: "action_results"
    });

    const nonEscalatedTick = runRuntimeTick(state, plan, [task], {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "execution_failed: target file not found (docs/missing.md)"
      },
      payload: {
        count: 1,
        results: []
      }
    });
    expect(nonEscalatedTick.request).toBeUndefined();
    expect(nonEscalatedTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      holdReason: "non_terminal_failure",
      resultKind: "action_results",
      requestKind: undefined
    });
  });

  it("keeps contract refusal / policy violation / review-required / execution failure visibly distinct", () => {
    const contractRefusal = executeShellRuntimeRequest(
      buildExecuteActionsRequest(
        buildCapabilityAction(workspace, {
          input: {
            target_path: "../bad.md",
            change: {
              kind: "replace_text",
              find_text: "a",
              replace_text: "b"
            }
          }
        })
      )
    );
    const policyViolation = executeShellRuntimeRequest(
      buildExecuteActionsRequest(
        buildCapabilityAction(workspace, {
          input: {
            target_path: "scripts/outside.md",
            change: {
              kind: "replace_text",
              find_text: "a",
              replace_text: "b"
            }
          }
        })
      )
    );
    const executionFailure = executeShellRuntimeRequest(
      buildExecuteActionsRequest(
        buildCapabilityAction(workspace, {
          input: {
            target_path: "docs/missing.md",
            change: {
              kind: "replace_text",
              find_text: "a",
              replace_text: "b"
            }
          }
        })
      )
    );

    const gatedTask = makeTask({
      id: "task-1",
      summary: PRE_EXECUTION_REVIEW_TAG
    });
    const reviewRequiredTick = runRuntimeTick(
      makeAgentState(),
      makePlan({ taskIds: ["task-1"] }),
      [gatedTask],
      undefined
    );

    expect(contractRefusal).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        message: "refused: invalid single-file text path"
      }
    });
    expect(policyViolation).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        message: "policy_refused: target path outside allowed boundary (scripts/outside.md)"
      }
    });
    expect(executionFailure).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        message: "execution_failed: target file not found (docs/missing.md)"
      }
    });
    expect(reviewRequiredTick.request?.kind).toBe("run_review");
  });
});
