// V4 §I / §A9–A10 / §A12 — custom domains for a non-technical owner: the minimum records, one-tap copy,
// provider-specific tips, on-demand verification (no scheduler), HTTPS check, clear status. Nameservers
// are never touched. Founding cohort attaches via Netlify aliases (hard cap); the durable layer is Phase 7.
// DNS and HTTP lookups are injectable so the logic is unit-tested without a network.
import "server-only";
import { randomBytes } from "node:crypto";
import dns from "node:dns/promises";
import { db } from "../db";
import { ALIAS_COHORT_CAP, listAliases, mergeAliases, setAliases } from "../netlify";

export interface DnsRecord {
  type: "TXT" | "A" | "CNAME";
  host: string; // as typed at the provider (e.g. "@", "www", "_gbf-verify")
  value: string;
  purpose: string;
}

export function publicHost(): string {
  return process.env.PUBLIC_SITE_HOST ?? "sites.gobeefound.com";
}
export function apexIp(): string {
  return process.env.PUBLIC_ORIGIN_APEX_IP ?? "75.2.60.5"; // Netlify's documented apex load balancer
}

// ---------------------------------------------------------------------------------------------
// Pure helpers (tested)
// ---------------------------------------------------------------------------------------------

const HOST_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

/** "https://www.Mikes-Junk.com/path" → "mikes-junk.com". Rejects our own domains and non-domains. */
export function normalizeDomain(input: string): string | null {
  let s = input.trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, "").split("/")[0]!.split("?")[0]!.split(":")[0]!;
  s = s.replace(/^www\./, "").replace(/\.$/, "");
  if (!HOST_RE.test(s)) return null;
  if (s === "gobeefound.com" || s.endsWith(".gobeefound.com")) return null;
  return s;
}

/** Apex (mikesjunk.com) vs subdomain (shop.mikesjunk.com). Two labels = apex; multi-part TLDs are treated as apex when 3 labels and a 2-letter TLD with a short SLD (co.uk, com.au). */
export function isApex(domain: string): boolean {
  const parts = domain.split(".");
  if (parts.length === 2) return true;
  if (parts.length === 3 && parts[2]!.length === 2 && /^(co|com|org|net|gov|ac|edu)$/.test(parts[1]!)) return true;
  return false;
}

export function newVerificationToken(): string {
  return `gbf-verify=${randomBytes(12).toString("hex")}`;
}

/** The exact records the owner adds. Minimum set; nothing else changes. */
export function dnsInstructions(domain: string, token: string, opts: { publicHost?: string; apexIp?: string } = {}): DnsRecord[] {
  const ph = opts.publicHost ?? publicHost();
  const ip = opts.apexIp ?? apexIp();
  const records: DnsRecord[] = [{ type: "TXT", host: "_gbf-verify", value: token, purpose: "Proves you own the domain" }];
  if (isApex(domain)) {
    records.push({ type: "A", host: "@", value: ip, purpose: `Points ${domain} at your site` });
    records.push({ type: "CNAME", host: "www", value: ph, purpose: `Points www.${domain} at your site` });
  } else {
    const sub = domain.split(".")[0]!;
    records.push({ type: "CNAME", host: sub, value: ph, purpose: `Points ${domain} at your site` });
  }
  return records;
}

export interface Resolver {
  txt(name: string): Promise<string[][]>;
  a(name: string): Promise<string[]>;
  cname(name: string): Promise<string[]>;
  mx(name: string): Promise<{ exchange: string; priority: number }[]>;
}

const nodeResolver: Resolver = {
  txt: (n) => dns.resolveTxt(n).catch(() => []),
  a: (n) => dns.resolve4(n).catch(() => []),
  cname: (n) => dns.resolveCname(n).catch(() => []),
  mx: (n) => dns.resolveMx(n).catch(() => []),
};

export interface DnsCheck {
  tokenOk: boolean;
  rootOk: boolean;
  wwwOk: boolean;
  mx: string[];
  detail: string[];
}

