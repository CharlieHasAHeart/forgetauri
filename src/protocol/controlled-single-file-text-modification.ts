import { type Action } from "./action.js";

export const CONTROLLED_SINGLE_FILE_TEXT_MODIFICATION_ACTION_NAME =
  "controlled_single_file_text_modification";

export const CONTROLLED_SINGLE_FILE_TEXT_MODIFICATION_CHANGE_KINDS = [
  "replace_text"
] as const;

export type ControlledSingleFileTextModificationChangeKind =
  (typeof CONTROLLED_SINGLE_FILE_TEXT_MODIFICATION_CHANGE_KINDS)[number];

export interface ControlledSingleFileTextModificationInput {
  target_path: string;
  change: {
    kind: ControlledSingleFileTextModificationChangeKind;
    find_text: string;
    replace_text: string;
  };
}

export interface ControlledSingleFileTextModificationEvidence {
  capability: "controlled_single_file_text_modification";
  target_path?: string;
  single_file: true;
  text_only: true;
  change_kind: "replace_text";
}

export interface ControlledSingleFileTextModificationSuccess {
  applied: true;
  summary: string;
  evidence: ControlledSingleFileTextModificationEvidence;
}

export const CONTROLLED_SINGLE_FILE_TEXT_MODIFICATION_REFUSAL_CODES = [
  "invalid_path",
  "unsupported_file_type",
  "missing_target",
  "empty_request",
  "no_op_request"
] as const;

export type ControlledSingleFileTextModificationRefusalCode =
  (typeof CONTROLLED_SINGLE_FILE_TEXT_MODIFICATION_REFUSAL_CODES)[number];

export interface ControlledSingleFileTextModificationFailure {
  applied: false;
  refusal: {
    code: ControlledSingleFileTextModificationRefusalCode;
    summary: string;
  };
  evidence: ControlledSingleFileTextModificationEvidence;
}

export const CONTROLLED_SINGLE_FILE_TEXT_MODIFICATION_EXECUTION_FAILURE_CODES = [
  "target_file_missing",
  "find_text_not_found",
  "file_read_failed",
  "file_write_failed"
] as const;

export type ControlledSingleFileTextModificationExecutionFailureCode =
  (typeof CONTROLLED_SINGLE_FILE_TEXT_MODIFICATION_EXECUTION_FAILURE_CODES)[number];

export interface ControlledSingleFileTextModificationExecutionFailure {
  applied: false;
  execution_failure: {
    code: ControlledSingleFileTextModificationExecutionFailureCode;
    summary: string;
  };
  evidence: ControlledSingleFileTextModificationEvidence;
}

export const CONTROLLED_SINGLE_FILE_TEXT_MODIFICATION_POLICY_VIOLATION_CODES = [
  "path_outside_boundary",
  "disallowed_file_type"
] as const;

export type ControlledSingleFileTextModificationPolicyViolationCode =
  (typeof CONTROLLED_SINGLE_FILE_TEXT_MODIFICATION_POLICY_VIOLATION_CODES)[number];

export interface ControlledSingleFileTextModificationPolicyViolation {
  applied: false;
  policy_violation: {
    code: ControlledSingleFileTextModificationPolicyViolationCode;
    summary: string;
  };
  evidence: ControlledSingleFileTextModificationEvidence;
}

export type ControlledSingleFileTextModificationActionOutput =
  | ControlledSingleFileTextModificationSuccess
  | ControlledSingleFileTextModificationFailure
  | ControlledSingleFileTextModificationExecutionFailure
  | ControlledSingleFileTextModificationPolicyViolation;

export type ControlledSingleFileTextModificationValidation =
  | { accepted: true; input: ControlledSingleFileTextModificationInput }
  | { accepted: false; refusalCode: ControlledSingleFileTextModificationRefusalCode };

const ALLOWED_TEXT_FILE_EXTENSIONS = [
  ".txt",
  ".md",
  ".json",
  ".yaml",
  ".yml",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".html"
] as const;

function hasAllowedTextExtension(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return ALLOWED_TEXT_FILE_EXTENSIONS.some((extension) =>
    lowerPath.endsWith(extension)
  );
}

function isSafeSingleFilePath(path: string): boolean {
  if (path.length === 0) {
    return false;
  }

  if (path.startsWith("/") || path.endsWith("/")) {
    return false;
  }

  if (path.includes("\0") || path.includes("\n") || path.includes("\r")) {
    return false;
  }

  if (path.includes("*") || path.includes("?")) {
    return false;
  }

  if (path.includes("//") || path.includes("\\")) {
    return false;
  }

  const segments = path.split("/");
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== ".."
  );
}

