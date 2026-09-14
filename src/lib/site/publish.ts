// V4 §F — publishing: point SitePublication at an approved SiteVersion, copy that version's assets to the
// PUBLIC bucket (so the public page never depends on signed URLs), purge the CDN. Rollback = repoint.
// Unpublish = soft. Requires Managed entitlement for publish/rollback; unpublish is always allowed.
import "server-only";
import { db } from "../db";
import { allocateSlug } from "./slug";
import { siteVersionSpecSchema } from "./spec";
import { copyToPublicAssets, pathBelongsTo } from "../storage";
import { purgePublicSite } from "../netlify";

export interface PublishResult {
  ok: true;
  slug: string;
  versionNumber: number;
  url: string;
}

export function publicSiteUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_SITES_URL ?? `https://${process.env.PUBLIC_SITE_HOST ?? "sites.gobeefound.com"}`;
  return `${base.replace(/\/$/, "")}/${slug}`;
}

async function ensurePublication(businessId: string, businessName: string) {
  const existing = await db.sitePublication.findUnique({ where: { businessId } });
  if (existing) return existing;
  const slug = await allocateSlug(businessName, async (s) => Boolean(await db.sitePublication.findUnique({ where: { slug: s }, select: { businessId: true } })));
  return db.sitePublication.create({ data: { businessId, slug } });
}

/** Publish a specific approved version (defaults to the latest). */
export async function publishVersion(businessId: string, versionId?: string): Promise<PublishResult | { ok: false; error: string }> {
  const version = versionId ? await db.siteVersion.findFirst({ where: { id: versionId, businessId } }) : await db.siteVersion.findFirst({ where: { businessId }, orderBy: { versionNumber: "desc" } });
  if (!version) return { ok: false, error: "Approve your website first." };
  const spec = siteVersionSpecSchema.safeParse(version.spec);
  if (!spec.success) return { ok: false, error: "That version can't be published. Approve a new one." };

  const pub = await ensurePublication(businessId, spec.data.facts.businessName);

  // Copy-on-publish: assets become immutable public URLs for this version.
  const assets: { logoUrl?: string; heroUrl?: string } = {};
  const logoPath = spec.data.facts.logoPath;
  if (logoPath && pathBelongsTo(logoPath, businessId)) {
    const u = await copyToPublicAssets(logoPath, `${businessId}/v${version.versionNumber}/logo`);
    if (u) assets.logoUrl = u;
  }
  const heroPath = spec.data.setup.heroStyle === "photo" ? spec.data.setup.heroPhotoPath : null;
  if (heroPath && pathBelongsTo(heroPath, businessId)) {
    const u = await copyToPublicAssets(heroPath, `${businessId}/v${version.versionNumber}/hero`);
    if (u) assets.heroUrl = u;
  }

  await db.sitePublication.update({ where: { businessId }, data: { currentVersionId: version.id, assets, publishedAt: new Date(), unpublishedAt: null } });
  await purgePublicSite(businessId);
  return { ok: true, slug: pub.slug, versionNumber: version.versionNumber, url: publicSiteUrl(pub.slug) };
}

export async function unpublish(businessId: string): Promise<void> {
  const pub = await db.sitePublication.findUnique({ where: { businessId } });
  if (!pub || pub.unpublishedAt) return;
  await db.sitePublication.update({ where: { businessId }, data: { unpublishedAt: new Date() } });
  await purgePublicSite(businessId);
}

export async function publicationFor(businessId: string) {
  const pub = await db.sitePublication.findUnique({ where: { businessId }, include: { currentVersion: { select: { id: true, versionNumber: true, createdAt: true } } } });
  if (!pub) return null;
  return { slug: pub.slug, url: publicSiteUrl(pub.slug), live: Boolean(pub.publishedAt && !pub.unpublishedAt && pub.currentVersionId), current: pub.currentVersion, publishedAt: pub.publishedAt, unpublishedAt: pub.unpublishedAt };
}
