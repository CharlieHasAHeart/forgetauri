import { describe, expect, it } from "vitest";
import { prepareRuntimeStepState } from "../../src/core/prepare-runtime-step-state.ts";
import { prepareRuntimeTickState, runRuntimeTick } from "../../src/core/run-runtime-tick.ts";
import {
  makeAgentState,
  minimalAgentState,
  minimalPlan,
  minimalTasks
} from "../shared/minimal-runtime-fixtures.ts";

describe("prepareRuntimeStepState", () => {
  it("returns clone-equivalent state for terminal input", () => {
    const terminalState = makeAgentState({ status: "done" });

    const result = prepareRuntimeStepState(terminalState, minimalPlan, minimalTasks);

    expect(result).toEqual(terminalState);
    expect(result).not.toBe(terminalState);
  });

  it("preserves current driveCoreRun behavior for runnable input", () => {
    const result = prepareRuntimeStepState(minimalAgentState, minimalPlan, minimalTasks);

    expect(result).toMatchObject({
      status: "running",
      currentTaskId: "task-1"
    });
  });

  it("matches prepareRuntimeTickState behavior", () => {
    const direct = prepareRuntimeStepState(minimalAgentState, minimalPlan, minimalTasks);
    const viaTick = prepareRuntimeTickState(minimalAgentState, minimalPlan, minimalTasks);

    expect(direct).toEqual(viaTick);
  });

  it("matches runRuntimeTick state in no incoming result scenario", () => {
    const direct = prepareRuntimeStepState(minimalAgentState, minimalPlan, minimalTasks);
    const tick = runRuntimeTick(minimalAgentState, minimalPlan, minimalTasks, undefined);

    expect(tick.state).toEqual(direct);
  });
});
