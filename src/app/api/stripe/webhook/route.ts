import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { creditExpiry } from "@/lib/purchase";
import { sendReceipt, sendRefundConfirmation } from "@/lib/email";

// §18.3 — signature-verified (raw body), idempotent on stripeSessionId. The ONLY path that grants
// entitlement. Refund flips status; entitlement derivation revokes automatically (§17.1).

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

      const email = session.customer_details?.email ?? session.customer_email;
      if (email) await sendReceipt(email, purchase.amountCents, purchase.creditExpiresAt!);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (!pi) break;
      const purchase = await db.purchase.findFirst({ where: { stripePaymentIntentId: pi } });
      if (!purchase || purchase.status === "refunded") break;
      await db.purchase.update({ where: { id: purchase.id }, data: { status: "refunded" } });
      // §18.3 — no user data deleted. Entitlement now derives to `free`; credit line disappears.
      const email = charge.billing_details?.email ?? charge.receipt_email;
      if (email) await sendRefundConfirmation(email, charge.amount_refunded || purchase.amountCents);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
