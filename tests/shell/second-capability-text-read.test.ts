import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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

describe("second capability - controlled_single_file_text_read", () => {
  let workspace: CapabilityWorkspace;

  beforeAll(() => {
    workspace = setupCapabilityWorkspace();
  });

  beforeEach(() => {
    resetActiveAgentProfile();
    resetCapabilityWorkspaceFiles(workspace);
  });

  afterAll(() => {
    resetActiveAgentProfile();
    teardownCapabilityWorkspace(workspace);
  });

  it("supports narrow contains_text contract and returns controlled success shape", () => {
    const result = buildActionResult(buildReadAction(workspace));

    expect(result).toMatchObject({
      status: "succeeded",
      actionName: "controlled_single_file_text_read",
      output: {
        inspected: true,
        result: {
          matched: true
        },
        evidence: {
          capability: "controlled_single_file_text_read",
          target_path: workspace.primaryTargetPath,
          single_file: true,
          text_only: true,
          read_kind: "contains_text"
        }
      },
      evidence_refs: [
        {
          capability: "controlled_single_file_text_read",
          outcome: "succeeded"
        }
      ]
    });
  });

  it("is meaningfully different from text modification: unmatched query is success with matched=false", () => {
    const readResult = buildActionResult(
      buildReadAction(workspace, {
        input: {
          target_path: workspace.primaryTargetPath,
          read: {
            kind: "contains_text",
            query_text: "not-present"
          }
        }
      })
    );
    const modifyResult = buildActionResult(
      buildModifyAction(workspace, {
        input: {
          target_path: workspace.primaryTargetPath,
          change: {
            kind: "replace_text",
            find_text: "not-present",
            replace_text: "new"
          }
        }
      })
    );

    expect(readResult).toMatchObject({
      status: "succeeded",
      output: {
        inspected: true,
        result: {
          matched: false
        }
      }
    });
    expect(modifyResult).toMatchObject({
      status: "failed",
      errorMessage: "find_text_not_found"
    });
  });

  it("normalizes refusal/policy/execution failures through same action/effect path", () => {
    const refusal = buildActionResult(
      buildReadAction(workspace, {
        input: {
          target_path: "../bad.md",
          read: { kind: "contains_text", query_text: "a" }
        }
      })
    );
    const policyViolation = buildActionResult(
      buildReadAction(workspace, {
        input: {
          target_path: "scripts/outside.md",
          read: { kind: "contains_text", query_text: "a" }
        }
      })
    );
    const executionFailure = buildActionResult(
      buildReadAction(workspace, {
        input: {
          target_path: "docs/missing.md",
          read: { kind: "contains_text", query_text: "a" }
        }
      })
    );

    expect(refusal).toMatchObject({ status: "failed", errorMessage: "invalid_path" });
    expect(policyViolation).toMatchObject({
      status: "failed",
      errorMessage: "path_outside_boundary"
    });
    expect(executionFailure).toMatchObject({
      status: "failed",
      errorMessage: "target_file_missing"
    });

    const effect = buildEffectResultFromActionResults(
      { kind: "execute_actions", payload: {} },
      [executionFailure]
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

  it("respects profile-driven policy for second capability (default allows, strict refuses)", () => {
    const action = buildReadAction(workspace);

    setActiveAgentProfile(DEFAULT_PROFILE);
    const defaultResult = buildActionResult(action);

    setActiveAgentProfile(STRICT_PROFILE);
    const strictResult = buildActionResult(action);

    expect(defaultResult.status).toBe("succeeded");
    expect(strictResult).toMatchObject({
      status: "failed",
      errorMessage: "path_outside_boundary"
    });
  });

  it("keeps request_ref/evidence/failure_signal compatibility on same effect pipeline", () => {
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
          buildReadAction(workspace, {
            input: {
              target_path: "docs/missing.md",
              read: {
                kind: "contains_text",
                query_text: "x"
              }
            }
          })
        ]
      }
    };

    const effect = executeEffectRequest(request);

    expect(effect).toMatchObject({
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
          outcome: "action_results_failed",
          requestKind: "execute_actions"
        }
      ]
    });
  });

  it("coexists with first capability under one semantic framework and same runtime path", () => {
    const request: EffectRequest = {
      kind: "execute_actions",
      payload: {
        actions: [buildReadAction(workspace), buildModifyAction(workspace)]
      }
    };

    const shellResult = executeEffectRequest(request);
    expect(shellResult).toMatchObject({
      kind: "action_results",
      success: true,
      payload: {
        count: 2
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
