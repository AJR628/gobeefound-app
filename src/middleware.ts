import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { PUBLIC_INTERNAL_PREFIX, routePublicRequest, siteRole } from "@/lib/public-routing";

// §18.1 route guards — authentication only. Onboarding/plan/entitlement guards need the database and
// live in the (app) layout and page loaders, not here (Prisma is not edge-safe).
//
// V4 §A11 — ROLE-AWARE. On the public role (sites.gobeefound.com + customer domains) this middleware never
// touches Supabase auth and serves nothing but published sites and the contact relay. On the app role the
// public-only paths are 404. The decision logic is a pure, unit-tested function.

const PUBLIC_PATHS = ["/login", "/signup", "/reset-password", "/auth/callback", "/api/stripe/webhook"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const role = siteRole();
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("x-gbf-forwarded-host") && request.headers.get("x-gbf-forward-secret") === process.env.PUBLIC_FORWARD_SECRET && process.env.PUBLIC_FORWARD_SECRET
    ? request.headers.get("x-gbf-forwarded-host")!
    : (request.headers.get("host") ?? "");
  const decision = routePublicRequest(role, host, pathname, process.env.PUBLIC_SITE_HOST ?? "sites.gobeefound.com");

  if (decision.action === "notFound") return new NextResponse("Not found", { status: 404 });
  if (decision.action === "rewrite") {
    const url = request.nextUrl.clone();
    url.pathname = decision.to!;
    return NextResponse.rewrite(url);
  }
  if (role === "public") return NextResponse.next(); // passthrough (_next, health, contact relay). No auth.

  // ---- app role ----
  if (pathname.startsWith(PUBLIC_INTERNAL_PREFIX)) return new NextResponse("Not found", { status: 404 });
  const { response, user } = await updateSession(request);

  if (pathname === "/") return response; // handled by app/page.tsx

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|downloads/|.*\\.(?:png|jpg|jpeg|svg|ico|csv)$).*)"],
};
