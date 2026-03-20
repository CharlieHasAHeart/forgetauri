import {
  isFailedActionResult,
  isEffectRequest,
  isSuccessfulActionResult,
  type Action,
  type ActionResult,
  type EvidenceRef,
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
  const refusal =
    typeof firstFailure.output === "object" && firstFailure.output !== null
      ? Reflect.get(firstFailure.output, "refusal")
      : undefined;
  const refusalSummary =
    typeof refusal === "object" && refusal !== null
      ? Reflect.get(refusal, "summary")
      : undefined;
  const executionFailure =
    typeof firstFailure.output === "object" && firstFailure.output !== null
      ? Reflect.get(firstFailure.output, "execution_failure")
      : undefined;
  const executionSummary =
    typeof executionFailure === "object" && executionFailure !== null
      ? Reflect.get(executionFailure, "summary")
      : undefined;
  const policyViolation =
    typeof firstFailure.output === "object" && firstFailure.output !== null
      ? Reflect.get(firstFailure.output, "policy_violation")
      : undefined;
  const policySummary =
    typeof policyViolation === "object" && policyViolation !== null
      ? Reflect.get(policyViolation, "summary")
      : undefined;
  const firstFailureEvidenceRefs = Array.isArray(firstFailure.evidence_refs)
    ? firstFailure.evidence_refs
    : undefined;
  const evidenceSummary = firstFailureEvidenceRefs?.[0]?.summary;
  const normalizedMessage =
    typeof evidenceSummary === "string"
      ? evidenceSummary
      : typeof refusalSummary === "string"
      ? refusalSummary
      : typeof policySummary === "string"
        ? policySummary
      : typeof executionSummary === "string"
        ? executionSummary
      : firstFailure.errorMessage ?? "action_execution_failed";

  return {
    category: "action",
    source: "shell",
    terminal: false,
    message: normalizedMessage,
    summary: `${failedResults.length} action(s) failed`,
    evidence_refs: firstFailureEvidenceRefs
  };
}

function buildEffectResultEvidenceRefs(
  request: EffectRequest,
  success: boolean,
  results: ActionResult[]
): EvidenceRef[] {
  const firstActionResult = results[0];
  const firstActionEvidenceRef =
    firstActionResult && Array.isArray(firstActionResult.evidence_refs)
      ? firstActionResult.evidence_refs[0]
      : undefined;

  return [
    {
      kind: "effect",
      source: "shell",
      outcome: success ? "action_results_succeeded" : "action_results_failed",
      requestKind: request.kind,
      actionName: firstActionResult?.actionName,
      capability: firstActionEvidenceRef?.capability,
      targetPath: firstActionEvidenceRef?.targetPath,
      summary: success
        ? `${results.length} action(s) succeeded`
        : `${results.length} action(s) processed with failure`
    }
  ];
}

export function buildEffectResultFromActionResults(
  request: EffectRequest,
  results: ActionResult[]
): EffectResult {
  const success = areAllActionResultsSuccessful(results);
  const failureSignal = success
    ? undefined
    : buildFailureSignalFromActionResults(results);
  const requestRef = request.request_ref;
  const normalizedFailureSignal =
    failureSignal === undefined
      ? undefined
      : requestRef
        ? { ...failureSignal, request_ref: requestRef }
        : failureSignal;

  return {
    kind: "action_results",
    success,
    failure_signal: normalizedFailureSignal,
    evidence_refs: buildEffectResultEvidenceRefs(request, success, results),
    ...(requestRef ? { request_ref: requestRef } : {}),
    payload: buildActionResultsPayload(results),
    context: {
      requestKind: request.kind,
      ...(requestRef ? { request_ref: requestRef } : {}),
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
