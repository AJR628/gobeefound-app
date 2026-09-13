// §21.7 — adversarial prompt-constraint suite. Tests the deterministic enforcement layer (P10),
// not the model: any output asserting an unsupported credential, guarantee, or superlative is rejected.
import { describe, expect, it } from "vitest";
import { findUnsupportedClaims, isKeywordStuffed, validateGeneratedOutput, type ClaimContext } from "@/lib/claims";

const bare: ClaimContext = { ownerText: ["I show up when I say I will", "Small repairs done right"], city: "Aurora", state: "CO" };

describe("unsupported claims are caught", () => {
  it.each([
    ["Licensed and insured handyman serving Aurora.", "license"],
    ["Fully insured for your peace of mind.", "insurance"],
    ["A certified technician on every job.", "certification"],
    ["Over 15 years of experience.", "years in business"],
    ["Family owned since 1998.", "years in business"],
    ["500+ happy customers served.", "customer count"],
    ["100% satisfaction guaranteed.", "guarantee"],
    ["Call for a free estimate today.", "pricing"],
    ["Jobs from $99.", "pricing"],
    ["Available 24/7 for emergencies.", "availability"],
    ["We respond within 15 minutes.", "response time"],
  ])("rejects %s", (text, kind) => {
    const v = findUnsupportedClaims(text, bare);
    expect(v.map((x) => x.kind)).toContain(kind);
  });

  it("rejects superlatives regardless of owner text", () => {
    expect(findUnsupportedClaims("Aurora's premier detailing service.", bare)[0]?.kind).toBe("superlative");
    expect(findUnsupportedClaims("The #1 choice for handyman work.", bare).some((v) => v.kind === "superlative")).toBe(true);
  });
});

describe("owner-provided facts are allowed", () => {
  it("allows 'licensed' when the owner said it", () => {
    const ctx: ClaimContext = { ...bare, ownerText: [...bare.ownerText, "Licensed electrician, state license on request"] };
    expect(findUnsupportedClaims("A licensed electrician you can actually reach.", ctx)).toEqual([]);
  });
  it("allows a years claim the owner stated", () => {
    const ctx: ClaimContext = { ...bare, ownerText: ["12 years of experience in residential plumbing"] };
    expect(findUnsupportedClaims("12 years of experience fixing what others patched.", ctx)).toEqual([]);
  });
  it("passes clean, plain copy", () => {
    expect(findUnsupportedClaims("Small home repairs across Aurora and the south metro. Call or text and I'll get back to you the same day I said I would.", bare)).toEqual([]);
  });
});

describe("keyword stuffing", () => {
  it("flags more than two city mentions in one field", () => {
    expect(isKeywordStuffed("Aurora handyman. Aurora repairs. Aurora drywall. Serving Aurora.", bare)).toBe(true);
    expect(isKeywordStuffed("Handyman in Aurora and nearby.", bare)).toBe(false);
  });
});

describe("structured output validation", () => {
  it("scans nested fields and arrays", () => {
    const out = { headline: "Handyman in Aurora", serviceBlurbs: [{ name: "Drywall", blurb: "Award-winning patches." }], about: "I fix things." };
    const v = validateGeneratedOutput(out, bare);
    expect(v.some((x) => x.kind === "superlative")).toBe(true);
  });
  it("returns empty for a clean structured output", () => {
    const out = { short: "Small home repairs in Aurora.", google: "I do drywall, fixture swaps, and small carpentry for homeowners in the south metro.", long: "I'm Dave. I do small repairs." };
    expect(validateGeneratedOutput(out, bare)).toEqual([]);
  });
});
