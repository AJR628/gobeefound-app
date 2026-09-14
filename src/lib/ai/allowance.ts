// V4 §E — the durable AI allowance. Two layers:
//   1. a short hourly anti-abuse throttle (count of attempts in the last hour);
//   2. the durable per-business budget, reserved with ONE conditional UPDATE so concurrent requests
//      cannot exceed a limit, and released when the failure was ours or the provider's.
// Fails CLOSED: no allowance row, no reservation, no generation. Never an unlimited fallback.
// The store is injectable so policy is unit-tested without Postgres; the Prisma store is the runtime.

import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { AiError } from "./errors";

export type Bucket = "builds" | "edits" | "logos" | "managed_edits";
export type OperationClass = "website_copy" | "descriptions" | "review_requests" | "section_rewrite" | "seo_meta" | "gbp_asset" | "gbp_kit" | "site_draft" | "logo_image";

export function bucketFor(op: OperationClass): Bucket {
  if (op === "site_draft") return "builds";
  if (op === "logo_image") return "logos";
  return "edits";
}

export interface AllowanceSnapshot {
  builds: { used: number; limit: number };
  edits: { used: number; limit: number };
  logos: { used: number; limit: number };
  managed_edits: { used: number; limit: number };
  hourlyLimit: number;
}

/** Exactly the words the owner sees. Never tokens, dollars, or model names. */
export function formatAllowance(bucket: Bucket, snap: AllowanceSnapshot): string {
  const { used, limit } = snap[bucket];
  const left = Math.max(limit - used, 0);
  const noun = bucket === "builds" ? "website build" : bucket === "logos" ? "logo design" : "AI edit";
  return `${left} ${noun}${left === 1 ? "" : "s"} left`;
}

export function exhaustedMessage(bucket: Bucket): string {
  if (bucket === "builds") return "You've used all of your website builds. You can still edit every part of your site by hand, and everything you've already made is yours.";
  if (bucket === "logos") return "You've used all of your logo designs. You can still upload a logo or use a text logo.";
  return "You've used all of your AI edits. You can still edit everything by hand — that never runs out.";
}

// ---------------------------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------------------------

export interface AllowanceStore {
  /** Create the default row if missing; return the snapshot. Throws if it cannot. */
  ensure(businessId: string): Promise<AllowanceSnapshot>;
  /** Atomically increment `used` iff `used < limit`. Returns the post-reservation snapshot, or null when exhausted. */
  reserve(businessId: string, bucket: Bucket): Promise<AllowanceSnapshot | null>;
  /** Give one unit back (never below zero). */
  release(businessId: string, bucket: Bucket): Promise<void>;
  /** Attempts in the trailing hour, all buckets. */
  attemptsLastHour(businessId: string): Promise<number>;
}

const USED_COL: Record<Bucket, string> = { builds: "buildsUsed", edits: "editsUsed", logos: "logosUsed", managed_edits: "managedEditsUsed" };
const LIMIT_COL: Record<Bucket, string> = { builds: "buildsLimit", edits: "editsLimit", logos: "logosLimit", managed_edits: "managedEditsLimit" };

type Row = { buildsLimit: number; buildsUsed: number; editsLimit: number; editsUsed: number; logosLimit: number; logosUsed: number; managedEditsLimit: number; managedEditsUsed: number; hourlyLimit: number };

function toSnapshot(r: Row): AllowanceSnapshot {
  return {
    builds: { used: r.buildsUsed, limit: r.buildsLimit },
    edits: { used: r.editsUsed, limit: r.editsLimit },
    logos: { used: r.logosUsed, limit: r.logosLimit },
    managed_edits: { used: r.managedEditsUsed, limit: r.managedEditsLimit },
    hourlyLimit: r.hourlyLimit,
  };
}

export const prismaAllowanceStore: AllowanceStore = {
  async ensure(businessId) {
    const row = await db.aiAllowance.upsert({ where: { businessId }, create: { businessId }, update: {} });
    return toSnapshot(row);
  },
  async reserve(businessId, bucket) {
    // Column names come from a closed map, never from input.
    const used = Prisma.raw(`"${USED_COL[bucket]}"`);
    const limit = Prisma.raw(`"${LIMIT_COL[bucket]}"`);
    const rows = await db.$queryRaw<Row[]>(Prisma.sql`
      UPDATE "AiAllowance"
         SET ${used} = ${used} + 1, "updatedAt" = now()
       WHERE "businessId" = ${businessId}::uuid AND ${used} < ${limit}
      RETURNING "buildsLimit","buildsUsed","editsLimit","editsUsed","logosLimit","logosUsed","managedEditsLimit","managedEditsUsed","hourlyLimit"`);
    return rows[0] ? toSnapshot(rows[0]) : null;
  },
  async release(businessId, bucket) {
    const used = Prisma.raw(`"${USED_COL[bucket]}"`);
    await db.$executeRaw(Prisma.sql`UPDATE "AiAllowance" SET ${used} = GREATEST(${used} - 1, 0), "updatedAt" = now() WHERE "businessId" = ${businessId}::uuid`);
  },
  async attemptsLastHour(businessId) {
    return db.aiUsage.count({ where: { businessId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  },
};

// ---------------------------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------------------------

export interface Reservation {
  bucket: Bucket;
  snapshot: AllowanceSnapshot;
}

/**
 * Throttle, then reserve. Throws AiError("rate_limit") on the hourly throttle and AiError("allowance")
 * when the bucket is exhausted. Fails closed if the store cannot answer.
 */
export async function reserveAllowance(businessId: string, op: OperationClass, store: AllowanceStore = prismaAllowanceStore): Promise<Reservation> {
  const bucket = bucketFor(op);
  const snap = await store.ensure(businessId);
  const attempts = await store.attemptsLastHour(businessId);
  if (attempts >= snap.hourlyLimit) {
    throw new AiError("rate_limit", { internal: `hourly throttle: ${attempts}/${snap.hourlyLimit}` }, "You've generated a lot in the last hour. Take a break and try again soon.");
  }
  const after = await store.reserve(businessId, bucket);
  if (!after) throw new AiError("allowance", { internal: `exhausted: ${bucket}` }, exhaustedMessage(bucket));
  return { bucket, snapshot: after };
}

/** Whether a failed generation gives its unit back. Ours/provider's fault → yes. Real tokens spent on a bad draft → no. */
export function shouldRelease(kind: string): boolean {
  return kind === "config" || kind === "rate_limit" || kind === "quota" || kind === "timeout" || kind === "unavailable" || kind === "refusal" || kind === "schema" || kind === "truncated" || kind === "unknown";
}

export async function releaseAllowance(businessId: string, bucket: Bucket, store: AllowanceStore = prismaAllowanceStore): Promise<void> {
  await store.release(businessId, bucket);
}

export async function readAllowance(businessId: string, store: AllowanceStore = prismaAllowanceStore): Promise<AllowanceSnapshot> {
  return store.ensure(businessId);
}
