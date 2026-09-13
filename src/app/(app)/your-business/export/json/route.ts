import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/current-user";
import { buildExport } from "@/lib/export";
import { track } from "@/lib/analytics/server";

/** §20.5 — structured JSON export. Free for every account, including after a refund. */
export async function GET() {
  const { user, business, profile } = await requireBusiness();
  const data = await buildExport(business.id);
  await track(user.id, "export_downloaded", { format: "json" });
  const slug = profile.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "business";
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gobeefound-${slug}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
