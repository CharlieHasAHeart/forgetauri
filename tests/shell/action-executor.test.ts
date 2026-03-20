import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Action } from "../../src/protocol/index.ts";
import {
  canExecuteAction,
  canExecuteActions,
  executeAction,
  executeActions
} from "../../src/shell/action-executor.ts";
import {
  buildActionResult,
  canBuildActionResult
} from "../../src/shell/build-action-result.ts";
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

describe("action-executor", () => {
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

  it("returns stable result for executeAction(undefined)", () => {
    const result = executeAction(undefined);

    expect(result).toMatchObject({
      status: "failed",
      actionName: "unknown-action",
      errorMessage: "invalid_action"
    });
  });

  it("returns result consistent with buildActionResult for valid action", () => {
    const action = buildCapabilityAction(workspace);

    const result = executeAction(action);

    expect(result).toMatchObject({
      status: "succeeded",
      actionName: "controlled_single_file_text_modification"
    });
    expect(readFileSync(workspace.primaryTargetPath, "utf8")).toContain("after-one");
  });

  it("returns empty array for executeActions([])", () => {
    const results = executeActions([]);

    expect(Array.isArray(results)).toBe(true);
    expect(results).toEqual([]);
  });

  it("maps each valid action to one ActionResult", () => {
    const actions: Action[] = [
      buildCapabilityAction(workspace),
      buildCapabilityAction(workspace, {
        input: {
          target_path: workspace.secondaryTargetPath,
          change: {
            kind: "replace_text",
            find_text: "alpha",
            replace_text: "omega"
          }
        }
      })
    ];

    const expected = actions.map((action) => buildActionResult(action));
    resetCapabilityWorkspaceFiles(workspace);
    const results = executeActions(actions);

    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(actions.length);
    expect(results).toEqual(expected);
  });

  it("returns false for canExecuteAction(undefined)", () => {
    expect(canExecuteAction(undefined)).toBe(false);
  });

  it("returns true for recognized capability action and matches canBuildActionResult", () => {
    const action = buildCapabilityAction(workspace);

    expect(canExecuteAction(action)).toBe(true);
    expect(canExecuteAction(action)).toBe(canBuildActionResult(action));
  });

  it("treats refusal input as executable and normalizes it to failed ActionResult", () => {
    const refusalAction = buildCapabilityAction(workspace, {
      input: {
        target_path: "",
        change: {
          kind: "replace_text",
          find_text: "a",
          replace_text: "b"
        }
      }
    });

    expect(canExecuteAction(refusalAction)).toBe(true);
    expect(executeAction(refusalAction)).toMatchObject({
      status: "failed",
      errorMessage: "missing_target"
    });
  });

  it("treats policy-refused input as executable and normalizes it to failed ActionResult", () => {
    const policyRefusedAction = buildCapabilityAction(workspace, {
      input: {
        target_path: "scripts/notes.md",
        change: {
          kind: "replace_text",
          find_text: "a",
          replace_text: "b"
        }
      }
    });

    expect(canExecuteAction(policyRefusedAction)).toBe(true);
    expect(executeAction(policyRefusedAction)).toMatchObject({
      status: "failed",
      errorMessage: "path_outside_boundary"
    });
  });

  it("returns current implementation behavior for canExecuteActions([])", () => {
    expect(canExecuteActions([])).toBe(true);
  });

  it("returns true for canExecuteActions with all recognizable capability actions", () => {
    const actions: Action[] = [
      buildCapabilityAction(workspace),
      buildCapabilityAction(workspace, {
        input: {
          target_path: "docs/missing.md",
          change: {
            kind: "replace_text",
            find_text: "x",
            replace_text: "y"
          }
        }
      })
    ];

    expect(canExecuteActions(actions)).toBe(true);
  });

  it("returns false for canExecuteActions with mixed valid and invalid actions", () => {
    const mixed = [
      buildCapabilityAction(workspace),
      { kind: "tool" }
    ] as unknown as Action[];

    expect(canExecuteActions(mixed)).toBe(false);
  });
});
