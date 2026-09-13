"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/current-user";
import { assetTypeSchema, declareAsset, removeAsset } from "@/lib/assets";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics/server";

export type AssetActionState = { error?: string; ok?: boolean } | undefined;

export async function declareAssetAction(_prev: AssetActionState, formData: FormData): Promise<AssetActionState> {
  const type = assetTypeSchema.safeParse(formData.get("type"));
  const url = z.string().safeParse(formData.get("url"));
  const label = z.string().max(60).optional().safeParse(formData.get("label") || undefined);
  if (!type.success || !url.success) return { error: "Choose an asset type and enter a link." };
  const { user, business } = await requireBusiness();
  const r = await declareAsset(business.id, type.data, url.data, label.success ? label.data : undefined);
  if (r.ok) await track(user.id, "asset_declared", { assetType: type.data });
  revalidatePath("/your-business/assets");
  revalidatePath("/home");
  return r.ok ? { ok: true } : { error: r.error };
}

export async function removeAssetAction(id: string): Promise<void> {
  const { user, business } = await requireBusiness();
  const row = await db.connectedAsset.findFirst({ where: { id, businessId: business.id }, select: { type: true } });
  await removeAsset(business.id, id);
  if (row) await track(user.id, "asset_removed", { assetType: row.type });
  revalidatePath("/your-business/assets");
}
