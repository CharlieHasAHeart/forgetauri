import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import { buildActionResult } from "../../src/shell/build-action-result.ts";
import { buildEffectResultFromActionResults } from "../../src/shell/build-effect-result-from-actions.ts";
import { executeEffectRequest } from "../../src/shell/execute-effect-request.ts";
import { DEFAULT_PROFILE, resetActiveAgentProfile, setActiveAgentProfile } from "../../src/profiles/default-profile.ts";
import { STRICT_PROFILE } from "../../src/profiles/strict-profile.ts";
import { type Action, type EffectRequest } from "../../src/protocol/index.ts";
import { minimalAgentState, minimalPlan, minimalTasks } from "../shared/minimal-runtime-fixtures.ts";
import {
  resetCapabilityWorkspaceFiles,
  setupCapabilityWorkspace,
  teardownCapabilityWorkspace,
  type CapabilityWorkspace
} from "../shared/capability-workspace-fixture.ts";

function buildListAction(
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

function buildModifyAction(
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

describe("third capability - controlled_directory_text_list", () => {
  let workspace: CapabilityWorkspace;

  beforeAll(() => {
    workspace = setupCapabilityWorkspace();
  });

  beforeEach(() => {
    resetActiveAgentProfile();
    resetCapabilityWorkspaceFiles(workspace);
    mkdirSync("docs/restricted", { recursive: true });
    writeFileSync("docs/restricted/allowed.txt", "alpha", "utf8");
    writeFileSync("docs/image.png", "binary-like", "utf8");
  });

  afterAll(() => {
    resetActiveAgentProfile();
    teardownCapabilityWorkspace(workspace);
  });

  it("defines narrow contract for single-directory non-recursive text listing", () => {
    const result = buildActionResult(buildListAction());

    expect(result).toMatchObject({
      status: "succeeded",
      actionName: "controlled_directory_text_list",
      output: {
        listed: true,
        count: expect.any(Number),
        entries: expect.any(Array),
        evidence: {
          capability: "controlled_directory_text_list",
          target_path: "docs",
          single_directory: true,
          non_recursive: true,
          text_only: true,
          list_kind: "text_entries"
        }
      }
    });
  });

  it("is clearly different kind from single-file read/modify capabilities", () => {
    const listResult = buildActionResult(buildListAction());
    const readResult = buildActionResult(buildReadAction(workspace));
    const modifyResult = buildActionResult(buildModifyAction(workspace));

    expect(listResult).toMatchObject({
      status: "succeeded",
      output: {
        listed: true
      }
    });
    expect(readResult).toMatchObject({
      status: "succeeded",
      output: {
        inspected: true
      }
    });
    expect(modifyResult).toMatchObject({
      status: "succeeded",
      output: {
        applied: true
      }
    });
  });

  it("normalizes refusal/policy/execution failures through same ActionResult/EffectResult/failure_signal path", () => {
    const refusal = buildActionResult(
      buildListAction({
        input: {
          target_path: "../docs",
          list: {
            kind: "text_entries",
            limit: 10
          }
        }
      })
    );
    const policy = buildActionResult(
      buildListAction({
        input: {
          target_path: "scripts",
          list: {
            kind: "text_entries",
            limit: 10
          }
        }
      })
    );
    const execution = buildActionResult(
      buildListAction({
        input: {
          target_path: "docs/missing-dir",
          list: {
            kind: "text_entries",
            limit: 10
          }
        }
      })
    );

    expect(refusal).toMatchObject({ status: "failed", errorMessage: "invalid_path" });
    expect(policy).toMatchObject({ status: "failed", errorMessage: "path_outside_boundary" });
    expect(execution).toMatchObject({
      status: "failed",
      errorMessage: "target_directory_missing"
    });

    const effect = buildEffectResultFromActionResults(
      { kind: "execute_actions", payload: {} },
      [execution]
    );
    expect(effect).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false
      }
    });
  });

  it("respects profile-driven policy for third capability (default allows, strict refuses docs)", () => {
    setActiveAgentProfile(DEFAULT_PROFILE);
    const defaultResult = buildActionResult(buildListAction());
    setActiveAgentProfile(STRICT_PROFILE);
    const strictResult = buildActionResult(buildListAction());

    expect(defaultResult.status).toBe("succeeded");
    expect(strictResult).toMatchObject({
      status: "failed",
      errorMessage: "path_outside_boundary"
    });
  });

  it("keeps evidence/request_ref/failure_signal compatibility for collection-style result", () => {
    const request: EffectRequest = {
      kind: "execute_actions",
      request_ref: {
        run_id: "run-1",
        plan_id: "plan-1",
        task_id: "task-1",
        request_kind: "execute_actions"
      },
      payload: {
        actions: [
          buildListAction({
            input: {
              target_path: "docs/missing-dir",
              list: {
                kind: "text_entries",
                limit: 10
              }
            }
          })
        ]
      }
    };

    const result = executeEffectRequest(request);

    expect(result).toMatchObject({
      kind: "action_results",
      success: false,
      request_ref: request.request_ref,
      context: {
        request_ref: request.request_ref
      },
      failure_signal: {
        request_ref: request.request_ref
      },
      evidence_refs: [
        {
          kind: "effect",
          outcome: "action_results_failed"
        }
      ]
    });
  });

  it("coexists with first+second capability under same runtime semantics", () => {
    const request: EffectRequest = {
      kind: "execute_actions",
      payload: {
        actions: [buildModifyAction(workspace), buildReadAction(workspace), buildListAction()]
      }
    };

    const shellResult = executeEffectRequest(request);
    expect(shellResult).toMatchObject({
      kind: "action_results",
      success: true,
      payload: {
        count: 3
      }
    });

    const absorbed = runRuntimeTick(
      runRuntimeTick(minimalAgentState, minimalPlan, minimalTasks, undefined).state,
      minimalPlan,
      minimalTasks,
      shellResult
    );
    expect(absorbed.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "continue",
      resultKind: "action_results",
      requestKind: "execute_actions"
    });
    expect(readFileSync(workspace.primaryTargetPath, "utf8")).toContain("after-one");
  });
});
