// §13 — the three generators. Input assembled from canonical values (P16); missing-field detection
// before any model call; deterministic claim scanning after (P10); both versions persisted (§13.1).

import { ARCHETYPE_BY_ID, FIELD_SOURCE_TASK, type BusinessProfileField, type ToolId } from "@/content";
import { DESCRIPTIONS_PROMPT, REVIEW_REQUESTS_PROMPT, WEBSITE_COPY_PROMPT, type BusinessFacts } from "@/content/prompts";
import { db } from "./db";
import { formatHours, type Service } from "./canonical";
import { descriptionsSchema, generateStructured, reviewRequestsSchema, websiteCopySchema, GenerationError } from "./ai";
import { validateGeneratedOutput, type ClaimContext } from "./claims";

export const TOOL_ROUTE: Record<ToolId, string> = { website_copy: "website-copy", descriptions: "descriptions", review_requests: "review-requests" };
export const TOOL_BY_ROUTE: Record<string, ToolId> = { "website-copy": "website_copy", descriptions: "descriptions", "review-requests": "review_requests" };

export const TOOL_META: Record<ToolId, { name: string; blurb: string; usedBy: string[] }> = {
  website_copy: { name: "Website Copy Builder", blurb: "A headline, service blurbs, an About paragraph, and a call to action — from what you've already told us.", usedBy: ["3.2"] },
  descriptions: { name: "Description Generator", blurb: "Three lengths of the same honest description: social bio, Google profile, website.", usedBy: ["4.4", "6.2", "3.6"] },
  review_requests: { name: "Review Request Kit", blurb: "A text, an email, a spoken line, a QR code, and a printable card — with your link already in them.", usedBy: ["5.2", "5.4"] },
};

/** Which canonical fields each tool needs before it can run (§13.1 — the model is never called with placeholders). */
export const TOOL_REQUIRED_FIELDS: Record<ToolId, BusinessProfileField[]> = {
  website_copy: ["displayName", "services", "serviceAreas"],
  descriptions: ["displayName", "services", "serviceAreas"],
  review_requests: ["displayName", "reviewLink"],
};

/** Questions a tool may ask when the answer isn't already known (P16 — ask only what we don't know). */
export const TOOL_QUESTIONS: Record<ToolId, { key: string; label: string; forField?: BusinessProfileField }[]> = {
  website_copy: [
    { key: "idealCustomer", label: "Who do you help most?", forField: "idealCustomer" },
    { key: "differentiators", label: "Why should someone choose you? (one reason per line)", forField: "differentiators" },
    { key: "visitorAction", label: "What should a visitor do next — call, text, or request a quote?" },
  ],
  descriptions: [
    { key: "idealCustomer", label: "Who do you help most?", forField: "idealCustomer" },
    { key: "differentiators", label: "Why should someone choose you? (one reason per line)", forField: "differentiators" },
  ],
  review_requests: [],
};

type ProfileRow = {
  displayName: string; phone: string | null; domain: string | null; hours: unknown; serviceAreas: unknown; services: unknown;
  idealCustomer: string | null; differentiators: unknown; reviewLink: string | null; preferredContact: string | null;
};

export function missingFields(tool: ToolId, profile: ProfileRow): { field: BusinessProfileField; taskId: string }[] {
  const p = profile as unknown as Record<string, unknown>;
  return TOOL_REQUIRED_FIELDS[tool]
    .filter((f) => {
      const v = p[f];
      return v === null || v === undefined || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);
    })
    .map((f) => ({ field: f, taskId: FIELD_SOURCE_TASK[f] ?? "1.1" }));
}

