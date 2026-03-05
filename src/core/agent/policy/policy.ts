import type { AgentPolicy } from "../../contracts/policy.js";

export type { AgentPolicy };

export const defaultAgentPolicy = (args: {
  maxSteps: number;
  maxActionsPerTask: number;
  maxRetriesPerTask: number;
  maxReplans: number;
  allowedTools: string[];
}): AgentPolicy => ({
  tech_stack: {
    app: "desktop",
    frontend: "react+ts",
    backend: "tauri+rust",
    database: "sqlite+rusqlite"
  },
  tech_stack_locked: true,
  acceptance: {
    locked: true,
    criteria: []
  },
  safety: {
    allowed_tools: Array.from(
      new Set(
        [...args.allowedTools, "apply_structured_edits"].filter(
          (name) => name !== "write_file" && name !== "edit_file" && name !== "delete_file"
        )
      )
    ).sort((a, b) => a.localeCompare(b)),
    allowed_commands: ["pnpm", "cargo", "node", "tauri"]
  },
  budgets: {
    max_steps: args.maxSteps,
    max_actions_per_task: args.maxActionsPerTask,
    max_retries_per_task: args.maxRetriesPerTask,
    max_replans: args.maxReplans
  },
  userExplicitlyAllowedRelaxAcceptance: false
});
