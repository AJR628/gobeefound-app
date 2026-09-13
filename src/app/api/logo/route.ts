import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/current-user";
import { deleteLogo, LOGO_MAX_BYTES, uploadLogo } from "@/lib/storage";
import { track } from "@/lib/analytics/server";

// §18.1 /api/logo — the only file upload in the product (§3). Auth required via middleware + requireBusiness.

export async function POST(request: Request) {
  const { user, business } = await requireBusiness();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (file.size > LOGO_MAX_BYTES) return NextResponse.json({ error: "That file is over 2 MB. Please use a smaller image." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await uploadLogo(business.id, bytes);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 415 });
  await track(user.id, "logo_uploaded");
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const { business } = await requireBusiness();
  await deleteLogo(business.id);
  return NextResponse.json({ ok: true });
}
