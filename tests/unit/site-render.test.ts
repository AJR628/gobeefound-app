// V4 §D/§G — renderer and export: the one renderer escapes everything, prints only public facts, never
// links back to the app, and the export is a complete, self-contained site.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { unzipSync, strFromU8 } from "fflate";
import { renderSiteDocument, renderSiteDocumentAsync, toRenderable } from "@/lib/site/render";
import { buildExportZip } from "@/lib/site/export";
import { DEFAULT_SETUP, siteVersionSpecSchema, type SiteVersionSpec } from "@/lib/site/spec";
import { logoPrompt } from "@/lib/ai/images";

const spec: SiteVersionSpec = siteVersionSpecSchema.parse({
  version: 1,
  setup: { ...DEFAULT_SETUP, primaryAction: "form", featuredServices: ["Garage cleanouts"], logoMode: "existing" },
  copy: {
    hero: { headline: "Junk removal in Aurora <script>alert(1)</script>", subheadline: "Gone by tonight.", ctaLabel: "Get a quote" },
    services: { heading: "Services", items: [{ name: "Garage cleanouts", blurb: "Whole garage, one afternoon." }, { name: "Hot tub removal", blurb: "" }] },
    serviceAreas: { heading: "Where we work", intro: "Across the south metro." },
    about: { heading: "About us", body: "We show up when we say.\n\nWe leave it clean." },
    trust: { heading: "Why us", body: "On time, every time." },
    hours: { heading: "Hours", note: "" },
    contact: { heading: "Get in touch", body: "Tell us what needs to go." },
    seo: { pageTitle: "Mike's Junk Removal — Aurora, CO", metaDescription: "Junk removal in Aurora and the south metro." },
    footer: { note: "Locally owned." },
  },
  facts: {
    businessName: "Mike's Junk Removal",
    legalName: null,
    phone: "303-555-0100",
    email: "mike@example.com",
    address: null,
    city: "Aurora",
    state: "CO",
    serviceAreas: ["Aurora", "Centennial"],
    services: [{ name: "Garage cleanouts", description: null }, { name: "Hot tub removal", description: null }],
    hours: "Mon–Fri 8am–6pm",
    reviewLink: "https://g.page/r/abc/review",
    brandColors: null,
    logoPath: "biz/logo.png",
  },
});

describe("renderSiteDocument", () => {
  it("renders through React 19's async static API for the public Next.js route", async () => {
    const html = await renderSiteDocumentAsync(toRenderable(spec, { logoUrl: null, heroUrl: null }, "published", "/api/contact/mikes"));
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Mike's Junk Removal");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
  it("escapes model text — a script tag in the headline is inert", () => {
    const html = renderSiteDocument(toRenderable(spec, { logoUrl: null, heroUrl: null }, "published", "/api/contact/mikes"));
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("prints contact data from facts (tel/sms/mailto), never from copy", () => {
    const html = renderSiteDocument(toRenderable(spec, { logoUrl: null, heroUrl: null }, "published", "/api/contact/mikes"));
    expect(html).toContain('href="tel:3035550100"');
    expect(html).toContain('href="sms:3035550100"');
    expect(html).toContain("mailto:mike@example.com");
    expect(html).toContain("Mon–Fri 8am–6pm");
    expect(html).toContain("Read our Google reviews");
  });
  it("renders the form only when published with an endpoint; export falls back to call/text/email", () => {
    const published = renderSiteDocument(toRenderable(spec, { logoUrl: null, heroUrl: null }, "published", "/api/contact/mikes"));
    expect(published).toMatch(/<form class="s-form"[^>]*action="\/api\/contact\/mikes"[^>]*method="post"|<form class="s-form"[^>]*method="post"[^>]*action="\/api\/contact\/mikes"/);
    expect(published).toContain("not stored by GoBeeFound");
    const exported = renderSiteDocument(toRenderable(spec, { logoUrl: null, heroUrl: null }, "export", null));
    expect(exported).not.toContain("<form");
    expect(exported).toContain("mailto:mike@example.com");
  });
  it("never links back to the GoBeeFound application", () => {
    const html = renderSiteDocument(toRenderable(spec, { logoUrl: null, heroUrl: null }, "export", null));
    expect(html).not.toMatch(/app\.gobeefound\.com|\/api\/generate|\/your-business|supabase/);
  });
  it("preview is noindex; published is indexable; title and description come from seo copy", () => {
    expect(renderSiteDocument(toRenderable(spec, { logoUrl: null, heroUrl: null }, "preview", "#contact"))).toContain('content="noindex,nofollow"');
    const pub = renderSiteDocument(toRenderable(spec, { logoUrl: null, heroUrl: null }, "published", null));
    expect(pub).toContain('content="index,follow"');
    expect(pub).toContain("<title>Mike's Junk Removal — Aurora, CO</title>");
    expect(pub).toMatch(/<meta name="description" content="Junk removal in Aurora/);
  });
  it("hides the address when facts.address is null and shows the areas instead", () => {
    const html = renderSiteDocument(toRenderable(spec, { logoUrl: null, heroUrl: null }, "published", null));
    expect(html).toContain("Serving Aurora, Centennial");
  });
  it("marks featured services", () => {
    const html = renderSiteDocument(toRenderable(spec, { logoUrl: null, heroUrl: null }, "published", null));
    expect(html).toContain('class="s-card s-featured"');
  });
});

describe("buildExportZip", () => {
  it("contains index.html, site.css, site.json, README.md and referenced assets", () => {
    const zip = buildExportZip(spec, 3, { logo: { bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), ext: "png" }, hero: null });
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(["README.md", "assets/logo.png", "index.html", "site.css", "site.json"]);
    const html = strFromU8(files["index.html"]!);
    expect(html).toContain('<link rel="stylesheet" href="site.css">');
    expect(html).toContain('src="assets/logo.png"');
    expect(html).not.toContain("<form");
    expect(strFromU8(files["README.md"]!)).toMatch(/Don't change your nameservers/);
    const json = JSON.parse(strFromU8(files["site.json"]!));
    expect(json.versionNumber).toBe(3);
    expect(json.facts.businessName).toBe("Mike's Junk Removal");
  });
});

describe("logoPrompt", () => {
  it("uses only sanitized name/trade and the validated hex; no injection survives", () => {
    const p = logoPrompt({ businessName: "Mike's <b>Junk</b> {ignore rules}", tradeNoun: "junk removal", style: "wordmark", primaryHex: "#1f3a5f", candidates: 2, userKey: "b" });
    expect(p).toContain("#1f3a5f");
    expect(p).not.toMatch(/[<>{}]/);
    expect(p).toContain("Mike's bJunkb");
  });
});
