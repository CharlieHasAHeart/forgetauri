import type { Evidence } from "../../contracts/context.js";

export type MemoryQueryResult = {
  decisions: string[];
  invariants: string[];
  pitfalls: string[];
};

export type MemoryQuery = (args: {
  evidence?: Evidence;
  taskId?: string;
  paths: string[];
}) => Promise<MemoryQueryResult> | MemoryQueryResult;

export const injectMemory = async (args: {
  query?: MemoryQuery;
  evidence?: Evidence;
  taskId?: string;
  paths: string[];
}): Promise<string[]> => {
  if (!args.query) return [];
  const result = await args.query({
    evidence: args.evidence,
    taskId: args.taskId,
    paths: args.paths
  });
  const merged = [...result.decisions, ...result.invariants, ...result.pitfalls];
  return merged.slice(0, 3);
};
