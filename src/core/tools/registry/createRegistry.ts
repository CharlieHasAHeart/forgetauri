import type { ToolSpec } from "../../contracts/tools.js";

export type ToolRegistryDeps = {
  overrides?: Partial<Record<string, ToolSpec<any>>>;
};

export const createRegistry = (deps?: ToolRegistryDeps): Record<string, ToolSpec<any>> => {
  const out: Record<string, ToolSpec<any>> = {};
  for (const [name, spec] of Object.entries(deps?.overrides ?? {})) {
    if (spec) out[name] = spec;
  }
  return out;
};
