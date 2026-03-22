import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readCoreRuntimeSummary } from "../../src/core/apply-runtime-step-result.ts";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import {
  type Action,
  type AgentState,
  type EffectRequest,
  type EffectResult,
  type Plan,
  type Task
} from "../../src/protocol/index.ts";
import {
  resetActiveAgentProfile,
  setActiveAgentProfile
} from "../../src/profiles/default-profile.ts";
import { STRICT_PROFILE } from "../../src/profiles/strict-profile.ts";
import { executeShellRuntimeRequest } from "../../src/shell/execute-shell-runtime-request.ts";
import { makeAgentState, makePlan, makeTask } from "../shared/minimal-runtime-fixtures.ts";

interface ScenarioWorkspace {
  root: string;
  originalCwd: string;
  targetDocPath: string;
  siblingDocPath: string;
}

function setupScenarioWorkspace(): ScenarioWorkspace {
  const root = mkdtempSync(join(tmpdir(), "forgetauri-scenario-"));
  const originalCwd = process.cwd();
  mkdirSync(join(root, "docs", "architecture"), { recursive: true });
  process.chdir(root);

  const workspace: ScenarioWorkspace = {
    root,
    originalCwd,
    targetDocPath: "docs/architecture/scenario-target.md",
    siblingDocPath: "docs/architecture/neighbor.md"
  };

  resetScenarioWorkspaceFiles(workspace);
  return workspace;
}

function resetScenarioWorkspaceFiles(workspace: ScenarioWorkspace): void {
  writeFileSync(
    workspace.targetDocPath,
    [
      "# Scenario Target",
      "",
      "Context: Controlled Docs Maintenance Validation Scenario",
      "TODO: refine this sentence"
    ].join("\n"),
    "utf8"
  );
  writeFileSync(
    workspace.siblingDocPath,
    ["# Neighbor", "", "secondary artifact file"].join("\n"),
    "utf8"
  );
}

function teardownScenarioWorkspace(workspace: ScenarioWorkspace): void {
  process.chdir(workspace.originalCwd);
  rmSync(workspace.root, { recursive: true, force: true });
}

function createRuntimeContext(): {
  state: AgentState;
  plan: Plan;
  tasks: Task[];
} {
  return {
    state: makeAgentState({
      runId: "scenario-run-1",
      status: "running",
      goal: "validate docs scenario",
      planId: "plan-1",
      currentTaskId: "task-1"
    }),
    plan: makePlan({
      id: "plan-1",
      goal: "validate docs scenario",
      status: "ready",
      taskIds: ["task-1"]
    }),
    tasks: [
      makeTask({
        id: "task-1",
        title: "validate controlled docs maintenance scenario",
        status: "ready"
      })
    ]
  };
}

function buildExecuteRequest(action: Action, requestRefSuffix: string): EffectRequest {
  return {
    kind: "execute_actions",
    request_ref: {
      run_id: "scenario-run-1",
      plan_id: "plan-1",
      task_id: "task-1",
      request_kind: "execute_actions"
    },
    payload: {
      request_ref_suffix: requestRefSuffix,
      actions: [action]
    }
  };
}

function buildDirectoryListAction(limit = 5): Action {
  return {
    kind: "capability",
    name: "controlled_directory_text_list",
    input: {
      target_path: "docs/architecture",
      list: {
        kind: "text_entries",
        limit
      }
    }
  };
}

function buildReadAction(targetPath: string, queryText: string): Action {
  return {
    kind: "capability",
    name: "controlled_single_file_text_read",
    input: {
      target_path: targetPath,
      read: {
        kind: "contains_text",
        query_text: queryText
      }
    }
  };
}

function buildModificationAction(
  targetPath: string,
  findText: string,
  replaceText: string
): Action {
  return {
    kind: "capability",
    name: "controlled_single_file_text_modification",
    input: {
      target_path: targetPath,
      change: {
        kind: "replace_text",
        find_text: findText,
        replace_text: replaceText
      }
    }
  };
}

function actionResultFromEffect(result: EffectResult): Record<string, unknown> {
  const payload = result.payload as { results?: unknown[] };
  return (payload.results?.[0] ?? {}) as Record<string, unknown>;
}

