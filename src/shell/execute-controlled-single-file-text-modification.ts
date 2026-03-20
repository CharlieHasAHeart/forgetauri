import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildControlledSingleFileTextModificationExecutionFailureSummary,
  type ControlledSingleFileTextModificationExecutionFailureCode,
  type ControlledSingleFileTextModificationInput
} from "../protocol/index.js";

export interface ControlledSingleFileTextModificationExecutionSuccess {
  success: true;
  targetPath: string;
}

export interface ControlledSingleFileTextModificationExecutionFailure {
  success: false;
  targetPath: string;
  code: ControlledSingleFileTextModificationExecutionFailureCode;
  summary: string;
}

export type ControlledSingleFileTextModificationExecutionResult =
  | ControlledSingleFileTextModificationExecutionSuccess
  | ControlledSingleFileTextModificationExecutionFailure;

function isNodeErrorWithCode(
  value: unknown
): value is NodeJS.ErrnoException & { code: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const code = Reflect.get(value, "code");
  return typeof code === "string";
}

export function readTextFile(path: string): string {
  return readFileSync(path, "utf8");
}

export function writeTextFile(path: string, content: string): void {
  writeFileSync(path, content, "utf8");
}

export function executeControlledSingleFileTextModification(
  input: ControlledSingleFileTextModificationInput
): ControlledSingleFileTextModificationExecutionResult {
  const absolutePath = resolve(process.cwd(), input.target_path);

  let originalContent: string;
  try {
    originalContent = readTextFile(absolutePath);
  } catch (error) {
    const code: ControlledSingleFileTextModificationExecutionFailureCode =
      isNodeErrorWithCode(error) && error.code === "ENOENT"
        ? "target_file_missing"
        : "file_read_failed";
    return {
      success: false,
      targetPath: input.target_path,
      code,
      summary: buildControlledSingleFileTextModificationExecutionFailureSummary(
        code,
        input.target_path
      )
    };
  }

  const index = originalContent.indexOf(input.change.find_text);
  if (index < 0) {
    return {
      success: false,
      targetPath: input.target_path,
      code: "find_text_not_found",
      summary: buildControlledSingleFileTextModificationExecutionFailureSummary(
        "find_text_not_found",
        input.target_path
      )
    };
  }

  const nextContent =
    originalContent.slice(0, index) +
    input.change.replace_text +
    originalContent.slice(index + input.change.find_text.length);

  try {
    writeTextFile(absolutePath, nextContent);
  } catch {
    return {
      success: false,
      targetPath: input.target_path,
      code: "file_write_failed",
      summary: buildControlledSingleFileTextModificationExecutionFailureSummary(
        "file_write_failed",
        input.target_path
      )
    };
  }

  return {
    success: true,
    targetPath: input.target_path
  };
}