export function isControlledSingleFileTextModificationAction(
  action: Action
): boolean {
  return (
    action.kind === "capability" &&
    action.name === CONTROLLED_SINGLE_FILE_TEXT_MODIFICATION_ACTION_NAME
  );
}

export function isControlledSingleFileTextModificationInput(
  value: unknown
): value is ControlledSingleFileTextModificationInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const targetPath = Reflect.get(value, "target_path");
  const change = Reflect.get(value, "change");

  if (typeof targetPath !== "string" || typeof change !== "object" || change === null) {
    return false;
  }

  const kind = Reflect.get(change, "kind");
  const findText = Reflect.get(change, "find_text");
  const replaceText = Reflect.get(change, "replace_text");

  return (
    kind === "replace_text" &&
    typeof findText === "string" &&
    typeof replaceText === "string"
  );
}

export function validateControlledSingleFileTextModificationInput(
  value: unknown
): ControlledSingleFileTextModificationValidation {
  // Stage 1.1 contract-only semantics:
  // missing_target means target path field is missing/blank in request input,
  // not filesystem existence of the referenced file.
  if (typeof value !== "object" || value === null) {
    return { accepted: false, refusalCode: "empty_request" };
  }

  const targetPath = Reflect.get(value, "target_path");
  if (typeof targetPath !== "string" || targetPath.trim().length === 0) {
    return { accepted: false, refusalCode: "missing_target" };
  }

  const normalizedPath = targetPath.trim();
  if (!isSafeSingleFilePath(normalizedPath)) {
    return { accepted: false, refusalCode: "invalid_path" };
  }

  if (!hasAllowedTextExtension(normalizedPath)) {
    return { accepted: false, refusalCode: "unsupported_file_type" };
  }

  const change = Reflect.get(value, "change");
  // empty_request is reserved for missing/incomplete/empty change intent,
  // and intentionally does not encode target-file existence checks in Stage 1.1.
  if (typeof change !== "object" || change === null) {
    return { accepted: false, refusalCode: "empty_request" };
  }

  const kind = Reflect.get(change, "kind");
  const findText = Reflect.get(change, "find_text");
  const replaceText = Reflect.get(change, "replace_text");
  if (
    kind !== "replace_text" ||
    typeof findText !== "string" ||
    typeof replaceText !== "string"
  ) {
    return { accepted: false, refusalCode: "empty_request" };
  }

  if (findText.length === 0 && replaceText.length === 0) {
    return { accepted: false, refusalCode: "empty_request" };
  }

  if (findText === replaceText) {
    return { accepted: false, refusalCode: "no_op_request" };
  }

  return {
    accepted: true,
    input: {
      target_path: normalizedPath,
      change: {
        kind: "replace_text",
        find_text: findText,
        replace_text: replaceText
      }
    }
  };
}

export function buildControlledSingleFileTextModificationRefusalSummary(
  code: ControlledSingleFileTextModificationRefusalCode
): string {
  if (code === "invalid_path") {
    return "refused: invalid single-file text path";
  }

  if (code === "unsupported_file_type") {
    return "refused: unsupported file type (text files only)";
  }

  if (code === "missing_target") {
    return "refused: missing target path in request";
  }

  if (code === "empty_request") {
    return "refused: empty or incomplete text modification request";
  }

  return "refused: no-op text modification request";
}

export function buildControlledSingleFileTextModificationExecutionFailureSummary(
  code: ControlledSingleFileTextModificationExecutionFailureCode,
  targetPath: string
): string {
  if (code === "target_file_missing") {
    return `execution_failed: target file not found (${targetPath})`;
  }

  if (code === "find_text_not_found") {
    return `execution_failed: find_text not found in ${targetPath}`;
  }

  if (code === "file_read_failed") {
    return `execution_failed: failed to read ${targetPath}`;
  }

  return `execution_failed: failed to write ${targetPath}`;
}

export function buildControlledSingleFileTextModificationPolicyViolationSummary(
  code: ControlledSingleFileTextModificationPolicyViolationCode,
  targetPath: string
): string {
  if (code === "path_outside_boundary") {
    return `policy_refused: target path outside allowed boundary (${targetPath})`;
  }

  return `policy_refused: target file type is not allowed by policy (${targetPath})`;
}
