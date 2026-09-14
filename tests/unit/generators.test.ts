// V4 §D rule 3 — the model never writes contact data; we inject it after validation.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

import { findGeneratedContactData, injectReviewLink, TOOL_SAVE_MAP } from "@/lib/generators";
import { TOOL_OUTPUT_FIELDS } from "@/content";
import { REVIEW_LINK_PLACEHOLDER } from "@/content/prompts";

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
