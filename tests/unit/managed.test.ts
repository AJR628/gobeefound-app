// V4 §F/§I/§H/§A11 — Managed logic that must be right before a single customer site goes live.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/stripe", () => ({ stripe: () => ({}) }));

import { deriveManagedState } from "@/lib/managed/entitlement";
import { mapStripeStatus, periodEndOf } from "@/lib/managed/stripe";
import { allocateSlug, isValidSlug, slugify } from "@/lib/site/slug";
import { routePublicRequest } from "@/lib/public-routing";
import { mergeAliases } from "@/lib/netlify";
import { checkDns, dnsInstructions, isApex, normalizeDomain, type Resolver } from "@/lib/managed/domains";
import { parseContactForm } from "@/lib/managed/contact-relay";

const day = 86_400_000;
const now = new Date("2026-09-14T18:00:00Z");

describe("deriveManagedState — the V4 §F lifecycle table", () => {
  it("active within the period is entitled", () => {
    expect(deriveManagedState({ status: "active", currentPeriodEnd: new Date(now.getTime() + 10 * day), graceEndsAt: null }, now)).toMatchObject({ entitled: true, reason: "active" });
  });
  it("cancelled stays live until the period ends, then not", () => {
    expect(deriveManagedState({ status: "cancel_at_period_end", currentPeriodEnd: new Date(now.getTime() + day), graceEndsAt: null }, now)).toMatchObject({ entitled: true, reason: "cancelling" });
    expect(deriveManagedState({ status: "cancel_at_period_end", currentPeriodEnd: new Date(now.getTime() - day), graceEndsAt: null }, now)).toMatchObject({ entitled: false, reason: "period_over" });
  });
  it("payment failure keeps the site live through grace, then not", () => {
    expect(deriveManagedState({ status: "past_due", currentPeriodEnd: null, graceEndsAt: new Date(now.getTime() + 3 * day) }, now)).toMatchObject({ entitled: true, reason: "grace" });
    expect(deriveManagedState({ status: "past_due", currentPeriodEnd: null, graceEndsAt: new Date(now.getTime() - 1) }, now)).toMatchObject({ entitled: false, reason: "grace_over" });
  });
  it("incomplete/ended/none are never entitled", () => {
    expect(deriveManagedState({ status: "incomplete", currentPeriodEnd: null, graceEndsAt: null }, now).entitled).toBe(false);
    expect(deriveManagedState({ status: "ended", currentPeriodEnd: new Date(now.getTime() + day), graceEndsAt: null }, now).entitled).toBe(false);
    expect(deriveManagedState(null, now)).toMatchObject({ entitled: false, reason: "none" });
  });
});

describe("Stripe mapping", () => {
  it("maps statuses and honours cancel_at_period_end", () => {
    expect(mapStripeStatus("active", false)).toBe("active");
    expect(mapStripeStatus("active", true)).toBe("cancel_at_period_end");
    expect(mapStripeStatus("past_due", false)).toBe("past_due");
    expect(mapStripeStatus("canceled", false)).toBe("ended");
    expect(mapStripeStatus("unpaid", false)).toBe("ended");
    expect(mapStripeStatus("incomplete", false)).toBe("incomplete");
  });
  it("reads current_period_end from the subscription or its first item", () => {
    expect(periodEndOf({ current_period_end: 1_800_000_000 })?.getTime()).toBe(1_800_000_000_000);
    expect(periodEndOf({ items: { data: [{ current_period_end: 1_800_000_001 }] } })?.getTime()).toBe(1_800_000_001_000);
    expect(periodEndOf({})).toBeNull();
  });
});

describe("slugs", () => {
  it("slugifies business names and rejects reserved words", () => {
    expect(slugify("Mike's Junk Removal")).toBe("mike-s-junk-removal");
    expect(slugify("A & B Cleaning")).toBe("a-and-b-cleaning");
    expect(isValidSlug("api")).toBe(false);
    expect(isValidSlug("mikes-junk")).toBe(true);
    expect(isValidSlug("-bad")).toBe(false);
  });
  it("allocates the first free suffix", async () => {
    const taken = new Set(["mike-s-junk-removal", "mike-s-junk-removal-2"]);
    expect(await allocateSlug("Mike's Junk Removal", async (s) => taken.has(s))).toBe("mike-s-junk-removal-3");
  });
});

