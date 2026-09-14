import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { runGenerator, TOOL_BY_ROUTE } from "@/lib/generators";
import { track } from "@/lib/analytics/server";

// §18.1 / V4 §E — /api/generate/[toolId]. Requires Launch entitlement. Everything else (hourly throttle,
// atomic allowance, idempotency, ledger) happens inside runGenerator → runMetered. The browser supplies
// only its answers and an Idempotency-Key; it never supplies tokens, costs, models, or limits.

const answersSchema = z.record(z.string(), z.string().max(1000)).default({});

export async function POST(request: Request, ctx: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await ctx.params;
  const tool = TOOL_BY_ROUTE[toolId];
  if (!tool) return NextResponse.json({ error: "Unknown tool." }, { status: 404 });

  const { user, business, profile } = await requireBusiness();
  if ((await getEntitlement(user.id)) !== "launch") return NextResponse.json({ error: "Launch required." }, { status: 403 });

  const body = answersSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Check your answers." }, { status: 400 });

  const idempotencyKey = request.headers.get("idempotency-key");
  const platformRequestId = request.headers.get("x-nf-request-id");

  const result = await runGenerator(tool, business, profile, body.data, { idempotencyKey, platformRequestId });
  const headers = result.generationId ? { "X-Generation-Id": result.generationId } : undefined;

  if (!result.ok) {
    if (result.kind === "allowance") await track(user.id, "allowance_exhausted", { bucket: result.allowance?.bucket ?? "edits" });
    if (result.kind && result.kind !== "allowance") await track(user.id, "ai_generation_failed", { operationClass: tool, errorKind: result.kind });
    // generationId is a support reference only; never provider detail.
    return NextResponse.json({ ok: false, error: result.error, missing: result.missing, allowance: result.allowance, generationId: result.generationId }, { status: result.status, headers });
  }

  await track(user.id, "generator_run", { toolId: tool, success: true, operationClass: tool, replayed: result.replayed });
  return NextResponse.json({ ok: true, id: result.id, output: result.output, allowance: result.allowance, generationId: result.generationId, replayed: result.replayed }, { headers });
}
