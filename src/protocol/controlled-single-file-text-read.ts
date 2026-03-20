import { type Action } from "./action.js";

export const CONTROLLED_SINGLE_FILE_TEXT_READ_ACTION_NAME =
  "controlled_single_file_text_read";

export const CONTROLLED_SINGLE_FILE_TEXT_READ_QUERY_KINDS = ["contains_text"] as const;
export type ControlledSingleFileTextReadQueryKind =
  (typeof CONTROLLED_SINGLE_FILE_TEXT_READ_QUERY_KINDS)[number];

export interface ControlledSingleFileTextReadInput {
  target_path: string;
  read: {
    kind: ControlledSingleFileTextReadQueryKind;
    query_text: string;
  };
}

export interface ControlledSingleFileTextReadEvidence {
  capability: "controlled_single_file_text_read";
  target_path?: string;
  single_file: true;
  text_only: true;
  read_kind: "contains_text";
}

export interface ControlledSingleFileTextReadSuccess {
  inspected: true;
  summary: string;
  result: {
    matched: boolean;
  };
  evidence: ControlledSingleFileTextReadEvidence;
}

export const CONTROLLED_SINGLE_FILE_TEXT_READ_REFUSAL_CODES = [
  "invalid_path",
  "unsupported_file_type",
  "missing_target",
  "empty_request",
  "no_op_request"
] as const;

export type ControlledSingleFileTextReadRefusalCode =
  (typeof CONTROLLED_SINGLE_FILE_TEXT_READ_REFUSAL_CODES)[number];

export interface ControlledSingleFileTextReadFailure {
  inspected: false;
  refusal: {
    code: ControlledSingleFileTextReadRefusalCode;
    summary: string;
  };
  evidence: ControlledSingleFileTextReadEvidence;
}

export const CONTROLLED_SINGLE_FILE_TEXT_READ_EXECUTION_FAILURE_CODES = [
  "target_file_missing",
  "file_read_failed"
] as const;

export type ControlledSingleFileTextReadExecutionFailureCode =
  (typeof CONTROLLED_SINGLE_FILE_TEXT_READ_EXECUTION_FAILURE_CODES)[number];

export interface ControlledSingleFileTextReadExecutionFailure {
  inspected: false;
  execution_failure: {
    code: ControlledSingleFileTextReadExecutionFailureCode;
    summary: string;
  };
  evidence: ControlledSingleFileTextReadEvidence;
}

export const CONTROLLED_SINGLE_FILE_TEXT_READ_POLICY_VIOLATION_CODES = [
  "path_outside_boundary",
  "disallowed_file_type"
] as const;

export type ControlledSingleFileTextReadPolicyViolationCode =
  (typeof CONTROLLED_SINGLE_FILE_TEXT_READ_POLICY_VIOLATION_CODES)[number];

export interface ControlledSingleFileTextReadPolicyViolation {
  inspected: false;
  policy_violation: {
    code: ControlledSingleFileTextReadPolicyViolationCode;
    summary: string;
  };
  evidence: ControlledSingleFileTextReadEvidence;
}

export type ControlledSingleFileTextReadActionOutput =
  | ControlledSingleFileTextReadSuccess
  | ControlledSingleFileTextReadFailure
  | ControlledSingleFileTextReadExecutionFailure
  | ControlledSingleFileTextReadPolicyViolation;

export type ControlledSingleFileTextReadValidation =
  | { accepted: true; input: ControlledSingleFileTextReadInput }
  | { accepted: false; refusalCode: ControlledSingleFileTextReadRefusalCode };

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

export function isControlledSingleFileTextReadAction(action: Action): boolean {
  return (
    action.kind === "capability" &&
    action.name === CONTROLLED_SINGLE_FILE_TEXT_READ_ACTION_NAME
  );
}

export function validateControlledSingleFileTextReadInput(
  value: unknown
): ControlledSingleFileTextReadValidation {
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

  const read = Reflect.get(value, "read");
  if (typeof read !== "object" || read === null) {
    return { accepted: false, refusalCode: "empty_request" };
  }

  const kind = Reflect.get(read, "kind");
  const queryText = Reflect.get(read, "query_text");
  if (kind !== "contains_text" || typeof queryText !== "string") {
    return { accepted: false, refusalCode: "empty_request" };
  }

  if (queryText.trim().length === 0) {
    return { accepted: false, refusalCode: "no_op_request" };
  }

  return {
    accepted: true,
    input: {
      target_path: normalizedPath,
      read: {
        kind: "contains_text",
        query_text: queryText
      }
    }
  };
}

export function buildControlledSingleFileTextReadRefusalSummary(
  code: ControlledSingleFileTextReadRefusalCode
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
    return "refused: empty or incomplete text read request";
  }

  return "refused: no-op text read request";
}

export function buildControlledSingleFileTextReadExecutionFailureSummary(
  code: ControlledSingleFileTextReadExecutionFailureCode,
  targetPath: string
): string {
  if (code === "target_file_missing") {
    return `execution_failed: target file not found (${targetPath})`;
  }

  return `execution_failed: failed to read ${targetPath}`;
}

export function buildControlledSingleFileTextReadPolicyViolationSummary(
  code: ControlledSingleFileTextReadPolicyViolationCode,
  targetPath: string
): string {
  if (code === "path_outside_boundary") {
    return `policy_refused: target path outside allowed boundary (${targetPath})`;
  }

  return `policy_refused: target file type is not allowed by policy (${targetPath})`;
}
