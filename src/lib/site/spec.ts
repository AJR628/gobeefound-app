// V4 §D — the SiteSpec contract. Three parts, deliberately separated:
//   SiteSetup  — the owner's design choices (selectable, never free text);
//   SiteCopy   — the ONLY thing the model produces: prose and structure, no contact data, no HTML;
//   PublicFacts — canonical business facts injected by the SERVER at render/publish time.
// Fixed shape + nullable optionals + closed enums = strict Structured Outputs compatible and exhaustively
// renderable. No unions, no open block lists. Shared by server, client, renderer, and export.
import { z } from "zod";

// ---------------------------------------------------------------------------------------------
// Closed design vocabulary
// ---------------------------------------------------------------------------------------------

export const THEME_IDS = ["clean", "bold", "warm", "classic", "modern", "trade"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const PALETTE_IDS = ["brand", "slate", "forest", "ocean", "sunset", "earth", "charcoal"] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export const LOGO_MODES = ["existing", "upload", "text", "none", "generated"] as const;
export type LogoMode = (typeof LOGO_MODES)[number];

export const VOICES = ["plain", "warm", "professional"] as const;
export type Voice = (typeof VOICES)[number];

export const PRIMARY_ACTIONS = ["call", "text", "form"] as const;
export type PrimaryAction = (typeof PRIMARY_ACTIONS)[number];

export const SECTION_KEYS = ["hero", "services", "serviceAreas", "about", "trust", "hours", "contact", "seo", "footer"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

// ---------------------------------------------------------------------------------------------
// SiteSetup — owner choices
// ---------------------------------------------------------------------------------------------

export const siteSetupSchema = z.object({
  theme: z.enum(THEME_IDS),
  palette: z.enum(PALETTE_IDS),
  logoMode: z.enum(LOGO_MODES),
  heroStyle: z.enum(["text", "photo"]),
  /** Canonical service names, in display order; up to 3 starred. Validated against BusinessProfile.services. */
  featuredServices: z.array(z.string().min(1).max(80)).max(3),
  primaryAction: z.enum(PRIMARY_ACTIONS),
  sections: z.object({ hours: z.boolean(), address: z.boolean(), serviceAreas: z.boolean(), reviews: z.boolean() }),
  voice: z.enum(VOICES),
  /** Storage path of the hero photo, when heroStyle = photo. Server-validated to belong to this business. */
  heroPhotoPath: z.string().max(400).nullable(),
});
export type SiteSetup = z.infer<typeof siteSetupSchema>;

export const DEFAULT_SETUP: SiteSetup = {
  theme: "clean",
  palette: "slate",
  logoMode: "text",
  heroStyle: "text",
  featuredServices: [],
  primaryAction: "call",
  sections: { hours: true, address: false, serviceAreas: true, reviews: true },
  voice: "plain",
  heroPhotoPath: null,
};

// ---------------------------------------------------------------------------------------------
// SiteCopy — what the model writes. Prose only. Every field present (strict mode); "" is allowed
// where a section may be empty, and the renderer treats "" as absent.
// ---------------------------------------------------------------------------------------------

const line = (max: number) => z.string().max(max);

export const siteCopySchema = z.object({
  hero: z.object({ headline: line(120), subheadline: line(240), ctaLabel: line(40) }),
  services: z.object({ heading: line(60), items: z.array(z.object({ name: line(80), blurb: line(200) })).min(1).max(30) }),
  serviceAreas: z.object({ heading: line(60), intro: line(240) }),
  about: z.object({ heading: line(60), body: line(1200) }),
  trust: z.object({ heading: line(60), body: line(600) }),
  hours: z.object({ heading: line(60), note: line(160) }),
  contact: z.object({ heading: line(60), body: line(300) }),
  seo: z.object({ pageTitle: line(70), metaDescription: line(170) }),
  footer: z.object({ note: line(160) }),
});
export type SiteCopy = z.infer<typeof siteCopySchema>;

/** Sub-schemas for section-level regeneration. */
export const SECTION_SCHEMAS: { [K in SectionKey]: z.ZodType<SiteCopy[K]> } = {
  hero: siteCopySchema.shape.hero,
  services: siteCopySchema.shape.services,
  serviceAreas: siteCopySchema.shape.serviceAreas,
  about: siteCopySchema.shape.about,
  trust: siteCopySchema.shape.trust,
  hours: siteCopySchema.shape.hours,
  contact: siteCopySchema.shape.contact,
  seo: siteCopySchema.shape.seo,
  footer: siteCopySchema.shape.footer,
};

export const SECTION_LABELS: Record<SectionKey, string> = {
  hero: "Headline",
  services: "Services",
  serviceAreas: "Where you work",
  about: "About",
  trust: "Why customers choose you",
  hours: "Hours",
  contact: "Contact",
  seo: "Page title & description",
  footer: "Footer",
};

// ---------------------------------------------------------------------------------------------
// PublicFacts — server-injected canonical data. NEVER produced by the model. Snapshotted into a
// SiteVersion at approval so the public renderer never reads the private BusinessProfile.
// ---------------------------------------------------------------------------------------------

export const publicFactsSchema = z.object({
  businessName: z.string().min(1).max(120),
  legalName: z.string().max(160).nullable(),
  phone: z.string().max(40).nullable(),
  email: z.string().max(200).nullable(),
  /** Present only when the owner shows the address (hideAddress = false AND setup.sections.address). */
  address: z.string().max(200).nullable(),
  city: z.string().max(80),
  state: z.string().max(2),
  serviceAreas: z.array(z.string().max(80)).max(30),
  services: z.array(z.object({ name: z.string().max(80), description: z.string().max(200).nullable() })).max(30),
  /** Pre-formatted, e.g. "Mon–Fri 8am–6pm · Sat 8am–2pm". */
  hours: z.string().max(200).nullable(),
  reviewLink: z.string().max(400).nullable(),
  brandColors: z.object({ primary: z.string(), secondary: z.string() }).nullable(),
  /** Storage path of the logo, when logoMode = existing|generated. Resolved to a URL by the renderer's host. */
  logoPath: z.string().max(400).nullable(),
});
export type PublicFacts = z.infer<typeof publicFactsSchema>;

// ---------------------------------------------------------------------------------------------
// The persisted shapes
// ---------------------------------------------------------------------------------------------

/** SiteDraft.spec — mutable working state. */
export const siteDraftSpecSchema = z.object({
  version: z.literal(1),
  setup: siteSetupSchema,
  copy: siteCopySchema.nullable(),
  approved: z.record(z.enum(SECTION_KEYS), z.boolean()).default({}),
});
export type SiteDraftSpec = z.infer<typeof siteDraftSpecSchema>;

/** SiteVersion.spec — immutable, approved, self-contained. Everything a public renderer needs. */
export const siteVersionSpecSchema = z.object({
  version: z.literal(1),
  setup: siteSetupSchema,
  copy: siteCopySchema,
  facts: publicFactsSchema,
});
export type SiteVersionSpec = z.infer<typeof siteVersionSpecSchema>;

/** What the renderer consumes. `assets` are resolved URLs; `mode` decides form behaviour. */
export interface RenderableSite {
  setup: SiteSetup;
  copy: SiteCopy;
  facts: PublicFacts;
  assets: { logoUrl: string | null; heroUrl: string | null };
  mode: "preview" | "published" | "export";
  /** Absolute or relative form endpoint; null → the renderer falls back to call/text/email. */
  formEndpoint: string | null;
}

/**
 * Which SiteCopy sections are visible for a given setup + facts. The renderer and the review gate
 * both use this so "what you see" and "what you approve" never disagree.
 */
export function visibleSections(setup: SiteSetup, facts: PublicFacts): SectionKey[] {
  const out: SectionKey[] = ["hero", "services"];
  if (setup.sections.serviceAreas && facts.serviceAreas.length) out.push("serviceAreas");
  out.push("about");
  out.push("trust");
  if (setup.sections.hours && facts.hours) out.push("hours");
  out.push("contact", "footer");
  return out;
}
