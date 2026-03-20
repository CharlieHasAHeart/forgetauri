import {
  buildControlledDirectoryTextListExecutionFailureSummary,
  buildControlledDirectoryTextListPolicyViolationSummary,
  buildControlledDirectoryTextListRefusalSummary,
  buildControlledSingleFileTextReadExecutionFailureSummary,
  buildControlledSingleFileTextReadPolicyViolationSummary,
  buildControlledSingleFileTextReadRefusalSummary,
  buildControlledSingleFileTextModificationExecutionFailureSummary,
  buildControlledSingleFileTextModificationPolicyViolationSummary,
  buildControlledSingleFileTextModificationRefusalSummary,
  isAction,
  isActionKind,
  isControlledDirectoryTextListAction,
  isControlledSingleFileTextReadAction,
  isControlledSingleFileTextModificationAction,
  validateControlledDirectoryTextListInput,
  validateControlledSingleFileTextReadInput,
  validateControlledSingleFileTextModificationInput,
  type Action,
  type ActionResult,
  type ControlledDirectoryTextListExecutionFailure,
  type ControlledDirectoryTextListFailure,
  type ControlledDirectoryTextListPolicyViolation,
  type ControlledDirectoryTextListSuccess,
  type ControlledSingleFileTextReadExecutionFailure,
  type ControlledSingleFileTextReadFailure,
  type ControlledSingleFileTextReadPolicyViolation,
  type ControlledSingleFileTextReadSuccess,
  type ControlledSingleFileTextModificationExecutionFailure,
  type ControlledSingleFileTextModificationFailure,
  type ControlledSingleFileTextModificationPolicyViolation,
  type ControlledSingleFileTextModificationSuccess,
  type EvidenceRef
} from "../protocol/index.js";
import {
  evaluateControlledDirectoryTextListPolicy,
  resolveEffectiveDirectoryTextListLimit
} from "./controlled-directory-text-list-policy.js";
import { evaluateControlledSingleFileTextReadPolicy } from "./controlled-single-file-text-read-policy.js";
import { evaluateControlledSingleFileTextModificationPolicy } from "./controlled-single-file-text-modification-policy.js";
import { executeControlledDirectoryTextList } from "./execute-controlled-directory-text-list.js";
import { executeControlledSingleFileTextRead } from "./execute-controlled-single-file-text-read.js";
import { executeControlledSingleFileTextModification } from "./execute-controlled-single-file-text-modification.js";

export function normalizeActionName(actionName: string | undefined): string {
  return actionName ?? "unknown-action";
}

export function buildInvalidActionErrorMessage(reason: string | undefined): string {
  return reason ?? "invalid_action";
}

function resolveCapabilityNameForActionName(
  actionName: string | undefined
):
  | "controlled_single_file_text_modification"
  | "controlled_single_file_text_read"
  | "controlled_directory_text_list" {
  if (actionName === "controlled_directory_text_list") {
    return "controlled_directory_text_list";
  }

  if (actionName === "controlled_single_file_text_read") {
    return "controlled_single_file_text_read";
  }

  return "controlled_single_file_text_modification";
}

function buildCapabilityEvidenceRef(input: {
  capability:
    | "controlled_single_file_text_modification"
    | "controlled_single_file_text_read"
    | "controlled_directory_text_list";
  outcome:
    | "succeeded"
    | "contract_refusal"
    | "policy_violation"
    | "execution_failure"
    | "invalid_action"
    | "unsupported_action";
  actionName: string;
  targetPath?: string;
  code?: string;
  summary?: string;
}): EvidenceRef {
  return {
    kind: "capability",
    source: "shell",
    outcome: input.outcome,
    capability: input.capability,
    actionName: input.actionName,
    targetPath: input.targetPath,
    code: input.code,
    summary: input.summary
  };
}

