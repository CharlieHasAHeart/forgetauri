import type { AgentPolicy } from "../../contracts/policy.js";
import type { AgentState } from "../../contracts/state.js";
import type { ToolSpec } from "../../contracts/tools.js";
import type { Workspace } from "../../contracts/workspace.js";

const truncate = (value: string, max: number): string => (value.length > max ? `${value.slice(0, max)}...<truncated>` : value);

export const buildProjectSnapshot = (args: {
  state: AgentState;
  policy: AgentPolicy;
  workspace: Workspace;
  registry: Record<string, ToolSpec<any>>;
  maxChars: number;
}): string => {
  const content = JSON.stringify(
    {
      workspace: {
        root: args.workspace.root,
        runDir: args.workspace.runDir,
        paths: args.workspace.paths
      },
      state: {
        status: args.state.status,
        currentTaskId: args.state.currentTaskId,
        appDir: args.state.appDir,
        runtimePaths: args.state.runtimePaths,
        usedTurns: args.state.budgets.usedTurns,
        maxTurns: args.state.budgets.maxTurns
      },
      policy: {
        acceptanceLocked: args.policy.acceptance.locked,
        techStackLocked: args.policy.tech_stack_locked,
        allowedTools: args.policy.safety.allowed_tools,
        allowedCommands: args.policy.safety.allowed_commands
      },
      registryKeys: Object.keys(args.registry).sort()
    },
    null,
    2
  );
  return truncate(content, args.maxChars);
};
