import { evaluateAcceptance, type EvaluationResult } from "../../agent/core/acceptance/engine.js";
import type { EvidenceEvent } from "../../agent/core/evidence/types.js";
import type { Intent } from "../../agent/core/acceptance/intent.js";
import type { WorkspaceSnapshot } from "../../agent/core/workspace/snapshot.js";
import type { ToolRunContext } from "../../agent/tools/types.js";
import type { AgentState } from "../../agent/types.js";
import { getRuntimePaths } from "../../core/runtime_paths/getRuntimePaths.js";

export const evaluateAcceptanceRuntime = (args: {
  goal: string;
  intent: Intent;
  ctx: ToolRunContext;
  state: AgentState;
  evidence: EvidenceEvent[];
  snapshot: WorkspaceSnapshot;
}): EvaluationResult => {
  const runtime = getRuntimePaths(args.ctx, args.state);
  return evaluateAcceptance({
    goal: args.goal,
    intent: args.intent,
    evidence: args.evidence,
    snapshot: args.snapshot,
    runtime
  });
};
