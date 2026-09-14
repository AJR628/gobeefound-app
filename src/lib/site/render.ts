// V4 §D/§G — turn a spec into a RenderableSite (resolving asset URLs) and into a complete standalone
// HTML document (for the export and, later, the public origin). Server-only.
import "server-only";
import { createElement } from "react";
// server.edge (not react-dom/server): the App Router forbids the classic entry in the server layer.
import { renderToStaticMarkup } from "react-dom/server.edge";
import { SiteBody } from "@/components/site/site-renderer";
import { SITE_CSS } from "@/components/site/site-css";
import { resolvePalette, themeStyleAttr, themeVariables } from "@/components/site/themes";
import type { RenderableSite, SiteVersionSpec } from "./spec";

export function toRenderable(spec: SiteVersionSpec, assets: { logoUrl: string | null; heroUrl: string | null }, mode: RenderableSite["mode"], formEndpoint: string | null): RenderableSite {
  return { setup: spec.setup, copy: spec.copy, facts: spec.facts, assets, mode, formEndpoint };
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/**
 * A complete, self-contained HTML document. Only the app's own constants (SITE_CSS, theme variables)
 * and React-escaped strings reach the markup — never raw model text.
 */
export function renderSiteDocument(site: RenderableSite, opts: { cssHref?: string; notice?: string } = {}): string {
  const vars = themeVariables(site.setup.theme, resolvePalette(site.setup.palette, site.facts.brandColors));
  const body = renderToStaticMarkup(createElement(SiteBody, { site: opts.notice ? { ...site, notice: opts.notice } : site }));
  const css = opts.cssHref ? `<link rel="stylesheet" href="${esc(opts.cssHref)}">` : `<style>${SITE_CSS}</style>`;
  const title = site.copy.seo.pageTitle.trim() || site.facts.businessName;
  const desc = site.copy.seo.metaDescription.trim();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${desc ? `<meta name="description" content="${esc(desc)}">` : ""}
<meta name="robots" content="${site.mode === "published" ? "index,follow" : "noindex,nofollow"}">
${css}
</head>
<body class="s-body" data-theme="${esc(site.setup.theme)}" style="${themeStyleAttr(vars)}">
${body}
</body>
</html>
`;
}
