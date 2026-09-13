"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getPlanContext } from "@/lib/plan-context";
import { fieldsToStampOnConfirm, getConfirmationBlockers } from "@/lib/confirmation";

// §12.3 — on confirm, in ONE transaction: stamp provenance → verify assets → Decision → stage=launched.

export async function confirmBaseline(): Promise<void> {
  const ctx = await getPlanContext();
  if (ctx.entitlement !== "launch") redirect("/unlock?from=/confirm");
  if (!ctx.progress.allRequiredComplete) redirect("/home");
  if (getConfirmationBlockers(ctx.profile, ctx.plan).length > 0) redirect("/confirm");

  const now = new Date();
  const fields = fieldsToStampOnConfirm(ctx.profile as unknown as Record<string, unknown> & { hideAddress: boolean });

  await db.$transaction([
    ...fields.map((fieldKey) =>
      db.fieldProvenance.upsert({
        where: { businessId_fieldKey: { businessId: ctx.business.id, fieldKey } },
        create: { businessId: ctx.business.id, fieldKey, source: "owner_entered", setAt: now, lastConfirmedAt: now, confirmedVia: "baseline_confirmation" },
        update: { lastConfirmedAt: now, confirmedVia: "baseline_confirmation" },
      }),
    ),
    db.connectedAsset.updateMany({ where: { businessId: ctx.business.id, removedAt: null }, data: { connectionState: "owner_verified", verifiedAt: now } }),
    db.decision.create({ data: { businessId: ctx.business.id, context: "confirmation", contextId: "baseline", proposedAction: "confirm_baseline", outcome: "accepted" } }),
    db.business.update({ where: { id: ctx.business.id }, data: { stage: "launched", launchedAt: now } }),
  ]);

  revalidatePath("/home");
  revalidatePath("/your-business");
  redirect("/launched");
}
