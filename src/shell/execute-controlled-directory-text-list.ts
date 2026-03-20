import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildControlledDirectoryTextListExecutionFailureSummary,
  type ControlledDirectoryTextListExecutionFailureCode,
  type ControlledDirectoryTextListInput
} from "../protocol/index.js";
import { resolveControlledDirectoryTextListPolicy } from "../profiles/index.js";

export interface ControlledDirectoryTextListExecutionSuccess {
  success: true;
  targetPath: string;
  entries: string[];
}

export interface ControlledDirectoryTextListExecutionFailure {
  success: false;
  targetPath: string;
  code: ControlledDirectoryTextListExecutionFailureCode;
  summary: string;
}

export type ControlledDirectoryTextListExecutionResult =
  | ControlledDirectoryTextListExecutionSuccess
  | ControlledDirectoryTextListExecutionFailure;

function isNodeErrorWithCode(
  value: unknown
): value is NodeJS.ErrnoException & { code: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const code = Reflect.get(value, "code");
  return typeof code === "string";
}

export function executeControlledDirectoryTextList(
  input: ControlledDirectoryTextListInput,
  limit: number
): ControlledDirectoryTextListExecutionResult {
  const absolutePath = resolve(process.cwd(), input.target_path);

  try {
    const stat = statSync(absolutePath);
    if (!stat.isDirectory()) {
      return {
        success: false,
        targetPath: input.target_path,
        code: "target_not_directory",
        summary: buildControlledDirectoryTextListExecutionFailureSummary(
          "target_not_directory",
          input.target_path
        )
      };
    }
  } catch (error) {
    const code: ControlledDirectoryTextListExecutionFailureCode =
      isNodeErrorWithCode(error) && error.code === "ENOENT"
        ? "target_directory_missing"
        : "directory_read_failed";
    return {
      success: false,
      targetPath: input.target_path,
      code,
      summary: buildControlledDirectoryTextListExecutionFailureSummary(code, input.target_path)
    };
  }

  let entryNames: string[];
  try {
    entryNames = readdirSync(absolutePath);
  } catch {
    return {
      success: false,
      targetPath: input.target_path,
      code: "directory_read_failed",
      summary: buildControlledDirectoryTextListExecutionFailureSummary(
        "directory_read_failed",
        input.target_path
      )
    };
  }

  const policy = resolveControlledDirectoryTextListPolicy(undefined);
  const allowedExtensions = policy.allowedTextFileExtensions.map((ext) => ext.toLowerCase());
  const entries = entryNames
    .filter((entry) => {
      const lower = entry.toLowerCase();
      if (!allowedExtensions.some((extension) => lower.endsWith(extension))) {
        return false;
      }

      try {
        const entryStat = statSync(resolve(absolutePath, entry));
        return entryStat.isFile();
      } catch {
        return false;
      }
    })
    .slice(0, limit)
    .map((entry) => `${input.target_path}/${entry}`);

  return {
    success: true,
    targetPath: input.target_path,
    entries
  };
}
