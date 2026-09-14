import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { creditExpiry } from "@/lib/purchase";
import { sendReceipt, sendRefundConfirmation } from "@/lib/email";
import { track } from "@/lib/analytics/server";
import { applySubscription } from "@/lib/managed/stripe";
import { afterManagedChange } from "@/lib/managed/lifecycle";

// §18.3 — signature-verified (raw body). The ONLY path that grants Launch entitlement (idempotent on
// stripeSessionId) and the ONLY path that writes Managed subscription state from Stripe (V4 §F): every
// handler is a pure projection of Stripe's subscription object, so duplicate deliveries are harmless.

async function subscriptionFromEvent(obj: unknown): Promise<Stripe.Subscription | null> {
  const o = obj as { subscription?: string | { id: string }; parent?: { subscription_details?: { subscription?: string | { id: string } } } };
  const ref = o.subscription ?? o.parent?.subscription_details?.subscription;
  const id = typeof ref === "string" ? ref : ref?.id;
  if (!id) return null;
  try {
    return await stripe().subscriptions.retrieve(id);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "unsigned" }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;

      // ---- Managed (subscription) ----
      if (session.mode === "subscription") {
        const sub = await subscriptionFromEvent(session);
        if (sub) {
          const r = await applySubscription(sub, { paymentSucceeded: session.payment_status === "paid" });
          if (r) await afterManagedChange(r);
        }
        break;
      }

      // ---- Launch (one-time) ----
      if (session.payment_status !== "paid") break;
      const existing = await db.purchase.findUnique({ where: { stripeSessionId: session.id } });
      if (existing?.status === "paid") break; // duplicate delivery → no-op

      const paidAt = new Date();
      const amountCents = session.amount_total ?? existing?.amountCents ?? 0;
      const userId = existing?.userId ?? session.metadata?.userId ?? session.client_reference_id ?? null;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

      const purchase = await db.purchase.upsert({
        where: { stripeSessionId: session.id },
        create: { stripeSessionId: session.id, userId, product: "launch", amountCents, status: "paid", paidAt, creditExpiresAt: creditExpiry(paidAt), stripePaymentIntentId: paymentIntentId },
        update: { status: "paid", paidAt, amountCents, creditExpiresAt: creditExpiry(paidAt), stripePaymentIntentId: paymentIntentId },
      });

      if (purchase.userId) await track(purchase.userId, "purchase_completed", { amountCents: purchase.amountCents });
      const email = session.customer_details?.email ?? session.customer_email;
      if (email) await sendReceipt(email, purchase.amountCents, purchase.creditExpiresAt!);
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.metadata?.product && sub.metadata.product !== "managed_website") break; // not ours
      const r = await applySubscription(sub);
      if (r) await afterManagedChange(r);
      break;
    }

    case "invoice.paid": {
      const sub = await subscriptionFromEvent(event.data.object);
      if (!sub) break;
      const r = await applySubscription(sub, { paymentSucceeded: true });
      if (r) await afterManagedChange(r);
      break;
    }

    case "invoice.payment_failed": {
      const sub = await subscriptionFromEvent(event.data.object);
      if (!sub) break;
      const r = await applySubscription(sub, { paymentFailed: true });
      if (r) await afterManagedChange(r);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (!pi) break;
      const purchase = await db.purchase.findFirst({ where: { stripePaymentIntentId: pi } });
      if (!purchase || purchase.status === "refunded") break;
      await db.purchase.update({ where: { id: purchase.id }, data: { status: "refunded" } });
      // §18.3 — no user data deleted. Launch entitlement now derives to `free`; credit line disappears.
      // A live Managed site is governed by its own subscription and is NOT affected by a Launch refund.
      const email = charge.billing_details?.email ?? charge.receipt_email;
      if (email) await sendRefundConfirmation(email, charge.amount_refunded || purchase.amountCents);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
