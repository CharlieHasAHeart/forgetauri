import type { AgentState } from "./state.js";
import type { ToolRunContext } from "./tools.js";

export type RuntimePaths = {
  repoRoot: string;
  appDir: string;
  tauriDir: string;
};

export type RuntimePathsResolver = (ctx: ToolRunContext, state: AgentState) => RuntimePaths;

export type CommandRunnerPort = (cmd: string, args: string[], cwd: string) => Promise<{ ok: boolean; code: number; stdout: string; stderr: string }>;
