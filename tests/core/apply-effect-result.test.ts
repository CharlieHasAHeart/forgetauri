import { describe, expect, it } from "vitest";
import { type EffectResult } from "../../src/protocol/index.ts";
import { applyEffectResult } from "../../src/core/apply-effect-result.ts";
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

  it("handles review_result continue by allowing progression", () => {
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

    expect(next).toMatchObject({
      status: "running",
      currentTaskId: undefined,
      lastEffectResultKind: "review_result"
    });
  });

  it("handles review_result repair without collapsing to success", () => {
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
  });

  it("handles review_result replan without collapsing to success", () => {
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
  });

  it("handles review_result stop as explicit terminal-style failure path", () => {
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
  });
});
