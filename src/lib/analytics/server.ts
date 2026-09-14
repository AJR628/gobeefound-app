// §19 — server-side analytics. Only events that change a decision. §19.3: NO PII in properties.
// The allowlist is enforced here: any property key not listed is dropped before send.

import { PostHog } from "posthog-node";

export const EVENT_PROPERTY_ALLOWLIST: Record<string, readonly string[]> = {
  signup_completed: ["authProvider"],
  onboarding_started: [],
  onboarding_question_answered: ["questionId", "wasUnsure"],
  onboarding_completed: ["trade", "state", "serviceAreaType", "alreadyHasCount"],
  onboarding_abandoned: ["lastQuestionId"],
  plan_revealed: ["requiredTaskCount", "adaptedCount"],
  task_opened: ["taskId", "isLocked"],
  task_completed: ["taskId", "moduleId", "daysSinceSignup"],
  task_skipped: ["taskId", "skipReason"],
  task_saved_for_later: ["taskId"],
  known_value_copied: ["taskId", "fieldKey"],
  milestone_reached: ["milestoneId", "daysSinceSignup"],
  unlock_viewed: ["trigger", "completedTaskCount"],
  purchase_completed: ["amountCents"],
  generator_run: ["toolId", "success", "operationClass", "replayed"],
  generator_output_edited: ["toolId", "fieldsEdited"],
  generator_output_copied: ["toolId"],
  // V4 §E / §18 — AI health. Never a prompt, output, business name, or token count.
  ai_generation_failed: ["operationClass", "errorKind"],
  allowance_exhausted: ["bucket"],
  // V4 §D — website builder. Never the business name, domain, or any copy.
  builder_opened: [],
  site_draft_created: ["replayed"],
  site_section_regenerated: ["section"],
  site_approved: ["versionNumber"],
  site_exported: ["versionNumber"],
  logo_generated: ["style"],
  logo_selected: [],
  asset_declared: ["assetType"],
  asset_removed: ["assetType"],
  logo_uploaded: [],
  business_field_edited: ["fieldKey", "source"],
  timezone_confirmed: ["matchedBrowserSuggestion"],
  confirmation_completed: ["daysSinceSignup", "fieldsEdited"],
  presence_summary_downloaded: [],
  export_downloaded: ["format"],
  service_offer_clicked: ["placement"],
  service_offer_dismissed: ["placement"],
  referral_link_copied: [],
};

export type EventName = keyof typeof EVENT_PROPERTY_ALLOWLIST;

/** Pure: keep only allowlisted keys for the event. Exported for tests. */
export function sanitizeProps(event: string, props: Record<string, unknown> = {}): Record<string, unknown> {
  const allowed = new Set(EVENT_PROPERTY_ALLOWLIST[event] ?? []);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) if (allowed.has(k) && v !== undefined) out[k] = v;
  return out;
}

let client: PostHog | null = null;
function posthog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!client) client = new PostHog(key, { host: "https://us.i.posthog.com", flushAt: 1, flushInterval: 0 });
  return client;
}

/** Fire-and-forget. distinctId is ALWAYS the internal user UUID, never an email (§19.3). */
export async function track(userId: string, event: EventName, props: Record<string, unknown> = {}): Promise<void> {
  const ph = posthog();
  if (!ph) return;
  try {
    ph.capture({ distinctId: userId, event, properties: sanitizeProps(event, props) });
    await ph.flush();
  } catch {
    /* analytics must never break a user action */
  }
}

export function daysSince(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
