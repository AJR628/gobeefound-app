// V4 §D — the SiteDraft service: load/create, setup changes, manual edits (free), AI build and section
// rewrite (metered), approval into an immutable SiteVersion. Server-only. Every write re-validates the
// whole spec with Zod; the model's output is merged only into sections the owner has NOT approved.
import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { ARCHETYPE_BY_ID } from "@/content";
import { SITE_COPY_PROMPT, SITE_SECTION_PROMPT } from "@/content/prompts/site";
import type { BusinessFacts } from "@/content/prompts";
import { generateStructured, type GenerationMeta } from "../ai";
import { runMetered, type MeteredOutcome, type MeteredResult } from "../ai/metered";
import { claimsGuidance, validateGeneratedOutput, type ClaimContext } from "../claims";
import { claimsRepairHint, findGeneratedContactData } from "../generators";
import { derivePublicFacts, type ProfileLike } from "./facts";
import { DEFAULT_SETUP, SECTION_KEYS, SECTION_SCHEMAS, siteCopySchema, siteDraftSpecSchema, siteSetupSchema, siteVersionSpecSchema, type PublicFacts, type SectionKey, type SiteCopy, type SiteDraftSpec, type SiteSetup, type SiteVersionSpec } from "./spec";

export interface BusinessRow {
  id: string;
  trade: keyof typeof ARCHETYPE_BY_ID;
  city: string;
  state: string;
}

// ---------------------------------------------------------------------------------------------
// Load / create
// ---------------------------------------------------------------------------------------------

export async function getOrCreateDraft(businessId: string, profile: ProfileLike): Promise<SiteDraftSpec> {
  const row = await db.siteDraft.findUnique({ where: { businessId } });
  if (row) {
    const parsed = siteDraftSpecSchema.safeParse(row.spec);
    if (parsed.success) return parsed.data;
  }
  const setup: SiteSetup = {
    ...DEFAULT_SETUP,
    logoMode: profile.logoUrl ? "existing" : "text",
    palette: profile.brandColors ? "brand" : "slate",
    sections: { ...DEFAULT_SETUP.sections, address: !profile.hideAddress && Boolean(profile.streetAddress) },
  };
  const spec: SiteDraftSpec = { version: 1, setup, copy: null, approved: {} };
  await db.siteDraft.upsert({ where: { businessId }, create: { businessId, spec }, update: { spec } });
  return spec;
}

async function saveSpec(businessId: string, spec: SiteDraftSpec, extra: { lastBuiltAt?: Date } = {}): Promise<void> {
  const valid = siteDraftSpecSchema.parse(spec);
  await db.siteDraft.update({ where: { businessId }, data: { spec: valid, ...extra } });
}

// ---------------------------------------------------------------------------------------------
// Owner edits — never cost anything
// ---------------------------------------------------------------------------------------------

/** Validate setup against the closed vocabulary AND the owner's real services. */
export async function updateSetup(businessId: string, profile: ProfileLike, patch: unknown): Promise<{ ok: true; spec: SiteDraftSpec } | { ok: false; error: string }> {
  const current = await getOrCreateDraft(businessId, profile);
  const parsed = siteSetupSchema.safeParse({ ...current.setup, ...(typeof patch === "object" && patch ? patch : {}) });
  if (!parsed.success) return { ok: false, error: "That choice isn't available." };
  const names = new Set((Array.isArray(profile.services) ? (profile.services as { name: string }[]) : []).map((s) => s.name.toLowerCase()));
  const featured = parsed.data.featuredServices.filter((s) => names.has(s.toLowerCase()));
  if (parsed.data.logoMode === "existing" && !profile.logoUrl) parsed.data.logoMode = "text";
  if (parsed.data.palette === "brand" && !profile.brandColors) parsed.data.palette = "slate";
  const spec: SiteDraftSpec = { ...current, setup: { ...parsed.data, featuredServices: featured } };
  await saveSpec(businessId, spec);
  return { ok: true, spec };
}

