import {
  type ControlledSingleFileTextModificationInput,
  type ControlledSingleFileTextModificationPolicyViolationCode
} from "../protocol/index.js";
import { resolveControlledSingleFileCapabilityPolicy } from "../profiles/index.js";

export type ControlledSingleFileTextModificationPolicyEvaluation =
  | { allowed: true }
  | {
      allowed: false;
      code: ControlledSingleFileTextModificationPolicyViolationCode;
    };

function hasPolicyAllowedExtension(path: string, allowedExtensions: string[]): boolean {
  const lowerPath = path.toLowerCase();
  return allowedExtensions.some((extension) =>
    lowerPath.endsWith(extension)
  );
}

function hasAllowedPathPrefix(path: string, allowedPrefixes: string[]): boolean {
  return allowedPrefixes.some((prefix) => path.startsWith(prefix));
}

export function evaluateControlledSingleFileTextModificationPolicy(
  input: ControlledSingleFileTextModificationInput
): ControlledSingleFileTextModificationPolicyEvaluation {
  const policy = resolveControlledSingleFileCapabilityPolicy(undefined);

  // Stage 3 policy remains narrow and declarative:
  // 1) target must match configured path prefixes
  // 2) executable text type must match configured allowlist extensions
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
