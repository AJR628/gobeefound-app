// §13 / V4 §E §J — the structured generators. Input assembled from canonical values (P16); missing-field
// detection before any model call; every call runs through the metered wrapper (idempotency, throttle,
// atomic allowance, ledger); deterministic claim scanning after (P10); contact data injected by us, never
// written by the model; both versions persisted (§13.1).

import { ARCHETYPE_BY_ID, FIELD_SOURCE_TASK, TOOL_OUTPUT_FIELDS, type BusinessProfileField, type ToolId } from "@/content";
import { DESCRIPTIONS_PROMPT, REVIEW_LINK_PLACEHOLDER, REVIEW_REQUESTS_PROMPT, WEBSITE_COPY_PROMPT, type BusinessFacts } from "@/content/prompts";
import { db } from "./db";
import { formatHours, type Service } from "./canonical";
import { AiError, descriptionsSchema, generateStructured, reviewRequestsSchema, websiteCopySchema, type AiErrorKind, type GenerationMeta } from "./ai";
import { formatAllowance, type AllowanceSnapshot, type Bucket } from "./ai/allowance";
import { runMetered, type MeteredOutcome } from "./ai/metered";
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

/**
 * Server-side mapping from canonical field → output key for "save to Your Business". The client never
 * chooses the destination (plan §8c S1). Every target must be in TOOL_OUTPUT_FIELDS (content-validated).
 */
export const TOOL_SAVE_MAP: Record<ToolId, Partial<Record<BusinessProfileField, string>>> = {
  website_copy: { longDescription: "about" },
  descriptions: { shortDescription: "short", gbpDescription: "google", longDescription: "long" },
  review_requests: {},
};
for (const tool of Object.keys(TOOL_SAVE_MAP) as ToolId[]) {
  for (const field of Object.keys(TOOL_SAVE_MAP[tool])) {
    if (!(TOOL_OUTPUT_FIELDS[tool] as readonly string[]).includes(field)) throw new Error(`TOOL_SAVE_MAP.${tool}.${field} is not in TOOL_OUTPUT_FIELDS`);
  }
}

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

// ---------------------------------------------------------------------------------------------
// Contact data: the model must never write it. We inject it. (V4 §D rule 3)
// ---------------------------------------------------------------------------------------------

const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|co|us|io|biz|info)\b/i;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.]+\b/;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

/** Returns the first contact-like value the model wrote, ignoring our own placeholder. Exported for tests. */
export function findGeneratedContactData(output: Record<string, unknown>): string | null {
  let found: string | null = null;
  const visit = (v: unknown) => {
    if (found) return;
    if (typeof v === "string") {
      const s = v.split(REVIEW_LINK_PLACEHOLDER).join(" ");
      const m = s.match(EMAIL_RE) ?? s.match(URL_RE) ?? s.match(PHONE_RE);
      if (m) found = m[0];
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(visit);
  };
  visit(output);
  return found;
}

/** Replace the review-link placeholder with the canonical link in every string field. Exported for tests. */
export function injectReviewLink<T extends Record<string, unknown>>(output: T, reviewLink: string): T {
  const visit = (v: unknown): unknown => {
    if (typeof v === "string") return v.split(REVIEW_LINK_PLACEHOLDER).join(reviewLink);
    if (Array.isArray(v)) return v.map(visit);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, visit(x)]));
    return v;
  };
  return visit(output) as T;
}

// ---------------------------------------------------------------------------------------------
// Result shape (what the route returns to the browser + server-only telemetry it strips)
// ---------------------------------------------------------------------------------------------

export interface AllowanceView {
  bucket: Bucket;
  used: number;
  limit: number;
  /** "32 AI edits left" — the only allowance wording the owner ever sees. */
  label: string;
}

export function allowanceView(bucket: Bucket, snap: AllowanceSnapshot): AllowanceView {
  return { bucket, used: snap[bucket].used, limit: snap[bucket].limit, label: formatAllowance(bucket, snap) };
}

export type GenerateResult =
  | { ok: true; id: string; output: Record<string, unknown>; generationId: string; allowance: AllowanceView; replayed: boolean; telemetry: { model: string | null; durationMs: number | null } }
  | { ok: false; error: string; status: number; generationId?: string; kind?: AiErrorKind; missing?: { field: BusinessProfileField; taskId: string }[]; allowance?: AllowanceView; telemetry?: { model: string | null; durationMs: number | null } };

