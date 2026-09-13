import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { db } from "@/lib/db";
import { runGenerator, TOOL_BY_ROUTE } from "@/lib/generators";

// §18.1 /api/generate/[toolId] — requires launch entitlement. Rate-limited per business (§16.6).

const RATE_LIMIT_PER_HOUR = 20;
const answersSchema = z.record(z.string(), z.string().max(1000)).default({});

export async function POST(request: Request, ctx: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await ctx.params;
  const tool = TOOL_BY_ROUTE[toolId];
  if (!tool) return NextResponse.json({ error: "Unknown tool." }, { status: 404 });

  const { user, business, profile } = await requireBusiness();
  if ((await getEntitlement(user.id)) !== "launch") return NextResponse.json({ error: "Launch required." }, { status: 403 });

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.generatedContent.count({ where: { businessId: business.id, createdAt: { gte: since } } });
  if (recent >= RATE_LIMIT_PER_HOUR) return NextResponse.json({ error: "You've generated a lot in the last hour. Take a break and try again soon." }, { status: 429 });

  const body = answersSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Check your answers." }, { status: 400 });

  const result = await runGenerator(tool, business, profile, body.data);
  if (!result.ok) return NextResponse.json(result, { status: result.missing ? 422 : 502 });
  return NextResponse.json(result);
}