describe("routePublicRequest — host isolation (V4 §A11)", () => {
  const PH = "sites.gobeefound.com";
  it("app role: normal paths pass; public internals and the relay are 404", () => {
    expect(routePublicRequest("app", "app.gobeefound.com", "/home", PH)).toEqual({ action: "next" });
    expect(routePublicRequest("app", "app.gobeefound.com", "/gbf-public/slug/x", PH)).toEqual({ action: "notFound" });
    expect(routePublicRequest("app", "app.gobeefound.com", "/api/contact/x", PH)).toEqual({ action: "notFound" });
  });
  it("public role on the GoBeeFound host: /{slug} rewrites, app routes are 404", () => {
    expect(routePublicRequest("public", PH, "/mikes-junk", PH)).toEqual({ action: "rewrite", to: "/gbf-public/slug/mikes-junk" });
    for (const p of ["/home", "/api/generate/x", "/your-business", "/site", "/login", "/t/1.1", "/site-preview"]) expect(routePublicRequest("public", PH, p, PH), p).toEqual({ action: "notFound" });
    expect(routePublicRequest("public", PH, "/mikes-junk/anything", PH)).toEqual({ action: "notFound" });
    expect(routePublicRequest("public", PH, "/gbf-public/slug/mikes-junk", PH)).toEqual({ action: "notFound" });
  });
  it("public role on a customer domain: only the root serves; passthroughs allowed", () => {
    expect(routePublicRequest("public", "mikesjunkremoval.com", "/", PH)).toEqual({ action: "rewrite", to: "/gbf-public/host/mikesjunkremoval.com" });
    expect(routePublicRequest("public", "MikesJunkRemoval.com:443", "/", PH)).toEqual({ action: "rewrite", to: "/gbf-public/host/mikesjunkremoval.com" });
    expect(routePublicRequest("public", "mikesjunkremoval.com", "/home", PH)).toEqual({ action: "notFound" });
    expect(routePublicRequest("public", "mikesjunkremoval.com", "/api/contact/mikes-junk", PH)).toEqual({ action: "next" });
    expect(routePublicRequest("public", "mikesjunkremoval.com", "/_next/static/x.js", PH)).toEqual({ action: "next" });
  });
});

describe("domains", () => {
  it("normalizes owner input and rejects our own domains", () => {
    expect(normalizeDomain("https://www.MikesJunkRemoval.com/about")).toBe("mikesjunkremoval.com");
    expect(normalizeDomain("mikes junk")).toBeNull();
    expect(normalizeDomain("app.gobeefound.com")).toBeNull();
    expect(normalizeDomain("shop.mikesjunk.com")).toBe("shop.mikesjunk.com");
  });
  it("tells apex from subdomain", () => {
    expect(isApex("mikesjunk.com")).toBe(true);
    expect(isApex("mikesjunk.co.uk")).toBe(true);
    expect(isApex("shop.mikesjunk.com")).toBe(false);
  });
  it("gives the minimum records — TXT + A + www CNAME for an apex; never a nameserver change", () => {
    const r = dnsInstructions("mikesjunk.com", "gbf-verify=abc", { publicHost: "sites.gobeefound.com", apexIp: "75.2.60.5" });
    expect(r.map((x) => `${x.type} ${x.host} ${x.value}`)).toEqual(["TXT _gbf-verify gbf-verify=abc", "A @ 75.2.60.5", "CNAME www sites.gobeefound.com"]);
    expect(JSON.stringify(r)).not.toMatch(/nameserver|NS /i);
    expect(dnsInstructions("shop.mikesjunk.com", "t", { publicHost: "sites.gobeefound.com" })).toHaveLength(2);
  });
  it("checkDns passes only when every record is right and reports MX for the warning", async () => {
    const resolver: Resolver = {
      txt: async (n) => (n === "_gbf-verify.mikesjunk.com" ? [["gbf-verify=abc"]] : []),
      a: async (n) => (n === "mikesjunk.com" ? ["75.2.60.5"] : []),
      cname: async (n) => (n === "www.mikesjunk.com" ? ["sites.gobeefound.com."] : []),
      mx: async () => [{ exchange: "mx.example.com", priority: 10 }],
    };
    const ok = await checkDns("mikesjunk.com", "gbf-verify=abc", resolver, { publicHost: "sites.gobeefound.com", apexIp: "75.2.60.5" });
    expect(ok).toMatchObject({ tokenOk: true, rootOk: true, wwwOk: true, mx: ["mx.example.com"] });
    const bad = await checkDns("mikesjunk.com", "gbf-verify=OTHER", resolver, { publicHost: "sites.gobeefound.com", apexIp: "75.2.60.5" });
    expect(bad.tokenOk).toBe(false);
    expect(bad.detail[0]).toMatch(/different value/);
  });
  it("mergeAliases adds and removes the apex + www pair without duplicates", () => {
    expect(mergeAliases(["other.com"], "MikesJunk.com", "add").sort()).toEqual(["mikesjunk.com", "other.com", "www.mikesjunk.com"]);
    expect(mergeAliases(["mikesjunk.com", "www.mikesjunk.com", "other.com"], "mikesjunk.com", "remove")).toEqual(["other.com"]);
  });
});

describe("contact relay parsing", () => {
  const good = { name: "Jo", contact: "303-555-0100", message: "Need a garage cleared", website: "", t: "100" };
  it("accepts a human submission", () => {
    expect(parseContactForm(good, 200)).toMatchObject({ ok: true });
  });
  it("rejects the honeypot, too-fast fills, and junk", () => {
    expect(parseContactForm({ ...good, website: "http://spam" }, 200)).toEqual({ ok: false, reason: "honeypot" });
    expect(parseContactForm({ ...good, t: "199" }, 200)).toEqual({ ok: false, reason: "too_fast" });
    expect(parseContactForm({ ...good, message: "" }, 200)).toEqual({ ok: false, reason: "invalid" });
    expect(parseContactForm({ ...good, name: "x".repeat(81) }, 200)).toEqual({ ok: false, reason: "invalid" });
  });
});