/** Check the records. Pure given a resolver. */
export async function checkDns(domain: string, token: string, resolver: Resolver = nodeResolver, opts: { publicHost?: string; apexIp?: string } = {}): Promise<DnsCheck> {
  const ph = (opts.publicHost ?? publicHost()).toLowerCase();
  const ip = opts.apexIp ?? apexIp();
  const detail: string[] = [];
  const txt = (await resolver.txt(`_gbf-verify.${domain}`)).map((chunks) => chunks.join("")).map((s) => s.trim());
  const tokenOk = txt.includes(token);
  if (!tokenOk) detail.push(txt.length ? "The _gbf-verify record exists but has a different value." : "The _gbf-verify record hasn't shown up yet.");

  let rootOk: boolean;
  let wwwOk: boolean;
  if (isApex(domain)) {
    const a = await resolver.a(domain);
    const cn = (await resolver.cname(domain)).map((c) => c.toLowerCase().replace(/\.$/, ""));
    rootOk = a.includes(ip) || cn.includes(ph);
    if (!rootOk) detail.push(a.length || cn.length ? `${domain} points somewhere else right now.` : `${domain} has no root record yet.`);
    const w = (await resolver.cname(`www.${domain}`)).map((c) => c.toLowerCase().replace(/\.$/, ""));
    wwwOk = w.includes(ph) || (await resolver.a(`www.${domain}`)).includes(ip);
    if (!wwwOk) detail.push(`www.${domain} isn't pointing at ${ph} yet.`);
  } else {
    const cn = (await resolver.cname(domain)).map((c) => c.toLowerCase().replace(/\.$/, ""));
    rootOk = cn.includes(ph) || (await resolver.a(domain)).includes(ip);
    wwwOk = true;
    if (!rootOk) detail.push(`${domain} isn't pointing at ${ph} yet.`);
  }
  const mx = (await resolver.mx(isApex(domain) ? domain : domain.split(".").slice(1).join("."))).map((m) => m.exchange.toLowerCase());
  return { tokenOk, rootOk, wwwOk, mx, detail };
}

/** HTTPS is live when the domain answers over TLS with something other than a server error. */
export async function checkHttps(domain: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(`https://${domain}/`, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8_000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// Orchestration (DB)
// ---------------------------------------------------------------------------------------------

export type DomainResult = { ok: true; id: string } | { ok: false; error: string };

export async function addDomain(businessId: string, input: string, dnsProvider: string | null): Promise<DomainResult> {
  const domain = normalizeDomain(input);
  if (!domain) return { ok: false, error: "That doesn't look like a domain. Try the form mikesjunkremoval.com." };
  const existing = await db.customDomain.findUnique({ where: { domain } });
  if (existing && existing.businessId !== businessId && !existing.removedAt) return { ok: false, error: "That domain is already connected to another GoBeeFound site. If it's yours, contact us." };
  const mine = await db.customDomain.count({ where: { businessId, removedAt: null } });
  if (mine >= 2 && !(existing && existing.businessId === businessId)) return { ok: false, error: "You can connect up to two domains." };
  const activeCohort = await db.customDomain.count({ where: { provider: "netlify_alias", state: { in: ["dns_verified", "active"] }, removedAt: null } });
  if (activeCohort >= ALIAS_COHORT_CAP && !(existing && existing.businessId === businessId)) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), evt: "domain_cohort_cap_reached", cap: ALIAS_COHORT_CAP }));
    return { ok: false, error: "Domain connection is full for founding members right now. We've been notified and will open more spots soon — your site stays live at its GoBeeFound address." };
  }
  const mxNow = await nodeResolver.mx(domain);
  const row = existing
    ? await db.customDomain.update({ where: { id: existing.id }, data: { businessId, state: "pending", removedAt: null, dnsProvider, lastError: null, verificationToken: existing.verificationToken || newVerificationToken(), mxSeenAt: mxNow.length ? new Date() : existing.mxSeenAt } })
    : await db.customDomain.create({ data: { businessId, domain, dnsProvider, verificationToken: newVerificationToken(), mxSeenAt: mxNow.length ? new Date() : null } });
  return { ok: true, id: row.id };
}

export interface VerifyOutcome {
  state: "pending" | "dns_verified" | "active" | "failed";
  message: string;
  detail: string[];
  mxWarning: string | null;
}

