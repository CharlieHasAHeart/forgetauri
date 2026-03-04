import type { AgentState } from "../../contracts/state.js";

export const summarizeState = (state: AgentState): Record<string, unknown> => ({
  status: state.status,
  goal: state.goal,
  outDir: state.outDir,
  appDir: state.appDir,
  planVersion: state.planVersion,
  completedTasks: state.completedTasks ?? [],
  touchedFilesCount: state.touchedFiles.length,
  patchCount: state.patchPaths.length,
  usedTurns: state.budgets.usedTurns,
  usedPatches: state.budgets.usedPatches,
  lastError: state.lastError?.message
});
