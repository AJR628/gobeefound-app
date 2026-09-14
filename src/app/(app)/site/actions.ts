"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { approveDraft, editCopy, setSectionApproved, updateSetup } from "@/lib/site/draft";
import { SECTION_KEYS } from "@/lib/site/spec";
import { track } from "@/lib/analytics/server";

// V4 §D — owner actions that cost nothing: design choices, manual text edits, approval. All validated
// server-side against the closed vocabulary and the owner's real data.

async function gate() {
  const ctx = await requireBusiness();
  if ((await getEntitlement(ctx.user.id)) !== "launch") return null;
  return ctx;
}

export async function saveSetup(patch: unknown): Promise<{ ok: boolean; error?: string }> {
  const ctx = await gate();
  if (!ctx) return { ok: false, error: "Launch required." };
  const r = await updateSetup(ctx.business.id, ctx.profile, patch);
  revalidatePath("/site");
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function saveCopy(patch: unknown): Promise<{ ok: boolean; error?: string }> {
  const ctx = await gate();
  if (!ctx) return { ok: false, error: "Launch required." };
  const r = await editCopy(ctx.business.id, ctx.profile, patch);
  revalidatePath("/site");
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

const approveSectionInput = z.object({ section: z.enum(SECTION_KEYS), approved: z.boolean() });
export async function approveSection(input: unknown): Promise<{ ok: boolean }> {
  const ctx = await gate();
  if (!ctx) return { ok: false };
  const p = approveSectionInput.safeParse(input);
  if (!p.success) return { ok: false };
  await setSectionApproved(ctx.business.id, ctx.profile, p.data.section, p.data.approved);
  revalidatePath("/site");
  return { ok: true };
}

const approveInput = z.object({ confirmedFacts: z.boolean(), contactEmailConfirmed: z.boolean() });
export async function approveWebsite(input: unknown): Promise<{ ok: boolean; error?: string; versionNumber?: number }> {
  const ctx = await gate();
  if (!ctx) return { ok: false, error: "Launch required." };
  const p = approveInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Please confirm the details." };
  const r = await approveDraft(ctx.business, ctx.profile, p.data);
  if (!r.ok) return { ok: false, error: r.error };
  await track(ctx.user.id, "site_approved", { versionNumber: r.versionNumber });
  revalidatePath("/site");
  return { ok: true, versionNumber: r.versionNumber };
}
