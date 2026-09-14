import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { latestVersion } from "@/lib/site/draft";
import { buildExportZip } from "@/lib/site/export";
import { downloadImage, pathBelongsTo } from "@/lib/storage";
import { track } from "@/lib/analytics/server";

// V4 §G — "Take my website with me". Exports the latest APPROVED version only. No AI, no allowance,
// nothing stored. Assets are copied from storage into the zip so nothing points back at GoBeeFound.

export async function GET() {
  const { user, business } = await requireBusiness();
  if ((await getEntitlement(user.id)) !== "launch") return NextResponse.json({ error: "Launch required." }, { status: 403 });
  const version = await latestVersion(business.id);
  if (!version) return NextResponse.json({ error: "Approve your website first, then export it." }, { status: 409 });

  const logoPath = version.spec.facts.logoPath;
  const heroPath = version.spec.setup.heroStyle === "photo" ? version.spec.setup.heroPhotoPath : null;
  const [logo, hero] = await Promise.all([
    logoPath && pathBelongsTo(logoPath, business.id) ? downloadImage(logoPath) : null,
    heroPath && pathBelongsTo(heroPath, business.id) ? downloadImage(heroPath) : null,
  ]);
  const zip = buildExportZip(version.spec, version.versionNumber, { logo, hero });
  await track(user.id, "site_exported", { versionNumber: version.versionNumber });
  const slug = version.spec.facts.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "website";
  return new NextResponse(zip as unknown as BodyInit, {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${slug}-website-v${version.versionNumber}.zip"`, "Cache-Control": "private, no-store" },
  });
}
