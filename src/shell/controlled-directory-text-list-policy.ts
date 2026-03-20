import {
  type ControlledDirectoryTextListInput,
  type ControlledDirectoryTextListPolicyViolationCode
} from "../protocol/index.js";
import { resolveControlledDirectoryTextListPolicy } from "../profiles/index.js";

export interface ControlledDirectoryTextListPolicyResolved {
  maxEntries: number;
}

export type ControlledDirectoryTextListPolicyEvaluation =
  | {
      allowed: true;
      resolved: ControlledDirectoryTextListPolicyResolved;
    }
  | {
      allowed: false;
      code: ControlledDirectoryTextListPolicyViolationCode;
    };

function hasAllowedPathPrefix(path: string, allowedPrefixes: string[]): boolean {
  return allowedPrefixes.some((prefix) => {
    if (path.startsWith(prefix)) {
      return true;
    }

    if (prefix.endsWith("/") && path === prefix.slice(0, -1)) {
      return true;
    }

    return false;
  });
}

export function evaluateControlledDirectoryTextListPolicy(
  input: ControlledDirectoryTextListInput
): ControlledDirectoryTextListPolicyEvaluation {
  const policy = resolveControlledDirectoryTextListPolicy(undefined);

  if (!hasAllowedPathPrefix(input.target_path, policy.allowedPathPrefixes)) {
    return {
      allowed: false,
      code: "path_outside_boundary"
    };
  }

  return {
    allowed: true,
    resolved: {
      maxEntries: policy.maxEntries
    }
  };
}

export function resolveEffectiveDirectoryTextListLimit(
  inputLimit: number | undefined,
  policyMaxEntries: number
): number {
  if (typeof inputLimit === "number") {
    return Math.min(inputLimit, policyMaxEntries);
  }

  return policyMaxEntries;
}
