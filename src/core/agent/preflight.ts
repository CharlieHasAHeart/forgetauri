import type { AgentState } from "../contracts/state.js";
import type { ToolRunContext } from "../contracts/tools.js";

export const preflightRuntime = (args: { state: AgentState; ctx: ToolRunContext }): void => {
  const { state, ctx } = args;
  if (!ctx.memory.patchPaths) ctx.memory.patchPaths = [];
  if (!ctx.memory.touchedPaths) ctx.memory.touchedPaths = [];

  if (!state.appDir) {
    if (ctx.memory.appDir) state.appDir = ctx.memory.appDir;
    else if (state.outDir) state.appDir = state.outDir;
  }
};