export interface GenerateContext {
  idempotencyKey?: string | null;
  platformRequestId?: string | null;
}

function logGeneration(tool: ToolId, businessId: string, generationId: string, meta: GenerationMeta, outcome: "ok" | "claims" | "contact_data") {
  console.info(JSON.stringify({ ts: new Date().toISOString(), evt: "generator_run", tool, businessId, generationId, outcome, provider: meta.provider, model: meta.model, promptVersion: meta.promptVersion, requestId: meta.requestId, inputTokens: meta.inputTokens, outputTokens: meta.outputTokens, reasoningTokens: meta.reasoningTokens, durationMs: meta.durationMs, attempts: meta.attempts }));
}

export async function runGenerator(
  tool: ToolId,
  business: { id: string; trade: keyof typeof ARCHETYPE_BY_ID; city: string; state: string },
  profile: ProfileRow,
  answers: Record<string, string>,
  ctx: GenerateContext = {},
): Promise<GenerateResult> {
  const missing = missingFields(tool, profile);
  if (missing.length) return { ok: false, error: "A few details are missing.", status: 422, missing };

  const facts = buildFacts(business, profile, answers);
  const claimCtx = claimContext(facts);
  const opts = { userKey: business.id, operation: "routine" as const, schemaName: tool };

  const result = await runMetered<Record<string, unknown>>({ businessId: business.id, operation: tool, idempotencyKey: ctx.idempotencyKey, platformRequestId: ctx.platformRequestId }, async (generationId): Promise<MeteredOutcome<Record<string, unknown>>> => {
    let output: Record<string, unknown>;
    let meta: GenerationMeta;
    if (tool === "website_copy") {
      const r = await generateStructured(WEBSITE_COPY_PROMPT(facts, { visitorAction: answers.visitorAction || facts.preferredContact || "call" }), websiteCopySchema, opts);
      output = r.data;
      meta = r.meta;
    } else if (tool === "descriptions") {
      const r = await generateStructured(DESCRIPTIONS_PROMPT(facts), descriptionsSchema, opts);
      output = r.data;
      meta = r.meta;
    } else {
      const r = await generateStructured(REVIEW_REQUESTS_PROMPT(facts), reviewRequestsSchema, opts);
      output = r.data;
      meta = r.meta;
    }

    // The model must not write contact data; we inject it (V4 §D rule 3).
    if (findGeneratedContactData(output)) {
      logGeneration(tool, business.id, generationId, meta, "contact_data");
      return { ok: false, kind: "contact", meta, userMessage: new AiError("schema").userMessage };
    }

    // P10 — deterministic enforcement. Reject anything the prompt failed to prevent.
    const violations = validateGeneratedOutput(output, claimCtx);
    if (violations.length) {
      logGeneration(tool, business.id, generationId, meta, "claims");
      return { ok: false, kind: "claims", meta, userMessage: `The draft made a claim we can't back up (${violations[0]!.kind}: "${violations[0]!.match}"). Please try again.` };
    }

    if (tool === "review_requests" && facts.reviewLink) output = injectReviewLink(output, facts.reviewLink);
    logGeneration(tool, business.id, generationId, meta, "ok");

    return {
      ok: true,
      data: output,
      meta,
      persist: async (aiUsageId) => {
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
          data: { businessId: business.id, toolType: tool, inputSnapshot: { facts, answers, generationId } as object, output: output as object, model: meta.model, promptVersion: meta.promptVersion, aiUsageId },
        });
        return row.id;
      },
    };
  });

  if (result.ok) {
    return { ok: true, id: result.generatedContentId, output: result.data, generationId: result.generationId, allowance: allowanceView(result.bucket, result.allowance), replayed: result.replayed, telemetry: { model: null, durationMs: null } };
  }
  return {
    ok: false,
    error: result.userMessage,
    status: result.status,
    generationId: result.generationId,
    kind: result.kind,
    allowance: result.allowance ? allowanceView(result.bucket, result.allowance) : undefined,
  };
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
