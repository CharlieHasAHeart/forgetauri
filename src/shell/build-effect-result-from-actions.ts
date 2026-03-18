import {
  isFailedActionResult,
  isEffectRequest,
  isSuccessfulActionResult,
  type Action,
  type ActionResult,
  type EffectRequest,
  type EffectResult,
  type FailureSignal
} from "../protocol/index.js";
import { buildActionResult, canBuildActionResult } from "./build-action-result.js";

export function buildActionResultsPayload(results: ActionResult[]): Record<string, unknown> {
  return {
    results,
    count: results.length
  };
}

export function areAllActionResultsSuccessful(results: ActionResult[]): boolean {
  if (results.length === 0) {
    return true;
  }

  for (const result of results) {
    if (!isSuccessfulActionResult(result)) {
      return false;
    }
  }

  return true;
}

export function collectFailedActionResults(results: ActionResult[]): ActionResult[] {
  return results.filter((result) => isFailedActionResult(result));
}

export function buildFailureSignalFromActionResults(
  results: ActionResult[]
): FailureSignal | undefined {
  const failedResults = collectFailedActionResults(results);

  if (failedResults.length === 0) {
    return undefined;
  }

  const firstFailure = failedResults[0];

  return {
    category: "action",
    source: "shell",
    terminal: false,
    message: firstFailure.errorMessage ?? "action_execution_failed",
    summary: `${failedResults.length} action(s) failed`
  };
}

export function buildEffectResultFromActionResults(
  request: EffectRequest,
  results: ActionResult[]
): EffectResult {
  const success = areAllActionResultsSuccessful(results);
  const failureSignal = success
    ? undefined
    : buildFailureSignalFromActionResults(results);

  return {
    kind: "action_results",
    success,
    failure_signal: failureSignal,
    payload: buildActionResultsPayload(results),
    context: {
      requestKind: request.kind,
      handled: true
    }
  };
}

export function buildEffectResultFromSingleAction(
  request: EffectRequest,
  action: Action | undefined
): EffectResult {
  const result = buildActionResult(action);
  return buildEffectResultFromActionResults(request, [result]);
}

export function buildEffectResultFromActions(
  request: EffectRequest | undefined,
  actions: Action[]
): EffectResult | undefined {
  if (!request) {
    return undefined;
  }

  if (!isEffectRequest(request)) {
    return undefined;
  }

  const results = actions.map((action) => buildActionResult(action));
  return buildEffectResultFromActionResults(request, results);
}

export function canBuildEffectResultFromActions(
  request: EffectRequest | undefined,
  actions: Action[]
): boolean {
  if (!request) {
    return false;
  }

  if (!isEffectRequest(request)) {
    return false;
  }

  return actions.every((action) => canBuildActionResult(action));
}
