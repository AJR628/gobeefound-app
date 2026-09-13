"use server";

import { revalidatePath } from "next/cache";
import { BUSINESS_PROFILE_FIELDS, type BusinessProfileField } from "@/content";
import { db } from "@/lib/db";
import { requireBusiness } from "@/lib/current-user";
import { saveCanonicalFields } from "@/lib/canonical";
import { fieldsToStampOnConfirm } from "@/lib/confirmation";

// §12.1 — inline edits go through the ONE write path (saveCanonicalFields) so a task revisit sees them.

export async function saveProfileField(field: string, value: unknown): Promise<{ ok: boolean; error?: string }> {
  if (!(BUSINESS_PROFILE_FIELDS as readonly string[]).includes(field)) return { ok: false, error: "Unknown field." };
  const { business } = await requireBusiness();
  const result = await saveCanonicalFields(business.id, { [field]: value }, "owner_entered");
  revalidatePath("/your-business");
  revalidatePath("/home");
  if (!result.ok) return { ok: false, error: result.errors[field as BusinessProfileField] ?? "Check this value." };
  return { ok: true };
}

/** §12.3 re-confirmation — steps 1–3 only, confirmedVia = manual_recheck. Stage unchanged. */
export async function reconfirmAll(): Promise<void> {
  const { business, profile } = await requireBusiness();
  const fields = fieldsToStampOnConfirm(profile as unknown as Record<string, unknown> & { hideAddress: boolean });
  const now = new Date();
  await db.$transaction([
    ...fields.map((fieldKey) =>
      db.fieldProvenance.upsert({
        where: { businessId_fieldKey: { businessId: business.id, fieldKey } },
        create: { businessId: business.id, fieldKey, source: "owner_entered", setAt: now, lastConfirmedAt: now, confirmedVia: "manual_recheck" },
        update: { lastConfirmedAt: now, confirmedVia: "manual_recheck" },
      }),
    ),
    db.connectedAsset.updateMany({ where: { businessId: business.id, removedAt: null }, data: { connectionState: "owner_verified", verifiedAt: now } }),
    db.decision.create({ data: { businessId: business.id, context: "confirmation", contextId: "manual_recheck", proposedAction: "reconfirm", outcome: "accepted" } }),
  ]);
  revalidatePath("/your-business");
}
