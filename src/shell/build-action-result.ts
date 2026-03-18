import { isAction, isActionKind, type Action, type ActionResult } from "../protocol/index.js";

export function normalizeActionName(actionName: string | undefined): string {
  return actionName ?? "unknown-action";
}

export function buildInvalidActionErrorMessage(reason: string | undefined): string {
  return reason ?? "invalid_action";
}

export function buildAcceptedActionResult(action: Action): ActionResult {
  return {
    status: "succeeded",
    actionName: action.name,
    output: {
      accepted: true
    }
  };
}

export function buildRejectedActionResult(action: Action): ActionResult {
  return {
    status: "failed",
    actionName: action.name,
    errorMessage: "unsupported_action"
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

  return isActionKind(action.kind);
}
