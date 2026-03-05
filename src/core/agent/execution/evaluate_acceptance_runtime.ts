import type { ToolRunContext } from "../../contracts/tools.js";
import type { AgentState } from "../../contracts/state.js";
import type { RuntimePaths } from "../../contracts/runtime.js";

export type EvaluationResult = {
  status: "pending" | "satisfied" | "failed";
  requirements: Array<Record<string, unknown>>;
  satisfied_requirements: Array<Record<string, unknown>>;
  diagnostics: string[];
  runtime: RuntimePaths;
};

export const evaluateAcceptanceRuntime = (args: {
  goal: string;
  intent: unknown;
  ctx: ToolRunContext;
  state: AgentState;
  evidence: unknown[];
  snapshot: unknown;
}): EvaluationResult => {
  const runtime = args.state.runtimePaths ?? args.ctx.memory.runtimePaths ?? {
    repoRoot: args.ctx.memory.repoRoot ?? process.cwd(),
    appDir: args.ctx.memory.appDir ?? args.state.appDir ?? args.state.runDir,
    tauriDir: args.ctx.memory.tauriDir ?? `${args.ctx.memory.appDir ?? args.state.appDir ?? args.state.runDir}/src-tauri`
  };

  return {
    status: "pending",
    requirements: [],
    satisfied_requirements: [],
    diagnostics: ["acceptance runtime evaluator is not wired in core-only mode"],
    runtime
  };
};
