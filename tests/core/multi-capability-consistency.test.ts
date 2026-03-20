import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import { readCoreRuntimeSummary } from "../../src/core/apply-runtime-step-result.ts";
import { type Action, type EffectRequest, type EffectResult } from "../../src/protocol/index.ts";
import { DEFAULT_PROFILE, resetActiveAgentProfile, setActiveAgentProfile } from "../../src/profiles/default-profile.ts";
import { STRICT_PROFILE } from "../../src/profiles/strict-profile.ts";
import { executeEffectRequest } from "../../src/shell/execute-effect-request.ts";
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

function buildModificationAction(
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

function buildReadAction(
  workspace: CapabilityWorkspace,
  overrides: Partial<Action> = {}
): Action {
  return {
    kind: "capability",
    name: "controlled_single_file_text_read",
    input: {
      target_path: workspace.primaryTargetPath,
      read: {
        kind: "contains_text",
        query_text: "before-one"
      }
    },
    ...overrides
  };
}

function buildDirectoryListAction(
  overrides: Partial<Action> = {}
): Action {
  return {
    kind: "capability",
    name: "controlled_directory_text_list",
    input: {
      target_path: "docs",
      list: {
        kind: "text_entries",
        limit: 10
      }
    },
    ...overrides
  };
}

function executeActions(actions: Action[]): EffectResult {
  const result = executeEffectRequest({
    kind: "execute_actions",
    payload: { actions }
  } as EffectRequest);
  expect(result).toBeDefined();
  return result as EffectResult;
}

function absorbResult(result: EffectResult) {
  const state = makeAgentState({ status: "running", planId: "plan-1", currentTaskId: "task-1" });
  const plan = makePlan({ id: "plan-1", taskIds: ["task-1"] });
  const tasks = [makeTask({ id: "task-1", summary: "plain task" })];

  return runRuntimeTick(state, plan, tasks, result);
}

describe("multi-capability runtime consistency", () => {
  let workspace: CapabilityWorkspace;

  beforeAll(() => {
    workspace = setupCapabilityWorkspace();
  });

  beforeEach(() => {
    resetActiveAgentProfile();
    resetCapabilityWorkspaceFiles(workspace);
    mkdirSync("docs/restricted", { recursive: true });
    writeFileSync("docs/restricted/allowed.txt", "alpha", "utf8");
    writeFileSync("docs/restricted/other.md", "beta", "utf8");
  });

  afterAll(() => {
    resetActiveAgentProfile();
    teardownCapabilityWorkspace(workspace);
  });

  it("keeps success/failure normalization consistent across three capabilities on the same path", () => {
    const modificationSuccess = executeActions([buildModificationAction(workspace)]);
    const readSuccess = executeActions([buildReadAction(workspace)]);
    const listSuccess = executeActions([buildDirectoryListAction()]);

    expect(modificationSuccess).toMatchObject({ kind: "action_results", success: true });
    expect(readSuccess).toMatchObject({ kind: "action_results", success: true });
    expect(listSuccess).toMatchObject({ kind: "action_results", success: true });

    const modificationFailure = executeActions([
      buildModificationAction(workspace, {
        input: {
          target_path: "docs/missing.md",
          change: { kind: "replace_text", find_text: "x", replace_text: "y" }
        }
      })
    ]);
    const readFailure = executeActions([
      buildReadAction(workspace, {
        input: {
          target_path: "docs/missing.md",
          read: { kind: "contains_text", query_text: "x" }
        }
      })
    ]);
    const listFailure = executeActions([
      buildDirectoryListAction({
        input: {
          target_path: "docs/missing-dir",
          list: { kind: "text_entries", limit: 10 }
        }
      })
    ]);

    expect(modificationFailure).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: { category: "action", source: "shell", terminal: false }
    });
    expect(readFailure).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: { category: "action", source: "shell", terminal: false }
    });
    expect(listFailure).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: { category: "action", source: "shell", terminal: false }
    });
  });

  it("keeps review/waiting/stop semantics unified across capabilities", () => {
    const readEscalated = absorbResult(
      executeActions([
        buildReadAction(workspace, {
          input: {
            target_path: "scripts/outside.md",
            read: { kind: "contains_text", query_text: "x" }
          }
        })
      ])
    );
    const listEscalated = absorbResult(
      executeActions([
        buildDirectoryListAction({
          input: {
            target_path: "scripts",
            list: { kind: "text_entries", limit: 10 }
          }
        })
      ])
    );

    expect(readEscalated.request?.kind).toBe("run_review");
    expect(listEscalated.request?.kind).toBe("run_review");
    expect(readEscalated.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "review_required",
      requestKind: "run_review"
    });
    expect(listEscalated.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "review_required",
      requestKind: "run_review"
    });

    const repairTick = runRuntimeTick(
      readEscalated.state,
      makePlan({ id: "plan-1", taskIds: ["task-1"] }),
      [makeTask({ id: "task-1", summary: "plain task" })],
      {
        kind: "review_result",
        success: false,
        payload: { decision: "changes_requested", next_action: "repair" }
      }
    );
    const stopTick = runRuntimeTick(
      listEscalated.state,
      makePlan({ id: "plan-1", taskIds: ["task-1"] }),
      [makeTask({ id: "task-1", summary: "plain task" })],
      {
        kind: "review_result",
        success: false,
        payload: { decision: "changes_requested", next_action: "stop" }
      }
    );
    const replanTick = runRuntimeTick(
      listEscalated.state,
      makePlan({ id: "plan-1", taskIds: ["task-1"] }),
      [makeTask({ id: "task-1", summary: "plain task" })],
      {
        kind: "review_result",
        success: false,
        payload: { decision: "changes_requested", next_action: "replan" }
      }
    );

    expect(repairTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_repair",
      orchestration: "waiting_for_repair"
    });
    expect(stopTick.state.status).toBe("failed");
    expect(stopTick.tickSummary).toMatchObject({
      progression: "terminal",
      signal: "review_rejected_run_terminal"
    });
    expect(replanTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_replan",
      orchestration: "waiting_for_replan"
    });
  });

  it("keeps contract refusal / policy violation / execution failure distinction unified across capabilities", () => {
    const contractRefusal = executeActions([
      buildModificationAction(workspace, {
        input: {
          target_path: "../outside.md",
          change: {
            kind: "replace_text",
            find_text: "before-one",
            replace_text: "after-one"
          }
        }
      })
    ]);
    const policyViolation = executeActions([
      buildReadAction(workspace, {
        input: {
          target_path: "scripts/outside.md",
          read: { kind: "contains_text", query_text: "x" }
        }
      })
    ]);
    const executionFailure = executeActions([
      buildDirectoryListAction({
        input: {
          target_path: "docs/missing-dir",
          list: { kind: "text_entries", limit: 10 }
        }
      })
    ]);

    expect(contractRefusal).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "refused: invalid single-file text path"
      }
    });
    expect(policyViolation).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "policy_refused: target path outside allowed boundary (scripts/outside.md)"
      }
    });
    expect(executionFailure).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "execution_failed: target directory not found (docs/missing-dir)"
      }
    });

    const contractResult = (contractRefusal.payload as { results: Array<Record<string, unknown>> })
      .results[0];
    const policyResult = (policyViolation.payload as { results: Array<Record<string, unknown>> })
      .results[0];
    const executionResult = (executionFailure.payload as { results: Array<Record<string, unknown>> })
      .results[0];

    expect(contractResult).toMatchObject({
      actionName: "controlled_single_file_text_modification",
      errorMessage: "invalid_path",
      evidence_refs: [{ outcome: "contract_refusal" }]
    });
    expect(policyResult).toMatchObject({
      actionName: "controlled_single_file_text_read",
      errorMessage: "path_outside_boundary",
      evidence_refs: [{ outcome: "policy_violation" }]
    });
    expect(executionResult).toMatchObject({
      actionName: "controlled_directory_text_list",
      errorMessage: "target_directory_missing",
      evidence_refs: [{ outcome: "execution_failure" }]
    });
  });

  it("keeps runtimeSummary and failure_signal interpretation consistent across capabilities", () => {
    const modFailTick = absorbResult(
      executeActions([
        buildModificationAction(workspace, {
          input: {
            target_path: "docs/missing.md",
            change: { kind: "replace_text", find_text: "x", replace_text: "y" }
          }
        })
      ])
    );
    const readFailTick = absorbResult(
      executeActions([
        buildReadAction(workspace, {
          input: {
            target_path: "docs/missing.md",
            read: { kind: "contains_text", query_text: "x" }
          }
        })
      ])
    );
    const listFailTick = absorbResult(
      executeActions([
        buildDirectoryListAction({
          input: {
            target_path: "docs/missing-dir",
            list: { kind: "text_entries", limit: 10 }
          }
        })
      ])
    );

    for (const tick of [modFailTick, readFailTick, listFailTick]) {
      expect(tick.tickSummary).toMatchObject({
        progression: "hold_current_task",
        signal: "hold_because_non_terminal_failure",
        holdReason: "non_terminal_failure",
        orchestration: undefined,
        resultKind: "action_results",
        requestKind: undefined
      });
      expect(readCoreRuntimeSummary(tick.state)).toMatchObject({
        progression: "hold_current_task",
        signal: "hold_because_non_terminal_failure",
        holdReason: "non_terminal_failure",
        resultKind: "action_results"
      });
      expect(tick.state.failure).toMatchObject({
        category: "action",
        source: "shell",
        terminal: false
      });
    }
  });

  it("keeps policy/profile influence consistent across multiple capabilities without semantic leakage", () => {
    setActiveAgentProfile(DEFAULT_PROFILE);
    const defaultRead = executeActions([buildReadAction(workspace)]);
    const defaultList = executeActions([buildDirectoryListAction()]);

    setActiveAgentProfile(STRICT_PROFILE);
    const strictRead = executeActions([buildReadAction(workspace)]);
    const strictList = executeActions([buildDirectoryListAction()]);

    expect(defaultRead.success).toBe(true);
    expect(defaultList.success).toBe(true);
    expect(strictRead).toMatchObject({
      success: false,
      failure_signal: {
        message: "policy_refused: target path outside allowed boundary (docs/notes.md)"
      }
    });
    expect(strictList).toMatchObject({
      success: false,
      failure_signal: {
        message: "policy_refused: target path outside allowed boundary (docs)"
      }
    });

    const reviewStop: EffectResult = {
      kind: "review_result",
      success: false,
      payload: { decision: "changes_requested", next_action: "stop" }
    };
    setActiveAgentProfile(DEFAULT_PROFILE);
    const defaultSemantics = absorbResult(reviewStop);
    setActiveAgentProfile(STRICT_PROFILE);
    const strictSemantics = absorbResult(reviewStop);

    expect(defaultSemantics.tickSummary).toMatchObject({
      progression: "terminal",
      signal: "review_rejected_run_terminal"
    });
    expect(strictSemantics.tickSummary).toMatchObject({
      progression: "terminal",
      signal: "review_rejected_run_terminal"
    });
  });

  it("demonstrates no second execution semantics: three capability kinds converge to one core semantic shape", () => {
    const request: EffectRequest = {
      kind: "execute_actions",
      payload: {
        actions: [
          buildModificationAction(workspace),
          buildReadAction(workspace),
          buildDirectoryListAction()
        ]
      }
    };
    const result = executeEffectRequest(request) as EffectResult;
    const tick = absorbResult(result);

    expect(result).toMatchObject({
      kind: "action_results",
      success: true,
      payload: {
        count: 3
      }
    });
    expect(tick.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "continue",
      resultKind: "action_results",
      requestKind: "execute_actions"
    });
    expect(tick.request?.kind).toBe("execute_actions");
  });
});
