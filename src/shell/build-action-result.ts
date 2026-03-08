import { isAction, isActionKind, type Action, type ActionResult } from "../protocol/index.js";

export function buildAcceptedActionResult(action: Action): ActionResult {
  return {
    actionId: Reflect.get(action, "id"),
    kind: action.kind,
    success: true,
    payload: {
      accepted: true
    },
    context: {
      handled: true
    }
  } as unknown as ActionResult;
}

export function buildRejectedActionResult(action: Action): ActionResult {
  return {
    actionId: Reflect.get(action, "id"),
    kind: action.kind,
    success: false,
    payload: {
      accepted: false,
      reason: "unsupported_action"
    },
    context: {
      handled: false
    }
  } as unknown as ActionResult;
}

export function buildInvalidActionResult(
  actionId: string | undefined,
  kind: string | undefined
): ActionResult {
  return {
    actionId: actionId ?? "unknown-action",
    kind: kind ?? "unknown",
    success: false,
    payload: {
      accepted: false,
      reason: "invalid_action"
    },
    context: {
      handled: false
    }
  } as unknown as ActionResult;
}

export function buildActionResult(action: Action | undefined): ActionResult {
  if (!action) {
    return buildInvalidActionResult(undefined, undefined);
  }

  if (!isAction(action)) {
    const actionId = Reflect.get(action as object, "id");
    const kind = Reflect.get(action as object, "kind");

    return buildInvalidActionResult(
      typeof actionId === "string" ? actionId : undefined,
      typeof kind === "string" ? kind : undefined
    );
  }

  if (!isActionKind(action.kind)) {
    const actionId = Reflect.get(action, "id");
    return buildInvalidActionResult(
      typeof actionId === "string" ? actionId : undefined,
      action.kind
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
