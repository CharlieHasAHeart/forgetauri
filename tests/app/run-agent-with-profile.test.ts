import { describe, expect, it } from "vitest";
import {
  runAgent,
  runAgentOnce,
  runAgentToCompletion
} from "../../src/app/run-agent.ts";
import {
  runAgentToProfileCompletion,
  runAgentWithDefaultProfile,
  runAgentWithProfile
} from "../../src/app/run-agent-with-profile.ts";
import { DEFAULT_PROFILE } from "../../src/profiles/default-profile.ts";
import {
  minimalAgentState,
  minimalPlan,
  minimalTasks
} from "../shared/minimal-runtime-fixtures.ts";

describe("run-agent-with-profile", () => {
  it("runAgentWithProfile matches default behavior when profile is omitted", () => {
    const output = runAgentWithProfile({
      state: minimalAgentState,
      plan: minimalPlan,
      tasks: minimalTasks
    });
    const expected = runAgent({
      state: minimalAgentState,
      plan: minimalPlan,
      tasks: minimalTasks
    });

    expect(output.state).toEqual(expected.state);
  });

  it("runAgentWithDefaultProfile equals runAgentWithProfile without explicit profile", () => {
    const output = runAgentWithDefaultProfile(
      minimalAgentState,
      minimalPlan,
      minimalTasks
    );
    const expected = runAgentWithProfile({
      state: minimalAgentState,
      plan: minimalPlan,
      tasks: minimalTasks
    });

    expect(output.state).toEqual(expected.state);
  });

  it("returns original state when shell execution is not allowed", () => {
    const output = runAgentWithProfile({
      state: minimalAgentState,
      plan: minimalPlan,
      tasks: minimalTasks,
      profile: {
        ...DEFAULT_PROFILE,
        allowShellExecution: false
      }
    });

    expect(output.state).toBe(minimalAgentState);
  });

  it("autoRunToCompletion=true matches runAgent behavior", () => {
    const output = runAgentWithProfile({
      state: minimalAgentState,
      plan: minimalPlan,
      tasks: minimalTasks,
      profile: {
        ...DEFAULT_PROFILE,
        autoRunToCompletion: true
      }
    });
    const expected = runAgent({
      state: minimalAgentState,
      plan: minimalPlan,
      tasks: minimalTasks
    });

    expect(output.state).toEqual(expected.state);
  });

  it("autoRunToCompletion=false matches runAgentOnce behavior", () => {
    const output = runAgentWithProfile({
      state: minimalAgentState,
      plan: minimalPlan,
      tasks: minimalTasks,
      profile: {
        ...DEFAULT_PROFILE,
        autoRunToCompletion: false
      }
    });
    const expected = runAgentOnce(minimalAgentState, minimalPlan, minimalTasks);

    expect(output.state).toEqual(expected);
  });

  it("runAgentToProfileCompletion returns original state when shell execution is blocked", () => {
    const output = runAgentToProfileCompletion(
      minimalAgentState,
      minimalPlan,
      minimalTasks,
      {
        ...DEFAULT_PROFILE,
        allowShellExecution: false
      }
    );

    expect(output).toBe(minimalAgentState);
  });

  it("runAgentToProfileCompletion matches runAgentToCompletion when auto-run is enabled", () => {
    const output = runAgentToProfileCompletion(
      minimalAgentState,
      minimalPlan,
      minimalTasks,
      {
        ...DEFAULT_PROFILE,
        autoRunToCompletion: true
      }
    );
    const expected = runAgentToCompletion(
      minimalAgentState,
      minimalPlan,
      minimalTasks
    );

    expect(output).toEqual(expected);
  });

  it("runAgentToProfileCompletion matches runAgentOnce when auto-run is disabled", () => {
    const output = runAgentToProfileCompletion(
      minimalAgentState,
      minimalPlan,
      minimalTasks,
      {
        ...DEFAULT_PROFILE,
        autoRunToCompletion: false
      }
    );
    const expected = runAgentOnce(minimalAgentState, minimalPlan, minimalTasks);

    expect(output).toEqual(expected);
  });
});
