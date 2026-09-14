// V4 §E / plan §15 — the metered wrapper every AI generation runs through:
//   idempotency (a replay returns the stored result and charges nothing)
//   → hourly throttle → atomic reservation → pending ledger row → the call
//   → finalize the ledger row (usage, cost, request ids) → release the unit if the failure was not the owner's.
// This is the ONLY place allowance is consumed. No client-supplied token, cost, or model field exists.

import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { AiError, isAiError, type AiErrorKind } from "./errors";
import { bucketFor, releaseAllowance, reserveAllowance, shouldRelease, type AllowanceSnapshot, type Bucket, type OperationClass } from "./allowance";
import { estimateCostMicros } from "./pricing";
import type { GenerationMeta } from "./types";

export interface MeteredContext {
  businessId: string;
  operation: OperationClass;
  /** Client-minted UUID per user intent. Absent → a fresh key (no replay protection for that call). */
  idempotencyKey?: string | null;
  platformRequestId?: string | null;
}

/** What the wrapped generator must return. `kind` names a rejection that still spent tokens. */
export type MeteredOutcome<T> =
  | { ok: true; data: T; meta: GenerationMeta; persist: (aiUsageId: string) => Promise<string /* generatedContentId */> }
  | { ok: false; kind: "claims" | "contact"; meta: GenerationMeta; userMessage: string };

export interface MeteredSuccess<T> {
  ok: true;
  generationId: string;
  generatedContentId: string;
  data: T;
  allowance: AllowanceSnapshot;
  bucket: Bucket;
  replayed: boolean;
}
export interface MeteredFailure {
  ok: false;
  generationId: string;
  kind: AiErrorKind;
  status: number;
  userMessage: string;
  allowance: AllowanceSnapshot | null;
  bucket: Bucket;
}
export type MeteredResult<T> = MeteredSuccess<T> | MeteredFailure;

const KEY_RE = /^[A-Za-z0-9_-]{8,128}$/;

function statusFor(kind: AiErrorKind): number {
  return new AiError(kind).httpStatus;
}

/**
 * Runs `work` under the allowance. `work` receives the generationId for logging and must not touch the
 * allowance itself.
 */
