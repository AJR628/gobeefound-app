// §10.4 — Next Step selection. Evaluate in order; take the first match.

import type { Plan, PlanTask } from "./plan";
import { computeProgress, indexStates, type TaskStateLike } from "./progress";

export type NextStep =
  | { kind: "task"; task: PlanTask }
  | { kind: "confirm" }
  | { kind: "maintenance" };

function isDone(states: Map<string, TaskStateLike>, taskId: string): boolean {
  const s = states.get(taskId);
  return s?.status === "complete" || (s?.status === "skipped" && s.skipReason === "not_doing");
}

function dependenciesMet(task: PlanTask, states: Map<string, TaskStateLike>, plan: Plan): boolean {
  const inPlan = new Set(plan.tasks.map((t) => t.taskId));
  // A dependency on a task not in this plan (hidden) is treated as met.
  return task.definition.dependsOn.every((dep) => !inPlan.has(dep) || isDone(states, dep));
}

export function selectNextStep(
  plan: Plan,
  stateList: TaskStateLike[],
  stage: "launching" | "launched",
): NextStep {
  if (stage === "launched") return { kind: "maintenance" }; // rule 6
  const states = indexStates(stateList);

  // Rule 1: saved_for_later whose dependencies are now met.
  const savedForLater = plan.tasks.find(
    (t) => states.get(t.taskId)?.status === "saved_for_later" && dependenciesMet(t, states, plan),
  );
  if (savedForLater) return { kind: "task", task: savedForLater };

  // Rule 2/3: lowest-order incomplete required task in highest-priority incomplete module,
  // skipping anything soft-blocked by an unmet dependency. plan.tasks is already ordered.
  const candidates = plan.tasks.filter((t) => t.isRequired && !isDone(states, t.taskId));
  const unblocked = candidates.filter((t) => dependenciesMet(t, states, plan));

  if (unblocked.length === 0) {
    // Rule 5: all required complete → confirm.
    const progress = computeProgress(plan, stateList);
    if (progress.allRequiredComplete) return { kind: "confirm" };
    // Everything remaining is blocked or awaiting — fall through to any candidate.
    return candidates[0] ? { kind: "task", task: candidates[0] } : { kind: "confirm" };
  }

  const first = unblocked[0]!;
  // Rule 4: if the indicated task is awaiting external verification, pick from a DIFFERENT module.
  if (states.get(first.taskId)?.status === "awaiting_verification") {
    const other = unblocked.find(
      (t) => t.moduleId !== first.moduleId && states.get(t.taskId)?.status !== "awaiting_verification",
    );
    if (other) return { kind: "task", task: other };
    const sameModuleOther = unblocked.find((t) => states.get(t.taskId)?.status !== "awaiting_verification");
    if (sameModuleOther) return { kind: "task", task: sameModuleOther };
  }
  return { kind: "task", task: first };
}
