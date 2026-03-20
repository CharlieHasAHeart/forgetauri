import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Action, type ActionResult, type EffectRequest } from "../../src/protocol/index.ts";
import { buildActionResult } from "../../src/shell/build-action-result.ts";
import {
  areAllActionResultsSuccessful,
  buildActionResultsPayload,
  buildEffectResultFromActionResults,
  buildEffectResultFromActions,
  buildEffectResultFromSingleAction,
  canBuildEffectResultFromActions
} from "../../src/shell/build-effect-result-from-actions.ts";
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

describe("build-effect-result-from-actions", () => {
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

  const validRequest: EffectRequest = {
    kind: "execute_actions",
    payload: {}
  };

  it("buildActionResultsPayload returns stable payload structure", () => {
    const action = buildCapabilityAction(workspace);
    const results = [buildActionResult(action)];

    const payload = buildActionResultsPayload(results);

    expect(payload).toEqual({
      results,
      count: 1
    });
  });

  it("areAllActionResultsSuccessful([]) matches current behavior", () => {
    expect(areAllActionResultsSuccessful([])).toBe(true);
  });

  it("areAllActionResultsSuccessful returns true for all successful results", () => {
    const results = [
      buildActionResult(buildCapabilityAction(workspace)),
      buildActionResult(
        buildCapabilityAction(workspace, {
          input: {
            target_path: workspace.secondaryTargetPath,
            change: {
              kind: "replace_text",
              find_text: "alpha",
              replace_text: "beta"
            }
          }
        })
      )
    ];

    expect(areAllActionResultsSuccessful(results)).toBe(true);
  });

  it("areAllActionResultsSuccessful returns false when any result fails", () => {
    const results = [buildActionResult(buildCapabilityAction(workspace)), buildActionResult(undefined)];

    expect(areAllActionResultsSuccessful(results)).toBe(false);
  });

  it("buildEffectResultFromActionResults normalizes contract refusal failures", () => {
    const results = [
      buildActionResult(buildCapabilityAction(workspace)),
      buildActionResult(
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
    ];

    const effectResult = buildEffectResultFromActionResults(validRequest, results);

    expect(effectResult).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "refused: invalid single-file text path",
        summary: "1 action(s) failed"
      },
      context: {
        requestKind: "execute_actions",
        handled: true
      }
    });
    expect(effectResult.payload).toEqual({
      results,
      count: 2
    });
  });

  it("buildEffectResultFromActionResults normalizes execution failures into failure_signal", () => {
    const results = [
      buildActionResult(
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
    ];

    const effectResult = buildEffectResultFromActionResults(validRequest, results);

    expect(effectResult).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "execution_failed: target file not found (docs/missing.md)",
        summary: "1 action(s) failed"
      }
    });
  });

  it("prefers evidence ref summary and propagates stable request_ref across result/failure/context", () => {
    const requestWithRef: EffectRequest = {
      kind: "execute_actions",
      request_ref: {
        run_id: "run-1",
        plan_id: "plan-1",
        task_id: "task-1",
        request_kind: "execute_actions"
      },
      payload: {}
    };
    const failedFromRef: ActionResult = {
      status: "failed",
      actionName: "controlled_single_file_text_modification",
      errorMessage: "path_outside_boundary",
      output: {
        // keep an intentionally noisy payload to verify aggregation no longer depends on it first.
        policy_violation: {
          code: "path_outside_boundary",
          summary: "noisy embedded payload summary"
        }
      },
      evidence_refs: [
        {
          kind: "capability",
          source: "shell",
          outcome: "policy_violation",
          capability: "controlled_single_file_text_modification",
          targetPath: "scripts/outside.md",
          code: "path_outside_boundary",
          summary: "policy_refused: target path outside allowed boundary (scripts/outside.md)"
        }
      ]
    };

    const effectResult = buildEffectResultFromActionResults(requestWithRef, [failedFromRef]);

    expect(effectResult).toMatchObject({
      kind: "action_results",
      success: false,
      request_ref: requestWithRef.request_ref,
      context: {
        requestKind: "execute_actions",
        request_ref: requestWithRef.request_ref,
        handled: true
      },
      failure_signal: {
        message: "policy_refused: target path outside allowed boundary (scripts/outside.md)",
        request_ref: requestWithRef.request_ref,
        summary: "1 action(s) failed"
      }
    });
  });

  it("buildEffectResultFromActionResults normalizes policy violation into failure_signal", () => {
    const results = [
      buildActionResult(
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
    ];

    const effectResult = buildEffectResultFromActionResults(validRequest, results);

    expect(effectResult).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "policy_refused: target path outside allowed boundary (scripts/outside.md)",
        summary: "1 action(s) failed"
      }
    });
  });

  it("buildEffectResultFromActionResults handles empty results stably", () => {
    const effectResult = buildEffectResultFromActionResults(validRequest, []);

    expect(effectResult).toMatchObject({
      kind: "action_results",
      success: true,
      context: {
        requestKind: "execute_actions",
        handled: true
      }
    });
    expect(effectResult.payload).toEqual({
      results: [],
      count: 0
    });
  });

  it("buildEffectResultFromSingleAction equals single-result aggregation", () => {
    const action = buildCapabilityAction(workspace);

    const viaSingle = buildEffectResultFromSingleAction(validRequest, action);
    resetCapabilityWorkspaceFiles(workspace);
    const viaAggregate = buildEffectResultFromActionResults(validRequest, [buildActionResult(action)]);

    expect(viaSingle).toEqual(viaAggregate);
  });

  it("buildEffectResultFromActions matches map(buildActionResult) aggregation", () => {
    const actions: Action[] = [
      buildCapabilityAction(workspace),
      buildCapabilityAction(workspace, {
        input: {
          target_path: workspace.secondaryTargetPath,
          change: {
            kind: "replace_text",
            find_text: "alpha",
            replace_text: "after-alpha"
          }
        }
      })
    ];

    const expected = buildEffectResultFromActionResults(
      validRequest,
      actions.map((action) => buildActionResult(action))
    );
    resetCapabilityWorkspaceFiles(workspace);
    const fromActions = buildEffectResultFromActions(validRequest, actions);

    expect(fromActions).toEqual(expected);
  });

  it("buildEffectResultFromActions(undefined, actions) matches current behavior", () => {
    const actions: Action[] = [buildCapabilityAction(workspace)];

    expect(buildEffectResultFromActions(undefined, actions)).toBeUndefined();
  });

  it("canBuildEffectResultFromActions(undefined, actions) returns false", () => {
    const actions: Action[] = [buildCapabilityAction(workspace)];

    expect(canBuildEffectResultFromActions(undefined, actions)).toBe(false);
  });

  it("canBuildEffectResultFromActions returns true for recognizable contract actions, including refusal inputs", () => {
    const actions: Action[] = [
      buildCapabilityAction(workspace),
      buildCapabilityAction(workspace, {
        input: {
          target_path: "",
          change: {
            kind: "replace_text",
            find_text: "x",
            replace_text: "z"
          }
        }
      })
    ];

    expect(canBuildEffectResultFromActions(validRequest, actions)).toBe(true);
  });

  it("canBuildEffectResultFromActions returns false when actions contain invalid items", () => {
    const mixedActions = [
      buildCapabilityAction(workspace),
      { kind: "tool" }
    ] as unknown as Action[];

    expect(canBuildEffectResultFromActions(validRequest, mixedActions)).toBe(false);
  });

  it("supports defensive aggregation with non-builder results for boundary tolerance", () => {
    const looseResults = [{ success: true }, { success: false }] as unknown[];
    const effectResult = buildEffectResultFromActionResults(
      validRequest,
      looseResults as ReturnType<typeof buildActionResult>[]
    );

    expect(effectResult.kind).toBe("action_results");
    expect(effectResult.success).toBe(false);
    expect(effectResult.context).toEqual({
      requestKind: "execute_actions",
      handled: true
    });
    expect(effectResult.payload).toMatchObject({ count: 2 });
  });
});