/** Manual text edit of one section (or several). Free. Marks nothing approved; approval is explicit. */
export async function editCopy(businessId: string, profile: ProfileLike, patch: unknown): Promise<{ ok: true; spec: SiteDraftSpec } | { ok: false; error: string }> {
  const current = await getOrCreateDraft(businessId, profile);
  if (!current.copy) return { ok: false, error: "Build your website first." };
  const p = typeof patch === "object" && patch ? (patch as Record<string, unknown>) : {};
  const next: SiteCopy = { ...current.copy };
  for (const key of SECTION_KEYS) {
    if (!(key in p)) continue;
    const s = SECTION_SCHEMAS[key].safeParse(p[key]);
    if (!s.success) return { ok: false, error: `Something in "${key}" is too long or missing.` };
    (next as Record<string, unknown>)[key] = s.data;
  }
  const spec: SiteDraftSpec = { ...current, copy: siteCopySchema.parse(next) };
  await saveSpec(businessId, spec);
  return { ok: true, spec };
}

export async function setSectionApproved(businessId: string, profile: ProfileLike, section: SectionKey, approved: boolean): Promise<SiteDraftSpec> {
  const current = await getOrCreateDraft(businessId, profile);
  const spec: SiteDraftSpec = { ...current, approved: { ...current.approved, [section]: approved } };
  await saveSpec(businessId, spec);
  return spec;
}

// ---------------------------------------------------------------------------------------------
// AI — metered
// ---------------------------------------------------------------------------------------------

function factsFor(business: BusinessRow, profile: ProfileLike & { idealCustomer: string | null; differentiators: unknown; preferredContact: string | null; domain: string | null }, setup: SiteSetup): { facts: BusinessFacts; claimCtx: ClaimContext; pub: PublicFacts } {
  const pub = derivePublicFacts(business, profile, setup);
  const facts: BusinessFacts = {
    displayName: profile.displayName,
    tradeNoun: ARCHETYPE_BY_ID[business.trade].tradeNoun,
    city: business.city,
    state: business.state,
    services: pub.services.map((s) => ({ name: s.name, description: s.description ?? undefined })),
    serviceAreas: pub.serviceAreas,
    idealCustomer: profile.idealCustomer,
    differentiators: Array.isArray(profile.differentiators) ? (profile.differentiators as string[]) : null,
    hours: pub.hours,
    preferredContact: setup.primaryAction,
  };
  const claimCtx: ClaimContext = { ownerText: [profile.idealCustomer ?? "", ...(facts.differentiators ?? []), ...facts.services.map((s) => `${s.name} ${s.description ?? ""}`)], city: business.city, state: business.state };
  return { facts, claimCtx, pub };
}

/** Service names in copy must be the owner's. Any invented service is dropped; missing ones are added with an empty blurb. */
export function reconcileServices(copy: SiteCopy, pub: PublicFacts): SiteCopy {
  const byName = new Map(copy.services.items.map((i) => [i.name.trim().toLowerCase(), i.blurb]));
  const items = pub.services.map((s) => ({ name: s.name, blurb: byName.get(s.name.trim().toLowerCase()) ?? s.description ?? "" }));
  return { ...copy, services: { ...copy.services, items: items.length ? items : copy.services.items } };
}

type FullProfile = ProfileLike & { idealCustomer: string | null; differentiators: unknown; preferredContact: string | null; domain: string | null };

export interface BuildContext {
  idempotencyKey?: string | null;
  platformRequestId?: string | null;
}

