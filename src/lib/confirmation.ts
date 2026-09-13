// §12.3 — the ONE server-side function deciding what blocks confirmation.
// Used by both the /confirm gate and the /home confirmation card.

import { FIELD_SOURCE_TASK, TRACKED_FIELDS, type BusinessProfileField } from "@/content";
import type { Plan } from "./plan";

export interface ProfileLike {
  displayName: string | null;
  phone: string | null;
  email: string | null;
  hours: unknown | null;
  serviceAreas: unknown; // string[]
  domain: string | null;
  reviewLink: string | null;
  gbpDescription: string | null;
  streetAddress: string | null;
  hideAddress: boolean;
  shortDescription: string | null;
}

export interface ConfirmationBlocker {
  fieldKey: BusinessProfileField;
  taskId: string;
}

const ALWAYS_REQUIRED: BusinessProfileField[] = [
  "displayName",
  "phone",
  "email",
  "hours",
  "serviceAreas",
  "domain",
  "reviewLink",
  "gbpDescription",
];

export function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

/** Fields required for confirmation for THIS owner (§12.3 table). */
export function confirmationRequiredFields(profile: ProfileLike, plan: Plan): BusinessProfileField[] {
  const fields = [...ALWAYS_REQUIRED];
  if (!profile.hideAddress) fields.push("streetAddress");
  const social = plan.tasks.find((t) => t.taskId === "6.2");
  if (social?.isRequired) fields.push("shortDescription");
  return fields;
}

export function getConfirmationBlockers(profile: ProfileLike, plan: Plan): ConfirmationBlocker[] {
  return confirmationRequiredFields(profile, plan)
    .filter((f) => isEmptyValue((profile as unknown as Record<string, unknown>)[f]))
    .map((f) => ({ fieldKey: f, taskId: FIELD_SOURCE_TASK[f] ?? "confirm" }));
}

/**
 * Tracked fields that should receive a provenance stamp on confirm:
 * every Surface-Map field that has a value. streetAddress is excluded while hideAddress = true.
 */
export function fieldsToStampOnConfirm(profile: Record<string, unknown> & { hideAddress: boolean }): BusinessProfileField[] {
  return TRACKED_FIELDS.filter((f) => {
    if (f === "streetAddress" && profile.hideAddress) return false;
    return !isEmptyValue(profile[f]);
  });
}
