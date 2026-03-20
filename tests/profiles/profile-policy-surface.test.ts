import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import {
  type Action,
  type EffectResult
} from "../../src/protocol/index.ts";
import {
  DEFAULT_PROFILE,
  resetActiveAgentProfile,
  setActiveAgentProfile
} from "../../src/profiles/default-profile.ts";
import { STRICT_PROFILE } from "../../src/profiles/strict-profile.ts";
import { buildActionResult } from "../../src/shell/build-action-result.ts";
import {
  resetCapabilityWorkspaceFiles,
  setupCapabilityWorkspace,
  teardownCapabilityWorkspace,
  type CapabilityWorkspace
} from "../shared/capability-workspace-fixture.ts";
import {
  makeAgentState,
  makePlan,
  makeTask
} from "../shared/minimal-runtime-fixtures.ts";

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

describe("profile as real policy surface", () => {
  let workspace: CapabilityWorkspace;

  beforeAll(() => {
    workspace = setupCapabilityWorkspace();
  });

  beforeEach(() => {
    resetCapabilityWorkspaceFiles(workspace);
    resetActiveAgentProfile();
  });

  afterAll(() => {
    resetActiveAgentProfile();
    teardownCapabilityWorkspace(workspace);
  });

  it("drives capability policy from profile (default allows, strict refuses same action)", () => {
    const action = buildCapabilityAction(workspace);

    setActiveAgentProfile(DEFAULT_PROFILE);
    const defaultResult = buildActionResult(action);

    setActiveAgentProfile(STRICT_PROFILE);
    const strictResult = buildActionResult(action);

    expect(defaultResult).toMatchObject({
      status: "succeeded"
    });
    expect(strictResult).toMatchObject({
      status: "failed",
      errorMessage: "path_outside_boundary",
      output: {
        policy_violation: {
          code: "path_outside_boundary"
        }
      }
    });
  });

  it("drives review routing rule from profile (default tagged_only vs strict always)", () => {
    const state = makeAgentState();
    const plan = makePlan({ taskIds: ["task-1"] });
    const task = makeTask({ id: "task-1", summary: "plain task without review tag" });

    setActiveAgentProfile(DEFAULT_PROFILE);
    const defaultTick = runRuntimeTick(state, plan, [task], undefined);

    setActiveAgentProfile(STRICT_PROFILE);
    const strictTick = runRuntimeTick(state, plan, [task], undefined);

    expect(defaultTick.request?.kind).toBe("execute_actions");
    expect(strictTick.request?.kind).toBe("run_review");
  });

  it("can disable specific escalation rule via profile without changing core semantics", () => {
    const noFindEscalationProfile = {
      ...DEFAULT_PROFILE,
      reviewPolicy: {
        ...DEFAULT_PROFILE.reviewPolicy,
        escalation: {
          ...DEFAULT_PROFILE.reviewPolicy.escalation,
          findTextNotFound: false
        }
      }
    };
    const state = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const plan = makePlan({ taskIds: ["task-1"] });
    const task = makeTask({ id: "task-1" });
    const findMissFailure: EffectResult = {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "execution_failed: find_text not found in docs/notes.md"
      },
      payload: {
        count: 1,
        results: []
      }
    };

    setActiveAgentProfile(DEFAULT_PROFILE);
    const defaultTick = runRuntimeTick(state, plan, [task], findMissFailure);

    setActiveAgentProfile(noFindEscalationProfile);
    const noEscalationTick = runRuntimeTick(state, plan, [task], findMissFailure);

    expect(defaultTick.request?.kind).toBe("run_review");
    expect(noEscalationTick.request).toBeUndefined();
    expect(noEscalationTick.tickSummary).toMatchObject({
      progression: "hold_current_task",
      holdReason: "non_terminal_failure"
    });
  });

  it("preserves core profile-agnostic semantics for identical review_result input", () => {
    const state = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const plan = makePlan({ taskIds: ["task-1"] });
    const task = makeTask({ id: "task-1" });
    const reviewStop: EffectResult = {
      kind: "review_result",
      success: false,
      payload: {
        decision: "changes_requested",
        next_action: "stop"
      }
    };

    setActiveAgentProfile(DEFAULT_PROFILE);
    const defaultTick = runRuntimeTick(state, plan, [task], reviewStop);

    setActiveAgentProfile(STRICT_PROFILE);
    const strictTick = runRuntimeTick(state, plan, [task], reviewStop);

    expect(defaultTick.state.status).toBe("failed");
    expect(strictTick.state.status).toBe("failed");
    expect(defaultTick.tickSummary).toMatchObject({
      progression: "terminal",
      resultKind: "review_result"
    });
    expect(strictTick.tickSummary).toMatchObject({
      progression: "terminal",
      resultKind: "review_result"
    });
  });

  it("supports strict profile allowed path/type as configured", () => {
    mkdirSync("docs/restricted", { recursive: true });
    writeFileSync("docs/restricted/notes.txt", "before-one", "utf8");

    setActiveAgentProfile(STRICT_PROFILE);
    const result = buildActionResult(
      buildCapabilityAction(workspace, {
        input: {
          target_path: "docs/restricted/notes.txt",
          change: {
            kind: "replace_text",
            find_text: "before-one",
            replace_text: "after-one"
          }
        }
      })
    );

    expect(result).toMatchObject({
      status: "succeeded"
    });
  });
});

