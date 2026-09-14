import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { buildSite } from "@/lib/site/draft";
import { allowanceView } from "@/lib/generators";
import { track } from "@/lib/analytics/server";

// V4 §D — "Build my website". Consumes one website build. Idempotent per click via Idempotency-Key.

export async function POST(request: Request) {
  const { user, business, profile } = await requireBusiness();
  if ((await getEntitlement(user.id)) !== "launch") return NextResponse.json({ error: "Launch required." }, { status: 403 });

  const result = await buildSite(business, profile, { idempotencyKey: request.headers.get("idempotency-key"), platformRequestId: request.headers.get("x-nf-request-id") });
  const headers = { "X-Generation-Id": result.generationId };
  if (!result.ok) {
    if (result.kind === "allowance") await track(user.id, "allowance_exhausted", { bucket: "builds" });
    else await track(user.id, "ai_generation_failed", { operationClass: "site_draft", errorKind: result.kind });
    return NextResponse.json({ ok: false, error: result.userMessage, generationId: result.generationId, allowance: result.allowance ? allowanceView("builds", result.allowance) : undefined }, { status: result.status, headers });
  }
  await track(user.id, "site_draft_created", { replayed: result.replayed });
  return NextResponse.json({ ok: true, spec: result.data, generationId: result.generationId, allowance: allowanceView("builds", result.allowance), edits: allowanceView("edits", result.allowance), replayed: result.replayed }, { headers });
}
