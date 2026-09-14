// V4 §D — derive PublicFacts from the canonical record. This is the ONLY place private BusinessProfile
// data becomes public site data, so the allow-list is explicit: nothing not named here can ever appear
// on a customer website. The address is included only when the owner shows it.
import type { PublicFacts, SiteSetup } from "./spec";
import { formatHours, type Service } from "../canonical";

export interface BusinessLike {
  city: string;
  state: string;
}
export interface ProfileLike {
  displayName: string;
  legalName: string | null;
  phone: string | null;
  email: string | null;
  streetAddress: string | null;
  hideAddress: boolean;
  serviceAreas: unknown;
  services: unknown;
  hours: unknown;
  reviewLink: string | null;
  brandColors: unknown;
  logoUrl: string | null;
}

function brand(v: unknown): { primary: string; secondary: string } | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const hex = /^#[0-9a-fA-F]{6}$/;
  return typeof o.primary === "string" && typeof o.secondary === "string" && hex.test(o.primary) && hex.test(o.secondary) ? { primary: o.primary, secondary: o.secondary } : null;
}

export function derivePublicFacts(business: BusinessLike, profile: ProfileLike, setup: SiteSetup): PublicFacts {
  const services = Array.isArray(profile.services) ? (profile.services as Service[]) : [];
  const showAddress = setup.sections.address && !profile.hideAddress && Boolean(profile.streetAddress?.trim());
  const wantsLogo = setup.logoMode === "existing" || setup.logoMode === "generated" || setup.logoMode === "upload";
  return {
    businessName: profile.displayName,
    legalName: profile.legalName?.trim() || null,
    phone: profile.phone?.trim() || null,
    email: profile.email?.trim() || null,
    address: showAddress ? profile.streetAddress!.trim() : null,
    city: business.city,
    state: business.state,
    serviceAreas: Array.isArray(profile.serviceAreas) ? (profile.serviceAreas as string[]).slice(0, 30) : [],
    services: services.slice(0, 30).map((s) => ({ name: s.name, description: s.description?.trim() || null })),
    hours: formatHours(profile.hours) || null,
    reviewLink: setup.sections.reviews ? profile.reviewLink?.trim() || null : null,
    brandColors: brand(profile.brandColors),
    logoPath: wantsLogo ? profile.logoUrl : null,
  };
}

/** The "What we already know" card: which facts will appear, in owner language. */
export function knownFactRows(f: PublicFacts): { label: string; value: string; present: boolean }[] {
  return [
    { label: "Business name", value: f.businessName, present: true },
    { label: "Services", value: f.services.map((s) => s.name).join(", "), present: f.services.length > 0 },
    { label: "Service area", value: f.serviceAreas.join(", "), present: f.serviceAreas.length > 0 },
    { label: "Phone", value: f.phone ?? "", present: Boolean(f.phone) },
    { label: "Email", value: f.email ?? "", present: Boolean(f.email) },
    { label: "Hours", value: f.hours ?? "", present: Boolean(f.hours) },
    { label: "Address", value: f.address ?? "Hidden — you go to your customers", present: true },
    { label: "Review link", value: f.reviewLink ?? "", present: Boolean(f.reviewLink) },
    { label: "Logo", value: f.logoPath ? "Uploaded" : "", present: Boolean(f.logoPath) },
    { label: "Brand colours", value: f.brandColors ? `${f.brandColors.primary} · ${f.brandColors.secondary}` : "", present: Boolean(f.brandColors) },
  ];
}
