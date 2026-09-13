// §9.2 — percentage, milestones. Computed at render time, never stored.

import { MILESTONES, type MilestoneDefinition, type ModuleId } from "@/content";
import type { Plan } from "./plan";

export type TaskStatus = "not_started" | "saved_for_later" | "complete" | "skipped" | "awaiting_verification";
export type SkipReason = "already_done" | "not_doing" | "later";

export interface TaskStateLike {
  taskId: string;
  status: TaskStatus;
  skipReason?: SkipReason | null;
}

export interface Progress {
  completedRequired: number;
  totalRequired: number;
  skippedNotDoing: number;
  denominator: number;
  percentage: number; // 0–100, integer
  allRequiredComplete: boolean;
}

export function indexStates(states: TaskStateLike[]): Map<string, TaskStateLike> {
  return new Map(states.map((s) => [s.taskId, s]));
}

/**
 * percentage = completed_required / (total_required − skipped_as_not_doing).
 * Optional tasks never appear in either term. Unknown taskIds in state are ignored.
 */
export function computeProgress(plan: Plan, states: TaskStateLike[]): Progress {
  const byId = indexStates(states);
  let completedRequired = 0;
  let skippedNotDoing = 0;
  let totalRequired = 0;

  for (const t of plan.tasks) {
    if (!t.isRequired) continue;
    totalRequired++;
    const s = byId.get(t.taskId);
    if (!s) continue;
    if (s.status === "complete") completedRequired++;
    else if (s.status === "skipped" && s.skipReason === "not_doing") skippedNotDoing++;
  }

  const denominator = totalRequired - skippedNotDoing;
  const percentage = denominator === 0 ? 100 : Math.round((completedRequired / denominator) * 100);
  return {
    completedRequired,
    totalRequired,
    skippedNotDoing,
    denominator,
    percentage,
    allRequiredComplete: completedRequired === denominator,
  };
}

export function isTaskComplete(states: Map<string, TaskStateLike>, taskId: string): boolean {
  return states.get(taskId)?.status === "complete";
}

export function isModuleRequiredComplete(plan: Plan, states: Map<string, TaskStateLike>, moduleId: ModuleId): boolean {
  const required = plan.tasks.filter((t) => t.moduleId === moduleId && t.isRequired);
  return required.every((t) => {
    const s = states.get(t.taskId);
    return s?.status === "complete" || (s?.status === "skipped" && s.skipReason === "not_doing");
  });
}

export interface MilestoneStatus {
  milestone: MilestoneDefinition;
  reached: boolean;
}

export function evaluateMilestones(
  plan: Plan,
  stateList: TaskStateLike[],
  stage: "launching" | "launched",
): MilestoneStatus[] {
  const states = indexStates(stateList);
  return MILESTONES.map((milestone) => {
    const c = milestone.condition;
    let reached = false;
    if (c.type === "module_required_complete") reached = isModuleRequiredComplete(plan, states, c.moduleId);
    else if (c.type === "tasks_complete") reached = c.taskIds.every((id) => isTaskComplete(states, id));
    else if (c.type === "stage_launched") reached = stage === "launched";
    return { milestone, reached };
  });
}
