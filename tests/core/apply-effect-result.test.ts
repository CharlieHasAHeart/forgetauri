import { describe, expect, it } from "vitest";
import { type EffectResult } from "../../src/protocol/index.ts";
import {
  applyEffectResult,
  resolveReviewRuntimeSignal
} from "../../src/core/apply-effect-result.ts";
import { makeAgentState } from "../shared/minimal-runtime-fixtures.ts";

describe("applyEffectResult", () => {
  it("handles successful action_results by clearing current task", () => {
    const state = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const result: EffectResult = {
      kind: "action_results",
      success: true,
      payload: { count: 1, results: [] }
    };

    const next = applyEffectResult(state, result);

    expect(next).toMatchObject({
      status: "running",
      currentTaskId: undefined,
      lastEffectResultKind: "action_results"
    });
  });

  it("handles non-terminal failed action_results without forcing run-level failure", () => {
    const state = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const result: EffectResult = {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "command_failed"
      },
      payload: { count: 1, results: [] }
    };

    const next = applyEffectResult(state, result);

    expect(next).toMatchObject({
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "action_results",
      failure: {
        category: "action",
        source: "shell",
        terminal: false,
        message: "command_failed"
      }
    });
  });

  it("handles terminal failed action_results as run-level failure", () => {
    const state = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const result: EffectResult = {
      kind: "action_results",
      success: false,
      failure_signal: {
        category: "runtime",
        source: "shell",
        terminal: true,
        summary: "terminal action failure"
      },
      payload: { count: 1, results: [] }
    };

    const next = applyEffectResult(state, result);

    expect(next).toMatchObject({
      status: "failed",
      currentTaskId: "task-1",
      lastEffectResultKind: "action_results",
      failure: {
        category: "runtime",
        source: "shell",
        terminal: true,
        summary: "terminal action failure"
      }
    });
  });

  it("handles review_result continue as explicit continue runtime signal", () => {
    const state = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const result: EffectResult = {
      kind: "review_result",
      success: true,
      payload: {
        decision: "approved",
        next_action: "continue"
      }
    };

    const next = applyEffectResult(state, result);
    const signal = resolveReviewRuntimeSignal(result);

    expect(next).toMatchObject({
      status: "running",
      currentTaskId: undefined,
      lastEffectResultKind: "review_result"
    });
    expect(signal).toBe("continue");
  });

  it("handles review_result repair as explicit hold-for-repair runtime signal", () => {
    const state = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const result: EffectResult = {
      kind: "review_result",
      success: false,
      failure_signal: {
        category: "review",
        source: "shell",
        terminal: false,
        summary: "repair requested"
      },
      payload: {
        decision: "changes_requested",
        next_action: "repair"
      }
    };

    const next = applyEffectResult(state, result);
    const signal = resolveReviewRuntimeSignal(result);

    expect(next).toMatchObject({
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "review_result",
      failure: {
        category: "review",
        source: "shell",
        terminal: false,
        summary: "repair requested"
      }
    });
    expect(signal).toBe("hold_for_repair");
  });

  it("handles review_result replan as explicit hold-for-replan runtime signal", () => {
    const state = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const result: EffectResult = {
      kind: "review_result",
      success: false,
      failure_signal: {
        category: "review",
        source: "shell",
        terminal: false,
        summary: "replan requested"
      },
      payload: {
        decision: "changes_requested",
        next_action: "replan"
      }
    };

    const next = applyEffectResult(state, result);
    const signal = resolveReviewRuntimeSignal(result);

    expect(next).toMatchObject({
      status: "running",
      currentTaskId: "task-1",
      lastEffectResultKind: "review_result",
      failure: {
        category: "review",
        source: "shell",
        terminal: false,
        summary: "replan requested"
      }
    });
    expect(signal).toBe("hold_for_replan");
  });

  it("handles review_result stop as review-rejected run-level terminal runtime signal", () => {
    const state = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const result: EffectResult = {
      kind: "review_result",
      success: false,
      failure_signal: {
        category: "review",
        source: "shell",
        terminal: true,
        summary: "stop requested"
      },
      payload: {
        decision: "changes_requested",
        next_action: "stop"
      }
    };

    const next = applyEffectResult(state, result);
    const signal = resolveReviewRuntimeSignal(result);

    expect(next).toMatchObject({
      status: "failed",
      currentTaskId: "task-1",
      lastEffectResultKind: "review_result",
      failure: {
        category: "review",
        source: "shell",
        terminal: true,
        summary: "stop requested"
      }
    });
    expect(signal).toBe("review_rejected_run_terminal");
  });

  it("preserves minimal recovery-failure evidence when repair recovery fails", () => {
    const state = makeAgentState({ status: "running", currentTaskId: "task-1" });
    const result: EffectResult = {
      kind: "repair_recovery",
      success: false,
      payload: {
        status: "failed",
        summary: "repair failed"
      }
    };

    const next = applyEffectResult(state, result);

    expect(next).toMatchObject({
      status: "running",
      failure: {
        category: "runtime",
        source: "core",
        terminal: false,
        evidence_refs: [
          {
            kind: "recovery",
            source: "core",
            outcome: "repair_failed"
          }
        ]
      }
    });
  });
});
