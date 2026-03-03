import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { describe, expect, test } from "vitest";
import { acceptanceGateMiddleware } from "../src/agent/middleware/tool/acceptance_gate_middleware.js";
import { evidenceMiddleware } from "../src/agent/middleware/tool/evidence_middleware.js";
import { policyMiddleware } from "../src/agent/middleware/tool/policy_middleware.js";
import { runtimePathsMiddleware } from "../src/agent/middleware/tool/runtime_paths_middleware.js";
import { schemaMiddleware } from "../src/agent/middleware/tool/schema_middleware.js";
import type { ToolCallContext, ToolCallResult } from "../src/agent/middleware/tool/types.js";
import { EvidenceLogger } from "../src/agent/core/evidence/logger.js";
import { defaultAgentPolicy } from "../src/agent/runtime/policy/policy.js";
import type { AgentState } from "../src/agent/types.js";
import type { ToolRunContext, ToolSpec } from "../src/agent/tools/types.js";
import { MockProvider } from "./helpers/mockProvider.js";

const makeState = (outDir: string): AgentState => ({
  status: "executing",
  goal: "middleware-test",
  specPath: "/tmp/spec.json",
  outDir,
  flags: { apply: true, verify: true, repair: false, truncation: "auto" },
  usedLLM: false,
  verifyHistory: [],
  budgets: { maxTurns: 8, maxPatches: 6, usedTurns: 1, usedPatches: 0, usedRepairs: 0 },
  patchPaths: [],
  humanReviews: [],
  touchedFiles: [],
  toolCalls: [],
  toolResults: []
});

const makeCtx = (outDir: string): ToolRunContext => ({
  provider: new MockProvider([]),
  runCmdImpl: async () => ({ ok: true, code: 0, stdout: "", stderr: "", cmd: "", args: [], cwd: outDir }),
  flags: { apply: true, verify: true, repair: false, maxPatchesPerTurn: 8 },
  memory: {
    specPath: "/tmp/spec.json",
    outDir,
    patchPaths: [],
    touchedPaths: []
  }
});

const makePolicy = (allowedTools: string[]) =>
  defaultAgentPolicy({
    maxSteps: 8,
    maxActionsPerTask: 4,
    maxRetriesPerTask: 2,
    maxReplans: 2,
    allowedTools
  });

const makeContext = (args: {
  outDir: string;
  callName: string;
  input: unknown;
  policyTools: string[];
  registry?: Record<string, ToolSpec<any>>;
}): ToolCallContext => {
  const state = makeState(args.outDir);
  const ctx = makeCtx(args.outDir);
  return {
    call: { name: args.callName, input: args.input },
    registry: args.registry ?? {},
    ctx,
    state,
    policy: makePolicy(args.policyTools)
  };
};

const okResult = (name: string): ToolCallResult => ({
  ok: true,
  note: "ok",
  touchedPaths: [],
  toolName: name
});

describe("tool middleware pipeline units", () => {
  test("runtimePaths middleware resolves and stores runtime paths", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "forgetauri-mw-runtimepaths-"));
    const context = makeContext({ outDir, callName: "tool_x", input: {}, policyTools: [] });

    await runtimePathsMiddleware(context, async (nextContext) => okResult(nextContext.call.name));

    expect(context.runtimePaths).toBeDefined();
    expect(context.ctx.memory.runtimePaths).toEqual(context.runtimePaths);
    expect(context.state.runtimePaths).toEqual(context.runtimePaths);
  });

  test("policy middleware short-circuits blocked tools", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "forgetauri-mw-policy-"));
    const context = makeContext({ outDir, callName: "tool_blocked", input: {}, policyTools: ["tool_allowed"] });
    let calledNext = false;

    const result = await policyMiddleware(context, async () => {
      calledNext = true;
      return okResult("tool_blocked");
    });

    expect(calledNext).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.note ?? "").toContain("blocked by policy");
  });

  test("schema middleware short-circuits invalid input", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "forgetauri-mw-schema-"));
    const context = makeContext({ outDir, callName: "tool_schema", input: { value: "bad" }, policyTools: ["tool_schema"] });
    context.tool = {
      name: "tool_schema",
      description: "schema",
      inputSchema: z.object({ value: z.number() }),
      inputJsonSchema: {},
      category: "low",
      capabilities: [],
      safety: { sideEffects: "none" },
      docs: "",
      run: async () => ({ ok: true, data: {} }),
      examples: []
    };
    let calledNext = false;

    const result = await schemaMiddleware(context, async () => {
      calledNext = true;
      return okResult("tool_schema");
    });

    expect(calledNext).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.note ?? "").toContain("expected number");
  });

  test("evidence middleware always writes tool_called/tool_returned pair", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "forgetauri-mw-evidence-"));
    const evidencePath = join(outDir, "run_evidence.jsonl");
    const logger = new EvidenceLogger({ filePath: evidencePath });
    const context = makeContext({ outDir, callName: "tool_throw", input: {}, policyTools: ["tool_throw"] });
    context.ctx.memory.evidenceLogger = logger;
    context.ctx.memory.evidenceRunId = "run-mw";
    context.ctx.memory.evidenceTurn = 1;
    context.ctx.memory.evidenceTaskId = "t1";

    const result = await evidenceMiddleware(context, async () => {
      throw new Error("middleware-next-fail");
    });
    await logger.close();

    const lines = (await readFile(evidencePath, "utf8"))
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as { event_type: string; ok?: boolean });

    expect(result.ok).toBe(false);
    expect(lines).toHaveLength(2);
    expect(lines[0]?.event_type).toBe("tool_called");
    expect(lines[1]).toMatchObject({ event_type: "tool_returned", ok: false });
  });

  test("acceptance gate middleware runs only for tool_verify_project and can fail the result", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "forgetauri-mw-accept-"));
    await writeFile(join(outDir, "run_evidence.jsonl"), "", "utf8");
    const context = makeContext({
      outDir,
      callName: "tool_verify_project",
      input: { projectRoot: outDir },
      policyTools: ["tool_verify_project"]
    });
    context.runtimePaths = {
      repoRoot: outDir.replace(/\\/g, "/"),
      appDir: `${outDir.replace(/\\/g, "/")}/generated/app`,
      tauriDir: `${outDir.replace(/\\/g, "/")}/generated/app/src-tauri`
    };
    context.ctx.memory.runtimePaths = context.runtimePaths;
    context.state.runtimePaths = context.runtimePaths;

    const result = await acceptanceGateMiddleware(context, async () => okResult("tool_verify_project"));

    expect(result.ok).toBe(false);
    expect(context.state.lastError?.code).toBe("VERIFY_ACCEPTANCE_FAILED");
  });
});
