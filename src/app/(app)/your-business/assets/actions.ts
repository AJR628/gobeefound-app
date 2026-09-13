"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/current-user";
import { assetTypeSchema, declareAsset, removeAsset } from "@/lib/assets";

export type AssetActionState = { error?: string; ok?: boolean } | undefined;

export async function declareAssetAction(_prev: AssetActionState, formData: FormData): Promise<AssetActionState> {
  const type = assetTypeSchema.safeParse(formData.get("type"));
  const url = z.string().safeParse(formData.get("url"));
  const label = z.string().max(60).optional().safeParse(formData.get("label") || undefined);
  if (!type.success || !url.success) return { error: "Choose an asset type and enter a link." };
  const { business } = await requireBusiness();
  const r = await declareAsset(business.id, type.data, url.data, label.success ? label.data : undefined);
  revalidatePath("/your-business/assets");
  revalidatePath("/home");
  return r.ok ? { ok: true } : { error: r.error };
}

export async function removeAssetAction(id: string): Promise<void> {
  const { business } = await requireBusiness();
  await removeAsset(business.id, id);
  revalidatePath("/your-business/assets");
}
