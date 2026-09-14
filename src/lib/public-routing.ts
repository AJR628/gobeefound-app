// V4 §A11 — host isolation rules, as a PURE function so they are unit-tested and shared by the middleware.
// Two roles, one codebase, two Netlify sites:
//   app    — app.gobeefound.com: the authenticated product. Public-site routes are 404 here.
//   public — sites.gobeefound.com + customer domains: ONLY published sites and the contact relay.
//            No auth cookies are ever read or set. Every app route is 404.

export type SiteRole = "app" | "public";

export interface RouteDecision {
  action: "next" | "rewrite" | "notFound";
  /** For rewrite: the internal path to serve. */
  to?: string;
}

/** The internal prefix the public HTML route handler lives under. Never reachable on the app role. */
export const PUBLIC_INTERNAL_PREFIX = "/gbf-public"; // not "_public": Next treats _-prefixed folders as private (unrouted)

const PUBLIC_PASSTHROUGH = [/^\/_next\//, /^\/favicon\.ico$/, /^\/health$/, /^\/api\/contact\//];

export function siteRole(): SiteRole {
  const r = process.env.SITE_ROLE;
  if (r === "public") return "public";
  if (r === "app" || !r) return "app";
  return "app";
}

/**
 * Decide how to treat a request. `publicHost` is the GoBeeFound public origin (sites.gobeefound.com);
 * any other host on the public role is a customer domain, whose path is the site root.
 */
export function routePublicRequest(role: SiteRole, host: string, pathname: string, publicHost: string): RouteDecision {
  const h = host.toLowerCase().split(":")[0]!;
  if (role === "app") {
    // Defence in depth: the internal public prefix and the relay never resolve on the app origin.
    if (pathname.startsWith(PUBLIC_INTERNAL_PREFIX) || pathname.startsWith("/api/contact/")) return { action: "notFound" };
    return { action: "next" };
  }
  // role === "public"
  if (PUBLIC_PASSTHROUGH.some((re) => re.test(pathname))) return { action: "next" };
  if (pathname.startsWith(PUBLIC_INTERNAL_PREFIX)) return { action: "notFound" }; // never addressable directly
  if (/^\/(?:api|auth|home|login|signup|tools|site|your-business|account|onboarding|plan|unlock|checkout|confirm|launched|m|t|site-preview)(?:\/|$)/.test(pathname)) return { action: "notFound" };
  if (h === publicHost.toLowerCase()) {
    // sites.gobeefound.com/{slug}[/...]
    const m = pathname.match(/^\/([a-z0-9-]+)\/?$/);
    if (!m) return { action: "notFound" };
    return { action: "rewrite", to: `${PUBLIC_INTERNAL_PREFIX}/slug/${m[1]}` };
  }
  // customer domain: only the root serves the site
  if (pathname === "/" || pathname === "") return { action: "rewrite", to: `${PUBLIC_INTERNAL_PREFIX}/host/${encodeURIComponent(h)}` };
  return { action: "notFound" };
}
