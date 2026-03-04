import type { AgentTurnAuditCollector } from "./audit.js";

export const recordPlanProposed = (args: {
  audit: AgentTurnAuditCollector;
  llmRaw: string;
  previousResponseIdSent?: string;
  responseId?: string;
  usage?: unknown;
  taskCount: number;
}): void => {
  args.audit.recordTurn({
    turn: 0,
    llmRaw: args.llmRaw,
    llmPreviousResponseId: args.previousResponseIdSent,
    llmResponseId: args.responseId,
    llmUsage: args.usage,
    toolCalls: [],
    toolResults: [],
    note: `plan_proposed tasks=${args.taskCount}`
  });
};

export const recordTaskActionPlan = (args: {
  audit: AgentTurnAuditCollector;
  turn: number;
  taskId: string;
  llmRaw: string;
  previousResponseIdSent?: string;
  responseId?: string;
  usage?: unknown;
  toolCalls: Array<{ name: string; input: unknown }>;
  toolResults: Array<{ name: string; ok: boolean; error?: string; touchedPaths?: string[] }>;
}): void => {
  args.audit.recordTurn({
    turn: args.turn,
    llmRaw: args.llmRaw,
    llmPreviousResponseId: args.previousResponseIdSent,
    llmResponseId: args.responseId,
    llmUsage: args.usage,
    toolCalls: args.toolCalls,
    toolResults: args.toolResults,
    note: `task=${args.taskId}`
  });
};

export const recordPlanChange = (args: {
  audit: AgentTurnAuditCollector;
  turn: number;
  llmRaw: string;
  previousResponseIdSent?: string;
  responseId?: string;
  usage?: unknown;
  gateResult: { status: "needs_user_review" | "denied"; reason: string };
}): void => {
  args.audit.recordTurn({
    turn: args.turn,
    llmRaw: args.llmRaw,
    llmPreviousResponseId: args.previousResponseIdSent,
    llmResponseId: args.responseId,
    llmUsage: args.usage,
    toolCalls: [],
    toolResults: [],
    note: `replan_gate=${args.gateResult.status}:${args.gateResult.reason}`
  });
};
