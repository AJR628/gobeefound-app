// V4 §A12 — the thin Netlify API client for the PUBLIC site: cache purge by tag and (founding cohort only)
// domain aliases. Server-only. Every call is best-effort and logged; nothing here can block a publish
// from being recorded in the database, which is the source of truth.
import "server-only";

const API = "https://api.netlify.com/api/v1";

function token(): string | null {
  return process.env.NETLIFY_API_TOKEN ?? null;
}
export function publicSiteId(): string | null {
  return process.env.NETLIFY_PUBLIC_SITE_ID ?? null;
}

/** Founding-cohort ceiling for Netlify domain aliases (Netlify recommends ≤ 50; we stop well short). */
export const ALIAS_COHORT_CAP = 20;

async function call<T>(method: string, path: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const t = token();
  if (!t) return { ok: false, status: 0, error: "NETLIFY_API_TOKEN is not set" };
  try {
    const res = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return { ok: false, status: res.status, error: (await res.text()).slice(0, 300) };
    const text = await res.text();
    return { ok: true, data: (text ? JSON.parse(text) : null) as T };
  } catch (e) {
    return { ok: false, status: 0, error: String((e as Error)?.message ?? e).slice(0, 300) };
  }
}

/** Purge everything tagged for one business on the public site. Tags are set by the public route handler. */
export async function purgePublicSite(businessId: string): Promise<boolean> {
  const site = publicSiteId();
  if (!site) return false;
  const r = await call("POST", "/purge", { site_id: site, cache_tags: [`site-${businessId}`] });
  if (!r.ok) console.error(JSON.stringify({ ts: new Date().toISOString(), evt: "netlify_purge_failed", businessId, status: r.status, error: r.error }));
  return r.ok;
}

export async function listAliases(): Promise<string[] | null> {
  const site = publicSiteId();
  if (!site) return null;
  const r = await call<{ domain_aliases?: string[] }>("GET", `/sites/${site}`);
  return r.ok ? r.data?.domain_aliases ?? [] : null;
}

/** Pure: the alias list after adding/removing a domain and its www. Exported for tests. */
export function mergeAliases(current: string[], domain: string, op: "add" | "remove"): string[] {
  const set = new Set(current.map((d) => d.toLowerCase()));
  const pair = [domain.toLowerCase(), `www.${domain.toLowerCase()}`];
  for (const d of pair) op === "add" ? set.add(d) : set.delete(d);
  return [...set];
}

export async function setAliases(aliases: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const site = publicSiteId();
  if (!site) return { ok: false, error: "NETLIFY_PUBLIC_SITE_ID is not set" };
  const r = await call("PATCH", `/sites/${site}`, { domain_aliases: aliases });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}
