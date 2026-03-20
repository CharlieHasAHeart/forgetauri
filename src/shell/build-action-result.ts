import {
  buildControlledSingleFileTextModificationRefusalSummary,
  isAction,
  isActionKind,
  isControlledSingleFileTextModificationAction,
  validateControlledSingleFileTextModificationInput,
  type Action,
  type ActionResult,
  type ControlledSingleFileTextModificationFailure,
  type ControlledSingleFileTextModificationSuccess
} from "../protocol/index.js";

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

  return buildControlledSingleFileTextModificationSucceededActionResult(
    action.name,
    validation.input.target_path
  );
}

export function buildControlledSingleFileTextModificationSucceededActionResult(
  actionName: string,
  targetPath: string
): ActionResult {
  const output: ControlledSingleFileTextModificationSuccess = {
    applied: true,
    summary: `contract accepted for ${targetPath}`,
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

  return validateControlledSingleFileTextModificationInput(action.input).accepted;
}