export function buildAcceptedActionResult(action: Action): ActionResult {
  if (isControlledSingleFileTextModificationAction(action)) {
    const validation = validateControlledSingleFileTextModificationInput(action.input);
    if (!validation.accepted) {
      return buildControlledSingleFileTextModificationFailedActionResult(
        action.name,
        validation.refusalCode,
        action.input
      );
    }

    const policy = evaluateControlledSingleFileTextModificationPolicy(validation.input);
    if (!policy.allowed) {
      return buildControlledSingleFileTextModificationPolicyFailedActionResult(
        action.name,
        policy.code,
        validation.input.target_path
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

    return buildControlledSingleFileTextModificationSucceededActionResult(
      action.name,
      executionResult.targetPath
    );
  }

  if (isControlledSingleFileTextReadAction(action)) {
    const validation = validateControlledSingleFileTextReadInput(action.input);
    if (!validation.accepted) {
      return buildControlledSingleFileTextReadFailedActionResult(
        action.name,
        validation.refusalCode,
        action.input
      );
    }

    const policy = evaluateControlledSingleFileTextReadPolicy(validation.input);
    if (!policy.allowed) {
      return buildControlledSingleFileTextReadPolicyFailedActionResult(
        action.name,
        policy.code,
        validation.input.target_path
      );
    }

    const executionResult = executeControlledSingleFileTextRead(validation.input);
    if (!executionResult.success) {
      return buildControlledSingleFileTextReadExecutionFailedActionResult(
        action.name,
        executionResult.code,
        executionResult.targetPath
      );
    }

    return buildControlledSingleFileTextReadSucceededActionResult(
      action.name,
      executionResult.targetPath,
      executionResult.matched
    );
  }

  if (isControlledDirectoryTextListAction(action)) {
    const validation = validateControlledDirectoryTextListInput(action.input);
    if (!validation.accepted) {
      return buildControlledDirectoryTextListFailedActionResult(
        action.name,
        validation.refusalCode,
        action.input
      );
    }

    const policy = evaluateControlledDirectoryTextListPolicy(validation.input);
    if (!policy.allowed) {
      return buildControlledDirectoryTextListPolicyFailedActionResult(
        action.name,
        policy.code,
        validation.input.target_path
      );
    }

    const effectiveLimit = resolveEffectiveDirectoryTextListLimit(
      validation.input.list.limit,
      policy.resolved.maxEntries
    );
    if (effectiveLimit <= 0) {
      return buildControlledDirectoryTextListFailedActionResult(
        action.name,
        "no_op_request",
        validation.input
      );
    }

    const executionResult = executeControlledDirectoryTextList(validation.input, effectiveLimit);
    if (!executionResult.success) {
      return buildControlledDirectoryTextListExecutionFailedActionResult(
        action.name,
        executionResult.code,
        executionResult.targetPath
      );
    }

    return buildControlledDirectoryTextListSucceededActionResult(
      action.name,
      validation.input.target_path,
      executionResult.entries
    );
  }

  return buildRejectedActionResult(action);
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
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_single_file_text_modification",
        outcome: "succeeded",
        actionName,
        targetPath,
        summary: output.summary
      })
    ],
    output
  };
}

export function buildRejectedActionResult(action: Action): ActionResult {
  return {
    status: "failed",
    actionName: action.name,
    errorMessage: "unsupported_action",
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: resolveCapabilityNameForActionName(action.name),
        outcome: "unsupported_action",
        actionName: action.name,
        code: "unsupported_action",
        summary: "refused: unsupported action"
      })
    ]
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
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_single_file_text_modification",
        outcome: "contract_refusal",
        actionName,
        targetPath,
        code: refusalCode,
        summary: output.refusal.summary
      })
    ],
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
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_single_file_text_modification",
        outcome: "execution_failure",
        actionName,
        targetPath,
        code: executionCode,
        summary: output.execution_failure.summary
      })
    ],
    output
  };
}

export function buildControlledSingleFileTextModificationPolicyFailedActionResult(
  actionName: string,
  policyCode: "path_outside_boundary" | "disallowed_file_type",
  targetPath: string
): ActionResult {
  const output: ControlledSingleFileTextModificationPolicyViolation = {
    applied: false,
    policy_violation: {
      code: policyCode,
      summary: buildControlledSingleFileTextModificationPolicyViolationSummary(
        policyCode,
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
    errorMessage: policyCode,
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_single_file_text_modification",
        outcome: "policy_violation",
        actionName,
        targetPath,
        code: policyCode,
        summary: output.policy_violation.summary
      })
    ],
    output
  };
}