/** Full site draft. Consumes one "website build". Approved sections are preserved. */
export async function buildSite(business: BusinessRow, profile: FullProfile, ctx: BuildContext = {}): Promise<MeteredResult<SiteDraftSpec>> {
  const current = await getOrCreateDraft(business.id, profile);
  const { facts, claimCtx, pub } = factsFor(business, profile, current.setup);
  const opts = { userKey: business.id, operation: "site" as const, schemaName: "site_copy", maxOutputTokens: 8_000, timeoutMs: 45_000 };

  return runMetered<SiteDraftSpec>({ businessId: business.id, operation: "site_draft", idempotencyKey: ctx.idempotencyKey, platformRequestId: ctx.platformRequestId }, async (): Promise<MeteredOutcome<SiteDraftSpec>> => {
    const prompt = SITE_COPY_PROMPT(facts, current.setup);
    let { data, meta } = await generateStructured(prompt, siteCopySchema, opts);
    let violations = validateGeneratedOutput(data as Record<string, unknown>, claimCtx);
    if (violations.length) {
      const r = await generateStructured({ instructions: prompt.instructions, input: prompt.input + claimsRepairHint(violations) }, siteCopySchema, opts);
      meta = mergeMeta(meta, r.meta);
      data = r.data;
      violations = validateGeneratedOutput(data as Record<string, unknown>, claimCtx);
    }
    if (violations.length) return { ok: false, kind: "claims", meta, userMessage: claimsGuidance(violations[0]!) };
    if (findGeneratedContactData(data as Record<string, unknown>)) return { ok: false, kind: "contact", meta, userMessage: "We couldn't put that together cleanly. Please try again." };

    const fresh = reconcileServices(data, pub);
    // Keep every section the owner already approved.
    const merged: SiteCopy = { ...fresh };
    if (current.copy) for (const k of SECTION_KEYS) if (current.approved[k]) (merged as Record<string, unknown>)[k] = current.copy[k];
    const spec: SiteDraftSpec = { ...current, copy: siteCopySchema.parse(merged) };

    return {
      ok: true,
      data: spec,
      meta,
      persist: async (aiUsageId) => {
        await saveSpec(business.id, spec, { lastBuiltAt: new Date() });
        const row = await db.generatedContent.create({ data: { businessId: business.id, toolType: "website_copy", inputSnapshot: { kind: "site_draft", setup: current.setup } as object, output: spec.copy as object, model: meta.model, promptVersion: meta.promptVersion, aiUsageId } });
        return row.id;
      },
    };
  });
}

/** Rewrite ONE section. Consumes one "AI edit". Refuses to touch an approved section or any other section. */
export async function rewriteSection(business: BusinessRow, profile: FullProfile, section: SectionKey, ctx: BuildContext = {}): Promise<MeteredResult<SiteDraftSpec> | { ok: false; generationId: string; kind: "config"; status: 409; userMessage: string; allowance: null; bucket: "edits" }> {
  const current = await getOrCreateDraft(business.id, profile);
  if (!current.copy) return { ok: false, generationId: "", kind: "config", status: 409, userMessage: "Build your website first.", allowance: null, bucket: "edits" };
  if (current.approved[section]) return { ok: false, generationId: "", kind: "config", status: 409, userMessage: "That section is approved. Un-approve it to rewrite it.", allowance: null, bucket: "edits" };
  const { facts, claimCtx, pub } = factsFor(business, profile, current.setup);
  const opts = { userKey: business.id, operation: "routine" as const, schemaName: `site_${section}`, maxOutputTokens: 1_200 };
  const copy = current.copy;
  // One section's Zod schema; typed loosely here because the section is chosen at runtime.
  const sectionSchema = SECTION_SCHEMAS[section] as unknown as z.ZodType<Record<string, unknown>>;

  return runMetered<SiteDraftSpec>({ businessId: business.id, operation: "section_rewrite", idempotencyKey: ctx.idempotencyKey, platformRequestId: ctx.platformRequestId }, async (): Promise<MeteredOutcome<SiteDraftSpec>> => {
    const prompt = SITE_SECTION_PROMPT(facts, current.setup, section, JSON.stringify(copy[section]));
    let { data, meta } = await generateStructured(prompt, sectionSchema, opts);
    let violations = validateGeneratedOutput(data as Record<string, unknown>, claimCtx);
    if (violations.length) {
      const r = await generateStructured({ instructions: prompt.instructions, input: prompt.input + claimsRepairHint(violations) }, sectionSchema, opts);
      meta = mergeMeta(meta, r.meta);
      data = r.data;
      violations = validateGeneratedOutput(data as Record<string, unknown>, claimCtx);
    }
    if (violations.length) return { ok: false, kind: "claims", meta, userMessage: claimsGuidance(violations[0]!) };
    if (findGeneratedContactData(data as Record<string, unknown>)) return { ok: false, kind: "contact", meta, userMessage: "We couldn't put that together cleanly. Please try again." };

    let next: SiteCopy = { ...copy, [section]: data } as SiteCopy;
    if (section === "services") next = reconcileServices(next, pub);
    const spec: SiteDraftSpec = { ...current, copy: siteCopySchema.parse(next) };
    return {
      ok: true,
      data: spec,
      meta,
      persist: async (aiUsageId) => {
        await saveSpec(business.id, spec);
        const row = await db.generatedContent.create({ data: { businessId: business.id, toolType: "website_copy", inputSnapshot: { kind: "section_rewrite", section } as object, output: { [section]: data } as object, model: meta.model, promptVersion: meta.promptVersion, aiUsageId } });
        return row.id;
      },
    };
  });
}

