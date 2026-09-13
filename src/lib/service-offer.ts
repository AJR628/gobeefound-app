"use server";

import { redirect } from "next/navigation";
import type { ServicePlacement } from "@/content";
import { db } from "./db";
import { requireBusiness } from "./current-user";
import { track } from "./analytics/server";

// §15 — four placements, one per screen, dismissal persists 30 days as a Decision row.

const DISMISS_DAYS = 30;

export async function isOfferDismissed(businessId: string, placement: ServicePlacement): Promise<boolean> {
  const since = new Date(Date.now() - DISMISS_DAYS * 24 * 60 * 60 * 1000);
  const row = await db.decision.findFirst({
    where: { businessId, context: "service_offer", contextId: placement, outcome: "ignored", createdAt: { gte: since } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function dismissOffer(placement: ServicePlacement): Promise<void> {
  const { user, business } = await requireBusiness();
  await track(user.id, "service_offer_dismissed", { placement });
  await db.decision.create({
    data: { businessId: business.id, context: "service_offer", contextId: placement, proposedAction: "website_build", outcome: "ignored" },
  });
}

/** Records the lead, then sends the owner to gobeefound.com/website (§15.4). The app sells nothing. */
export async function clickOffer(placement: ServicePlacement): Promise<void> {
  const { user, business } = await requireBusiness();
  await track(user.id, "service_offer_clicked", { placement });
  await db.$transaction([
    db.serviceLead.create({ data: { businessId: business.id, placement, serviceType: "website_build" } }),
    db.decision.create({
      data: { businessId: business.id, context: "service_offer", contextId: placement, proposedAction: "website_build", outcome: "accepted" },
    }),
  ]);
  redirect(`${process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://gobeefound.com"}/website`);
}
