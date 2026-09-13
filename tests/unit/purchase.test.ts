import { describe, expect, it } from "vitest";
import { activeCredit, creditExpiry, expectedAmountCents, money } from "@/lib/purchase";

describe("§4 / §15.5 credit math derives from amountCents", () => {
  const paidAt = new Date("2026-09-13T12:00:00Z");
  const base = { status: "paid" as const, paidAt, creditExpiresAt: creditExpiry(paidAt), creditRedeemedAt: null };

  it("founding purchase → $79 credit; standard → $99", () => {
    expect(activeCredit({ ...base, amountCents: 7900 })?.amountCents).toBe(7900);
    expect(activeCredit({ ...base, amountCents: 9900 })?.amountCents).toBe(9900);
    expect(expectedAmountCents("founding")).toBe(7900);
    expect(expectedAmountCents("standard")).toBe(9900);
  });
  it("expires 90 days after paidAt", () => {
    expect(creditExpiry(paidAt).toISOString()).toBe("2026-12-12T12:00:00.000Z");
    expect(activeCredit({ ...base, amountCents: 7900 }, new Date("2026-12-13T00:00:00Z"))).toBeNull();
  });
  it("is void once redeemed, refunded, or pending", () => {
    expect(activeCredit({ ...base, amountCents: 7900, creditRedeemedAt: new Date() })).toBeNull();
    expect(activeCredit({ ...base, amountCents: 7900, status: "refunded" })).toBeNull();
    expect(activeCredit({ ...base, amountCents: 7900, status: "pending", creditExpiresAt: null })).toBeNull();
  });
  it("formats money without spurious cents", () => {
    expect(money(7900)).toBe("$79");
    expect(money(9900)).toBe("$99");
    expect(money(1050)).toBe("$10.50");
  });
});
