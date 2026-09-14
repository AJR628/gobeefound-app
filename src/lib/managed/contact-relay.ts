// V4 §H — the stateless contact relay's rules, as pure functions plus one atomic counter. Nothing about
// the message is ever stored: the counter keys hold a slug or a hashed IP prefix and a time window only.
import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "../db";

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  contact: z.string().trim().min(3).max(120),
  message: z.string().trim().min(2).max(1500),
});
export type ContactMessage = z.infer<typeof contactSchema>;

export const MIN_FILL_SECONDS = 3;
export const PER_SITE_DAILY_CAP = 30;
export const PER_IP_MINUTE_CAP = 3;

export type ParseResult = { ok: true; data: ContactMessage } | { ok: false; reason: "honeypot" | "too_fast" | "invalid" };

/** Pure. Honeypot filled → bot. Submitted faster than a human can type → bot. Otherwise validate. */
export function parseContactForm(fields: Record<string, string | undefined>, nowSeconds: number): ParseResult {
  if ((fields.website ?? "").trim() !== "") return { ok: false, reason: "honeypot" };
  const t = Number(fields.t ?? 0);
  if (t > 0 && nowSeconds - t < MIN_FILL_SECONDS) return { ok: false, reason: "too_fast" };
  const parsed = contactSchema.safeParse({ name: fields.name, contact: fields.contact, message: fields.message });
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, reason: "invalid" };
}

export function ipKey(ip: string, now = new Date()): string {
  const h = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  return `h:${h}:${now.toISOString().slice(0, 16)}`; // minute window
}
export function siteKey(slug: string, now = new Date()): string {
  return `slug:${slug}:${now.toISOString().slice(0, 10)}`; // day window
}

/**
 * Atomic increment-if-below-cap. One statement: concurrent submissions cannot exceed the cap.
 * Returns true when the request is allowed.
 */
export async function bump(key: string, cap: number, ttlSeconds: number): Promise<boolean> {
  const expires = new Date(Date.now() + ttlSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>(Prisma.sql`
    INSERT INTO "ContactRelayCounter" ("key","count","windowStart","expiresAt") VALUES (${key}, 1, now(), ${expires})
    ON CONFLICT ("key") DO UPDATE SET "count" = "ContactRelayCounter"."count" + 1
      WHERE "ContactRelayCounter"."count" < ${cap}
    RETURNING "count"`);
  return rows.length > 0;
}

/** Best-effort cleanup of expired counters; called opportunistically from the relay. */
export async function sweepCounters(): Promise<void> {
  await db.contactRelayCounter.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);
}
