import { NextResponse } from "next/server";
import { z } from "zod";
import { ARCHETYPE_BY_ID } from "@/content";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { runMetered } from "@/lib/ai/metered";
import { generateLogoCandidates, LOGO_STYLES } from "@/lib/ai/images";
import { PALETTES } from "@/components/site/themes";
import { getSignedUrl, pathBelongsTo, promoteLogoCandidate, uploadSiteImage } from "@/lib/storage";
import { updateSetup } from "@/lib/site/draft";
import { allowanceView } from "@/lib/generators";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics/server";
import { PALETTE_IDS } from "@/lib/site/spec";

// V4 §A3 — bounded AI logo generation. POST generates ≤2 candidates (one "logo design" from the allowance);
// PUT promotes a chosen candidate to THE logo. Upload / text / none / existing never touch this route.

const genBody = z.object({ style: z.enum(LOGO_STYLES), palette: z.enum(PALETTE_IDS) });
const pickBody = z.object({ path: z.string().min(1).max(400) });

export async function POST(request: Request) {
  const { user, business, profile } = await requireBusiness();
  if ((await getEntitlement(user.id)) !== "launch") return NextResponse.json({ error: "Launch required." }, { status: 403 });
  const parsed = genBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Pick a style." }, { status: 400 });

  const brand = profile.brandColors as { primary?: string } | null;
  const primaryHex = parsed.data.palette === "brand" && brand?.primary && /^#[0-9a-fA-F]{6}$/.test(brand.primary) ? brand.primary : PALETTES[parsed.data.palette === "brand" ? "slate" : parsed.data.palette].primary;

  const result = await runMetered<{ paths: string[] }>({ businessId: business.id, operation: "logo_image", idempotencyKey: request.headers.get("idempotency-key"), platformRequestId: request.headers.get("x-nf-request-id") }, async (generationId) => {
    const r = await generateLogoCandidates({ businessName: profile.displayName, tradeNoun: ARCHETYPE_BY_ID[business.trade].tradeNoun, style: parsed.data.style, primaryHex, candidates: 2, userKey: business.id });
    const paths: string[] = [];
    for (let i = 0; i < r.images.length; i++) {
      const up = await uploadSiteImage(business.id, `logo-candidates/${generationId.slice(0, 8)}-${i}`, r.images[i]!, 4 * 1024 * 1024);
      if (up.ok) paths.push(up.path);
    }
    return {
      ok: true,
      data: { paths },
      meta: { provider: "openai", model: r.model, promptVersion: "logo.1", requestId: r.requestId, inputTokens: r.inputTokens, outputTokens: r.outputTokens, cachedTokens: null, reasoningTokens: null, durationMs: r.durationMs, attempts: 1 },
      persist: async (aiUsageId) => {
        const row = await db.generatedContent.create({ data: { businessId: business.id, toolType: "website_copy", inputSnapshot: { kind: "logo_image", style: parsed.data.style } as object, output: { paths } as object, model: r.model, promptVersion: "logo.1", aiUsageId } });
        return row.id;
      },
    };
  });

  if (!result.ok) {
    if (result.kind === "allowance") await track(user.id, "allowance_exhausted", { bucket: "logos" });
    else await track(user.id, "ai_generation_failed", { operationClass: "logo_image", errorKind: result.kind });
    return NextResponse.json({ ok: false, error: result.userMessage, generationId: result.generationId, allowance: result.allowance ? allowanceView("logos", result.allowance) : undefined }, { status: result.status });
  }
  await track(user.id, "logo_generated", { style: parsed.data.style });
  const candidates = await Promise.all(result.data.paths.map(async (p) => ({ path: p, url: await getSignedUrl(p, 60 * 30) })));
  return NextResponse.json({ ok: true, candidates: candidates.filter((c) => c.url), allowance: allowanceView("logos", result.allowance) });
}

export async function PUT(request: Request) {
  const { user, business, profile } = await requireBusiness();
  if ((await getEntitlement(user.id)) !== "launch") return NextResponse.json({ error: "Launch required." }, { status: 403 });
  const parsed = pickBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || !pathBelongsTo(parsed.data.path, business.id)) return NextResponse.json({ error: "That image isn't yours to use." }, { status: 400 });
  const r = await promoteLogoCandidate(business.id, parsed.data.path);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  await updateSetup(business.id, { ...profile, logoUrl: r.path }, { logoMode: "generated" });
  await track(user.id, "logo_selected");
  return NextResponse.json({ ok: true, url: await getSignedUrl(r.path) });
}
