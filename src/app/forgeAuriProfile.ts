import { defaultAgentPolicy, type AgentPolicy } from "./defaultPolicy.js";
import type { ToolSpec } from "../agent/tools/types.js";
import { AgentTurnAuditCollector } from "../core/agent/audit.js";

/**
 * ForgeAuri profile is the single assembly source for app-level defaults:
 * ports, audit collector, registry loading and policy construction.
 *
 * This is intentionally ForgeAuri-specific (Tauri v2 + React + Rust + SQLite).
 */
export const createForgeAuriProfile = <TLlm, TCommandRunner, TRegistryDeps = unknown>(args: {
  deps?: {
    llm?: TLlm;
    commandRunner?: TCommandRunner;
    audit?: AgentTurnAuditCollector;
    policy?: AgentPolicy;
    registry?: Record<string, ToolSpec<any>>;
  };
  resolveDefaultLlm: () => TLlm;
  resolveDefaultCommandRunner: () => TCommandRunner;
  createDefaultAudit: (goal: string) => AgentTurnAuditCollector;
  loadRegistryWithDocs: (registryDeps?: TRegistryDeps) => Promise<{ registry: Record<string, ToolSpec<any>> } | null>;
  createRegistry: (registryDeps?: TRegistryDeps) => Promise<Record<string, ToolSpec<any>>>;
}) => {
  const deps = args.deps;

  const resolvePorts = (overrides?: {
    llm?: TLlm;
    commandRunner?: TCommandRunner;
  }): { llm: TLlm; commandRunner: TCommandRunner } => ({
    llm: overrides?.llm ?? deps?.llm ?? args.resolveDefaultLlm(),
    commandRunner: overrides?.commandRunner ?? deps?.commandRunner ?? args.resolveDefaultCommandRunner()
  });

  const createAudit = (opts: {
    goal: string;
    auditOverride?: AgentTurnAuditCollector;
    useDepsAudit?: boolean;
  }): AgentTurnAuditCollector => {
    if (opts.auditOverride) return opts.auditOverride;
    if (opts.useDepsAudit && deps?.audit) return deps.audit;
    return args.createDefaultAudit(opts.goal);
  };

  const resolveRegistry = async (opts?: {
    registryOverride?: Record<string, ToolSpec<any>>;
    registryDeps?: TRegistryDeps;
  }): Promise<Record<string, ToolSpec<any>>> => {
    if (opts?.registryOverride) return opts.registryOverride;
    if (deps?.registry) return deps.registry;

    const discovered = await args.loadRegistryWithDocs(opts?.registryDeps);
    if (discovered?.registry) return discovered.registry;

    return args.createRegistry(opts?.registryDeps);
  };

  const buildPolicy = (opts: {
    maxTurns: number;
    maxToolCallsPerTurn: number;
    registryKeys: string[];
    overridePolicy?: AgentPolicy;
    useDepsPolicy?: boolean;
  }): AgentPolicy => {
    if (opts.overridePolicy) return opts.overridePolicy;
    if (opts.useDepsPolicy && deps?.policy) return deps.policy;

    return defaultAgentPolicy({
      maxSteps: opts.maxTurns,
      maxActionsPerTask: opts.maxToolCallsPerTurn,
      maxRetriesPerTask: 3,
      maxReplans: 3,
      allowedTools: opts.registryKeys
    });
  };

  return {
    resolvePorts,
    createAudit,
    resolveRegistry,
    buildPolicy
  };
};
