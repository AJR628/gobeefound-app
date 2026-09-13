import { describe, expect, it } from "vitest";
import { formatCanonicalValue, formatHours } from "@/lib/canonical";
import { normalizeUrl } from "@/lib/assets";

describe("formatHours", () => {
  it("groups consecutive identical days", () => {
    const h = {
      mon: { open: "08:00", close: "18:00" }, tue: { open: "08:00", close: "18:00" }, wed: { open: "08:00", close: "18:00" },
      thu: { open: "08:00", close: "18:00" }, fri: { open: "08:00", close: "18:00" }, sat: { open: "08:00", close: "14:00" }, sun: "closed",
    };
    expect(formatHours(h)).toBe("Mon–Fri 8am–6pm · Sat 8am–2pm · Sun closed");
  });
  it("returns empty for invalid input", () => {
    expect(formatHours(null)).toBe("");
    expect(formatHours({ mon: "nope" })).toBe("");
  });
});

describe("formatCanonicalValue", () => {
  it("renders arrays and services as comma lists", () => {
    expect(formatCanonicalValue("serviceAreas", ["Aurora", "Parker"])).toBe("Aurora, Parker");
    expect(formatCanonicalValue("services", [{ name: "TV mounting" }, { name: "Drywall" }])).toBe("TV mounting, Drywall");
  });
  it("renders hideAddress honestly", () => {
    expect(formatCanonicalValue("hideAddress", true)).toMatch(/hidden/);
  });
});

describe("normalizeUrl — format only, never fetched", () => {
  it("adds https and strips a trailing slash", () => {
    expect(normalizeUrl("daveauroradetail.com/")).toBe("https://daveauroradetail.com");
  });
  it("keeps paths (Google profile share links)", () => {
    expect(normalizeUrl("https://g.page/r/abc/review")).toBe("https://g.page/r/abc/review");
  });
  it("rejects strings without a dot", () => {
    expect(normalizeUrl("localhost")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
});
