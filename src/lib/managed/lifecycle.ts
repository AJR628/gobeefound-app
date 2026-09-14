// V4 §F lifecycle effects — what happens to the SITE when the subscription changes. Called only from the
// verified webhook after applySubscription. Never destroys data: unpublish is soft, domains are released.
import "server-only";
import { db } from "../db";
import { deriveManagedState } from "./entitlement";
import { publishVersion, publicationFor, unpublish } from "../site/publish";
import { releaseAllDomains } from "./domains";
import { sendManagedEnded, sendManagedWelcome, sendPaymentFailed } from "../email";
import { track } from "../analytics/server";
import type { ApplyResult } from "./stripe";

export async function afterManagedChange(r: ApplyResult): Promise<void> {
  const state = deriveManagedState({ status: r.status, currentPeriodEnd: r.currentPeriodEnd, graceEndsAt: r.graceEndsAt });
  const email = r.userId ? (await db.user.findUnique({ where: { id: r.userId }, select: { email: true } }))?.email ?? null : null;
  const app = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (state.entitled) {
    const pub = await publicationFor(r.businessId);
    if (!pub?.live) {
      const p = await publishVersion(r.businessId);
      if (p.ok) {
        if (r.userId) await track(r.userId, "site_published", { versionNumber: p.versionNumber });
        if (email && (r.previous === null || r.previous === "incomplete" || r.previous === "ended")) await sendManagedWelcome(email, p.url);
      }
    }
    if (r.userId && r.previous !== r.status && (r.status === "active") && (r.previous === null || r.previous === "incomplete")) await track(r.userId, "managed_activated");
    if (r.status === "past_due" && r.previous !== "past_due" && email) await sendPaymentFailed(email, `${app}/site/managed`, r.graceEndsAt);
    return;
  }

  // Not entitled: incomplete (never paid) → nothing to take down. Ended / grace over → offline, domains released.
  if (r.status === "incomplete") return;
  const pub = await publicationFor(r.businessId);
  if (pub?.live) {
    await unpublish(r.businessId);
    await releaseAllDomains(r.businessId);
    if (r.userId) await track(r.userId, "site_unpublished");
    if (email) await sendManagedEnded(email, `${app}/site/publish`);
  }
}
