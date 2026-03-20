import {
  type ControlledSingleFileTextReadInput,
  type ControlledSingleFileTextReadPolicyViolationCode
} from "../protocol/index.js";
import { resolveControlledSingleFileTextReadPolicy } from "../profiles/index.js";

export type ControlledSingleFileTextReadPolicyEvaluation =
  | { allowed: true }
  | {
      allowed: false;
      code: ControlledSingleFileTextReadPolicyViolationCode;
    };

function hasPolicyAllowedExtension(path: string, allowedExtensions: string[]): boolean {
  const lowerPath = path.toLowerCase();
  return allowedExtensions.some((extension) => lowerPath.endsWith(extension));
}

function hasAllowedPathPrefix(path: string, allowedPrefixes: string[]): boolean {
  return allowedPrefixes.some((prefix) => path.startsWith(prefix));
}

export function evaluateControlledSingleFileTextReadPolicy(
  input: ControlledSingleFileTextReadInput
): ControlledSingleFileTextReadPolicyEvaluation {
  const policy = resolveControlledSingleFileTextReadPolicy(undefined);

  if (!hasAllowedPathPrefix(input.target_path, policy.allowedPathPrefixes)) {
    return {
      allowed: false,
      code: "path_outside_boundary"
    };
  }

  if (!hasPolicyAllowedExtension(input.target_path, policy.allowedTextFileExtensions)) {
    return {
      allowed: false,
      code: "disallowed_file_type"
    };
  }

  return { allowed: true };
}
