// V4 §A1 — the path on the GoBeeFound public origin: sites.gobeefound.com/{slug}. Derived from the business
// name, immutable after first publish. Reserved words can never become a slug.

export const RESERVED_SLUGS = new Set([
  "api", "_next", "_public", "gbf-public", "admin", "app", "assets", "auth", "contact", "favicon.ico", "health", "home", "login", "logout", "robots.txt", "sitemap.xml", "signup", "site", "sites", "static", "www", "gobeefound", "support", "help", "terms", "privacy",
]);

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

export function slugify(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return base.length >= 3 ? base : `${base}-site`.replace(/^-/, "");
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug);
}

/** Try the base, then base-2 … base-20, then base-<6 hex>. `taken` answers "is this slug in use?". */
export async function allocateSlug(name: string, taken: (slug: string) => Promise<boolean>): Promise<string> {
  let base = slugify(name);
  if (!isValidSlug(base)) base = `${base}-site`;
  if (!(await taken(base))) return base;
  for (let i = 2; i <= 20; i++) {
    const s = `${base}-${i}`;
    if (!(await taken(s))) return s;
  }
  return `${base}-${Math.random().toString(16).slice(2, 8)}`;
}
