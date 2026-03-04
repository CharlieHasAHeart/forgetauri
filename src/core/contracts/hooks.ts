import type { AgentState } from "./state.js";
import type { ToolResult, ToolRunContext } from "./tools.js";

export type KernelHooks = {
  onToolResult?: (args: {
    call: { name: string; input: unknown };
    result: ToolResult;
    ctx: ToolRunContext;
    state: AgentState;
  }) => void | Promise<void>;
  onPatchPathsChanged?: (args: {
    patchPaths: string[];
    ctx: ToolRunContext;
    state: AgentState;
  }) => void | Promise<void>;
};
