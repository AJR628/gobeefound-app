// §12.1 / §16.6 / V4 §A3 §G — file storage. V1 allowed exactly one file: the logo. V4 adds published-site
// assets (one hero photo, AI logo candidates) under the same rules: PNG/JPEG only, MIME sniffed from bytes
// (never trusted from the client), private bucket, short-lived signed URLs, paths always scoped by businessId.

import { createClient } from "@supabase/supabase-js";
import { db } from "./db";

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const HERO_MAX_BYTES = 4 * 1024 * 1024;

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

/** Every stored path belongs to exactly one business. Anything else is rejected before storage is touched. */
export function pathBelongsTo(path: string, businessId: string): boolean {
  return path.startsWith(`${businessId}/`) && !path.includes("..");
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

/** Short-lived signed URL for display. Null when no path or storage unavailable. */
export async function getLogoSignedUrl(path: string | null): Promise<string | null> {
  return getSignedUrl(path);
}

export async function getSignedUrl(path: string | null, seconds = 60 * 60): Promise<string | null> {
  if (!path) return null;
  try {
    const { data } = await serviceClient().storage.from(bucket()).createSignedUrl(path, seconds);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// V4 — site assets
// ---------------------------------------------------------------------------------------------

/** Store an image at a business-scoped path after sniffing it. Returns the final path (extension from bytes). */
export async function uploadSiteImage(businessId: string, name: "hero" | `logo-candidates/${string}`, bytes: Uint8Array, maxBytes: number): Promise<LogoUploadResult> {
  if (bytes.byteLength > maxBytes) return { ok: false, error: `That file is over ${Math.round(maxBytes / 1024 / 1024)} MB. Please use a smaller image.` };
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: "Please upload a PNG or JPEG." };
  const path = `${businessId}/${name}.${kind.ext}`;
  const { error } = await serviceClient().storage.from(bucket()).upload(path, bytes, { contentType: kind.mime, upsert: true });
  if (error) return { ok: false, error: "Upload failed. Please try again." };
  return { ok: true, path };
}

export async function downloadImage(path: string): Promise<{ bytes: Uint8Array; ext: "png" | "jpg" } | null> {
  try {
    const { data, error } = await serviceClient().storage.from(bucket()).download(path);
    if (error || !data) return null;
    const bytes = new Uint8Array(await data.arrayBuffer());
    const kind = sniffImage(bytes);
    return kind ? { bytes, ext: kind.ext } : null;
  } catch {
    return null;
  }
}

export async function removeImages(paths: string[]): Promise<void> {
  if (!paths.length) return;
  await serviceClient().storage.from(bucket()).remove(paths).then(() => undefined, () => undefined);
}

/** Make a generated candidate THE logo: copy bytes to the canonical logo path and clean up the candidates. */
export async function promoteLogoCandidate(businessId: string, candidatePath: string): Promise<LogoUploadResult> {
  if (!pathBelongsTo(candidatePath, businessId) || !candidatePath.includes("/logo-candidates/")) return { ok: false, error: "That image isn't yours to use." };
  const img = await downloadImage(candidatePath);
  if (!img) return { ok: false, error: "That image has expired. Generate again." };
  const result = await uploadLogo(businessId, img.bytes);
  if (result.ok) {
    const { data } = await serviceClient().storage.from(bucket()).list(`${businessId}/logo-candidates`);
    await removeImages((data ?? []).map((f) => `${businessId}/logo-candidates/${f.name}`));
  }
  return result;
}
