import type { PlanTask, PlanV1 } from "../../contracts/planning.js";

export const requiredInput = <T>(value: T | undefined, message: string): T => {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
};

export const getNextReadyTask = (plan: PlanV1, completed: Set<string>): PlanTask | undefined => {
  for (const task of plan.tasks) {
    if (completed.has(task.id)) continue;
    const deps = task.dependencies ?? [];
    if (deps.every((dep) => completed.has(dep))) {
      return task;
    }
  }
  return undefined;
};

export const summarizePlan = (plan: PlanV1): Record<string, unknown> => ({
  version: plan.version,
  goal: plan.goal,
  taskCount: plan.tasks.length,
  tasks: plan.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    dependencies: task.dependencies,
    criteriaCount: task.success_criteria.length
  }))
});
