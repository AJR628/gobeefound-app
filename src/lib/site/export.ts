// V4 §G — "Take my website with me". A functional static snapshot: index.html, site.css, assets, the
// spec as JSON, and a plain README. No app URLs, no Managed-only features (the form falls back to
// call/text/email), no allowance cost, nothing persisted.
import "server-only";
import { strToU8, zipSync } from "fflate";
import { SITE_CSS } from "@/components/site/site-css";
import { renderSiteDocument, toRenderable } from "./render";
import type { SiteVersionSpec } from "./spec";

export interface ExportAssets {
  logo: { bytes: Uint8Array; ext: "png" | "jpg" } | null;
  hero: { bytes: Uint8Array; ext: "png" | "jpg" } | null;
}

function readme(spec: SiteVersionSpec, versionNumber: number): string {
  const name = spec.facts.businessName;
  return `# ${name} — your website

This folder is your complete website, version ${versionNumber}, exported from GoBeeFound on ${new Date().toISOString().slice(0, 10)}.
You own it. You can host it anywhere that serves plain web pages.

## What's inside
- index.html — the whole site, one page
- site.css — its styles
- assets/ — your logo and photos, if any
- site.json — everything the page was built from, in case you or a developer want to rebuild it

## How to put it online (the simple version)
1. Sign up with any static web host (examples: Netlify, Cloudflare Pages, GitHub Pages, your domain
   registrar's "website hosting" if it offers one).
2. Upload this whole folder. Most hosts let you drag and drop it.
3. Point your domain at the host by following ITS instructions. You usually add one or two DNS records
   at the company where you bought the domain. Don't change your nameservers unless the host says you must —
   changing nameservers can break your email.
4. Turn on HTTPS at the host (nearly all do it automatically).

## About the contact form
Online forms need a server to deliver messages. This exported copy replaces the form with your phone
number and email so nothing silently breaks. If you want a form, your host may offer one, or you can use a
form service and paste its code where the contact section is.

## Keeping it up to date
Edit index.html with any text editor, or come back to GoBeeFound, make changes, and export again.
`;
}

export function buildExportZip(spec: SiteVersionSpec, versionNumber: number, assets: ExportAssets): Uint8Array {
  const logoName = assets.logo ? `assets/logo.${assets.logo.ext}` : null;
  const heroName = assets.hero ? `assets/hero.${assets.hero.ext}` : null;
  const site = toRenderable(spec, { logoUrl: logoName, heroUrl: heroName }, "export", null);
  const html = renderSiteDocument(site, { cssHref: "site.css" });
  const files: Record<string, Uint8Array> = {
    "index.html": strToU8(html),
    "site.css": strToU8(SITE_CSS.trim() + "\n"),
    "site.json": strToU8(JSON.stringify({ exportedAt: new Date().toISOString(), versionNumber, ...spec }, null, 2)),
    "README.md": strToU8(readme(spec, versionNumber)),
  };
  if (assets.logo && logoName) files[logoName] = assets.logo.bytes;
  if (assets.hero && heroName) files[heroName] = assets.hero.bytes;
  return zipSync(files, { level: 6 });
}
