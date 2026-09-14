// V4 §D rule 3 — the model never writes contact data; we inject it after validation.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

import { claimsRepairHint, findGeneratedContactData, injectReviewLink, mergeServiceDescriptions, TOOL_BY_ROUTE, TOOL_META, TOOL_SAVE_MAP } from "@/lib/generators";
import { TOOL_IDS, TOOL_OUTPUT_FIELDS, TOOL_ROUTES } from "@/content";
import { REVIEW_LINK_PLACEHOLDER } from "@/content/prompts";

describe("mergeServiceDescriptions", () => {
  const existing = [{ name: "Garage cleanouts" }, { name: "Hot tub removal", description: "old text" }];
  it("fills descriptions by name, never adds or drops a service", () => {
    const merged = mergeServiceDescriptions(existing, [
      { name: "garage cleanouts", blurb: "Whole garage, one afternoon." },
      { name: "Invented service", description: "should be ignored" },
    ]);
    expect(merged).toEqual([{ name: "Garage cleanouts", description: "Whole garage, one afternoon." }, { name: "Hot tub removal", description: "old text" }]);
  });
  it("accepts description or blurb keys and caps at 200 chars", () => {
    const merged = mergeServiceDescriptions(existing, [{ name: "Hot tub removal", description: "x".repeat(300) }]);
    expect(merged[1]!.description).toHaveLength(200);
  });
  it("returns the input untouched for non-array output", () => {
    expect(mergeServiceDescriptions(existing, "nope")).toBe(existing);
  });
});

describe("claimsRepairHint", () => {
  it("names every violation so the retry removes them", () => {
    const hint = claimsRepairHint([{ kind: "guarantee", match: "guaranteed" }, { kind: "pricing", match: "free estimates" }]);
    expect(hint).toContain('guarantee: "guaranteed"');
    expect(hint).toContain('pricing: "free estimates"');
  });
});

describe("tool routing", () => {
  it("every tool has a route, meta, and a reverse lookup", () => {
    for (const t of TOOL_IDS) {
      expect(TOOL_ROUTES[t]).toMatch(/^[a-z-]+$/);
      expect(TOOL_BY_ROUTE[TOOL_ROUTES[t]]).toBe(t);
      expect(TOOL_META[t].name.length).toBeGreaterThan(0);
    }
  });
  it("only website_copy writes longDescription (P5)", () => {
    const writers = TOOL_IDS.filter((t) => (TOOL_OUTPUT_FIELDS[t] as readonly string[]).includes("longDescription"));
    expect(writers).toEqual(["website_copy"]);
  });
});

describe("findGeneratedContactData", () => {
  it("flags phone numbers, emails, and URLs anywhere in the output", () => {
    expect(findGeneratedContactData({ a: "Call 303-555-0100 today" })).toBe("303-555-0100");
    expect(findGeneratedContactData({ a: { b: ["Email mike@example.com"] } })).toBe("mike@example.com");
    expect(findGeneratedContactData({ a: "See https://mikesjunk.com/" })).toMatch(/^https:\/\/mikesjunk\.com/);
    expect(findGeneratedContactData({ a: "Visit mikesjunk.com" })).toBe("mikesjunk.com");
  });
  it("ignores our own review-link placeholder", () => {
    expect(findGeneratedContactData({ sms: `Leave a review: ${REVIEW_LINK_PLACEHOLDER}` })).toBeNull();
  });
  it("does not flag ordinary copy, hours, or prices-free text", () => {
    expect(findGeneratedContactData({ a: "Open Mon–Fri 8am–6pm. We clear garages in one afternoon." })).toBeNull();
  });
});

describe("injectReviewLink", () => {
  it("replaces every placeholder in every string field, leaving structure intact", () => {
    const out = injectReviewLink({ sms: `Review us: ${REVIEW_LINK_PLACEHOLDER}`, emailBody: `Here ${REVIEW_LINK_PLACEHOLDER} and ${REVIEW_LINK_PLACEHOLDER}`, nested: { x: ["ok"] } }, "https://g.page/r/abc/review");
    expect(out.sms).toBe("Review us: https://g.page/r/abc/review");
    expect(out.emailBody).toBe("Here https://g.page/r/abc/review and https://g.page/r/abc/review");
    expect(out.nested).toEqual({ x: ["ok"] });
  });
});

describe("TOOL_SAVE_MAP (server-side save targets)", () => {
  it("every save target is a field the tool is allowed to write", () => {
    for (const [tool, map] of Object.entries(TOOL_SAVE_MAP)) {
      for (const field of Object.keys(map)) expect(TOOL_OUTPUT_FIELDS[tool as keyof typeof TOOL_OUTPUT_FIELDS]).toContain(field);
    }
  });
});
