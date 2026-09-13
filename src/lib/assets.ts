// §12.2 — declared online assets. Owner-typed URLs only. Format-validated, NEVER fetched (P5, §3).

import { z } from "zod";
import type { AssetType } from "@/content";
import { db } from "./db";

export const URL_ERROR = "That doesn't look like a web address. It should start with https:// and include a dot.";

/** Adds a scheme if missing, strips a trailing slash, validates shape only. No network. */
export function normalizeUrl(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".")) return null;
    u.hash = "";
    let out = u.toString();
    if (out.endsWith("/") && u.pathname === "/") out = out.slice(0, -1);
    return out;
  } catch {
    return null;
  }
}

export const assetTypeSchema = z.enum(["website", "gbp", "facebook", "instagram", "booking", "other"]);

/**
 * Declare (or replace) an asset. One per type except `other` (max five).
 * New assets start `declared`; editing a URL resets to `declared` and clears verifiedAt (§18.2).
 */
export async function declareAsset(
  businessId: string,
  type: AssetType,
  rawUrl: string,
  label?: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const url = normalizeUrl(rawUrl);
  if (!url) return { ok: false, error: URL_ERROR };

  if (type === "other") {
    const count = await db.connectedAsset.count({ where: { businessId, type, removedAt: null } });
    if (count >= 5) return { ok: false, error: "You can save up to five other links." };
    const created = await db.connectedAsset.create({ data: { businessId, type, url, label: label ?? null } });
    return { ok: true, id: created.id };
  }

  const existing = await db.connectedAsset.findFirst({ where: { businessId, type, removedAt: null } });
  if (existing) {
    if (existing.url === url) return { ok: true, id: existing.id };
    const updated = await db.connectedAsset.update({
      where: { id: existing.id },
      data: { url, label: label ?? existing.label, connectionState: "declared", verifiedAt: null },
    });
    return { ok: true, id: updated.id };
  }
  const created = await db.connectedAsset.create({ data: { businessId, type, url, label: label ?? null } });
  return { ok: true, id: created.id };
}

/** Soft delete (§12.2). Tasks that created it stay complete. */
export async function removeAsset(businessId: string, id: string): Promise<void> {
  await db.connectedAsset.updateMany({ where: { id, businessId, removedAt: null }, data: { removedAt: new Date() } });
}

export const ASSET_LABEL: Record<AssetType, string> = {
  website: "Website",
  gbp: "Google Business Profile",
  facebook: "Facebook",
  instagram: "Instagram",
  booking: "Booking link",
  other: "Other",
};
