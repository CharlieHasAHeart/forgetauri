import { describe, expect, it } from "vitest";
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

function buildCapabilityAction(
  overrides: Partial<Action> = {}
): Action {
  return {
    kind: "capability",
    name: "controlled_single_file_text_modification",
    input: {
      target_path: "docs/notes.md",
      change: {
        kind: "replace_text",
        find_text: "before",
        replace_text: "after"
      }
    },
    ...overrides
  };
}

describe("action-executor", () => {
  it("returns stable result for executeAction(undefined)", () => {
    const result = executeAction(undefined);

    expect(result).toMatchObject({
      status: "failed",
      actionName: "unknown-action",
      errorMessage: "invalid_action"
    });
  });

  it("returns result consistent with buildActionResult for valid action", () => {
    const action = buildCapabilityAction({
      name: "controlled_single_file_text_modification"
    });

    const result = executeAction(action);

    expect(result).toEqual(buildActionResult(action));
    expect(result).toMatchObject({
      status: "succeeded",
      actionName: "controlled_single_file_text_modification"
    });
  });

  it("returns empty array for executeActions([])", () => {
    const results = executeActions([]);

    expect(Array.isArray(results)).toBe(true);
    expect(results).toEqual([]);
  });

  it("maps each valid action to one ActionResult", () => {
    const actions: Action[] = [
      buildCapabilityAction(),
      buildCapabilityAction({
        input: {
          target_path: "src/app/index.ts",
          change: {
            kind: "replace_text",
            find_text: "one",
            replace_text: "two"
          }
        }
      })
    ];

    const results = executeActions(actions);

    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(actions.length);
    expect(results).toEqual(actions.map((action) => buildActionResult(action)));
  });

  it("returns false for canExecuteAction(undefined)", () => {
    expect(canExecuteAction(undefined)).toBe(false);
  });

  it("returns true for valid action and matches canBuildActionResult", () => {
    const action = buildCapabilityAction();

    expect(canExecuteAction(action)).toBe(true);
    expect(canExecuteAction(action)).toBe(canBuildActionResult(action));
  });

  it("returns current implementation behavior for canExecuteActions([])", () => {
    expect(canExecuteActions([])).toBe(true);
  });

  it("returns true for canExecuteActions with all valid actions", () => {
    const actions: Action[] = [
      buildCapabilityAction(),
      buildCapabilityAction({
        input: {
          target_path: "README.md",
          change: {
            kind: "replace_text",
            find_text: "old",
            replace_text: "new"
          }
        }
      })
    ];

    expect(canExecuteActions(actions)).toBe(true);
  });

  it("returns false for canExecuteActions with mixed valid and invalid actions", () => {
    const mixed = [
      buildCapabilityAction(),
      { kind: "tool" }
    ] as unknown as Action[];

    expect(canExecuteActions(mixed)).toBe(false);
  });
});
