import type { AgentState } from "../../contracts/state.js";

const truncate = (value: string, max: number): string => (value.length > max ? `${value.slice(0, max)}...<truncated>` : value);

export const buildChangesSoFar = (args: { state: AgentState; maxChars: number }): string => {
  const snapshot = {
    touchedFiles: args.state.touchedFiles.slice(-20),
    patchPaths: args.state.patchPaths.slice(-20),
    latestToolResults: args.state.toolResults.slice(-10),
    latestError: args.state.lastError?.message
  };
  return truncate(JSON.stringify(snapshot, null, 2), args.maxChars);
};
