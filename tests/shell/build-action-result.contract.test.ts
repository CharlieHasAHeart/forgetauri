import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { isActionResult, type Action } from "../../src/protocol/index.ts";
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

function buildContractAction(
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

describe("build-action-result contract", () => {
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

  it("accepts valid contract shape and applies real modification", () => {
    const result = buildActionResult(buildContractAction(workspace));

    expect(isActionResult(result)).toBe(true);
    expect(result).toMatchObject({
      status: "succeeded",
      actionName: "controlled_single_file_text_modification",
      output: {
        applied: true,
        evidence: {
          capability: "controlled_single_file_text_modification",
          target_path: workspace.primaryTargetPath,
          single_file: true,
          text_only: true,
          change_kind: "replace_text"
        }
      }
    });
    expect(canBuildActionResult(buildContractAction(workspace))).toBe(true);
    expect(readFileSync(workspace.primaryTargetPath, "utf8")).toContain("after-one");
  });

  it("refuses invalid path", () => {
    const action = buildContractAction(workspace, {
      input: {
        target_path: "../secret.md",
        change: {
          kind: "replace_text",
          find_text: "a",
          replace_text: "b"
        }
      }
    });
    expect(canBuildActionResult(action)).toBe(true);

    const result = buildActionResult(action);

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
    const action = buildContractAction(workspace, {
      input: {
        target_path: "assets/logo.png",
        change: {
          kind: "replace_text",
          find_text: "a",
          replace_text: "b"
        }
      }
    });
    expect(canBuildActionResult(action)).toBe(true);

    const result = buildActionResult(action);

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("unsupported_file_type");
  });

  it("refuses by policy when path is outside allowed boundary", () => {
    const action = buildContractAction(workspace, {
      input: {
        target_path: "scripts/notes.md",
        change: {
          kind: "replace_text",
          find_text: "a",
          replace_text: "b"
        }
      }
    });
    expect(canBuildActionResult(action)).toBe(true);

    const result = buildActionResult(action);

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("path_outside_boundary");
    expect(result.output).toMatchObject({
      applied: false,
      policy_violation: {
        code: "path_outside_boundary",
        summary: "policy_refused: target path outside allowed boundary (scripts/notes.md)"
      }
    });
  });

  it("refuses by policy when file type is disallowed by policy", () => {
    const action = buildContractAction(workspace, {
      input: {
        target_path: "docs/notes.json",
        change: {
          kind: "replace_text",
          find_text: "a",
          replace_text: "b"
        }
      }
    });
    expect(canBuildActionResult(action)).toBe(true);

    const result = buildActionResult(action);

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("disallowed_file_type");
    expect(result.output).toMatchObject({
      applied: false,
      policy_violation: {
        code: "disallowed_file_type",
        summary: "policy_refused: target file type is not allowed by policy (docs/notes.json)"
      }
    });
  });

  it("refuses missing target path in request", () => {
    const action = buildContractAction(workspace, {
      input: {
        target_path: "",
        change: {
          kind: "replace_text",
          find_text: "a",
          replace_text: "b"
        }
      }
    });
    expect(canBuildActionResult(action)).toBe(true);

    const result = buildActionResult(action);

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("missing_target");
    expect(result.output).toMatchObject({
      refusal: {
        summary: "refused: missing target path in request"
      }
    });
  });

  it("refuses empty request when change is incomplete", () => {
    const action = buildContractAction(workspace, {
      input: {
        target_path: workspace.primaryTargetPath,
        change: {
          kind: "replace_text",
          find_text: "",
          replace_text: ""
        }
      }
    });
    expect(canBuildActionResult(action)).toBe(true);

    const result = buildActionResult(action);

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("empty_request");
    expect(result.output).toMatchObject({
      refusal: {
        summary: "refused: empty or incomplete text modification request"
      }
    });
  });

  it("refuses no-op request", () => {
    const action = buildContractAction(workspace, {
      input: {
        target_path: workspace.primaryTargetPath,
        change: {
          kind: "replace_text",
          find_text: "same",
          replace_text: "same"
        }
      }
    });
    expect(canBuildActionResult(action)).toBe(true);

    const result = buildActionResult(action);

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("no_op_request");
  });

  it("normalizes execution failure for missing target file", () => {
    const result = buildActionResult(
      buildContractAction(workspace, {
        input: {
          target_path: "docs/missing.md",
          change: {
            kind: "replace_text",
            find_text: "old",
            replace_text: "new"
          }
        }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      errorMessage: "target_file_missing",
      output: {
        applied: false,
        execution_failure: {
          code: "target_file_missing",
          summary: "execution_failed: target file not found (docs/missing.md)"
        }
      }
    });
  });

  it("keeps contract refusal distinct from policy violation", () => {
    const contractRefusal = buildActionResult(
      buildContractAction(workspace, {
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
    const policyRefusal = buildActionResult(
      buildContractAction(workspace, {
        input: {
          target_path: "scripts/notes.md",
          change: {
            kind: "replace_text",
            find_text: "a",
            replace_text: "b"
          }
        }
      })
    );

    expect(contractRefusal.errorMessage).toBe("invalid_path");
    expect(contractRefusal.output).toMatchObject({
      refusal: {
        code: "invalid_path"
      }
    });
    expect(policyRefusal.errorMessage).toBe("path_outside_boundary");
    expect(policyRefusal.output).toMatchObject({
      policy_violation: {
        code: "path_outside_boundary"
      }
    });
  });

  it("keeps policy violation distinct from execution failure", () => {
    const policyRefusal = buildActionResult(
      buildContractAction(workspace, {
        input: {
          target_path: "scripts/notes.md",
          change: {
            kind: "replace_text",
            find_text: "a",
            replace_text: "b"
          }
        }
      })
    );
    const executionFailure = buildActionResult(
      buildContractAction(workspace, {
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

    expect(policyRefusal.errorMessage).toBe("path_outside_boundary");
    expect(policyRefusal.output).toMatchObject({
      policy_violation: {
        code: "path_outside_boundary"
      }
    });
    expect(executionFailure.errorMessage).toBe("target_file_missing");
    expect(executionFailure.output).toMatchObject({
      execution_failure: {
        code: "target_file_missing"
      }
    });
  });

  it("normalizes execution failure when find_text is not found", () => {
    const result = buildActionResult(
      buildContractAction(workspace, {
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

    expect(result).toMatchObject({
      status: "failed",
      errorMessage: "find_text_not_found",
      output: {
        applied: false,
        execution_failure: {
          code: "find_text_not_found"
        }
      }
    });
  });

  it("normalizes execution failure when file read fails", () => {
    const targetPath = "docs/no-read.md";
    writeFileSync(targetPath, "read-block", "utf8");
    chmodSync(targetPath, 0o000);
    try {
      const result = buildActionResult(
        buildContractAction(workspace, {
          input: {
            target_path: targetPath,
            change: {
              kind: "replace_text",
              find_text: "read",
              replace_text: "write"
            }
          }
        })
      );

      expect(result).toMatchObject({
        status: "failed",
        errorMessage: "file_read_failed",
        output: {
          applied: false,
          execution_failure: {
            code: "file_read_failed"
          }
        }
      });
    } finally {
      chmodSync(targetPath, 0o644);
    }
  });

  it("normalizes execution failure when file write fails", () => {
    const targetPath = "docs/no-write.md";
    writeFileSync(targetPath, "needs replace", "utf8");
    chmodSync(targetPath, 0o444);
    try {
      const result = buildActionResult(
        buildContractAction(workspace, {
          input: {
            target_path: targetPath,
            change: {
              kind: "replace_text",
              find_text: "replace",
              replace_text: "updated"
            }
          }
        })
      );

      expect(result).toMatchObject({
        status: "failed",
        errorMessage: "file_write_failed",
        output: {
          applied: false,
          execution_failure: {
            code: "file_write_failed"
          }
        }
      });
    } finally {
      chmodSync(targetPath, 0o644);
    }
  });

  it("returns false only when action is not recognizable as capability contract", () => {
    expect(canBuildActionResult(undefined)).toBe(false);
    expect(
      canBuildActionResult({
        kind: "tool",
        name: "lint"
      } as Action)
    ).toBe(false);
    expect(
      canBuildActionResult({
        kind: "capability",
        name: "other_capability",
        input: {}
      } as Action)
    ).toBe(false);
  });
});