export async function runMetered<T>(ctx: MeteredContext, work: (generationId: string) => Promise<MeteredOutcome<T>>): Promise<MeteredResult<T>> {
  const bucket = bucketFor(ctx.operation);
  const idempotencyKey = ctx.idempotencyKey && KEY_RE.test(ctx.idempotencyKey) ? ctx.idempotencyKey : randomUUID();

  // 1. Idempotent replay — the same intent never charges twice.
  const prior = await db.aiUsage.findUnique({ where: { businessId_idempotencyKey: { businessId: ctx.businessId, idempotencyKey } } });
  if (prior) {
    if (prior.outcome === "ok" && prior.generatedContentId) {
      const row = await db.generatedContent.findFirst({ where: { id: prior.generatedContentId, businessId: ctx.businessId } });
      const snap = await reserveSnapshotOnly(ctx.businessId);
      if (row) return { ok: true, generationId: prior.generationId, generatedContentId: row.id, data: row.output as T, allowance: snap, bucket, replayed: true };
    }
    if (prior.outcome === "pending") {
      return { ok: false, generationId: prior.generationId, kind: "rate_limit", status: 409, userMessage: "That's still being written. Give it a moment.", allowance: null, bucket };
    }
    // A finished failure with the same key: fall through and try again under a fresh ledger row.
  }

  // 2. Throttle + reserve (throws AiError rate_limit / allowance; fails closed).
  let reservation;
  try {
    reservation = await reserveAllowance(ctx.businessId, ctx.operation);
  } catch (e) {
    const err = isAiError(e) ? e : new AiError("unknown", { cause: e });
    const generationId = randomUUID();
    // Record the refusal-to-run too: it is how we see abuse and exhaustion in the ledger.
    await db.aiUsage
      .create({ data: { businessId: ctx.businessId, generationId, idempotencyKey: prior ? `${idempotencyKey}:${generationId.slice(0, 8)}` : idempotencyKey, operation: ctx.operation, bucket, outcome: "error", errorKind: err.kind, consumed: false, platformRequestId: ctx.platformRequestId ?? null, finishedAt: new Date() } })
      .catch(() => undefined);
    return { ok: false, generationId, kind: err.kind, status: err.httpStatus, userMessage: err.userMessage, allowance: null, bucket };
  }

  // 3. Pending ledger row. The unique (businessId, idempotencyKey) makes a concurrent duplicate fail here.
  const generationId = randomUUID();
  let usageId: string;
  try {
    const row = await db.aiUsage.create({
      data: { businessId: ctx.businessId, generationId, idempotencyKey: prior ? `${idempotencyKey}:${generationId.slice(0, 8)}` : idempotencyKey, operation: ctx.operation, bucket, outcome: "pending", consumed: true, platformRequestId: ctx.platformRequestId ?? null },
    });
    usageId = row.id;
  } catch (e) {
    await releaseAllowance(ctx.businessId, bucket);
    return { ok: false, generationId, kind: "rate_limit", status: 409, userMessage: "That's still being written. Give it a moment.", allowance: null, bucket };
  }

  // 4. The call.
  try {
    const outcome = await work(generationId);
    const meta = outcome.meta;
    const cost = estimateCostMicros(meta.model, { inputTokens: meta.inputTokens, outputTokens: meta.outputTokens, cachedTokens: meta.cachedTokens });
    const usageFields = { provider: meta.provider, model: meta.model, promptVersion: meta.promptVersion, inputTokens: meta.inputTokens, outputTokens: meta.outputTokens, cachedTokens: meta.cachedTokens, reasoningTokens: meta.reasoningTokens, estimatedCostMicros: cost, durationMs: meta.durationMs, attempts: meta.attempts, providerRequestId: meta.requestId, finishedAt: new Date() };

    if (outcome.ok) {
      const generatedContentId = await outcome.persist(usageId);
      await db.aiUsage.update({ where: { id: usageId }, data: { ...usageFields, outcome: "ok", consumed: true, generatedContentId } });
      return { ok: true, generationId, generatedContentId, data: outcome.data, allowance: reservation.snapshot, bucket, replayed: false };
    }

    // Tokens were spent on a draft we refused to show. The unit stays consumed (V4 §E).
    await db.aiUsage.update({ where: { id: usageId }, data: { ...usageFields, outcome: outcome.kind === "claims" ? "claims_rejected" : "contact_rejected", errorKind: outcome.kind, consumed: true } });
    return { ok: false, generationId, kind: outcome.kind === "claims" ? "claims" : "schema", status: outcome.kind === "claims" ? 422 : 502, userMessage: outcome.userMessage, allowance: reservation.snapshot, bucket };
  } catch (e) {
    const err = isAiError(e) ? e : new AiError("unknown", { internal: String((e as Error)?.message ?? e).slice(0, 300), cause: e });
    const release = shouldRelease(err.kind);
    if (release) await releaseAllowance(ctx.businessId, bucket).catch(() => undefined);
    await db.aiUsage.update({ where: { id: usageId }, data: { outcome: "error", errorKind: err.kind, consumed: !release, providerRequestId: err.detail.requestId ?? null, finishedAt: new Date() } }).catch(() => undefined);
    const snap = release ? { ...reservation.snapshot, [bucket]: { ...reservation.snapshot[bucket], used: Math.max(reservation.snapshot[bucket].used - 1, 0) } } : reservation.snapshot;
    return { ok: false, generationId, kind: err.kind, status: statusFor(err.kind), userMessage: err.userMessage, allowance: snap, bucket };
  }
}

async function reserveSnapshotOnly(businessId: string): Promise<AllowanceSnapshot> {
  const { readAllowance } = await import("./allowance");
  return readAllowance(businessId);
}
