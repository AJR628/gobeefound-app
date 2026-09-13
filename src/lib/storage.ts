// §12.1 / §16.6 — the single file-storage exception: the logo. PNG or JPEG, ≤ 2 MB, SVG rejected.
// Private bucket, signed URLs, MIME sniffed from bytes (never trusted from the client).

import { createClient } from "@supabase/supabase-js";
import { db } from "./db";

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export type SniffedImage = { ext: "png"; mime: "image/png" } | { ext: "jpg"; mime: "image/jpeg" };

/** Detects PNG or JPEG from magic bytes. Anything else — including SVG — returns null. */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return { ext: "png", mime: "image/png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  return null;
}

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function bucket(): string {
  return process.env.SUPABASE_LOGO_BUCKET ?? "logos";
}

export type LogoUploadResult = { ok: true; path: string } | { ok: false; error: string };

export async function uploadLogo(businessId: string, bytes: Uint8Array): Promise<LogoUploadResult> {
  if (bytes.byteLength > LOGO_MAX_BYTES) return { ok: false, error: "That file is over 2 MB. Please use a smaller image." };
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: "Please upload a PNG or JPEG." };

  const path = `${businessId}/logo.${kind.ext}`;
  const supabase = serviceClient();

  // Replace any previous logo (different extension included).
  const existing = await db.businessProfile.findUnique({ where: { businessId }, select: { logoUrl: true } });
  if (existing?.logoUrl && existing.logoUrl !== path) await supabase.storage.from(bucket()).remove([existing.logoUrl]);

  const { error } = await supabase.storage.from(bucket()).upload(path, bytes, { contentType: kind.mime, upsert: true });
  if (error) return { ok: false, error: "Upload failed. Please try again." };

  await db.businessProfile.update({ where: { businessId }, data: { logoUrl: path } });
  return { ok: true, path };
}

export async function deleteLogo(businessId: string): Promise<void> {
  const existing = await db.businessProfile.findUnique({ where: { businessId }, select: { logoUrl: true } });
  if (existing?.logoUrl) await serviceClient().storage.from(bucket()).remove([existing.logoUrl]);
  await db.businessProfile.update({ where: { businessId }, data: { logoUrl: null } });
}

/** Short-lived signed URL for display. Null when no logo or storage unavailable. */
export async function getLogoSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    const { data } = await serviceClient().storage.from(bucket()).createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
