import { describe, expect, it } from "vitest";
import { runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import {
  normalizeRunAgentMaxSteps,
  runAgent,
  runAgentOnce,
  runAgentStep,
  runAgentToCompletion
} from "../../src/app/run-agent.ts";
import { runShellRuntimeLoop, runShellRuntimeStep } from "../../src/shell/run-shell-runtime.ts";
import {
  minimalAgentState,
  minimalPlan,
  minimalTasks
} from "../shared/minimal-runtime-fixtures.ts";

describe("run-agent", () => {
  it("runAgentStep matches runShellRuntimeStep behavior", () => {
    const step = runAgentStep({
      state: minimalAgentState,
      plan: minimalPlan,
      tasks: minimalTasks
    });
    const shellStep = runShellRuntimeStep(
      minimalAgentState,
      minimalPlan,
      minimalTasks,
      undefined
    );

    expect(step).toEqual(shellStep);
  });

  it("runAgent uses default maxSteps when undefined", () => {
    const output = runAgent({
      state: minimalAgentState,
      plan: minimalPlan,
      tasks: minimalTasks
    });
    const expected = runShellRuntimeLoop(
      minimalAgentState,
      minimalPlan,
      minimalTasks,
      10
    );

    expect(output.state).toEqual(expected);
  });

  it("runAgent respects explicit maxSteps", () => {
    const output = runAgent({
      state: minimalAgentState,
      plan: minimalPlan,
      tasks: minimalTasks,
      maxSteps: 1
    });
    const expected = runShellRuntimeLoop(
      minimalAgentState,
      minimalPlan,
      minimalTasks,
      1
    );

    expect(output.state).toEqual(expected);
  });

  it("runAgentOnce equals runShellRuntimeLoop(..., 1)", () => {
    const direct = runAgentOnce(minimalAgentState, minimalPlan, minimalTasks);
    const expected = runShellRuntimeLoop(
      minimalAgentState,
      minimalPlan,
      minimalTasks,
      1
    );

    expect(direct).toEqual(expected);
  });

  it("runAgentToCompletion equals runShellRuntimeLoop(..., 10)", () => {
    const direct = runAgentToCompletion(minimalAgentState, minimalPlan, minimalTasks);
    const expected = runShellRuntimeLoop(
      minimalAgentState,
      minimalPlan,
      minimalTasks,
      10
    );

    expect(direct).toEqual(expected);
  });

  it("normalizeRunAgentMaxSteps handles default, floor, and non-positive cases", () => {
    expect(normalizeRunAgentMaxSteps(undefined)).toBe(10);
    expect(normalizeRunAgentMaxSteps(0)).toBe(0);
    expect(normalizeRunAgentMaxSteps(-5)).toBe(0);
    expect(normalizeRunAgentMaxSteps(2.8)).toBe(2);
  });

  it("runAgentStep aligns with current runtime tick orchestration", () => {
    const step = runAgentStep({
      state: minimalAgentState,
      plan: minimalPlan,
      tasks: minimalTasks
    });

    const tick = runRuntimeTick(
      minimalAgentState,
      minimalPlan,
      minimalTasks,
      undefined
    );

    expect(step.tick).toEqual(tick);
  });
});
