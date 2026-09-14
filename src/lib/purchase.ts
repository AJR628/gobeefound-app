// §4 / §15.5 — credit math. Always derived from amountCents; never a constant.

export const CREDIT_WINDOW_DAYS = 90;

export type ActivePrice = "founding" | "standard";

export function activePrice(): ActivePrice {
  return process.env.LAUNCH_ACTIVE_PRICE === "standard" ? "standard" : "founding";
}

export function expectedAmountCents(price: ActivePrice): number {
  return price === "standard" ? 16900 : 7900;
}

export function priceIdFor(price: ActivePrice): string {
  const id = price === "standard" ? process.env.STRIPE_PRICE_ID_LAUNCH_STANDARD : process.env.STRIPE_PRICE_ID_LAUNCH_FOUNDING;
  if (!id) throw new Error(`Missing Stripe price id for ${price}`);
  return id;
}

export function creditExpiry(paidAt: Date): Date {
  return new Date(paidAt.getTime() + CREDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export interface PurchaseLike {
  amountCents: number;
  status: "pending" | "paid" | "refunded";
  paidAt: Date | null;
  creditExpiresAt: Date | null;
  creditRedeemedAt: Date | null;
}

/** The credit the owner can currently apply toward the $900 build, or null. */
export function activeCredit(p: PurchaseLike | null | undefined, now = new Date()): { amountCents: number; expiresAt: Date } | null {
  if (!p || p.status !== "paid" || !p.creditExpiresAt) return null;
  if (p.creditRedeemedAt) return null;
  if (p.creditExpiresAt <= now) return null;
  return { amountCents: p.amountCents, expiresAt: p.creditExpiresAt };
}

export function money(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}
