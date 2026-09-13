import { MODULE_1_TASKS } from "./tasks/module-1";
import { MODULE_2_TASKS } from "./tasks/module-2";
import { MODULE_3_TASKS } from "./tasks/module-3";
import { MODULE_4_TASKS } from "./tasks/module-4";
import { MODULE_5_TASKS } from "./tasks/module-5";
import { MODULE_6_TASKS } from "./tasks/module-6";
import { MODULE_7_TASKS } from "./tasks/module-7";
import type { TaskDefinition, ModuleId } from "./types";

export { MODULES, MODULE_BY_ID } from "./modules";
export { ARCHETYPES, ARCHETYPE_BY_ID } from "./archetypes";
export { SURFACE_MAP, TRACKED_FIELDS } from "./surface-map";
export { MILESTONES } from "./milestones";
export { STATE_RESOURCES, STATE_RESOURCE_BY_CODE, FEDERAL_FALLBACK, US_STATES } from "./state-resources";
export { CONFIRM_STEP, CONFIRM_STEP_ID } from "./tasks/confirm";
export * from "./types";

/** All 35 module task definitions (the 36th authored item is the confirm step). */
export const ALL_TASKS: TaskDefinition[] = [
  ...MODULE_1_TASKS,
  ...MODULE_2_TASKS,
  ...MODULE_3_TASKS,
  ...MODULE_4_TASKS,
  ...MODULE_5_TASKS,
  ...MODULE_6_TASKS,
  ...MODULE_7_TASKS,
];

export const TASK_BY_ID: Record<string, TaskDefinition> = Object.fromEntries(
  ALL_TASKS.map((t) => [t.id, t]),
);

export function tasksForModule(moduleId: ModuleId): TaskDefinition[] {
  return ALL_TASKS.filter((t) => t.moduleId === moduleId).sort((a, b) => a.order - b.order);
}

/** Maps each onboarding answer to the tasks that render as verify variants (§11.3). */
export const VERIFY_VARIANT_MAP = {
  hasDomain: ["2.2"],
  hasEmail: ["2.3"],
  hasWebsite: ["3.1", "3.3", "3.4"],
  hasPhone: ["1.4"],
  hasGBP: ["4.1", "4.2"],
  hasSocial: ["6.2"],
  hasReviews: ["5.3"],
} as const;

/** Which task fills each confirmation-relevant field (§12.3 blockers link here). */
export const FIELD_SOURCE_TASK: Record<string, string> = {
  displayName: "2.1",
  legalName: "2.1",
  phone: "1.4",
  preferredContact: "1.4",
  email: "2.3",
  hours: "1.5",
  timezone: "1.5",
  serviceAreas: "1.2",
  services: "1.3",
  pricingApproach: "1.3",
  idealCustomer: "1.1",
  differentiators: "1.1",
  domain: "2.2",
  logoUrl: "2.5",
  brandColors: "2.5",
  longDescription: "3.2",
  pageTitle: "3.6",
  metaDescription: "3.6",
  streetAddress: "4.3",
  hideAddress: "4.3",
  gbpDescription: "4.4",
  reviewLink: "5.1",
  shortDescription: "6.2",
  responseCommitment: "7.4",
};
