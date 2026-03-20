import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildControlledSingleFileTextReadExecutionFailureSummary,
  type ControlledSingleFileTextReadExecutionFailureCode,
  type ControlledSingleFileTextReadInput
} from "../protocol/index.js";

export interface ControlledSingleFileTextReadExecutionSuccess {
  success: true;
  targetPath: string;
  matched: boolean;
}

export interface ControlledSingleFileTextReadExecutionFailure {
  success: false;
  targetPath: string;
  code: ControlledSingleFileTextReadExecutionFailureCode;
  summary: string;
}

export type ControlledSingleFileTextReadExecutionResult =
  | ControlledSingleFileTextReadExecutionSuccess
  | ControlledSingleFileTextReadExecutionFailure;

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

export function executeControlledSingleFileTextRead(
  input: ControlledSingleFileTextReadInput
): ControlledSingleFileTextReadExecutionResult {
  const absolutePath = resolve(process.cwd(), input.target_path);

  let content: string;
  try {
    content = readTextFile(absolutePath);
  } catch (error) {
    const code: ControlledSingleFileTextReadExecutionFailureCode =
      isNodeErrorWithCode(error) && error.code === "ENOENT"
        ? "target_file_missing"
        : "file_read_failed";
    return {
      success: false,
      targetPath: input.target_path,
      code,
      summary: buildControlledSingleFileTextReadExecutionFailureSummary(code, input.target_path)
    };
  }

  return {
    success: true,
    targetPath: input.target_path,
    matched: content.includes(input.read.query_text)
  };
}
