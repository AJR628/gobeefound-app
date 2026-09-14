import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { HERO_MAX_BYTES, uploadSiteImage } from "@/lib/storage";
import { updateSetup } from "@/lib/site/draft";

// V4 §A3 — the one hero photo. PNG/JPEG ≤ 4 MB, sniffed. No AI, no allowance.

export async function POST(request: Request) {
  const { user, business, profile } = await requireBusiness();
  if ((await getEntitlement(user.id)) !== "launch") return NextResponse.json({ error: "Launch required." }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  if (file.size > HERO_MAX_BYTES) return NextResponse.json({ error: "That photo is over 4 MB. Please use a smaller one." }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const up = await uploadSiteImage(business.id, "hero", bytes, HERO_MAX_BYTES);
  if (!up.ok) return NextResponse.json({ error: up.error }, { status: 415 });
  await updateSetup(business.id, profile, { heroStyle: "photo", heroPhotoPath: up.path });
  return NextResponse.json({ ok: true, path: up.path });
}

export async function DELETE() {
  const { business, profile } = await requireBusiness();
  await updateSetup(business.id, profile, { heroStyle: "text", heroPhotoPath: null });
  return NextResponse.json({ ok: true });
}
