import type { ToolDocPack, ToolSpec } from "../../contracts/tools.js";

export const loadRegistryWithDocs = async (deps?: {
  registry?: Record<string, ToolSpec<any>>;
}): Promise<{ registry: Record<string, ToolSpec<any>>; docs: ToolDocPack[] }> => {
  const registry = deps?.registry ?? {};
  const docs: ToolDocPack[] = Object.keys(registry)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      description: registry[name]?.description
    }));
  return { registry, docs };
};
