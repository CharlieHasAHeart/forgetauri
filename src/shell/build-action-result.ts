import {
  buildControlledSingleFileTextModificationExecutionFailureSummary,
  buildControlledSingleFileTextModificationRefusalSummary,
  isAction,
  isActionKind,
  isControlledSingleFileTextModificationAction,
  validateControlledSingleFileTextModificationInput,
  type Action,
  type ActionResult,
  type ControlledSingleFileTextModificationExecutionFailure,
  type ControlledSingleFileTextModificationFailure,
  type ControlledSingleFileTextModificationSuccess
} from "../protocol/index.js";
import { executeControlledSingleFileTextModification } from "./execute-controlled-single-file-text-modification.js";

export function normalizeActionName(actionName: string | undefined): string {
  return actionName ?? "unknown-action";
}

export function buildInvalidActionErrorMessage(reason: string | undefined): string {
  return reason ?? "invalid_action";
}

export function buildAcceptedActionResult(action: Action): ActionResult {
  if (!isControlledSingleFileTextModificationAction(action)) {
    return buildRejectedActionResult(action);
  }

  const validation = validateControlledSingleFileTextModificationInput(action.input);
  if (!validation.accepted) {
    return buildControlledSingleFileTextModificationFailedActionResult(
      action.name,
      validation.refusalCode,
      action.input
    );
  }

  const executionResult = executeControlledSingleFileTextModification(validation.input);
  if (!executionResult.success) {
    return buildControlledSingleFileTextModificationExecutionFailedActionResult(
      action.name,
      executionResult.code,
      executionResult.targetPath
    );
  }

  return buildControlledSingleFileTextModificationSucceededActionResult(action.name, executionResult.targetPath);
}

export function buildControlledSingleFileTextModificationSucceededActionResult(
  actionName: string,
  targetPath: string
): ActionResult {
  const output: ControlledSingleFileTextModificationSuccess = {
    applied: true,
    summary: `applied replace_text to ${targetPath}`,
    evidence: {
      capability: "controlled_single_file_text_modification",
      target_path: targetPath,
      single_file: true,
      text_only: true,
      change_kind: "replace_text"
    }
  };

  return {
    status: "succeeded",
    actionName,
    output
  };
}

export function buildRejectedActionResult(action: Action): ActionResult {
  return {
    status: "failed",
    actionName: action.name,
    errorMessage: "unsupported_action"
  };
}

export function buildControlledSingleFileTextModificationFailedActionResult(
  actionName: string,
  refusalCode:
    | "invalid_path"
    | "unsupported_file_type"
    | "missing_target"
    | "empty_request"
    | "no_op_request",
  input: unknown
): ActionResult {
  const maybeTargetPath =
    typeof input === "object" && input !== null ? Reflect.get(input, "target_path") : undefined;
  const targetPath = typeof maybeTargetPath === "string" ? maybeTargetPath : undefined;

  const output: ControlledSingleFileTextModificationFailure = {
    applied: false,
    refusal: {
      code: refusalCode,
      summary: buildControlledSingleFileTextModificationRefusalSummary(refusalCode)
    },
    evidence: {
      capability: "controlled_single_file_text_modification",
      target_path: targetPath,
      single_file: true,
      text_only: true,
      change_kind: "replace_text"
    }
  };

  return {
    status: "failed",
    actionName,
    errorMessage: refusalCode,
    output
  };
}

export function buildControlledSingleFileTextModificationExecutionFailedActionResult(
  actionName: string,
  executionCode:
    | "target_file_missing"
    | "find_text_not_found"
    | "file_read_failed"
    | "file_write_failed",
  targetPath: string
): ActionResult {
  const output: ControlledSingleFileTextModificationExecutionFailure = {
    applied: false,
    execution_failure: {
      code: executionCode,
      summary: buildControlledSingleFileTextModificationExecutionFailureSummary(
        executionCode,
        targetPath
      )
    },
    evidence: {
      capability: "controlled_single_file_text_modification",
      target_path: targetPath,
      single_file: true,
      text_only: true,
      change_kind: "replace_text"
    }
  };

  return {
    status: "failed",
    actionName,
    errorMessage: executionCode,
    output
  };
}

export function buildInvalidActionResult(
  actionName: string | undefined,
  reason: string | undefined
): ActionResult {
  return {
    status: "failed",
    actionName: normalizeActionName(actionName),
    errorMessage: buildInvalidActionErrorMessage(reason)
  };
}

export function buildActionResult(action: Action | undefined): ActionResult {
  if (!action) {
    return buildInvalidActionResult(undefined, undefined);
  }

  if (!isAction(action)) {
    const actionName = Reflect.get(action as object, "name");
    const kind = Reflect.get(action as object, "kind");

    return buildInvalidActionResult(
      typeof actionName === "string" ? actionName : undefined,
      typeof kind === "string" ? `invalid_action_kind:${kind}` : undefined
    );
  }

  if (!isActionKind(action.kind)) {
    const actionName = Reflect.get(action, "name");
    return buildInvalidActionResult(
      typeof actionName === "string" ? actionName : undefined,
      `invalid_action_kind:${action.kind}`
    );
  }

  return buildAcceptedActionResult(action);
}

export function canBuildActionResult(action: Action | undefined): boolean {
  if (!action) {
    return false;
  }

  if (!isAction(action)) {
    return false;
  }

  if (!isActionKind(action.kind)) {
    return false;
  }

  if (!isControlledSingleFileTextModificationAction(action)) {
    return false;
  }

  // Buildability is broader than acceptance:
  // recognizable contract actions can always be normalized into succeeded/failed ActionResult.
  return true;
}
