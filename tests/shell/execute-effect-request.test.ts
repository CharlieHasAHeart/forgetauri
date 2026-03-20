import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { isEffectResult, type Action, type EffectRequest } from "../../src/protocol/index.ts";
import {
  buildInvalidEffectResult,
  buildUnsupportedEffectResult,
  canExecuteEffectRequest,
  executeEffectRequest
} from "../../src/shell/execute-effect-request.ts";
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

describe("executeEffectRequest - normal paths", () => {
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

  it("returns normalized action_results for valid execute_actions request", () => {
    const request: EffectRequest = {
      kind: "execute_actions",
      payload: {
        actions: [buildCapabilityAction(workspace)]
      }
    };

    const result = executeEffectRequest(request);

    expect(result).toBeDefined();
    expect(isEffectResult(result)).toBe(true);
    expect(result?.kind).toBe("action_results");
    expect(result?.success).toBe(true);
    expect(result?.context).toEqual({ requestKind: "execute_actions", handled: true });
    expect(result?.payload).toMatchObject({
      count: 1,
      results: [
        {
          status: "succeeded",
          actionName: "controlled_single_file_text_modification"
        }
      ]
    });
    expect(readFileSync(workspace.primaryTargetPath, "utf8")).toContain("after-one");
  });

  it("returns stable result for execute_actions with empty actions", () => {
    const request: EffectRequest = {
      kind: "execute_actions",
      payload: {
        actions: []
      }
    };

    const result = executeEffectRequest(request);

    expect(result).toBeDefined();
    expect(result?.kind).toBe("action_results");
    expect(result?.success).toBe(true);
    expect(result?.payload).toEqual({ count: 0, results: [] });
  });

  it("propagates request_ref through execute_actions result and failure signal", () => {
    const requestRef = {
      run_id: "run-1",
      plan_id: "plan-1",
      task_id: "task-1",
      request_kind: "execute_actions" as const
    };
    const request: EffectRequest = {
      kind: "execute_actions",
      request_ref: requestRef,
      payload: {
        actions: [
          buildCapabilityAction(workspace, {
            input: {
              target_path: "docs/missing.md",
              change: {
                kind: "replace_text",
                find_text: "old",
                replace_text: "new"
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
      request_ref: requestRef,
      context: {
        requestKind: "execute_actions",
        request_ref: requestRef,
        handled: true
      },
      failure_signal: {
        request_ref: requestRef
      }
    });
  });

  it("keeps only valid actions when payload.actions contains mixed items", () => {
    const mixedActions = [
      buildCapabilityAction(workspace),
      { kind: "capability" },
      "not-an-action"
    ] as unknown as Action[];

    const request: EffectRequest = {
      kind: "execute_actions",
      payload: {
        actions: mixedActions
      }
    };

    const result = executeEffectRequest(request);

    expect(result).toBeDefined();
    expect(result?.kind).toBe("action_results");
    expect(result?.success).toBe(true);
    expect(result?.payload).toMatchObject({ count: 1 });
    const results = Reflect.get(result?.payload as object, "results");
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(1);
    expect(results).toMatchObject([
      {
        status: "succeeded",
        actionName: "controlled_single_file_text_modification"
      }
    ]);
  });

  it("returns action_results failure for execution error when target file is missing", () => {
    const request: EffectRequest = {
      kind: "execute_actions",
      payload: {
        actions: [
          buildCapabilityAction(workspace, {
            input: {
              target_path: "docs/missing.md",
              change: {
                kind: "replace_text",
                find_text: "old",
                replace_text: "new"
              }
            }
          })
        ]
      }
    };

    const result = executeEffectRequest(request);

    expect(result).toBeDefined();
    expect(result?.kind).toBe("action_results");
    expect(result?.success).toBe(false);
    expect(result).toMatchObject({
      failure_signal: {
        terminal: false,
        message: "execution_failed: target file not found (docs/missing.md)"
      }
    });
  });

  it("returns action_results failure for policy-refused path boundary", () => {
    const request: EffectRequest = {
      kind: "execute_actions",
      payload: {
        actions: [
          buildCapabilityAction(workspace, {
            input: {
              target_path: "scripts/missing.md",
              change: {
                kind: "replace_text",
                find_text: "old",
                replace_text: "new"
              }
            }
          })
        ]
      }
    };

    const result = executeEffectRequest(request);

    expect(result).toBeDefined();
    expect(result?.kind).toBe("action_results");
    expect(result?.success).toBe(false);
    expect(result).toMatchObject({
      failure_signal: {
        terminal: false,
        message:
          "policy_refused: target path outside allowed boundary (scripts/missing.md)"
      }
    });
  });

  it("returns action_results failure for execution error when find_text is not found", () => {
    const request: EffectRequest = {
      kind: "execute_actions",
      payload: {
        actions: [
          buildCapabilityAction(workspace, {
            input: {
              target_path: workspace.primaryTargetPath,
              change: {
                kind: "replace_text",
                find_text: "not-present",
                replace_text: "new"
              }
            }
          })
        ]
      }
    };

    const result = executeEffectRequest(request);

    expect(result).toBeDefined();
    expect(result?.kind).toBe("action_results");
    expect(result?.success).toBe(false);
    expect(result).toMatchObject({
      failure_signal: {
        terminal: false,
        message: `execution_failed: find_text not found in ${workspace.primaryTargetPath}`
      }
    });
  });

  it("treats malformed request_ref as invalid effect request boundary", () => {
    const request = {
      kind: "execute_actions",
      request_ref: {
        run_id: "run-1",
        plan_id: "plan-1",
        task_id: "",
        request_kind: "execute_actions"
      },
      payload: { actions: [buildCapabilityAction(workspace)] }
    } as unknown as EffectRequest;

    const result = executeEffectRequest(request);

    expect(result).toMatchObject({
      kind: "action_results",
      success: false,
      payload: {
        reason: "invalid_effect_request"
      },
      context: {
        handled: false
      }
    });
  });

  it("returns normalized review_result for valid run_review request", () => {
    const request: EffectRequest = {
      kind: "run_review",
      payload: {}
    };

    const result = executeEffectRequest(request);

    expect(result).toBeDefined();
    expect(isEffectResult(result)).toBe(true);
    expect(result?.kind).toBe("review_result");
    expect(result?.success).toBe(true);
    expect(result?.payload).toEqual({
      decision: "approved",
      next_action: "continue",
      summary: "review accepted for run_review"
    });
    expect(result?.context).toEqual({ handled: true });
  });

  it("keeps run_review behavior stable when payload contains extra fields", () => {
    const request: EffectRequest = {
      kind: "run_review",
      payload: {
        criteria: { level: "strict" },
        notes: "extra input should not change minimal review path"
      }
    };

    const result = executeEffectRequest(request);

    expect(result).toBeDefined();
    expect(result?.kind).toBe("review_result");
    expect(result?.success).toBe(true);
    expect(result?.payload).toEqual({
      decision: "approved",
      next_action: "continue",
      summary: "review accepted for run_review"
    });
    expect(result?.context).toEqual({ handled: true });
  });

  it("does not route run_review request to execute_actions aggregation shape", () => {
    const request: EffectRequest = {
      kind: "run_review",
      payload: {
        actions: [{ kind: "tool", name: "should_not_be_used" }]
      }
    };

    const result = executeEffectRequest(request);

    expect(result).toBeDefined();
    expect(result?.kind).toBe("review_result");
    expect(result?.payload).not.toMatchObject({
      count: expect.any(Number),
      results: expect.any(Array)
    });
    expect(result?.context).toEqual({ handled: true });
  });

  it("returns undefined for undefined input", () => {
    expect(executeEffectRequest(undefined)).toBeUndefined();
  });

  it("returns invalid effect result for invalid request object", () => {
    const invalidRequest = {
      kind: "execute_actions"
    } as unknown as EffectRequest;

    const result = executeEffectRequest(invalidRequest);

    expect(result).toBeDefined();
    expect(result?.kind).toBe("action_results");
    expect(result?.success).toBe(false);
    expect(result?.payload).toMatchObject({
      reason: "invalid_effect_request",
      requestKind: "unknown"
    });
    expect(result?.context).toEqual({ handled: false });
  });

  it("returns invalid effect result when request kind is not allowed", () => {
    const invalidRequest = {
      kind: "unknown_kind",
      payload: {}
    } as unknown as EffectRequest;

    const result = executeEffectRequest(invalidRequest);

    expect(result).toBeDefined();
    expect(result?.kind).toBe("action_results");
    expect(result?.success).toBe(false);
    expect(result?.payload).toMatchObject({
      reason: "invalid_effect_request",
      requestKind: "unknown"
    });
    expect(result?.context).toEqual({ handled: false });
  });
});

describe("executeEffectRequest - invalid/unsupported builders", () => {
  it("buildInvalidEffectResult(undefined) returns stable invalid template", () => {
    const result = buildInvalidEffectResult(undefined);

    expect(result).toMatchObject({
      kind: "action_results",
      success: false,
      payload: {
        reason: "invalid_effect_request",
        requestKind: "unknown"
      },
      context: {
        handled: false
      }
    });
  });

  it("buildInvalidEffectResult(kind) keeps provided request kind", () => {
    const result = buildInvalidEffectResult("some_kind");

    expect(result).toMatchObject({
      kind: "action_results",
      success: false,
      payload: {
        reason: "invalid_effect_request",
        requestKind: "some_kind"
      },
      context: {
        handled: false
      }
    });
  });

  it("buildUnsupportedEffectResult(request) returns stable unsupported template", () => {
    const request: EffectRequest = {
      kind: "execute_actions",
      payload: {}
    };

    const result = buildUnsupportedEffectResult(request);

    expect(result).toMatchObject({
      kind: "action_results",
      success: false,
      payload: {
        reason: "unsupported_effect_request",
        requestKind: request.kind
      },
      context: {
        handled: false
      }
    });
  });
});

describe("canExecuteEffectRequest", () => {
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

  it("returns false for undefined and invalid request", () => {
    expect(canExecuteEffectRequest(undefined)).toBe(false);

    const invalidRequest = {
      kind: "execute_actions"
    } as unknown as EffectRequest;

    expect(canExecuteEffectRequest(invalidRequest)).toBe(false);
  });

  it("returns true for valid execute_actions request", () => {
    const request: EffectRequest = {
      kind: "execute_actions",
      payload: { actions: [buildCapabilityAction(workspace)] }
    };

    expect(canExecuteEffectRequest(request)).toBe(true);
  });

  it("returns true for valid run_review request", () => {
    const request: EffectRequest = {
      kind: "run_review",
      payload: {}
    };

    expect(canExecuteEffectRequest(request)).toBe(true);
  });
});
