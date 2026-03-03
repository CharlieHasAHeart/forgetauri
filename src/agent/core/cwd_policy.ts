import type { AcceptanceCommand } from "./acceptance_catalog.js";
import { canonicalizeCwd } from "./cwd_normalize.js";
import type { RuntimePaths } from "./runtime_paths.js";

export const resolveCwdFromPolicy = (
  cwdPolicy: AcceptanceCommand["cwd_policy"],
  runtimePaths: RuntimePaths
): string => {
  if (typeof cwdPolicy === "object") {
    return canonicalizeCwd(cwdPolicy.explicit, runtimePaths.repoRoot);
  }
  if (cwdPolicy === "repo_root") {
    return canonicalizeCwd(runtimePaths.repoRoot, runtimePaths.repoRoot);
  }
  if (cwdPolicy === "app_dir") {
    return canonicalizeCwd(runtimePaths.appDir, runtimePaths.repoRoot);
  }
  return canonicalizeCwd(runtimePaths.tauriDir, runtimePaths.repoRoot);
};