export function buildControlledSingleFileTextReadSucceededActionResult(
  actionName: string,
  targetPath: string,
  matched: boolean
): ActionResult {
  const output: ControlledSingleFileTextReadSuccess = {
    inspected: true,
    summary: matched
      ? `contains_text matched in ${targetPath}`
      : `contains_text not matched in ${targetPath}`,
    result: {
      matched
    },
    evidence: {
      capability: "controlled_single_file_text_read",
      target_path: targetPath,
      single_file: true,
      text_only: true,
      read_kind: "contains_text"
    }
  };

  return {
    status: "succeeded",
    actionName,
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_single_file_text_read",
        outcome: "succeeded",
        actionName,
        targetPath,
        summary: output.summary
      })
    ],
    output
  };
}

export function buildControlledSingleFileTextReadFailedActionResult(
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

  const output: ControlledSingleFileTextReadFailure = {
    inspected: false,
    refusal: {
      code: refusalCode,
      summary: buildControlledSingleFileTextReadRefusalSummary(refusalCode)
    },
    evidence: {
      capability: "controlled_single_file_text_read",
      target_path: targetPath,
      single_file: true,
      text_only: true,
      read_kind: "contains_text"
    }
  };

  return {
    status: "failed",
    actionName,
    errorMessage: refusalCode,
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_single_file_text_read",
        outcome: "contract_refusal",
        actionName,
        targetPath,
        code: refusalCode,
        summary: output.refusal.summary
      })
    ],
    output
  };
}

export function buildControlledSingleFileTextReadExecutionFailedActionResult(
  actionName: string,
  executionCode: "target_file_missing" | "file_read_failed",
  targetPath: string
): ActionResult {
  const output: ControlledSingleFileTextReadExecutionFailure = {
    inspected: false,
    execution_failure: {
      code: executionCode,
      summary: buildControlledSingleFileTextReadExecutionFailureSummary(
        executionCode,
        targetPath
      )
    },
    evidence: {
      capability: "controlled_single_file_text_read",
      target_path: targetPath,
      single_file: true,
      text_only: true,
      read_kind: "contains_text"
    }
  };

  return {
    status: "failed",
    actionName,
    errorMessage: executionCode,
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_single_file_text_read",
        outcome: "execution_failure",
        actionName,
        targetPath,
        code: executionCode,
        summary: output.execution_failure.summary
      })
    ],
    output
  };
}

export function buildControlledSingleFileTextReadPolicyFailedActionResult(
  actionName: string,
  policyCode: "path_outside_boundary" | "disallowed_file_type",
  targetPath: string
): ActionResult {
  const output: ControlledSingleFileTextReadPolicyViolation = {
    inspected: false,
    policy_violation: {
      code: policyCode,
      summary: buildControlledSingleFileTextReadPolicyViolationSummary(policyCode, targetPath)
    },
    evidence: {
      capability: "controlled_single_file_text_read",
      target_path: targetPath,
      single_file: true,
      text_only: true,
      read_kind: "contains_text"
    }
  };

  return {
    status: "failed",
    actionName,
    errorMessage: policyCode,
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_single_file_text_read",
        outcome: "policy_violation",
        actionName,
        targetPath,
        code: policyCode,
        summary: output.policy_violation.summary
      })
    ],
    output
  };
}

export function buildControlledDirectoryTextListSucceededActionResult(
  actionName: string,
  targetPath: string,
  entries: string[]
): ActionResult {
  const output: ControlledDirectoryTextListSuccess = {
    listed: true,
    summary: `listed ${entries.length} text entr${entries.length === 1 ? "y" : "ies"} in ${targetPath}`,
    count: entries.length,
    entries: entries.map((relativePath) => ({
      relative_path: relativePath,
      entry_kind: "text_file"
    })),
    evidence: {
      capability: "controlled_directory_text_list",
      target_path: targetPath,
      single_directory: true,
      non_recursive: true,
      text_only: true,
      list_kind: "text_entries"
    }
  };

  return {
    status: "succeeded",
    actionName,
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_directory_text_list",
        outcome: "succeeded",
        actionName,
        targetPath,
        summary: output.summary
      })
    ],
    output
  };
}