describe("stage 7.2 e2e - controlled docs maintenance validation scenario", () => {
  let workspace: ScenarioWorkspace;

  beforeAll(() => {
    workspace = setupScenarioWorkspace();
  });

  beforeEach(() => {
    resetActiveAgentProfile();
    resetScenarioWorkspaceFiles(workspace);
  });

  afterAll(() => {
    resetActiveAgentProfile();
    teardownScenarioWorkspace(workspace);
  });

  it("normal path: bounded list -> bounded read -> single-file correction on docs/architecture markdown", () => {
    const runtime = createRuntimeContext();
    const observedActionNames: string[] = [];

    const listResult = executeShellRuntimeRequest(
      buildExecuteRequest(buildDirectoryListAction(2), "list")
    ) as EffectResult;
    expect(listResult).toMatchObject({
      kind: "action_results",
      success: true,
      request_ref: {
        run_id: "scenario-run-1",
        plan_id: "plan-1",
        task_id: "task-1",
        request_kind: "execute_actions"
      },
      payload: {
        count: 1
      }
    });
    const listActionResult = actionResultFromEffect(listResult);
    observedActionNames.push(String(listActionResult.actionName));
    expect(listActionResult).toMatchObject({
      status: "succeeded",
      actionName: "controlled_directory_text_list",
      output: {
        listed: true,
        count: 2,
        evidence: {
          capability: "controlled_directory_text_list",
          target_path: "docs/architecture",
          non_recursive: true
        }
      }
    });
    const listedEntries = (
      (listActionResult.output as {
        entries?: Array<{ relative_path?: string }>;
      })?.entries ?? []
    ).map((entry) => entry.relative_path);
    expect(listedEntries).toEqual([
      "docs/architecture/neighbor.md",
      "docs/architecture/scenario-target.md"
    ]);

    const tickAfterList = runRuntimeTick(runtime.state, runtime.plan, runtime.tasks, listResult);
    expect(tickAfterList.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "continue",
      resultKind: "action_results",
      requestKind: "execute_actions"
    });

    const readResult = executeShellRuntimeRequest(
      buildExecuteRequest(
        buildReadAction(
          workspace.targetDocPath,
          "TODO: refine this sentence"
        ),
        "read"
      )
    ) as EffectResult;
    expect(readResult).toMatchObject({
      kind: "action_results",
      success: true,
      payload: {
        count: 1
      }
    });
    const readActionResult = actionResultFromEffect(readResult);
    observedActionNames.push(String(readActionResult.actionName));
    expect(readActionResult).toMatchObject({
      status: "succeeded",
      actionName: "controlled_single_file_text_read",
      output: {
        inspected: true,
        result: {
          matched: true
        },
        evidence: {
          capability: "controlled_single_file_text_read",
          target_path: workspace.targetDocPath
        }
      }
    });

    const tickAfterRead = runRuntimeTick(
      tickAfterList.state,
      runtime.plan,
      runtime.tasks,
      readResult
    );
    expect(tickAfterRead.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "continue",
      resultKind: "action_results"
    });

    const modifyResult = executeShellRuntimeRequest(
      buildExecuteRequest(
        buildModificationAction(
          workspace.targetDocPath,
          "TODO: refine this sentence",
          "DONE: sentence refined"
        ),
        "modify"
      )
    ) as EffectResult;
    expect(modifyResult).toMatchObject({
      kind: "action_results",
      success: true,
      payload: {
        count: 1
      }
    });
    const modifyActionResult = actionResultFromEffect(modifyResult);
    observedActionNames.push(String(modifyActionResult.actionName));
    expect(modifyActionResult).toMatchObject({
      status: "succeeded",
      actionName: "controlled_single_file_text_modification",
      output: {
        applied: true,
        evidence: {
          capability: "controlled_single_file_text_modification",
          target_path: workspace.targetDocPath
        }
      }
    });

    const finalTick = runRuntimeTick(
      tickAfterRead.state,
      runtime.plan,
      runtime.tasks,
      modifyResult
    );
    expect(finalTick.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "continue",
      resultKind: "action_results",
      requestKind: "execute_actions"
    });
    expect(readCoreRuntimeSummary(finalTick.state)).toMatchObject(finalTick.tickSummary);
    expect(readFileSync(workspace.targetDocPath, "utf8")).toContain("DONE: sentence refined");
    expect(observedActionNames).toEqual([
      "controlled_directory_text_list",
      "controlled_single_file_text_read",
      "controlled_single_file_text_modification"
    ]);
  });

  it("governance path: strict profile policy constrains docs/architecture scenario and keeps review observable", () => {
    setActiveAgentProfile(STRICT_PROFILE);
    const runtime = createRuntimeContext();

    const listResult = executeShellRuntimeRequest(
      buildExecuteRequest(buildDirectoryListAction(2), "governance-list")
    ) as EffectResult;

    expect(listResult).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message:
          "policy_refused: target path outside allowed boundary (docs/architecture)",
        request_ref: {
          run_id: "scenario-run-1",
          plan_id: "plan-1",
          task_id: "task-1",
          request_kind: "execute_actions"
        }
      }
    });

    const actionResult = actionResultFromEffect(listResult);
    expect(actionResult).toMatchObject({
      status: "failed",
      actionName: "controlled_directory_text_list",
      errorMessage: "path_outside_boundary",
      output: {
        listed: false,
        policy_violation: {
          code: "path_outside_boundary"
        },
        evidence: {
          target_path: "docs/architecture"
        }
      }
    });

    const tick = runRuntimeTick(runtime.state, runtime.plan, runtime.tasks, listResult);
    expect(tick.request?.kind).toBe("run_review");
    expect(tick.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "review_required",
      resultKind: "action_results",
      requestKind: "run_review",
      failureSummary: "1 action(s) failed"
    });
    expect(readCoreRuntimeSummary(tick.state)).toMatchObject(tick.tickSummary);
  });

  it("failure/recovery path: find_text miss normalizes failure, then repair waiting and recovery re-entry stay on existing semantics", () => {
    const runtime = createRuntimeContext();

    const failedModifyResult = executeShellRuntimeRequest(
      buildExecuteRequest(
        buildModificationAction(
          workspace.targetDocPath,
          "TEXT_NOT_PRESENT",
          "replacement"
        ),
        "failure-modify"
      )
    ) as EffectResult;

    expect(failedModifyResult).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: `execution_failed: find_text not found in ${workspace.targetDocPath}`,
        summary: "1 action(s) failed"
      }
    });

    const failedTick = runRuntimeTick(
      runtime.state,
      runtime.plan,
      runtime.tasks,
      failedModifyResult
    );
    expect(failedTick.request?.kind).toBe("run_review");
    expect(failedTick.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "review_required",
      resultKind: "action_results",
      requestKind: "run_review",
      failureSummary: "1 action(s) failed"
    });

    const reviewRequest: EffectRequest = {
      ...(failedTick.request as EffectRequest),
      payload: {
        ...((failedTick.request?.payload as Record<string, unknown>) ?? {}),
        decision_override: "repair"
      }
    };
    const reviewResult = executeShellRuntimeRequest(reviewRequest) as EffectResult;
    expect(reviewResult).toMatchObject({
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "repair"
      }
    });

    const repairWaitingTick = runRuntimeTick(
      failedTick.state,
      runtime.plan,
      runtime.tasks,
      reviewResult
    );
    expect(repairWaitingTick.request).toBeUndefined();
    expect(repairWaitingTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_repair",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      resultKind: "review_result"
    });

    const recoveryResult: EffectResult = {
      kind: "repair_recovery",
      success: true,
      payload: {
        status: "recovered",
        summary: "manual repair completed"
      }
    };
    const recoveredTick = runRuntimeTick(
      repairWaitingTick.state,
      runtime.plan,
      runtime.tasks,
      recoveryResult
    );

    expect(recoveredTick.request?.kind).toBe("execute_actions");
    expect(recoveredTick.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "repair_recovered",
      resultKind: "repair_recovery",
      requestKind: "execute_actions",
      failureSummary: "manual repair completed"
    });
    expect(readCoreRuntimeSummary(recoveredTick.state)).toMatchObject(
      recoveredTick.tickSummary
    );
  });
});
