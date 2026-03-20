import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readCoreRuntimeSummary } from "../../src/core/apply-runtime-step-result.ts";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import {
  type Action,
  type AgentState,
  type EffectRequest,
  type EffectResult
} from "../../src/protocol/index.ts";
import { executeShellRuntimeRequest } from "../../src/shell/execute-shell-runtime-request.ts";
import {
  minimalAgentState,
  minimalPlan,
  minimalTasks
} from "../shared/minimal-runtime-fixtures.ts";
import {
  resetCapabilityWorkspaceFiles,
  setupCapabilityWorkspace,
  teardownCapabilityWorkspace,
  type CapabilityWorkspace
} from "../shared/capability-workspace-fixture.ts";

function buildCapabilityAction(
  workspace: CapabilityWorkspace,
  overrides: Partial<Action> = {}
): Action {
  return {
    kind: "capability",
    name: "controlled_single_file_text_modification",
    input: {
      target_path: workspace.primaryTargetPath,
      change: {
        kind: "replace_text",
        find_text: "before-one",
        replace_text: "after-one"
      }
    },
    ...overrides
  };
}

function buildExecuteActionsRequest(action: Action): EffectRequest {
  return {
    kind: "execute_actions",
    payload: {
      actions: [action]
    }
  };
}

function bootstrapRuntimeContext() {
  const firstTick = runRuntimeTick(minimalAgentState, minimalPlan, minimalTasks, undefined);
  expect(firstTick.state.status).toBe("running");
  expect(firstTick.request?.kind).toBe("execute_actions");
  expect(firstTick.tickSummary).toMatchObject({
    progression: "continueable",
    requestKind: "execute_actions"
  });

  return firstTick;
}

function executeRealCapabilityFromState(
  state: AgentState,
  workspace: CapabilityWorkspace,
  actionOverrides: Partial<Action> = {}
) {
  const request = buildExecuteActionsRequest(buildCapabilityAction(workspace, actionOverrides));
  const shellResult = executeShellRuntimeRequest(request);
  expect(shellResult).toBeDefined();
  expect(shellResult?.kind).toBe("action_results");

  const absorbedTick = runRuntimeTick(state, minimalPlan, minimalTasks, shellResult);
  return { request, shellResult, absorbedTick };
}

