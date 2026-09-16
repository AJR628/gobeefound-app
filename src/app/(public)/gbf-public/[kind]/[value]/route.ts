import { NextResponse } from "next/server";
import { getPublishedSiteByHost, getPublishedSiteBySlug } from "@/lib/site/public-read";
import { renderSiteDocumentAsync, toRenderable } from "@/lib/site/render";
import { siteRole } from "@/lib/public-routing";

// V4 §A11 — the public site. Reached ONLY via the middleware rewrite on the public role
// (/gbf-public/slug/{slug} or /gbf-public/host/{host}); 404 everywhere else. Renders the CURRENT published
// SiteVersion with the one trusted renderer, as a complete HTML document, with CDN caching by tag.

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ kind: string; value: string }> }) {
  if (siteRole() !== "public") return new NextResponse("Not found", { status: 404 });
  const { kind, value } = await ctx.params;
  const site = kind === "slug" ? await getPublishedSiteBySlug(value) : kind === "host" ? await getPublishedSiteByHost(decodeURIComponent(value)) : null;
  if (!site) return new NextResponse("<!doctype html><title>Not found</title><p style=\"font:16px system-ui;padding:40px\">This site isn't available.</p>", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

  const sent = new URL(request.url).searchParams.get("sent") === "1";
  const formEndpoint = site.spec.setup.primaryAction === "form" && site.contactEmail ? `/api/contact/${site.slug}` : null;
  const html = await renderSiteDocumentAsync(toRenderable(site.spec, site.assets, "published", formEndpoint), { notice: sent ? "Thanks — your message was sent." : undefined });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Browser: brief. CDN: long-lived + durable, invalidated by tag on publish/rollback/unpublish.
      "Cache-Control": sent ? "no-store" : "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": sent ? "no-store" : "public, s-maxage=31536000, durable",
      "Cache-Tag": `site-${site.businessId}`,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