/** "I added them — check my domain". On demand. Verifies DNS, attaches the hostname, checks HTTPS. */
export async function verifyDomain(businessId: string, id: string, deps: { resolver?: Resolver; fetchImpl?: typeof fetch } = {}): Promise<VerifyOutcome> {
  const d = await db.customDomain.findFirst({ where: { id, businessId, removedAt: null } });
  if (!d) return { state: "failed", message: "That domain wasn't found.", detail: [], mxWarning: null };

  const dnsCheck = await checkDns(d.domain, d.verificationToken, deps.resolver);
  const mxWarning = d.mxSeenAt && dnsCheck.mx.length === 0 ? "Your email records (MX) seem to have disappeared. If you use email at this domain, check them before anything else — we didn't ask you to change them." : null;
  const now = new Date();

  if (!dnsCheck.tokenOk || !dnsCheck.rootOk || !dnsCheck.wwwOk) {
    await db.customDomain.update({ where: { id }, data: { state: "pending", lastCheckedAt: now, lastError: dnsCheck.detail.join(" ") } });
    return { state: "pending", message: "Not there yet. DNS changes can take a few minutes to a few hours to show up. Add the records exactly as shown, then check again.", detail: dnsCheck.detail, mxWarning };
  }

  // DNS verified → attach the hostname (founding cohort: Netlify aliases on the public site).
  if (d.state === "pending" || d.state === "failed") {
    const current = await listAliases();
    if (current === null) {
      await db.customDomain.update({ where: { id }, data: { state: "dns_verified", verifiedAt: d.verifiedAt ?? now, lastCheckedAt: now, lastError: "hosting attach not configured" } });
      return { state: "dns_verified", message: "Your records are correct. We're finishing the connection on our side — check again in a little while.", detail: [], mxWarning };
    }
    const r = await setAliases(mergeAliases(current, d.domain, "add"));
    if (!r.ok) {
      await db.customDomain.update({ where: { id }, data: { state: "dns_verified", verifiedAt: d.verifiedAt ?? now, lastCheckedAt: now, lastError: r.error } });
      console.error(JSON.stringify({ ts: now.toISOString(), evt: "domain_attach_failed", domain: d.domain, error: r.error }));
      return { state: "dns_verified", message: "Your records are correct. We're finishing the connection on our side — check again in a little while.", detail: [], mxWarning };
    }
    await db.customDomain.update({ where: { id }, data: { state: "dns_verified", verifiedAt: d.verifiedAt ?? now, lastCheckedAt: now, lastError: null, providerRef: d.domain } });
  }

  // HTTPS: certificates take a few minutes after attach.
  const https = await checkHttps(d.domain, deps.fetchImpl);
  if (https) {
    await db.customDomain.update({ where: { id }, data: { state: "active", activeAt: d.activeAt ?? now, lastCheckedAt: now, lastError: null } });
    return { state: "active", message: "Domain connected. Secure HTTPS active. Your website is live.", detail: [], mxWarning };
  }
  await db.customDomain.update({ where: { id }, data: { lastCheckedAt: now } });
  return { state: "dns_verified", message: "Domain connected. Turning on secure HTTPS — this usually takes a few minutes. Check again shortly.", detail: [], mxWarning };
}

export async function removeDomain(businessId: string, id: string): Promise<void> {
  const d = await db.customDomain.findFirst({ where: { id, businessId, removedAt: null } });
  if (!d) return;
  if (d.provider === "netlify_alias" && (d.state === "dns_verified" || d.state === "active")) {
    const current = await listAliases();
    if (current) await setAliases(mergeAliases(current, d.domain, "remove"));
  }
  await db.customDomain.update({ where: { id }, data: { state: "removed", removedAt: new Date() } });
}

/** Managed ended → hostnames released so the domain no longer resolves to a dead site. Data retained. */
export async function releaseAllDomains(businessId: string): Promise<void> {
  const rows = await db.customDomain.findMany({ where: { businessId, removedAt: null } });
  for (const d of rows) await removeDomain(businessId, d.id);
}
