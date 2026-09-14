import { NextResponse } from "next/server";
import { siteRole } from "@/lib/public-routing";
import { getPublishedSiteBySlug } from "@/lib/site/public-read";
import { bump, ipKey, parseContactForm, PER_IP_MINUTE_CAP, PER_SITE_DAILY_CAP, siteKey, sweepCounters } from "@/lib/managed/contact-relay";
import { sendContactRelay } from "@/lib/email";

// V4 §H — the contact-form relay. Public origin only. Visitor → validation → honeypot/timing → atomic
// per-IP and per-site caps → email to the owner-confirmed business email → redirect back with ?sent=1.
// No message content is stored anywhere. Bots get the same redirect as humans (no oracle).

export const dynamic = "force-dynamic";

function backTo(request: Request, slug: string, viaCustomDomain: boolean): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-gbf-forwarded-host") ?? request.headers.get("host") ?? "";
  const path = viaCustomDomain ? "/" : `/${slug}`;
  return `${proto}://${host}${path}?sent=1#contact`;
}

export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (siteRole() !== "public") return new NextResponse("Not found", { status: 404 });
  const { slug } = await ctx.params;
  const site = await getPublishedSiteBySlug(slug);
  if (!site || site.spec.setup.primaryAction !== "form" || !site.contactEmail) return new NextResponse("Not found", { status: 404 });

  const host = (request.headers.get("x-gbf-forwarded-host") ?? request.headers.get("host") ?? "").toLowerCase().split(":")[0]!;
  const viaCustomDomain = host !== (process.env.PUBLIC_SITE_HOST ?? "sites.gobeefound.com");
  const redirect = NextResponse.redirect(backTo(request, slug, viaCustomDomain), 303);

  const form = await request.formData().catch(() => null);
  if (!form) return redirect;
  const fields: Record<string, string | undefined> = {};
  for (const k of ["name", "contact", "message", "website", "t"]) {
    const v = form.get(k);
    fields[k] = typeof v === "string" ? v : undefined;
  }
  const parsed = parseContactForm(fields, Math.floor(Date.now() / 1000));
  if (!parsed.ok) return redirect; // bots and junk get the same friendly page

  const ip = (request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "0.0.0.0").split(",")[0]!.trim();
  const [ipOk, siteOk] = await Promise.all([bump(ipKey(ip), PER_IP_MINUTE_CAP, 120), bump(siteKey(site.slug), PER_SITE_DAILY_CAP, 86_400 + 3600)]);
  if (!ipOk || !siteOk) {
    console.info(JSON.stringify({ ts: new Date().toISOString(), evt: "contact_relay_limited", slug: site.slug, ipLimited: !ipOk, siteLimited: !siteOk }));
    return redirect;
  }

  const sent = await sendContactRelay({ to: site.contactEmail, businessName: site.spec.facts.businessName, ...parsed.data });
  console.info(JSON.stringify({ ts: new Date().toISOString(), evt: "contact_relayed", slug: site.slug, sent }));
  void sweepCounters();
  return redirect;
}
