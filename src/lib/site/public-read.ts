// V4 §A11 — THE only query a public request can reach. Selects exclusively from SitePublication,
// SiteVersion, and CustomDomain. Never joins BusinessProfile, Business, User, or Purchase. Runs under the
// read-only Postgres role on the public origin. Returns a narrow object or null — never a fallback tenant.
import "server-only";
import { db } from "../db";
import { siteVersionSpecSchema, type SiteVersionSpec } from "./spec";

export interface PublishedSite {
  businessId: string;
  slug: string;
  versionNumber: number;
  spec: SiteVersionSpec;
  contactEmail: string | null;
  assets: { logoUrl: string | null; heroUrl: string | null };
  /** True when reached through a verified, active custom domain. */
  viaCustomDomain: boolean;
}

function shape(pub: { businessId: string; slug: string; assets: unknown; unpublishedAt: Date | null; publishedAt: Date | null; currentVersion: { versionNumber: number; spec: unknown; contactEmail: string | null } | null }, viaCustomDomain: boolean): PublishedSite | null {
  if (!pub.currentVersion || !pub.publishedAt || pub.unpublishedAt) return null;
  const spec = siteVersionSpecSchema.safeParse(pub.currentVersion.spec);
  if (!spec.success) return null;
  const a = (pub.assets ?? {}) as { logoUrl?: string; heroUrl?: string };
  return { businessId: pub.businessId, slug: pub.slug, versionNumber: pub.currentVersion.versionNumber, spec: spec.data, contactEmail: pub.currentVersion.contactEmail, assets: { logoUrl: a.logoUrl ?? null, heroUrl: a.heroUrl ?? null }, viaCustomDomain };
}

const SELECT = { businessId: true, slug: true, assets: true, unpublishedAt: true, publishedAt: true, currentVersion: { select: { versionNumber: true, spec: true, contactEmail: true } } } as const;

export async function getPublishedSiteBySlug(slug: string): Promise<PublishedSite | null> {
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const pub = await db.sitePublication.findUnique({ where: { slug }, select: SELECT });
  return pub ? shape(pub, false) : null;
}

export async function getPublishedSiteByHost(host: string): Promise<PublishedSite | null> {
  const h = host.toLowerCase().replace(/^www\./, "").split(":")[0]!;
  if (!/^[a-z0-9.-]{3,253}$/.test(h)) return null;
  const d = await db.customDomain.findUnique({ where: { domain: h }, select: { businessId: true, state: true, removedAt: true } });
  if (!d || d.state !== "active" || d.removedAt) return null;
  const pub = await db.sitePublication.findUnique({ where: { businessId: d.businessId }, select: SELECT });
  return pub ? shape(pub, true) : null;
}
