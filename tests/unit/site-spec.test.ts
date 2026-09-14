// V4 §D — SiteSpec contract tests: strict-mode compatibility, closed vocabulary, P16 guardrail, facts derivation.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { BUSINESS_PROFILE_FIELDS } from "@/content";
import { toStrictTextFormat } from "@/lib/ai/json-schema";
import { DEFAULT_SETUP, SECTION_KEYS, SECTION_SCHEMAS, siteCopySchema, siteSetupSchema, visibleSections, type PublicFacts } from "@/lib/site/spec";
import { derivePublicFacts, knownFactRows } from "@/lib/site/facts";
import { PALETTES, THEMES, resolvePalette, themeStyleAttr, themeVariables } from "@/components/site/themes";

const profile = {
  displayName: "Mike's Junk Removal",
  legalName: "Mike's Junk Removal LLC",
  phone: "303-555-0100",
  email: "mike@example.com",
  streetAddress: "12 Elm St",
  hideAddress: false,
  serviceAreas: ["Aurora", "Centennial"],
  services: [{ name: "Garage cleanouts", description: "Whole garage" }, { name: "Hot tub removal" }],
  hours: { mon: { open: "08:00", close: "18:00" } },
  reviewLink: "https://g.page/r/abc/review",
  brandColors: { primary: "#112233", secondary: "#aabbcc" },
  logoUrl: "biz/logo.png",
};
const business = { city: "Aurora", state: "CO" };

describe("SiteCopy is strict-Structured-Outputs compatible", () => {
  it("derives a strict json_schema with every property required and no unions", () => {
    const f = toStrictTextFormat(siteCopySchema, "site_copy");
    const s = JSON.stringify(f.schema);
    expect(f.strict).toBe(true);
    expect(s).not.toMatch(/anyOf|oneOf|allOf/);
    expect((f.schema.required as string[]).sort()).toEqual([...SECTION_KEYS].sort());
    expect(f.schema.additionalProperties).toBe(false);
  });
  it("every section has a sub-schema and a label", () => {
    for (const k of SECTION_KEYS) {
      expect(SECTION_SCHEMAS[k]).toBeDefined();
      const f = toStrictTextFormat(SECTION_SCHEMAS[k], `site_${k}`);
      expect(JSON.stringify(f.schema)).not.toMatch(/anyOf|oneOf/);
    }
  });
});

describe("P16 guardrail — the guided setup never asks for a canonical fact", () => {
  it("SiteSetup keys are disjoint from BusinessProfile fields", () => {
    const setupKeys = Object.keys(siteSetupSchema.shape);
    const overlap = setupKeys.filter((k) => (BUSINESS_PROFILE_FIELDS as readonly string[]).includes(k));
    expect(overlap).toEqual([]);
  });
  it("the default setup is valid", () => {
    expect(siteSetupSchema.safeParse(DEFAULT_SETUP).success).toBe(true);
  });
});

describe("derivePublicFacts — the only door from private record to public site", () => {
  it("includes the address only when the owner shows it AND the section is on", () => {
    const on = derivePublicFacts(business, profile, { ...DEFAULT_SETUP, sections: { ...DEFAULT_SETUP.sections, address: true } });
    expect(on.address).toBe("12 Elm St");
    const off = derivePublicFacts(business, profile, { ...DEFAULT_SETUP, sections: { ...DEFAULT_SETUP.sections, address: false } });
    expect(off.address).toBeNull();
    const hidden = derivePublicFacts(business, { ...profile, hideAddress: true }, { ...DEFAULT_SETUP, sections: { ...DEFAULT_SETUP.sections, address: true } });
    expect(hidden.address).toBeNull();
  });
  it("drops the review link when reviews are off, and the logo when the mode is text/none", () => {
    expect(derivePublicFacts(business, profile, { ...DEFAULT_SETUP, sections: { ...DEFAULT_SETUP.sections, reviews: false } }).reviewLink).toBeNull();
    expect(derivePublicFacts(business, profile, { ...DEFAULT_SETUP, logoMode: "text" }).logoPath).toBeNull();
    expect(derivePublicFacts(business, profile, { ...DEFAULT_SETUP, logoMode: "existing" }).logoPath).toBe("biz/logo.png");
  });
  it("never carries private fields", () => {
    const f = derivePublicFacts(business, profile, DEFAULT_SETUP) as unknown as Record<string, unknown>;
    for (const k of ["timezone", "pricingApproach", "idealCustomer", "differentiators", "legalName_private", "ownerId", "userId"]) expect(f).not.toHaveProperty(k);
  });
  it("formats hours and validates brand colours", () => {
    const f = derivePublicFacts(business, profile, DEFAULT_SETUP);
    expect(f.hours).toBe("Mon 8am–6pm");
    expect(f.brandColors).toEqual({ primary: "#112233", secondary: "#aabbcc" });
    expect(derivePublicFacts(business, { ...profile, brandColors: { primary: "red", secondary: "#000000" } }, DEFAULT_SETUP).brandColors).toBeNull();
  });
  it("knownFactRows says 'Hidden' for a hidden address rather than leaking it", () => {
    const rows = knownFactRows(derivePublicFacts(business, { ...profile, hideAddress: true }, DEFAULT_SETUP));
    expect(rows.find((r) => r.label === "Address")!.value).toMatch(/Hidden/);
  });
});

describe("visibleSections", () => {
  const facts: PublicFacts = derivePublicFacts(business, profile, DEFAULT_SETUP);
  it("hides hours/areas when toggled off or absent", () => {
    expect(visibleSections(DEFAULT_SETUP, facts)).toContain("hours");
    expect(visibleSections({ ...DEFAULT_SETUP, sections: { ...DEFAULT_SETUP.sections, hours: false } }, facts)).not.toContain("hours");
    expect(visibleSections(DEFAULT_SETUP, { ...facts, serviceAreas: [] })).not.toContain("serviceAreas");
  });
});

describe("themes", () => {
  it("every theme and palette resolves; brand falls back safely", () => {
    for (const t of Object.keys(THEMES)) expect(Object.keys(themeVariables(t as keyof typeof THEMES, PALETTES.slate))).toContain("--s-primary");
    expect(resolvePalette("brand", null).primary).toBe(PALETTES.slate.primary);
    expect(resolvePalette("brand", { primary: "#123456", secondary: "#abcdef" }).primary).toBe("#123456");
  });
  it("style attribute serialisation strips characters that could break out of the attribute", () => {
    expect(themeStyleAttr({ "--s-primary": "#fff;}</style><script>" })).not.toMatch(/[;{}<>]{2,}|<script/);
  });
});
