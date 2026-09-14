// V4 §F — Managed entitlement is DERIVED, never stored (same principle as Launch). The public renderer
// and every Managed action ask this one function. Pure core + a thin DB wrapper.
import { cache } from "react";
import { db } from "../db";

export const MANAGED_GRACE_DAYS = 7;

export interface ManagedLike {
  status: "incomplete" | "active" | "past_due" | "cancel_at_period_end" | "canceled" | "ended";
  currentPeriodEnd: Date | null;
  graceEndsAt: Date | null;
}

export type ManagedState =
  | { entitled: true; reason: "active" | "cancelling" | "grace"; until: Date | null }
  | { entitled: false; reason: "none" | "incomplete" | "ended" | "period_over" | "grace_over" };

/** Pure. The customer-facing lifecycle in V4 §F, exactly. */
export function deriveManagedState(m: ManagedLike | null | undefined, now = new Date()): ManagedState {
  if (!m) return { entitled: false, reason: "none" };
  const periodOk = !m.currentPeriodEnd || m.currentPeriodEnd.getTime() + 24 * 3600 * 1000 > now.getTime(); // 1-day clock/renewal slack
  switch (m.status) {
    case "active":
      return periodOk ? { entitled: true, reason: "active", until: m.currentPeriodEnd } : { entitled: false, reason: "period_over" };
    case "cancel_at_period_end":
      return m.currentPeriodEnd && m.currentPeriodEnd.getTime() > now.getTime() ? { entitled: true, reason: "cancelling", until: m.currentPeriodEnd } : { entitled: false, reason: "period_over" };
    case "past_due":
      return m.graceEndsAt && m.graceEndsAt.getTime() > now.getTime() ? { entitled: true, reason: "grace", until: m.graceEndsAt } : { entitled: false, reason: "grace_over" };
    case "incomplete":
      return { entitled: false, reason: "incomplete" };
    default:
      return { entitled: false, reason: "ended" };
  }
}

export const getManagedState = cache(async (businessId: string): Promise<ManagedState> => {
  const m = await db.managedSubscription.findUnique({ where: { businessId } });
  return deriveManagedState(m);
});

export function managedStatusCopy(s: ManagedState): string {
  const d = (x: Date | null) => (x ? x.toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "");
  switch (s.reason) {
    case "active":
      return `Managed hosting is on. Renews ${d(s.until)}.`;
    case "cancelling":
      return `Managed hosting is cancelled. Your site stays live until ${d(s.until)}. You can export it any time.`;
    case "grace":
      return `We couldn't take your last payment. Your site stays live until ${d(s.until)} — fix your payment method to keep it online.`;
    case "none":
      return "Not hosted with GoBeeFound yet.";
    case "incomplete":
      return "Your payment hasn't gone through yet.";
    case "period_over":
    case "grace_over":
    case "ended":
      return "Managed hosting has ended. Your site is offline, your data is safe, and you can reactivate or export.";
  }
}
