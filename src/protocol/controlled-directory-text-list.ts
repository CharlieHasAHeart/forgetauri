import { type Action } from "./action.js";

export const CONTROLLED_DIRECTORY_TEXT_LIST_ACTION_NAME =
  "controlled_directory_text_list";

export const CONTROLLED_DIRECTORY_TEXT_LIST_LIST_KINDS = ["text_entries"] as const;
export type ControlledDirectoryTextListKind =
  (typeof CONTROLLED_DIRECTORY_TEXT_LIST_LIST_KINDS)[number];

export interface ControlledDirectoryTextListInput {
  target_path: string;
  list: {
    kind: ControlledDirectoryTextListKind;
    limit?: number;
  };
}

export interface ControlledDirectoryTextListEntry {
  relative_path: string;
  entry_kind: "text_file";
}

export interface ControlledDirectoryTextListEvidence {
  capability: "controlled_directory_text_list";
  target_path?: string;
  single_directory: true;
  non_recursive: true;
  text_only: true;
  list_kind: "text_entries";
}

export interface ControlledDirectoryTextListSuccess {
  listed: true;
  summary: string;
  count: number;
  entries: ControlledDirectoryTextListEntry[];
  evidence: ControlledDirectoryTextListEvidence;
}

export const CONTROLLED_DIRECTORY_TEXT_LIST_REFUSAL_CODES = [
  "invalid_path",
  "missing_target",
  "empty_request",
  "no_op_request"
] as const;

export type ControlledDirectoryTextListRefusalCode =
  (typeof CONTROLLED_DIRECTORY_TEXT_LIST_REFUSAL_CODES)[number];

export interface ControlledDirectoryTextListFailure {
  listed: false;
  refusal: {
    code: ControlledDirectoryTextListRefusalCode;
    summary: string;
  };
  evidence: ControlledDirectoryTextListEvidence;
}

export const CONTROLLED_DIRECTORY_TEXT_LIST_EXECUTION_FAILURE_CODES = [
  "target_directory_missing",
  "target_not_directory",
  "directory_read_failed"
] as const;

export type ControlledDirectoryTextListExecutionFailureCode =
  (typeof CONTROLLED_DIRECTORY_TEXT_LIST_EXECUTION_FAILURE_CODES)[number];

export interface ControlledDirectoryTextListExecutionFailure {
  listed: false;
  execution_failure: {
    code: ControlledDirectoryTextListExecutionFailureCode;
    summary: string;
  };
  evidence: ControlledDirectoryTextListEvidence;
}

export const CONTROLLED_DIRECTORY_TEXT_LIST_POLICY_VIOLATION_CODES = [
  "path_outside_boundary"
] as const;

export type ControlledDirectoryTextListPolicyViolationCode =
  (typeof CONTROLLED_DIRECTORY_TEXT_LIST_POLICY_VIOLATION_CODES)[number];

export interface ControlledDirectoryTextListPolicyViolation {
  listed: false;
  policy_violation: {
    code: ControlledDirectoryTextListPolicyViolationCode;
    summary: string;
  };
  evidence: ControlledDirectoryTextListEvidence;
}

export type ControlledDirectoryTextListActionOutput =
  | ControlledDirectoryTextListSuccess
  | ControlledDirectoryTextListFailure
  | ControlledDirectoryTextListExecutionFailure
  | ControlledDirectoryTextListPolicyViolation;

export type ControlledDirectoryTextListValidation =
  | { accepted: true; input: ControlledDirectoryTextListInput }
  | { accepted: false; refusalCode: ControlledDirectoryTextListRefusalCode };

function isSafeSingleDirectoryPath(path: string): boolean {
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

export function isControlledDirectoryTextListAction(action: Action): boolean {
  return (
    action.kind === "capability" &&
    action.name === CONTROLLED_DIRECTORY_TEXT_LIST_ACTION_NAME
  );
}

export function validateControlledDirectoryTextListInput(
  value: unknown
): ControlledDirectoryTextListValidation {
  if (typeof value !== "object" || value === null) {
    return { accepted: false, refusalCode: "empty_request" };
  }

  const targetPath = Reflect.get(value, "target_path");
  if (typeof targetPath !== "string" || targetPath.trim().length === 0) {
    return { accepted: false, refusalCode: "missing_target" };
  }

  const normalizedPath = targetPath.trim();
  if (!isSafeSingleDirectoryPath(normalizedPath)) {
    return { accepted: false, refusalCode: "invalid_path" };
  }

  const list = Reflect.get(value, "list");
  if (typeof list !== "object" || list === null) {
    return { accepted: false, refusalCode: "empty_request" };
  }

  const kind = Reflect.get(list, "kind");
  const limit = Reflect.get(list, "limit");
  if (kind !== "text_entries") {
    return { accepted: false, refusalCode: "empty_request" };
  }

  if (limit !== undefined) {
    if (!Number.isInteger(limit) || typeof limit !== "number" || limit < 0) {
      return { accepted: false, refusalCode: "empty_request" };
    }
    if (limit === 0) {
      return { accepted: false, refusalCode: "no_op_request" };
    }
  }

  return {
    accepted: true,
    input: {
      target_path: normalizedPath,
      list: {
        kind: "text_entries",
        ...(typeof limit === "number" ? { limit } : {})
      }
    }
  };
}

export function buildControlledDirectoryTextListRefusalSummary(
  code: ControlledDirectoryTextListRefusalCode
): string {
  if (code === "invalid_path") {
    return "refused: invalid single-directory path";
  }

  if (code === "missing_target") {
    return "refused: missing target directory path in request";
  }

  if (code === "empty_request") {
    return "refused: empty or incomplete directory text list request";
  }

  return "refused: no-op directory text list request";
}

export function buildControlledDirectoryTextListExecutionFailureSummary(
  code: ControlledDirectoryTextListExecutionFailureCode,
  targetPath: string
): string {
  if (code === "target_directory_missing") {
    return `execution_failed: target directory not found (${targetPath})`;
  }

  if (code === "target_not_directory") {
    return `execution_failed: target is not a directory (${targetPath})`;
  }

  return `execution_failed: failed to list ${targetPath}`;
}

export function buildControlledDirectoryTextListPolicyViolationSummary(
  code: ControlledDirectoryTextListPolicyViolationCode,
  targetPath: string
): string {
  if (code === "path_outside_boundary") {
    return `policy_refused: target path outside allowed boundary (${targetPath})`;
  }

  return `policy_refused: target path outside allowed boundary (${targetPath})`;
}
