// V4 §F — Stripe for THE single recurring product. Checkout creation, state mapping from Stripe's
// subscription object (pure, tested), cancel/reactivate, and the customer portal for payment fixes.
// Only the verified webhook (api/stripe/webhook) and these owner actions write ManagedSubscription.
import "server-only";
import type Stripe from "stripe";
import { db } from "../db";
import { stripe } from "../stripe";
import { MANAGED_GRACE_DAYS } from "./entitlement";

export const MANAGED_PRICE_CENTS = 1900;

export function managedPriceId(): string | null {
  return process.env.STRIPE_PRICE_ID_MANAGED_MONTHLY ?? null;
}

export type ManagedStatusValue = "incomplete" | "active" | "past_due" | "cancel_at_period_end" | "canceled" | "ended";

/** Stripe's subscription shape moved `current_period_end` onto items in recent API versions; read both. */
export function periodEndOf(sub: unknown): Date | null {
  const s = sub as { current_period_end?: number; items?: { data?: { current_period_end?: number }[] } };
  const secs = s.current_period_end ?? s.items?.data?.[0]?.current_period_end ?? null;
  return secs ? new Date(secs * 1000) : null;
}

/** Pure: Stripe status → our lifecycle status (V4 §F table). Exported for tests. */
export function mapStripeStatus(stripeStatus: string, cancelAtPeriodEnd: boolean): ManagedStatusValue {
  switch (stripeStatus) {
    case "trialing":
    case "active":
      return cancelAtPeriodEnd ? "cancel_at_period_end" : "active";
    case "past_due":
      return "past_due";
    case "unpaid":
    case "canceled":
      return "ended";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
    case "paused":
    default:
      return "ended";
  }
}

export interface ApplyResult {
  businessId: string;
  previous: ManagedStatusValue | null;
  status: ManagedStatusValue;
  currentPeriodEnd: Date | null;
  graceEndsAt: Date | null;
  userId: string | null;
}

/**
 * Upsert our row from a Stripe subscription object. Idempotent: Stripe's state is the source of truth,
 * every handler is a pure projection of it. `businessId` comes from subscription metadata (set at checkout)
 * or from the existing row.
 */
export async function applySubscription(sub: Stripe.Subscription, opts: { paymentFailed?: boolean; paymentSucceeded?: boolean } = {}): Promise<ApplyResult | null> {
  const existing = await db.managedSubscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
  const businessId = existing?.businessId ?? (sub.metadata?.businessId as string | undefined);
  if (!businessId) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), evt: "managed_apply_no_business", subscriptionId: sub.id }));
    return null;
  }
  const userId = existing?.userId ?? (sub.metadata?.userId as string | undefined) ?? null;
  const status = mapStripeStatus(sub.status, Boolean(sub.cancel_at_period_end));
  const currentPeriodEnd = periodEndOf(sub);
  const now = new Date();
  let graceEndsAt = existing?.graceEndsAt ?? null;
  if (status === "past_due" && (opts.paymentFailed || !graceEndsAt)) graceEndsAt = graceEndsAt && graceEndsAt > now ? graceEndsAt : new Date(now.getTime() + MANAGED_GRACE_DAYS * 86_400_000);
  if (status === "active" || status === "cancel_at_period_end") graceEndsAt = null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const row = await db.managedSubscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: { businessId, userId, stripeCustomerId: customerId, stripeSubscriptionId: sub.id, status, currentPeriodEnd, graceEndsAt, canceledAt: status === "cancel_at_period_end" || status === "ended" ? now : null, endedAt: status === "ended" ? now : null },
    update: { status, currentPeriodEnd, graceEndsAt, stripeCustomerId: customerId, canceledAt: status === "cancel_at_period_end" ? (existing?.canceledAt ?? now) : status === "ended" ? (existing?.canceledAt ?? now) : null, endedAt: status === "ended" ? (existing?.endedAt ?? now) : null },
  });

  if (opts.paymentSucceeded) {
    // New billing month: reset the Managed AI-edit allowance (V4 §E).
    await db.aiAllowance.updateMany({ where: { businessId }, data: { managedEditsUsed: 0, managedPeriodStart: now } });
  }
  return { businessId, previous: (existing?.status as ManagedStatusValue | undefined) ?? null, status: row.status as ManagedStatusValue, currentPeriodEnd, graceEndsAt, userId };
}

export async function createManagedCheckout(args: { userId: string; email: string; businessId: string }): Promise<string | null> {
  const price = managedPriceId();
  if (!price) return null;
  const app = process.env.NEXT_PUBLIC_APP_URL!;
  const existing = await db.managedSubscription.findUnique({ where: { businessId: args.businessId } });
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    ...(existing?.stripeCustomerId ? { customer: existing.stripeCustomerId } : { customer_email: args.email }),
    client_reference_id: args.userId,
    metadata: { userId: args.userId, businessId: args.businessId, product: "managed_website" },
    subscription_data: { metadata: { userId: args.userId, businessId: args.businessId, product: "managed_website" } },
    success_url: `${app}/site/managed/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${app}/site/publish`,
    allow_promotion_codes: false,
  });
  return session.url ?? null;
}

export async function setCancelAtPeriodEnd(businessId: string, cancel: boolean): Promise<Stripe.Subscription | null> {
  const row = await db.managedSubscription.findUnique({ where: { businessId } });
  if (!row) return null;
  return stripe().subscriptions.update(row.stripeSubscriptionId, { cancel_at_period_end: cancel });
}

/** Stripe's hosted portal for updating a card. Requires the portal to be configured in the Stripe dashboard. */
export async function portalUrl(businessId: string): Promise<string | null> {
  const row = await db.managedSubscription.findUnique({ where: { businessId } });
  if (!row) return null;
  try {
    const s = await stripe().billingPortal.sessions.create({ customer: row.stripeCustomerId, return_url: `${process.env.NEXT_PUBLIC_APP_URL}/site/managed` });
    return s.url;
  } catch {
    return null;
  }
}
