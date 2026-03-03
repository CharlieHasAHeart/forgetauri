import type { AgentEvent } from "../core/agent/events.js";
import type { ToolSpec } from "../agent/tools/types.js";
import { getLlmAdapterFromEnv } from "../adapters/llm/index.js";
import { NodeCommandRunner } from "../adapters/command/NodeCommandRunner.js";
import { FileAuditAdapter } from "../adapters/audit/FileAuditAdapter.js";
import { runAgent as runCoreAgent } from "../core/agent/runAgent.js";
import type { AgentPolicy } from "./defaultPolicy.js";
import { createDefaultRegistry, loadDefaultRegistryWithDocs } from "./defaultRegistry.js";
import type { HumanReviewPort } from "../ports/HumanReviewPort.js";
import type { LlmPort } from "../ports/LlmPort.js";
import type { CommandRunnerPort } from "../ports/CommandRunnerPort.js";
import type { AgentTurnAuditCollector } from "../core/agent/audit.js";
import { createForgeAuriProfile } from "./forgeAuriProfile.js";

export type CreateAgentAppDeps = {
  llm?: LlmPort;
  commandRunner?: CommandRunnerPort;
  audit?: AgentTurnAuditCollector;
  policy?: AgentPolicy;
  registry?: Record<string, ToolSpec<any>>;
};

export const createAgentApp = (deps?: CreateAgentAppDeps) => {
  const profile = createForgeAuriProfile<LlmPort, CommandRunnerPort>({
    deps,
    resolveDefaultLlm: () => getLlmAdapterFromEnv(),
    resolveDefaultCommandRunner: () => NodeCommandRunner,
    createDefaultAudit: () => new FileAuditAdapter("agent"),
    loadRegistryWithDocs: () => loadDefaultRegistryWithDocs(),
    createRegistry: () => createDefaultRegistry()
  });

  const { llm, commandRunner } = profile.resolvePorts();
  const audit = profile.createAudit({ goal: "agent", useDepsAudit: true });

  const runAgent = async (args: {
    goal: string;
    specPath: string;
    outDir: string;
    apply: boolean;
    verify: boolean;
    repair: boolean;
    maxTurns?: number;
    maxToolCallsPerTurn?: number;
    maxPatches?: number;
    policy?: AgentPolicy;
    truncation?: "auto" | "disabled";
    compactionThreshold?: number;
    humanReview?: HumanReviewPort;
    onEvent?: (event: AgentEvent) => void;
  }) => {
    const maxTurns = args.maxTurns ?? 16;
    const maxToolCallsPerTurn = args.maxToolCallsPerTurn ?? 4;
    const maxPatches = args.maxPatches ?? 8;
    const registry = await profile.resolveRegistry();
    const policy = profile.buildPolicy({
      maxTurns,
      maxToolCallsPerTurn,
      registryKeys: Object.keys(registry),
      overridePolicy: args.policy,
      useDepsPolicy: true
    });

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
      llm,
      commandRunner,
      audit,
      humanReview: args.humanReview,
      onEvent: args.onEvent
    });
  };

  return {
    runAgent
  };
};
