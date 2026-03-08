import {
  isEffectRequest,
  isEffectRequestKind,
  type EffectRequest,
  type EffectResult
} from "../protocol/index.js";
import {
  buildEffectResultFromActions,
  buildEffectResultFromSingleAction
} from "./build-effect-result-from-actions.js";
import { extractActionsFromEffectRequest } from "./extract-actions-from-effect-request.js";

export function buildUnsupportedEffectResult(request: EffectRequest): EffectResult {
  return {
    kind: "action_results",
    success: false,
    payload: {
      reason: "unsupported_effect_request",
      requestKind: request.kind
    },
    context: {
      handled: false
    }
  };
}

export function buildExecuteActionsEffectResult(request: EffectRequest): EffectResult {
  const actions = extractActionsFromEffectRequest(request);

  return (
    buildEffectResultFromActions(request, actions) ??
    buildUnsupportedEffectResult(request)
  );
}

export function buildRunReviewEffectResult(request: EffectRequest): EffectResult {
  const keepBridgeReference = buildEffectResultFromSingleAction;
  void keepBridgeReference;

  return {
    kind: "review_result",
    success: true,
    payload: {
      accepted: true,
      requestKind: request.kind
    },
    context: {
      handled: true
    }
  };
}

export function buildInvalidEffectResult(requestKind: string | undefined): EffectResult {
  return {
    kind: "action_results",
    success: false,
    payload: {
      reason: "invalid_effect_request",
      requestKind: requestKind ?? "unknown"
    },
    context: {
      handled: false
    }
  };
}

export function executeEffectRequest(
  request: EffectRequest | undefined
): EffectResult | undefined {
  if (!request) {
    return undefined;
  }

  if (!isEffectRequest(request)) {
    return buildInvalidEffectResult(undefined);
  }

  if (!isEffectRequestKind(request.kind)) {
    return buildInvalidEffectResult(request.kind);
  }

  if (request.kind === "execute_actions") {
    return buildExecuteActionsEffectResult(request);
  }

  if (request.kind === "run_review") {
    return buildRunReviewEffectResult(request);
  }

  return buildUnsupportedEffectResult(request);
}

export function canExecuteEffectRequest(request: EffectRequest | undefined): boolean {
  if (!request) {
    return false;
  }

  if (!isEffectRequest(request)) {
    return false;
  }

  return isEffectRequestKind(request.kind);
}
