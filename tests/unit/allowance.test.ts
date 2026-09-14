// V4 §E — allowance policy, with an in-memory store that mimics the conditional UPDATE. No Postgres.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

import { bucketFor, exhaustedMessage, formatAllowance, releaseAllowance, reserveAllowance, shouldRelease, type AllowanceSnapshot, type AllowanceStore, type Bucket } from "@/lib/ai/allowance";
import { estimateCostMicros, priceFor } from "@/lib/ai/pricing";

function memoryStore(init: Partial<AllowanceSnapshot> = {}, attempts = 0): AllowanceStore & { snap: AllowanceSnapshot } {
  const snap: AllowanceSnapshot = {
    builds: { used: 0, limit: 5 },
    edits: { used: 0, limit: 40 },
    logos: { used: 0, limit: 3 },
    managed_edits: { used: 0, limit: 10 },
    hourlyLimit: 20,
    ...init,
  };
  return {
    snap,
    async ensure() {
      return structuredClone(snap);
    },
    async reserve(_id, bucket: Bucket) {
      // Mirrors `UPDATE … SET used = used + 1 WHERE used < limit RETURNING …`
      if (snap[bucket].used >= snap[bucket].limit) return null;
      snap[bucket].used += 1;
      return structuredClone(snap);
    },
    async release(_id, bucket: Bucket) {
      snap[bucket].used = Math.max(snap[bucket].used - 1, 0);
    },
    async attemptsLastHour() {
      return attempts;
    },
  };
}

describe("bucketFor", () => {
  it("routes full site drafts, logos, and everything else to the right budget", () => {
    expect(bucketFor("site_draft")).toBe("builds");
    expect(bucketFor("logo_image")).toBe("logos");
    for (const op of ["website_copy", "descriptions", "review_requests", "section_rewrite", "seo_meta", "gbp_asset"] as const) expect(bucketFor(op)).toBe("edits");
  });
});

describe("reserveAllowance", () => {
  it("reserves one unit and returns the post-reservation snapshot", async () => {
    const store = memoryStore();
    const r = await reserveAllowance("b1", "descriptions", store);
    expect(r.bucket).toBe("edits");
    expect(r.snapshot.edits.used).toBe(1);
  });

  it("fails closed with AiError allowance when the bucket is exhausted", async () => {
    const store = memoryStore({ edits: { used: 40, limit: 40 } });
    await expect(reserveAllowance("b1", "descriptions", store)).rejects.toMatchObject({ kind: "allowance", httpStatus: 429 });
    expect(store.snap.edits.used).toBe(40);
  });

  it("the hourly throttle stops a request before it reserves", async () => {
    const store = memoryStore({}, 20);
    await expect(reserveAllowance("b1", "descriptions", store)).rejects.toMatchObject({ kind: "rate_limit" });
    expect(store.snap.edits.used).toBe(0);
  });

  it("N concurrent reservations against a limit of N-2 admit exactly N-2", async () => {
    const store = memoryStore({ builds: { used: 0, limit: 3 } });
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => reserveAllowance("b1", "site_draft", store)));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBe(3);
    expect(store.snap.builds.used).toBe(3);
  });

  it("the site-draft bucket is separate from the edits bucket", async () => {
    const store = memoryStore({ builds: { used: 5, limit: 5 } });
    await expect(reserveAllowance("b1", "site_draft", store)).rejects.toMatchObject({ kind: "allowance" });
    await expect(reserveAllowance("b1", "descriptions", store)).resolves.toBeTruthy();
  });

  it("release never goes below zero", async () => {
    const store = memoryStore();
    await releaseAllowance("b1", "edits", store);
    expect(store.snap.edits.used).toBe(0);
  });
});

describe("shouldRelease — who pays for a failure", () => {
  it("our or the provider's failure gives the unit back", () => {
    for (const k of ["config", "rate_limit", "quota", "timeout", "unavailable", "refusal", "schema", "truncated", "unknown"]) expect(shouldRelease(k), k).toBe(true);
  });
  it("a draft that was produced but rejected for claims keeps the unit", () => {
    expect(shouldRelease("claims")).toBe(false);
  });
});

describe("customer-facing wording", () => {
  const snap: AllowanceSnapshot = { builds: { used: 1, limit: 5 }, edits: { used: 8, limit: 40 }, logos: { used: 2, limit: 3 }, managed_edits: { used: 0, limit: 10 }, hourlyLimit: 20 };
  it("formats exactly as the product contract says", () => {
    expect(formatAllowance("builds", snap)).toBe("4 website builds left");
    expect(formatAllowance("edits", snap)).toBe("32 AI edits left");
    expect(formatAllowance("logos", snap)).toBe("1 logo design left");
  });
  it("never mentions tokens, dollars, or models", () => {
    for (const b of ["builds", "edits", "logos"] as const) {
      expect(formatAllowance(b, snap)).not.toMatch(/token|\$|gpt|model/i);
      expect(exhaustedMessage(b)).not.toMatch(/token|\$|gpt|model/i);
    }
  });
  it("exhaustion messages name what still works", () => {
    expect(exhaustedMessage("edits")).toMatch(/by hand/);
    expect(exhaustedMessage("logos")).toMatch(/upload/);
  });
});

describe("pricing", () => {
  it("prices known models and dated snapshots, null for unknown", () => {
    expect(priceFor("gpt-5.6-luna")?.outputPerM).toBe(1.2);
    expect(priceFor("gpt-5.6-luna-2026-02-16")?.outputPerM).toBe(1.2);
    expect(priceFor("mystery-model")).toBeNull();
  });
  it("estimates micro-dollars with cached tokens at the cached rate", () => {
    // 1,000 input (200 cached) + 500 output on luna: 800*0.2 + 200*0.02 + 500*1.2 = 764 micro-USD... per 1M → /1M
    expect(estimateCostMicros("gpt-5.6-luna", { inputTokens: 1000, outputTokens: 500, cachedTokens: 200 })).toBe(764);
    expect(estimateCostMicros("unknown", { inputTokens: 1, outputTokens: 1, cachedTokens: 0 })).toBeNull();
    expect(estimateCostMicros("gpt-5.6-luna", { inputTokens: null, outputTokens: 1, cachedTokens: 0 })).toBeNull();
  });
  it("a full-site draft on sol lands near the plan estimate (~$0.11)", () => {
    const micros = estimateCostMicros("gpt-5.6-sol", { inputTokens: 2500, outputTokens: 5000, cachedTokens: 0 })!;
    expect(micros / 1_000_000).toBeGreaterThan(0.09);
    expect(micros / 1_000_000).toBeLessThan(0.13);
  });
});