describe("kernel validation e2e - real capability path", () => {
  let workspace: CapabilityWorkspace;

  beforeAll(() => {
    workspace = setupCapabilityWorkspace();
  });

  beforeEach(() => {
    resetCapabilityWorkspaceFiles(workspace);
  });

  afterAll(() => {
    teardownCapabilityWorkspace(workspace);
  });

  it("covers real execution success with coherent runtimeSummary and aligned request/result path", () => {
    const bootstrap = bootstrapRuntimeContext();
    const { request, shellResult, absorbedTick } = executeRealCapabilityFromState(
      bootstrap.state,
      workspace
    );

    expect(request.kind).toBe("execute_actions");
    expect(shellResult).toMatchObject({
      kind: "action_results",
      success: true,
      payload: {
        count: 1
      }
    });
    expect(readFileSync(workspace.primaryTargetPath, "utf8")).toContain("after-one");

    expect(absorbedTick.state.status).toBe("running");
    expect(absorbedTick.request?.kind).toBe("execute_actions");
    expect(absorbedTick.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "continue",
      resultKind: "action_results",
      requestKind: "execute_actions"
    });
    expect(absorbedTick.tickSummary.holdReason).toBeUndefined();
    expect(absorbedTick.tickSummary.orchestration).toBeUndefined();
    expect(absorbedTick.tickSummary.failureSummary).toBeUndefined();

    const runtimeSummary = readCoreRuntimeSummary(absorbedTick.state);
    expect(runtimeSummary).toMatchObject({
      progression: "continueable",
      signal: "continue",
      resultKind: "action_results",
      requestKind: "execute_actions"
    });
    expect(runtimeSummary?.holdReason).toBeUndefined();
    expect(runtimeSummary?.orchestration).toBeUndefined();
    expect(runtimeSummary?.failureSummary).toBeUndefined();
  });

  it("covers real execution non-terminal failure for target file missing", () => {
    const bootstrap = bootstrapRuntimeContext();
    const { shellResult, absorbedTick } = executeRealCapabilityFromState(bootstrap.state, workspace, {
      input: {
        target_path: "docs/missing.md",
        change: {
          kind: "replace_text",
          find_text: "old",
          replace_text: "new"
        }
      }
    });

    expect(shellResult).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "execution_failed: target file not found (docs/missing.md)"
      }
    });

    expect(absorbedTick.state.status).toBe("running");
    expect(absorbedTick.request).toBeUndefined();
    expect(absorbedTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_because_non_terminal_failure",
      holdReason: "non_terminal_failure",
      orchestration: undefined,
      resultKind: "action_results",
      requestKind: undefined,
      failureSummary: "1 action(s) failed"
    });

    const runtimeSummary = readCoreRuntimeSummary(absorbedTick.state);
    expect(runtimeSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_because_non_terminal_failure",
      holdReason: "non_terminal_failure",
      resultKind: "action_results",
      failureSummary: "1 action(s) failed"
    });
    expect(runtimeSummary?.orchestration).toBeUndefined();
    expect(runtimeSummary?.requestKind).toBeUndefined();
  });

  it("covers find_text miss escalation into review control path", () => {
    const bootstrap = bootstrapRuntimeContext();
    const { shellResult, absorbedTick } = executeRealCapabilityFromState(bootstrap.state, workspace, {
      input: {
        target_path: workspace.primaryTargetPath,
        change: {
          kind: "replace_text",
          find_text: "not-present",
          replace_text: "new"
        }
      }
    });

    expect(shellResult).toMatchObject({
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: `execution_failed: find_text not found in ${workspace.primaryTargetPath}`
      }
    });

    expect(absorbedTick.state.status).toBe("running");
    expect(absorbedTick.request?.kind).toBe("run_review");
    expect(absorbedTick.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "review_required",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "action_results",
      requestKind: "run_review",
      failureSummary: "1 action(s) failed"
    });
  });

  it("preserves terminal failure semantics after real execution context", () => {
    const bootstrap = bootstrapRuntimeContext();
    const { absorbedTick } = executeRealCapabilityFromState(bootstrap.state, workspace);

    const terminalResult: EffectResult = {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "runtime",
        source: "shell",
        terminal: true,
        summary: "forced terminal failure for kernel validation"
      },
      payload: {
        results: [],
        count: 0
      }
    };

    const terminalTick = runRuntimeTick(
      absorbedTick.state,
      minimalPlan,
      minimalTasks,
      terminalResult
    );

    expect(terminalTick.state.status).toBe("failed");
    expect(terminalTick.request).toBeUndefined();
    expect(terminalTick.tickSummary).toMatchObject({
      progression: "terminal",
      signal: "terminal_failure",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "action_results",
      requestKind: undefined,
      failureSummary: "forced terminal failure for kernel validation"
    });
    const terminalSummary = readCoreRuntimeSummary(terminalTick.state);
    expect(terminalSummary?.signal).toBe("terminal_failure");
  });

  it("preserves review continue semantics after real execution", () => {
    const bootstrap = bootstrapRuntimeContext();
    const { absorbedTick } = executeRealCapabilityFromState(bootstrap.state, workspace);

    const reviewContinue: EffectResult = {
      kind: "review_result",
      success: true,
      payload: {
        decision: "approved",
        next_action: "continue"
      }
    };

    const continueTick = runRuntimeTick(
      absorbedTick.state,
      minimalPlan,
      minimalTasks,
      reviewContinue
    );

    expect(continueTick.state.status).toBe("running");
    expect(continueTick.request?.kind).toBe("execute_actions");
    expect(continueTick.tickSummary).toMatchObject({
      progression: "continueable",
      signal: "continue",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "review_result",
      requestKind: "execute_actions"
    });
    expect(readCoreRuntimeSummary(continueTick.state)?.signal).toBe("continue");
  });

  it("preserves review repair waiting semantics after real execution", () => {
    const bootstrap = bootstrapRuntimeContext();
    const { absorbedTick } = executeRealCapabilityFromState(bootstrap.state, workspace);

    const reviewRepair: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "repair"
      }
    };

    const repairTick = runRuntimeTick(absorbedTick.state, minimalPlan, minimalTasks, reviewRepair);

    expect(repairTick.state.status).toBe("running");
    expect(repairTick.request).toBeUndefined();
    expect(repairTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_repair",
      holdReason: "repair",
      orchestration: "waiting_for_repair",
      resultKind: "review_result",
      requestKind: undefined,
      failureSummary: "review_result requested repair"
    });
    expect(readCoreRuntimeSummary(repairTick.state)?.signal).toBe("hold_for_repair");
  });

  it("preserves review replan waiting semantics after real execution", () => {
    const bootstrap = bootstrapRuntimeContext();
    const { absorbedTick } = executeRealCapabilityFromState(bootstrap.state, workspace);

    const reviewReplan: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "replan"
      }
    };

    const replanTick = runRuntimeTick(absorbedTick.state, minimalPlan, minimalTasks, reviewReplan);

    expect(replanTick.state.status).toBe("running");
    expect(replanTick.request).toBeUndefined();
    expect(replanTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      signal: "hold_for_replan",
      holdReason: "replan",
      orchestration: "waiting_for_replan",
      resultKind: "review_result",
      requestKind: undefined,
      failureSummary: "review_result requested replan"
    });
    expect(readCoreRuntimeSummary(replanTick.state)?.signal).toBe("hold_for_replan");
  });

  it("preserves review stop terminal semantics after real execution", () => {
    const bootstrap = bootstrapRuntimeContext();
    const { absorbedTick } = executeRealCapabilityFromState(bootstrap.state, workspace);

    const reviewStop: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "stop"
      }
    };

    const stopTick = runRuntimeTick(absorbedTick.state, minimalPlan, minimalTasks, reviewStop);

    expect(stopTick.state.status).toBe("failed");
    expect(stopTick.request).toBeUndefined();
    expect(stopTick.tickSummary).toMatchObject({
      progression: "terminal",
      signal: "review_rejected_run_terminal",
      holdReason: undefined,
      orchestration: undefined,
      resultKind: "review_result",
      requestKind: undefined,
      failureSummary: "review_result requested stop (review_rejected_run_terminal)"
    });
    expect(readCoreRuntimeSummary(stopTick.state)?.signal).toBe(
      "review_rejected_run_terminal"
    );
  });
});
