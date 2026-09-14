import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { rewriteSection } from "@/lib/site/draft";
import { SECTION_KEYS } from "@/lib/site/spec";
import { allowanceView } from "@/lib/generators";
import { track } from "@/lib/analytics/server";

// V4 §D — rewrite ONE section. Consumes one AI edit. Never touches approved or unrelated sections.

const body = z.object({ section: z.enum(SECTION_KEYS) });

export async function POST(request: Request) {
  const { user, business, profile } = await requireBusiness();
  if ((await getEntitlement(user.id)) !== "launch") return NextResponse.json({ error: "Launch required." }, { status: 403 });
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Pick a section." }, { status: 400 });

  const result = await rewriteSection(business, profile, parsed.data.section, { idempotencyKey: request.headers.get("idempotency-key"), platformRequestId: request.headers.get("x-nf-request-id") });
  if (!result.ok) {
    if (result.kind === "allowance") await track(user.id, "allowance_exhausted", { bucket: "edits" });
    else if (result.generationId) await track(user.id, "ai_generation_failed", { operationClass: "section_rewrite", errorKind: result.kind });
    return NextResponse.json({ ok: false, error: result.userMessage, generationId: result.generationId || undefined, allowance: result.allowance ? allowanceView("edits", result.allowance) : undefined }, { status: result.status });
  }
  await track(user.id, "site_section_regenerated", { section: parsed.data.section });
  return NextResponse.json({ ok: true, spec: result.data, generationId: result.generationId, allowance: allowanceView("edits", result.allowance) });
}
