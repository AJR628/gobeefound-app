"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { getManagedState } from "@/lib/managed/entitlement";
import { createManagedCheckout, portalUrl, setCancelAtPeriodEnd, applySubscription } from "@/lib/managed/stripe";
import { addDomain, removeDomain, verifyDomain, type VerifyOutcome } from "@/lib/managed/domains";
import { publishVersion } from "@/lib/site/publish";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics/server";

// V4 §F/§I — owner actions for Managed. Publishing/rollback require Managed entitlement; cancel is
// "stop renewing" (site stays live to period end); reactivate clears it. Domains: add → check → remove.

async function gate() {
  const ctx = await requireBusiness();
  if ((await getEntitlement(ctx.user.id)) !== "launch") return null;
  return ctx;
}

export async function startManagedCheckout(): Promise<void> {
  const ctx = await gate();
  if (!ctx) redirect("/unlock?from=%2Fsite%2Fmanaged");
  const version = await db.siteVersion.findFirst({ where: { businessId: ctx.business.id }, select: { id: true } });
  if (!version) redirect("/site/review");
  await track(ctx.user.id, "managed_checkout_started");
  const url = await createManagedCheckout({ userId: ctx.user.id, email: ctx.user.email, businessId: ctx.business.id });
  if (!url) redirect("/site/publish?error=managed");
  redirect(url);
}

export async function cancelManaged(): Promise<{ ok: boolean; error?: string }> {
  const ctx = await gate();
  if (!ctx) return { ok: false, error: "Launch required." };
  const sub = await setCancelAtPeriodEnd(ctx.business.id, true);
  if (!sub) return { ok: false, error: "No hosting subscription found." };
  await applySubscription(sub);
  await track(ctx.user.id, "managed_cancelled");
  revalidatePath("/site/managed");
  return { ok: true };
}

export async function reactivateManaged(): Promise<{ ok: boolean; error?: string }> {
  const ctx = await gate();
  if (!ctx) return { ok: false, error: "Launch required." };
  const sub = await setCancelAtPeriodEnd(ctx.business.id, false);
  if (!sub) return { ok: false, error: "No hosting subscription found." };
  await applySubscription(sub);
  await track(ctx.user.id, "managed_reactivated");
  revalidatePath("/site/managed");
  return { ok: true };
}

export async function openBillingPortal(): Promise<void> {
  const ctx = await gate();
  if (!ctx) redirect("/site");
  const url = await portalUrl(ctx.business.id);
  redirect(url ?? "/site/managed?error=portal");
}

const publishInput = z.object({ versionId: z.string().uuid().optional() });
export async function publishNow(input: unknown): Promise<{ ok: boolean; error?: string; url?: string }> {
  const ctx = await gate();
  if (!ctx) return { ok: false, error: "Launch required." };
  const state = await getManagedState(ctx.business.id);
  if (!state.entitled) return { ok: false, error: "Managed hosting isn't active." };
  const p = publishInput.safeParse(input ?? {});
  if (!p.success) return { ok: false, error: "Pick a version." };
  const r = await publishVersion(ctx.business.id, p.data.versionId);
  if (!r.ok) return { ok: false, error: r.error };
  await track(ctx.user.id, p.data.versionId ? "site_rolled_back" : "site_published", { versionNumber: r.versionNumber });
  revalidatePath("/site/managed");
  return { ok: true, url: r.url };
}

const addDomainInput = z.object({ domain: z.string().min(3).max(253), dnsProvider: z.string().max(40).nullable() });
export async function connectDomain(input: unknown): Promise<{ ok: boolean; error?: string; id?: string }> {
  const ctx = await gate();
  if (!ctx) return { ok: false, error: "Launch required." };
  const state = await getManagedState(ctx.business.id);
  if (!state.entitled) return { ok: false, error: "Managed hosting isn't active." };
  const p = addDomainInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Type your domain, like mikesjunkremoval.com." };
  const r = await addDomain(ctx.business.id, p.data.domain, p.data.dnsProvider);
  if (r.ok) await track(ctx.user.id, "domain_added");
  revalidatePath("/site/managed");
  return r.ok ? { ok: true, id: r.id } : { ok: false, error: r.error };
}

const idInput = z.object({ id: z.string().uuid() });
export async function checkDomain(input: unknown): Promise<VerifyOutcome | { state: "failed"; message: string; detail: string[]; mxWarning: null }> {
  const ctx = await gate();
  if (!ctx) return { state: "failed", message: "Launch required.", detail: [], mxWarning: null };
  const p = idInput.safeParse(input);
  if (!p.success) return { state: "failed", message: "That domain wasn't found.", detail: [], mxWarning: null };
  const r = await verifyDomain(ctx.business.id, p.data.id);
  if (r.state === "active") await track(ctx.user.id, "domain_active");
  else if (r.state === "dns_verified") await track(ctx.user.id, "domain_verified");
  revalidatePath("/site/managed");
  return r;
}

export async function disconnectDomain(input: unknown): Promise<{ ok: boolean }> {
  const ctx = await gate();
  if (!ctx) return { ok: false };
  const p = idInput.safeParse(input);
  if (!p.success) return { ok: false };
  await removeDomain(ctx.business.id, p.data.id);
  revalidatePath("/site/managed");
  return { ok: true };
}
