import { randomUUID } from "node:crypto";
import type { Middleware } from "../compose.js";
import type { ToolCallContext, ToolCallResult } from "./types.js";
import { summarizeForEvidence, tail, type EvidenceEvent } from "../../core/evidence/types.js";
import { canonicalizeCwd } from "../../core/runtime_paths/cwd_normalize.js";

const safeInt = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;

const appendEvidence = (context: ToolCallContext, event: EvidenceEvent): void => {
  const logger = context.ctx.memory.evidenceLogger;
  if (!logger) return;
  logger.append(event);
};

const canLog = (context: ToolCallContext): boolean =>
  Boolean(context.ctx.memory.evidenceLogger && context.ctx.memory.evidenceRunId && context.ctx.memory.evidenceTaskId) &&
  context.ctx.memory.evidenceTurn !== undefined;

export const evidenceMiddleware: Middleware<ToolCallContext, ToolCallResult> = async (context, next) => {
  const enabled = canLog(context);
  const runId = context.ctx.memory.evidenceRunId;
  const turn = context.ctx.memory.evidenceTurn;
  const taskId = context.ctx.memory.evidenceTaskId;
  const callId = randomUUID();
  context.evidenceCallId = callId;

  if (enabled && runId && turn !== undefined && taskId) {
    appendEvidence(context, {
      event_type: "tool_called",
      run_id: runId,
      turn,
      task_id: taskId,
      call_id: callId,
      tool_name: context.call.name,
      input: summarizeForEvidence(context.call.input),
      started_at: new Date().toISOString()
    });
  }

  let result: ToolCallResult;
  try {
    result = await next(context);
  } catch (error) {
    result = {
      ok: false,
      note: error instanceof Error ? error.message : String(error),
      touchedPaths: [],
      toolName: context.call.name
    };
  }

  const exitCode = safeInt((result.resultData as Record<string, unknown> | undefined)?.exitCode ?? (result.resultData as Record<string, unknown> | undefined)?.code);

  if (enabled && runId && turn !== undefined && taskId) {
    appendEvidence(context, {
      event_type: "tool_returned",
      run_id: runId,
      turn,
      task_id: taskId,
      call_id: callId,
      tool_name: context.call.name,
      ok: result.ok,
      ended_at: new Date().toISOString(),
      note: result.note ? summarizeForEvidence(result.note) : undefined,
      touched_paths: result.touchedPaths ?? [],
      output_summary: result.resultData === undefined ? undefined : summarizeForEvidence(result.resultData),
      exit_code: exitCode
    });
  }

  if (
    enabled &&
    runId &&
    turn !== undefined &&
    taskId &&
    context.call.name === "tool_run_cmd" &&
    context.parsedInput &&
    typeof context.parsedInput === "object"
  ) {
    const parsedInput = context.parsedInput as Record<string, unknown>;
    const cmd = typeof parsedInput.cmd === "string" ? parsedInput.cmd : "";
    const args = Array.isArray(parsedInput.args) ? parsedInput.args.map((item) => String(item)) : [];
    const cwd = typeof parsedInput.cwd === "string" ? parsedInput.cwd : "";
    const commandId = typeof parsedInput.command_id === "string" ? parsedInput.command_id : undefined;
    if (cmd && cwd && exitCode !== undefined && context.runtimePaths) {
      appendEvidence(context, {
        event_type: "command_ran",
        run_id: runId,
        turn,
        task_id: taskId,
        call_id: callId,
        command_id: commandId,
        cmd,
        args,
        cwd: canonicalizeCwd(cwd, context.runtimePaths.repoRoot),
        ok: result.ok,
        exit_code: exitCode,
        stdout_tail:
          typeof (result.resultData as Record<string, unknown> | undefined)?.stdout === "string"
            ? tail((result.resultData as Record<string, unknown>).stdout as string)
            : undefined,
        stderr_tail:
          typeof (result.resultData as Record<string, unknown> | undefined)?.stderr === "string"
            ? tail((result.resultData as Record<string, unknown>).stderr as string)
            : undefined,
        at: new Date().toISOString()
      });
    }
  }

  return result;
};
