import type { SurfaceExpectation } from "./types";

// §5.5 — authored content. Defines the provenance-tracked field set and the
// confirmation baseline. NOT user-editable. Nothing in V1 performs drift detection.

export const SURFACE_MAP: SurfaceExpectation[] = [
  {
    fieldKey: "phone",
    appearsOn: ["website", "gbp", "facebook"],
    severity: "critical",
    explanation:
      "Customers calling the wrong number is the most expensive kind of mistake on this list.",
  },
  {
    fieldKey: "email",
    appearsOn: ["website"],
    severity: "important",
    explanation: "Quote requests that go to an old inbox are jobs you never hear about.",
  },
  {
    fieldKey: "displayName",
    appearsOn: ["website", "gbp", "facebook", "instagram"],
    severity: "critical",
    explanation:
      "Google and customers both match you by name. Spelling it three different ways splits you into three businesses.",
  },
  {
    fieldKey: "streetAddress",
    appearsOn: ["website", "gbp"],
    severity: "important",
    explanation:
      "If you show an address, it needs to be the same everywhere — a mismatch confuses customers and can get a Google profile suspended.",
    // Conditional: tracked only while hideAddress = false (§5.5).
  },
  {
    fieldKey: "serviceAreas",
    appearsOn: ["website", "gbp"],
    severity: "important",
    explanation:
      "When your service area grows and your website doesn't, customers in the new area assume you don't come to them.",
  },
  {
    fieldKey: "hours",
    appearsOn: ["website", "gbp", "facebook"],
    severity: "important",
    explanation: "Hours that differ between Google and your site make customers guess — and call someone else.",
  },
  {
    fieldKey: "domain",
    appearsOn: ["gbp", "facebook", "instagram"],
    severity: "important",
    explanation: "Every profile should send people to the same website. A missing or old link is a dead end.",
  },
  {
    fieldKey: "reviewLink",
    appearsOn: ["website"],
    severity: "minor",
    explanation: "A review link on your site turns happy visitors into reviews without you asking.",
  },
  {
    fieldKey: "shortDescription",
    appearsOn: ["facebook", "instagram"],
    severity: "minor",
    explanation: "Your social bios should say the same thing your website says, in fewer words.",
  },
  {
    fieldKey: "gbpDescription",
    appearsOn: ["gbp"],
    severity: "minor",
    explanation: "Your Google description is often the first paragraph a new customer reads about you.",
  },
];

/** The provenance-tracked field set (§5.2) — derived from the Surface Map, never hand-listed. */
export const TRACKED_FIELDS = SURFACE_MAP.map((s) => s.fieldKey);
