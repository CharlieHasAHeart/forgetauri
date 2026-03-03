import { AgentTurnAuditCollector } from "../../core/agent/audit.js";
import { getProviderFromEnv } from "../../llm/index.js";
import type { LlmProvider } from "../../llm/provider.js";
import { runCmd, type CmdResult } from "../../runner/runCmd.js";
import { runAgent as runCoreAgent } from "../../core/agent/runAgent.js";
import { type AgentPolicy } from "../../core/agent/policy/policy.js";
import { createToolRegistry, loadToolRegistryWithDocs } from "../tools/registry.js";
import type { ToolSpec } from "../tools/types.js";
import type { AgentState } from "../types.js";
import type { HumanReviewFn, PlanChangeReviewFn } from "../../core/agent/contracts.js";
import type { AgentEvent } from "../../core/agent/events.js";
import { createForgeAuriProfile } from "../../app/forgeAuriProfile.js";

export const runAgent = async (args: {
  goal: string;
  specPath: string;
  outDir: string;
  apply: boolean;
  verify: boolean;
  repair: boolean;
  policy?: AgentPolicy;
  maxTurns?: number;
  maxToolCallsPerTurn?: number;
  maxPatches?: number;
  truncation?: "auto" | "disabled";
  compactionThreshold?: number;
  provider?: LlmProvider;
  runCmdImpl?: (cmd: string, argv: string[], cwd: string) => Promise<CmdResult>;
  registry?: Record<string, ToolSpec<any>>;
  registryDeps?: Parameters<typeof createToolRegistry>[0];
  humanReview?: HumanReviewFn;
  requestPlanChangeReview?: PlanChangeReviewFn;
  onEvent?: (event: AgentEvent) => void;
}): Promise<{ ok: boolean; summary: string; auditPath?: string; patchPaths?: string[]; state: AgentState }> => {
  const profile = createForgeAuriProfile<
    LlmProvider,
    (cmd: string, argv: string[], cwd: string) => Promise<CmdResult>,
    Parameters<typeof createToolRegistry>[0]
  >({
    resolveDefaultLlm: () => getProviderFromEnv(),
    resolveDefaultCommandRunner: () => runCmd,
    createDefaultAudit: (goal) => new AgentTurnAuditCollector(goal),
    loadRegistryWithDocs: (registryDeps) => loadToolRegistryWithDocs(registryDeps),
    createRegistry: (registryDeps) => createToolRegistry(registryDeps)
  });

  const { llm: provider, commandRunner: runCmdImpl } = profile.resolvePorts({
    llm: args.provider,
    commandRunner: args.runCmdImpl
  });
  const maxTurns = args.maxTurns ?? 16;
  const maxToolCallsPerTurn = args.maxToolCallsPerTurn ?? 4;
  const maxPatches = args.maxPatches ?? 8;
  const registry = await profile.resolveRegistry({
    registryOverride: args.registry,
    registryDeps: args.registryDeps
  });
  const policy = profile.buildPolicy({
    maxTurns,
    maxToolCallsPerTurn,
    registryKeys: Object.keys(registry),
    overridePolicy: args.policy
  });

  const modelHint =
    provider.name === "dashscope_responses"
      ? process.env.DASHSCOPE_MODEL
      : provider.name === "openai_responses"
        ? process.env.OPENAI_MODEL
        : undefined;

  const reviewPort =
    args.humanReview || args.requestPlanChangeReview
      ? {
          humanReview: args.humanReview,
          requestPlanChangeReview: args.requestPlanChangeReview
        }
      : undefined;

  return runCoreAgent({
    goal: args.goal,
    specPath: args.specPath,
    outDir: args.outDir,
    apply: args.apply,
    verify: args.verify,
    repair: args.repair,
    maxTurns,
    maxToolCallsPerTurn,
    maxPatches,
    truncation: args.truncation,
    compactionThreshold: args.compactionThreshold,
    policy,
    registry,
    llm: provider,
    commandRunner: runCmdImpl,
    audit: profile.createAudit({ goal: args.goal }),
    humanReview: reviewPort,
    modelHint,
    runtimeRepoRoot: process.cwd(),
    onEvent: args.onEvent
  });
};
