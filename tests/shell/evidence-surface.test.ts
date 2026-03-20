import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Action, type EffectRequest } from "../../src/protocol/index.ts";
import { buildActionResult } from "../../src/shell/build-action-result.ts";
import { buildEffectResultFromActionResults } from "../../src/shell/build-effect-result-from-actions.ts";
import { executeEffectRequest } from "../../src/shell/execute-effect-request.ts";
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

describe("evidence surface", () => {
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

  it("preserves minimal success evidence on action/effect results", () => {
    const actionResult = buildActionResult(buildCapabilityAction(workspace));
    const effectResult = buildEffectResultFromActionResults(
      { kind: "execute_actions", payload: {} },
      [actionResult]
    );

    expect(actionResult).toMatchObject({
      status: "succeeded",
      evidence_refs: [
        {
          kind: "capability",
          source: "shell",
          outcome: "succeeded",
          capability: "controlled_single_file_text_modification",
          targetPath: workspace.primaryTargetPath
        }
      ]
    });
    expect(effectResult).toMatchObject({
      kind: "action_results",
      success: true,
      evidence_refs: [
        {
          kind: "effect",
          source: "shell",
          outcome: "action_results_succeeded",
          requestKind: "execute_actions"
        }
      ]
    });
    expect(() => JSON.stringify(effectResult)).not.toThrow();
  });

  it("preserves contract refusal evidence (invalid_path)", () => {
    const result = buildActionResult(
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
    );

    expect(result).toMatchObject({
      status: "failed",
      errorMessage: "invalid_path",
      evidence_refs: [
        {
          outcome: "contract_refusal",
          code: "invalid_path"
        }
      ]
    });
  });

  it("preserves policy violation evidence distinct from execution failure", () => {
    const policyViolation = buildActionResult(
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
    );
    const executionFailure = buildActionResult(
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
    );

    expect(policyViolation).toMatchObject({
      errorMessage: "path_outside_boundary",
      evidence_refs: [
        {
          outcome: "policy_violation",
          code: "path_outside_boundary"
        }
      ]
    });
    expect(executionFailure).toMatchObject({
      errorMessage: "target_file_missing",
      evidence_refs: [
        {
          outcome: "execution_failure",
          code: "target_file_missing"
        }
      ]
    });
  });

  it("preserves review reject evidence for governance-visible stop", () => {
    const reviewRequest: EffectRequest = {
      kind: "run_review",
      payload: {
        decision_override: "stop",
        review_request: {
          kind: "task",
          target: "task-1",
          summary: "manual reject"
        }
      }
    };

    const result = executeEffectRequest(reviewRequest);

    expect(result).toMatchObject({
      kind: "review_result",
      success: false,
      evidence_refs: [
        {
          kind: "review",
          source: "shell",
          outcome: "review_stop"
        }
      ],
      failure_signal: {
        category: "review",
        terminal: true,
        evidence_refs: [
          {
            kind: "review",
            source: "shell",
            outcome: "review_stop"
          }
        ]
      }
    });
  });

  it("keeps summary / failure_signal / evidence distinct in failed aggregation", () => {
    const actionResult = buildActionResult(
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
    );
    const effectResult = buildEffectResultFromActionResults(
      { kind: "execute_actions", payload: {} },
      [actionResult]
    );

    expect(effectResult.failure_signal?.message).toBe(
      "policy_refused: target path outside allowed boundary (scripts/outside.md)"
    );
    expect(effectResult.failure_signal?.summary).toBe("1 action(s) failed");
    expect(effectResult.failure_signal?.evidence_refs).toMatchObject([
      {
        kind: "capability",
        outcome: "policy_violation",
        code: "path_outside_boundary"
      }
    ]);
    expect(effectResult.evidence_refs).toMatchObject([
      {
        kind: "effect",
        outcome: "action_results_failed",
        requestKind: "execute_actions"
      }
    ]);
    expect(() => JSON.stringify(effectResult.failure_signal)).not.toThrow();
  });

  it("keeps context refs distinct from evidence refs in replay-friendly boundary", () => {
    const actionResult = buildActionResult(
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
    );
    const requestRef = {
      run_id: "run-1",
      plan_id: "plan-1",
      task_id: "task-1",
      request_kind: "execute_actions" as const
    };
    const effectResult = buildEffectResultFromActionResults(
      { kind: "execute_actions", request_ref: requestRef, payload: {} },
      [actionResult]
    );

    expect(effectResult.request_ref).toEqual(requestRef);
    expect(effectResult.context).toMatchObject({
      request_ref: requestRef
    });
    expect(effectResult.failure_signal?.request_ref).toEqual(requestRef);
    expect(effectResult.evidence_refs?.[0]).not.toHaveProperty("run_id");
    expect(effectResult.evidence_refs?.[0]).not.toHaveProperty("plan_id");
    expect(effectResult.evidence_refs?.[0]).not.toHaveProperty("task_id");
  });
});