export function buildFacts(business: { trade: keyof typeof ARCHETYPE_BY_ID; city: string; state: string }, profile: ProfileRow, answers: Record<string, string>): BusinessFacts {
  const differentiators = (answers.differentiators?.split("\n").map((s) => s.trim()).filter(Boolean)) ?? (Array.isArray(profile.differentiators) ? (profile.differentiators as string[]) : null);
  return {
    displayName: profile.displayName,
    tradeNoun: ARCHETYPE_BY_ID[business.trade].tradeNoun,
    city: business.city,
    state: business.state,
    services: Array.isArray(profile.services) ? (profile.services as Service[]) : [],
    serviceAreas: Array.isArray(profile.serviceAreas) ? (profile.serviceAreas as string[]) : [],
    idealCustomer: answers.idealCustomer ?? profile.idealCustomer,
    differentiators,
    phone: profile.phone,
    domain: profile.domain,
    hours: formatHours(profile.hours) || null,
    reviewLink: profile.reviewLink,
    preferredContact: profile.preferredContact,
  };
}

export function claimContext(f: BusinessFacts): ClaimContext {
  return {
    ownerText: [f.idealCustomer ?? "", ...(f.differentiators ?? []), ...f.services.map((s) => `${s.name} ${s.description ?? ""}`)],
    city: f.city,
    state: f.state,
  };
}

export type GenerateResult =
  | { ok: true; id: string; output: Record<string, unknown> }
  | { ok: false; error: string; missing?: { field: BusinessProfileField; taskId: string }[] };

export async function runGenerator(
  tool: ToolId,
  business: { id: string; trade: keyof typeof ARCHETYPE_BY_ID; city: string; state: string },
  profile: ProfileRow,
  answers: Record<string, string>,
): Promise<GenerateResult> {
  const missing = missingFields(tool, profile);
  if (missing.length) return { ok: false, error: "A few details are missing.", missing };

  const facts = buildFacts(business, profile, answers);
  const ctx = claimContext(facts);

  let output: Record<string, unknown>;
  try {
    if (tool === "website_copy") output = await generateStructured(WEBSITE_COPY_PROMPT(facts, { visitorAction: answers.visitorAction || facts.preferredContact || "call" }), websiteCopySchema);
    else if (tool === "descriptions") output = await generateStructured(DESCRIPTIONS_PROMPT(facts), descriptionsSchema);
    else output = await generateStructured(REVIEW_REQUESTS_PROMPT(facts), reviewRequestsSchema);
  } catch (e) {
    return { ok: false, error: e instanceof GenerationError ? e.message : "We couldn't generate that just now. Please try again." };
  }

  // P10 — deterministic enforcement. Reject anything the prompt failed to prevent.
  const violations = validateGeneratedOutput(output, ctx);
  if (violations.length) {
    return { ok: false, error: `The draft made a claim we can't back up (${violations[0]!.kind}: "${violations[0]!.match}"). Please try again.` };
  }

  // Persist the owner-supplied answers that map to canonical fields (P16 — they entered it once).
  const patch: Record<string, unknown> = {};
  for (const q of TOOL_QUESTIONS[tool]) {
    if (q.forField && answers[q.key]) patch[q.forField] = q.forField === "differentiators" ? answers[q.key]!.split("\n").map((s) => s.trim()).filter(Boolean) : answers[q.key];
  }
  if (Object.keys(patch).length) {
    const { saveCanonicalFields } = await import("./canonical");
    await saveCanonicalFields(business.id, patch, "owner_entered");
  }

  const row = await db.generatedContent.create({
    data: { businessId: business.id, toolType: tool, inputSnapshot: { facts, answers } as object, output: output as object },
  });
  return { ok: true, id: row.id, output };
}

/** Save the owner's edited version. `output` is never overwritten (§13.1). Edits write a Decision row. */
export async function saveEditedOutput(businessId: string, id: string, edited: Record<string, unknown>, original: Record<string, unknown>): Promise<void> {
  const wasEdited = JSON.stringify(edited) !== JSON.stringify(original);
  const editedFields = Object.keys(edited).filter((k) => JSON.stringify(edited[k]) !== JSON.stringify(original[k]));
  await db.$transaction([
    db.generatedContent.update({ where: { id, businessId }, data: { editedOutput: edited as object, wasEdited } }),
    db.decision.create({
      data: {
        businessId,
        context: "generator_edit",
        contextId: id,
        proposedAction: "generated_output",
        outcome: "accepted",
        reason: wasEdited ? `edited:${editedFields.join(",")}` : "accepted_as_is",
      },
    }),
  ]);
}
