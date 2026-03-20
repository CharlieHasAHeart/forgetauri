import { describe, expect, it } from "vitest";
import { type Action, type EffectRequest } from "../../src/protocol/index.ts";
import { buildActionResult } from "../../src/shell/build-action-result.ts";
import {
  areAllActionResultsSuccessful,
  buildActionResultsPayload,
  buildEffectResultFromActionResults,
  buildEffectResultFromActions,
  buildEffectResultFromSingleAction,
  canBuildEffectResultFromActions
} from "../../src/shell/build-effect-result-from-actions.ts";

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

describe("build-effect-result-from-actions", () => {
  const validRequest: EffectRequest = {
    kind: "execute_actions",
    payload: {}
  };

  it("buildActionResultsPayload returns stable payload structure", () => {
    const action = buildCapabilityAction();
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
      buildActionResult(buildCapabilityAction()),
      buildActionResult(
        buildCapabilityAction({
          input: {
            target_path: "src/app/index.ts",
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
    const results = [buildActionResult(buildCapabilityAction()), buildActionResult(undefined)];

    expect(areAllActionResultsSuccessful(results)).toBe(false);
  });

  it("buildEffectResultFromActionResults returns normalized EffectResult", () => {
    const results = [
      buildActionResult(buildCapabilityAction()),
      buildActionResult(
        buildCapabilityAction({
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
    const action = buildCapabilityAction();

    const viaSingle = buildEffectResultFromSingleAction(validRequest, action);
    const viaAggregate = buildEffectResultFromActionResults(validRequest, [buildActionResult(action)]);

    expect(viaSingle).toEqual(viaAggregate);
  });

  it("buildEffectResultFromActions matches map(buildActionResult) aggregation", () => {
    const actions: Action[] = [
      buildCapabilityAction(),
      buildCapabilityAction({
        input: {
          target_path: "src/core/build-effect-request.ts",
          change: {
            kind: "replace_text",
            find_text: "before",
            replace_text: "after"
          }
        }
      })
    ];

    const fromActions = buildEffectResultFromActions(validRequest, actions);
    const expected = buildEffectResultFromActionResults(
      validRequest,
      actions.map((action) => buildActionResult(action))
    );

    expect(fromActions).toEqual(expected);
  });

  it("buildEffectResultFromActions(undefined, actions) matches current behavior", () => {
    const actions: Action[] = [buildCapabilityAction()];

    expect(buildEffectResultFromActions(undefined, actions)).toBeUndefined();
  });

  it("canBuildEffectResultFromActions(undefined, actions) returns false", () => {
    const actions: Action[] = [buildCapabilityAction()];

    expect(canBuildEffectResultFromActions(undefined, actions)).toBe(false);
  });

  it("canBuildEffectResultFromActions returns true for valid request and valid actions", () => {
    const actions: Action[] = [
      buildCapabilityAction(),
      buildCapabilityAction({
        input: {
          target_path: "README.md",
          change: {
            kind: "replace_text",
            find_text: "x",
            replace_text: "y"
          }
        }
      })
    ];

    expect(canBuildEffectResultFromActions(validRequest, actions)).toBe(true);
  });

  it("canBuildEffectResultFromActions returns false when actions contain invalid items", () => {
    const mixedActions = [
      buildCapabilityAction(),
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
