import { describe, expect, it } from "vitest";
import { runShellRuntimeStep } from "../../src/shell/run-shell-runtime.ts";
import {
  makeAgentState,
  makePlan,
  makeTask,
  minimalAgentState,
  minimalPlan,
  minimalTasks
} from "./minimal-runtime-fixtures.ts";

describe("minimal-runtime-fixtures", () => {
  it("minimalAgentState exposes current runtime baseline fields", () => {
    expect(minimalAgentState).toMatchObject({
      runId: "run-1",
      status: "idle",
      goal: "ship feature"
    });
  });

  it("minimalPlan exposes current runtime baseline fields", () => {
    expect(minimalPlan).toMatchObject({
      id: "plan-1",
      goal: "ship feature",
      status: "ready",
      taskIds: ["task-1"]
    });
  });

  it("minimalTasks exposes current runtime baseline task list", () => {
    expect(Array.isArray(minimalTasks)).toBe(true);
    expect(minimalTasks.length).toBeGreaterThan(0);
    expect(minimalTasks[0]).toMatchObject({
      id: "task-1",
      title: "implement",
      status: "ready"
    });
  });

  it("makeAgentState keeps defaults, applies overrides, and returns a new reference", () => {
    const state = makeAgentState({ status: "running", runId: "run-custom" });

    expect(state).toMatchObject({
      runId: "run-custom",
      status: "running",
      goal: "ship feature"
    });
    expect(state).not.toBe(minimalAgentState);
  });

  it("makePlan keeps defaults, applies overrides, and returns a new reference", () => {
    const plan = makePlan({ status: "in_progress", id: "plan-custom" });

    expect(plan).toMatchObject({
      id: "plan-custom",
      goal: "ship feature",
      status: "in_progress",
      taskIds: ["task-1"]
    });
    expect(plan).not.toBe(minimalPlan);
  });

  it("makeTask keeps defaults, applies overrides, and returns a new reference", () => {
    const task = makeTask({ status: "pending", title: "custom-task" });

    expect(task).toMatchObject({
      id: "task-1",
      title: "custom-task",
      status: "pending"
    });
    expect(task).not.toBe(minimalTasks[0]);
  });

  it("makeTask override does not mutate minimalTasks default entry", () => {
    const originalTitle = minimalTasks[0].title;
    const changedTask = makeTask({ title: "changed" });

    expect(changedTask.title).toBe("changed");
    expect(minimalTasks[0].title).toBe(originalTitle);
    expect(minimalTasks[0].title).toBe("implement");
  });

  it("minimal fixtures can drive current runtime minimal step", () => {
    const step = runShellRuntimeStep(minimalAgentState, minimalPlan, minimalTasks, undefined);

    expect(step.tick.request).toBeDefined();
    expect(step.tick.request?.kind).toBe("execute_actions");
  });
});
