"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { stripe } from "@/lib/stripe";
import { activePrice, expectedAmountCents, priceIdFor } from "@/lib/purchase";

// §14.3 / §4.1 — Stripe Checkout (hosted). Price object chosen by LAUNCH_ACTIVE_PRICE.
// A pending Purchase row is created here; ONLY the verified webhook marks it paid (§18.3).

function safeFrom(raw: FormDataEntryValue | null): string {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/home";
}

export async function startCheckout(formData: FormData): Promise<void> {
  const { user, business } = await requireBusiness();
  if ((await getEntitlement(user.id)) === "launch") redirect("/home");

  const from = safeFrom(formData.get("from"));
  const price = activePrice();
  const app = process.env.NEXT_PUBLIC_APP_URL!;

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceIdFor(price), quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id, businessId: business.id, price },
    success_url: `${app}/checkout/success?session_id={CHECKOUT_SESSION_ID}&from=${encodeURIComponent(from)}`,
    cancel_url: `${app}/checkout/cancelled?from=${encodeURIComponent(from)}`,
    allow_promotion_codes: false,
  });

  await db.purchase.create({
    data: {
      userId: user.id,
      stripeSessionId: session.id,
      product: "launch",
      amountCents: expectedAmountCents(price), // provisional; webhook writes amount_total
      status: "pending",
    },
  });

  if (!session.url) redirect("/unlock?error=checkout");
  redirect(session.url);
}

/** Polled by /checkout/success (§18.3). Server action, so no extra route is needed. */
export async function checkEntitlement(): Promise<"free" | "launch"> {
  const { user } = await requireBusiness();
  return getEntitlement(user.id);
}
