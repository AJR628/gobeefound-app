// §20.5 — data portability. Free, permanent, regardless of entitlement or refund status.

import { db } from "./db";

export const EXPORT_SCHEMA_VERSION = 1;

export async function buildExport(businessId: string) {
  const [business, profile, assets, provenance, generated] = await Promise.all([
    db.business.findUniqueOrThrow({ where: { id: businessId }, include: { onboarding: true } }),
    db.businessProfile.findUniqueOrThrow({ where: { businessId } }),
    db.connectedAsset.findMany({ where: { businessId, removedAt: null }, orderBy: { createdAt: "asc" } }),
    db.fieldProvenance.findMany({ where: { businessId } }),
    db.generatedContent.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } }),
  ]);

  const { businessId: _b, ...profileFields } = profile;
  void _b;

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    business: {
      trade: business.trade,
      city: business.city,
      state: business.state,
      serviceAreaType: business.serviceAreaType,
      alreadyServing: business.alreadyServing,
      stage: business.stage,
      launchedAt: business.launchedAt,
      createdAt: business.createdAt,
      onboardingAnswers: business.onboarding
        ? {
            hasDomain: business.onboarding.hasDomain, hasWebsite: business.onboarding.hasWebsite, hasEmail: business.onboarding.hasEmail,
            hasPhone: business.onboarding.hasPhone, hasGBP: business.onboarding.hasGBP, hasSocial: business.onboarding.hasSocial, hasReviews: business.onboarding.hasReviews,
          }
        : null,
    },
    profile: profileFields,
    assets: assets.map((a) => ({ type: a.type, url: a.url, label: a.label, connectionState: a.connectionState, verifiedAt: a.verifiedAt, createdAt: a.createdAt })),
    provenance: provenance.map((p) => ({ field: p.fieldKey, source: p.source, setAt: p.setAt, lastConfirmedAt: p.lastConfirmedAt, confirmedVia: p.confirmedVia })),
    generatedContent: generated.map((g) => ({ tool: g.toolType, createdAt: g.createdAt, output: g.output, editedOutput: g.editedOutput, wasEdited: g.wasEdited })),
  };
}
