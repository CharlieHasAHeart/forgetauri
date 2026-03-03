import { z } from "zod";
import { runVerifyProject, verifyProjectInputSchema } from "../../verifyProject.js";
import type { ToolPackage } from "../../types.js";
import { randomUUID } from "node:crypto";

const verifyStepSchema = z.object({
  name: z.enum(["install", "install_retry", "build", "build_retry", "cargo_check", "tauri_check", "tauri_build"]),
  ok: z.boolean(),
  code: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  skipped: z.boolean().optional()
});

const outputSchema = z.object({
  ok: z.boolean(),
  step: z.enum(["install", "install_retry", "build", "build_retry", "cargo_check", "tauri_check", "tauri_build", "none"]),
  results: z.array(verifyStepSchema),
  summary: z.string(),
  classifiedError: z.enum(["Deps", "TS", "Rust", "Tauri", "Config", "Unknown"]),
  suggestion: z.string()
});

export const toolPackage: ToolPackage<z.infer<typeof verifyProjectInputSchema>, z.infer<typeof outputSchema>> = {
  manifest: {
    name: "tool_verify_project",
    version: "1.0.0",
    category: "high",
    description: "High-level verify gate with fixed full order ending in tauri build.",
    capabilities: ["verify", "build", "cargo", "tauri"],
    inputSchema: verifyProjectInputSchema,
    outputSchema,
    safety: {
      sideEffects: "exec",
      allowlist: ["pnpm", "cargo", "tauri", "node"]
    }
  },
  runtime: {
    run: async (input, ctx) => {
      try {
        const runtimePaths = ctx.memory.runtimePaths ?? {
          repoRoot: ctx.memory.repoRoot ?? process.cwd(),
          appDir: input.projectRoot,
          tauriDir: `${input.projectRoot.replace(/\\/g, "/")}/src-tauri`
        };
        const result = await runVerifyProject({
          projectRoot: input.projectRoot,
          runCmdImpl: ctx.runCmdImpl,
          runtimePaths,
          onCommandRun: (event) => {
            const logger = ctx.memory.evidenceLogger;
            const runId = ctx.memory.evidenceRunId;
            const turn = ctx.memory.evidenceTurn;
            const taskId = ctx.memory.evidenceTaskId;
            if (!logger || !runId || turn === undefined || !taskId) return;
            logger.append({
              event_type: "command_ran",
              run_id: runId,
              turn,
              task_id: taskId,
              call_id: randomUUID(),
              command_id: event.commandId,
              cmd: event.cmd,
              args: event.args,
              cwd: event.cwd,
              ok: event.ok,
              exit_code: event.code,
              stdout_tail: event.stdout.length > 4000 ? event.stdout.slice(event.stdout.length - 4000) : event.stdout,
              stderr_tail: event.stderr.length > 4000 ? event.stderr.slice(event.stderr.length - 4000) : event.stderr,
              at: new Date().toISOString()
            });
          }
        });
        ctx.memory.runtimePaths = runtimePaths;
        ctx.memory.verifyResult = {
          ok: result.ok,
          code: result.ok ? 0 : 1,
          stdout: result.results.map((r) => `[${r.name}] ${r.stdout}`).join("\n"),
          stderr: result.results.map((r) => `[${r.name}] ${r.stderr}`).join("\n")
        };
        return {
          ok: result.ok,
          data: result,
          error: result.ok
            ? undefined
            : {
                code: "VERIFY_FAILED",
                message: result.summary,
                detail: result.suggestion
              },
          meta: { touchedPaths: [input.projectRoot] }
        };
      } catch (error) {
        return {
          ok: false,
          error: {
            code: "VERIFY_FAILED",
            message: error instanceof Error ? error.message : "verify failed"
          }
        };
      }
    },
    examples: [
      {
        title: "Project verify",
        toolCall: { name: "tool_verify_project", input: { projectRoot: "./generated/app" } },
        expected: "Runs install/build/cargo_check/tauri_check/tauri_build and returns structured step results."
      }
    ]
  }
};
