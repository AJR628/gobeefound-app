import { describe, expect, it } from "vitest";
import { EVENT_PROPERTY_ALLOWLIST, sanitizeProps } from "@/lib/analytics/server";

describe("§19.3 analytics — no PII in event properties", () => {
  it("drops any property not on the event's allowlist", () => {
    const out = sanitizeProps("onboarding_completed", {
      trade: "handyman",
      state: "CO",
      city: "Aurora", // NOT allowed
      email: "dave@example.com", // NOT allowed
      displayName: "Dave's Detail", // NOT allowed
      alreadyHasCount: 2,
    });
    expect(out).toEqual({ trade: "handyman", state: "CO", alreadyHasCount: 2 });
  });
  it("never lets a URL or phone through on asset/known-value events", () => {
    expect(sanitizeProps("asset_declared", { assetType: "website", url: "https://x.com" })).toEqual({ assetType: "website" });
    expect(sanitizeProps("known_value_copied", { taskId: "4.4", fieldKey: "phone", value: "303-555-0000" })).toEqual({ taskId: "4.4", fieldKey: "phone" });
  });
  it("unknown events send nothing", () => {
    expect(sanitizeProps("made_up_event", { anything: 1 })).toEqual({});
  });
  it("no allowlist contains a PII key", () => {
    const pii = new Set(["email", "phone", "url", "city", "displayName", "name", "address", "streetAddress", "domain", "reviewLink"]);
    for (const [event, keys] of Object.entries(EVENT_PROPERTY_ALLOWLIST)) {
      for (const k of keys) expect(pii.has(k), `${event} allows PII key ${k}`).toBe(false);
    }
  });
});