export function buildControlledDirectoryTextListFailedActionResult(
  actionName: string,
  refusalCode: "invalid_path" | "missing_target" | "empty_request" | "no_op_request",
  input: unknown
): ActionResult {
  const maybeTargetPath =
    typeof input === "object" && input !== null ? Reflect.get(input, "target_path") : undefined;
  const targetPath = typeof maybeTargetPath === "string" ? maybeTargetPath : undefined;

  const output: ControlledDirectoryTextListFailure = {
    listed: false,
    refusal: {
      code: refusalCode,
      summary: buildControlledDirectoryTextListRefusalSummary(refusalCode)
    },
    evidence: {
      capability: "controlled_directory_text_list",
      target_path: targetPath,
      single_directory: true,
      non_recursive: true,
      text_only: true,
      list_kind: "text_entries"
    }
  };

  return {
    status: "failed",
    actionName,
    errorMessage: refusalCode,
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_directory_text_list",
        outcome: "contract_refusal",
        actionName,
        targetPath,
        code: refusalCode,
        summary: output.refusal.summary
      })
    ],
    output
  };
}

export function buildControlledDirectoryTextListExecutionFailedActionResult(
  actionName: string,
  executionCode:
    | "target_directory_missing"
    | "target_not_directory"
    | "directory_read_failed",
  targetPath: string
): ActionResult {
  const output: ControlledDirectoryTextListExecutionFailure = {
    listed: false,
    execution_failure: {
      code: executionCode,
      summary: buildControlledDirectoryTextListExecutionFailureSummary(
        executionCode,
        targetPath
      )
    },
    evidence: {
      capability: "controlled_directory_text_list",
      target_path: targetPath,
      single_directory: true,
      non_recursive: true,
      text_only: true,
      list_kind: "text_entries"
    }
  };

  return {
    status: "failed",
    actionName,
    errorMessage: executionCode,
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_directory_text_list",
        outcome: "execution_failure",
        actionName,
        targetPath,
        code: executionCode,
        summary: output.execution_failure.summary
      })
    ],
    output
  };
}

export function buildControlledDirectoryTextListPolicyFailedActionResult(
  actionName: string,
  policyCode: "path_outside_boundary",
  targetPath: string
): ActionResult {
  const output: ControlledDirectoryTextListPolicyViolation = {
    listed: false,
    policy_violation: {
      code: policyCode,
      summary: buildControlledDirectoryTextListPolicyViolationSummary(policyCode, targetPath)
    },
    evidence: {
      capability: "controlled_directory_text_list",
      target_path: targetPath,
      single_directory: true,
      non_recursive: true,
      text_only: true,
      list_kind: "text_entries"
    }
  };

  return {
    status: "failed",
    actionName,
    errorMessage: policyCode,
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: "controlled_directory_text_list",
        outcome: "policy_violation",
        actionName,
        targetPath,
        code: policyCode,
        summary: output.policy_violation.summary
      })
    ],
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
    errorMessage: buildInvalidActionErrorMessage(reason),
    evidence_refs: [
      buildCapabilityEvidenceRef({
        capability: resolveCapabilityNameForActionName(normalizeActionName(actionName)),
        outcome: "invalid_action",
        actionName: normalizeActionName(actionName),
        code: buildInvalidActionErrorMessage(reason),
        summary: "refused: invalid action input"
      })
    ]
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

  if (
    !isControlledSingleFileTextModificationAction(action) &&
    !isControlledSingleFileTextReadAction(action) &&
    !isControlledDirectoryTextListAction(action)
  ) {
    return false;
  }

  // Buildability is broader than acceptance:
  // recognizable contract actions can always be normalized into succeeded/failed ActionResult.
  return true;
}
