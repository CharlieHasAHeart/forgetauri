import type { Middleware } from "../compose.js";
import type { ToolCallContext, ToolCallResult } from "./types.js";
import { getRuntimePaths } from "../../runtime/get_runtime_paths.js";

export const runtimePathsMiddleware: Middleware<ToolCallContext, ToolCallResult> = async (context, next) => {
  const runtimePaths = getRuntimePaths(context.ctx, context.state);
  context.runtimePaths = runtimePaths;
  context.ctx.memory.runtimePaths = runtimePaths;
  context.state.runtimePaths = runtimePaths;
  context.ctx.memory.repoRoot = runtimePaths.repoRoot;
  context.ctx.memory.appDir = runtimePaths.appDir;
  context.ctx.memory.tauriDir = runtimePaths.tauriDir;
  return next(context);
};