function mergeMeta(a: GenerationMeta, b: GenerationMeta): GenerationMeta {
  const add = (x: number | null, y: number | null) => (x === null && y === null ? null : (x ?? 0) + (y ?? 0));
  return { ...b, inputTokens: add(a.inputTokens, b.inputTokens), outputTokens: add(a.outputTokens, b.outputTokens), cachedTokens: add(a.cachedTokens, b.cachedTokens), reasoningTokens: add(a.reasoningTokens, b.reasoningTokens), durationMs: a.durationMs + b.durationMs, attempts: a.attempts + b.attempts };
}

// ---------------------------------------------------------------------------------------------
// Approval → immutable SiteVersion
// ---------------------------------------------------------------------------------------------

export interface ApprovalInput {
  /** The owner ticked every public fact on the review screen. Server re-derives the facts; the ticks are consent. */
  confirmedFacts: boolean;
  /** Where contact-form messages go (Managed). Must equal the canonical email; never free text from the client. */
  contactEmailConfirmed: boolean;
}

export async function approveDraft(business: BusinessRow, profile: FullProfile, input: ApprovalInput): Promise<{ ok: true; versionId: string; versionNumber: number } | { ok: false; error: string }> {
  if (!input.confirmedFacts) return { ok: false, error: "Please confirm each detail is correct before approving." };
  const current = await getOrCreateDraft(business.id, profile);
  if (!current.copy) return { ok: false, error: "Build your website first." };
  const pub = derivePublicFacts(business, profile, current.setup);

  // Publish-time re-scan on the exact bytes being frozen (plan §8c S2): manual edits are not exempt.
  const claimCtx: ClaimContext = { ownerText: [profile.idealCustomer ?? "", ...((Array.isArray(profile.differentiators) ? (profile.differentiators as string[]) : []) ?? []), ...pub.services.map((s) => `${s.name} ${s.description ?? ""}`)], city: business.city, state: business.state };
  const violations = validateGeneratedOutput(current.copy as Record<string, unknown>, claimCtx);
  if (violations.length) return { ok: false, error: claimsGuidance(violations[0]!) };
  if (findGeneratedContactData(current.copy as Record<string, unknown>)) return { ok: false, error: "Phone numbers, emails, and web addresses are added by the site itself — please remove them from the text." };

  const spec: SiteVersionSpec = siteVersionSpecSchema.parse({ version: 1, setup: current.setup, copy: current.copy, facts: pub });
  const contactEmail = input.contactEmailConfirmed && current.setup.primaryAction === "form" ? pub.email : null;
  if (current.setup.primaryAction === "form" && !contactEmail) return { ok: false, error: "A contact form needs a confirmed business email. Add one in Your Business, or choose Call or Text instead." };

  const last = await db.siteVersion.findFirst({ where: { businessId: business.id }, orderBy: { versionNumber: "desc" }, select: { versionNumber: true } });
  const versionNumber = (last?.versionNumber ?? 0) + 1;
  const row = await db.$transaction(async (tx) => {
    const v = await tx.siteVersion.create({ data: { businessId: business.id, versionNumber, spec, contactEmail } });
    await tx.siteDraft.update({ where: { businessId: business.id }, data: { approvedAt: new Date(), spec: { ...current, approved: Object.fromEntries(SECTION_KEYS.map((k) => [k, true])) } } });
    return v;
  });
  return { ok: true, versionId: row.id, versionNumber };
}

export async function latestVersion(businessId: string): Promise<{ id: string; versionNumber: number; spec: SiteVersionSpec; contactEmail: string | null; createdAt: Date } | null> {
  const row = await db.siteVersion.findFirst({ where: { businessId }, orderBy: { versionNumber: "desc" } });
  if (!row) return null;
  const parsed = siteVersionSpecSchema.safeParse(row.spec);
  if (!parsed.success) return null;
  return { id: row.id, versionNumber: row.versionNumber, spec: parsed.data, contactEmail: row.contactEmail, createdAt: row.createdAt };
}
