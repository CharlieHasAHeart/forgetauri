import { describe, expect, it } from "vitest";
import { isActionResult, type Action } from "../../src/protocol/index.ts";
import {
  buildActionResult,
  canBuildActionResult
} from "../../src/shell/build-action-result.ts";

function buildContractAction(overrides: Partial<Action> = {}): Action {
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

describe("build-action-result contract", () => {
  it("accepts valid contract shape", () => {
    const result = buildActionResult(buildContractAction());

    expect(isActionResult(result)).toBe(true);
    expect(result).toMatchObject({
      status: "succeeded",
      actionName: "controlled_single_file_text_modification",
      output: {
        applied: true,
        evidence: {
          capability: "controlled_single_file_text_modification",
          target_path: "docs/notes.md",
          single_file: true,
          text_only: true,
          change_kind: "replace_text"
        }
      }
    });
    expect(canBuildActionResult(buildContractAction())).toBe(true);
  });

  it("refuses invalid path", () => {
    const result = buildActionResult(
      buildContractAction({
        input: {
          target_path: "../secret.md",
          change: {
            kind: "replace_text",
            find_text: "a",
            replace_text: "b"
          }
        }
      })
    );

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("invalid_path");
    expect(result.output).toMatchObject({
      applied: false,
      refusal: {
        code: "invalid_path"
      }
    });
  });

  it("refuses unsupported file type", () => {
    const result = buildActionResult(
      buildContractAction({
        input: {
          target_path: "assets/logo.png",
          change: {
            kind: "replace_text",
            find_text: "a",
            replace_text: "b"
          }
        }
      })
    );

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("unsupported_file_type");
  });

  it("refuses missing target", () => {
    const result = buildActionResult(
      buildContractAction({
        input: {
          target_path: "",
          change: {
            kind: "replace_text",
            find_text: "a",
            replace_text: "b"
          }
        }
      })
    );

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("missing_target");
  });

  it("refuses empty request", () => {
    const result = buildActionResult(
      buildContractAction({
        input: {
          target_path: "docs/notes.md",
          change: {
            kind: "replace_text",
            find_text: "",
            replace_text: ""
          }
        }
      })
    );

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("empty_request");
  });

  it("refuses no-op request", () => {
    const result = buildActionResult(
      buildContractAction({
        input: {
          target_path: "docs/notes.md",
          change: {
            kind: "replace_text",
            find_text: "same",
            replace_text: "same"
          }
        }
      })
    );

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("no_op_request");
  });

  it("normalizes success payload with summary and evidence", () => {
    const result = buildActionResult(buildContractAction());

    expect(result).toMatchObject({
      status: "succeeded",
      output: {
        applied: true,
        summary: "contract accepted for docs/notes.md",
        evidence: {
          capability: "controlled_single_file_text_modification",
          target_path: "docs/notes.md"
        }
      }
    });
  });

  it("normalizes failure payload with refusal and evidence", () => {
    const result = buildActionResult(
      buildContractAction({
        input: {
          target_path: "../invalid.md",
          change: {
            kind: "replace_text",
            find_text: "x",
            replace_text: "y"
          }
        }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      errorMessage: "invalid_path",
      output: {
        applied: false,
        refusal: {
          code: "invalid_path",
          summary: "refused: invalid single-file text path"
        },
        evidence: {
          capability: "controlled_single_file_text_modification",
          target_path: "../invalid.md"
        }
      }
    });
    expect(
      canBuildActionResult(
        buildContractAction({
          input: {
            target_path: "",
            change: {
              kind: "replace_text",
              find_text: "a",
              replace_text: "b"
            }
          }
        })
      )
    ).toBe(false);
  });
});
