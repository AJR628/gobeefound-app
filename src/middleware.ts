import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// §18.1 route guards — authentication only. Onboarding/plan/entitlement guards need the
// database and live in the (app) layout and page loaders, not here (Prisma is not edge-safe).

const PUBLIC_PATHS = ["/login", "/signup", "/reset-password", "/auth/callback", "/api/stripe/webhook"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

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
