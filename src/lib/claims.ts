// §13.1 / P7 / P10 / V4 — deterministic post-generation scanner. The model is constrained by prompt;
// THIS is the enforcement. Any output that asserts a credential, guarantee, or superlative the owner
// never provided is rejected before it is ever rendered. Pure function; adversarially tested.

export interface ClaimContext {
  /** Free-text facts the owner actually provided (differentiators, idealCustomer, etc.). */
  ownerText: string[];
  city?: string;
  state?: string;
}

const SUPERLATIVES = /(?:\b(?:premier|best|leading|number one|top[- ]rated|award[- ]winning|world[- ]class|unmatched|unbeatable|elite)\b|#\s?1\b)/i;

const CREDENTIAL_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "license", re: /\b(licensed|license[d]? and insured|state[- ]licensed|fully licensed)\b/i },
  { name: "insurance", re: /\b(insured|bonded|fully insured|bonded and insured)\b/i },
  { name: "certification", re: /\b(certified|certification|accredited|BBB)\b/i },
  { name: "years in business", re: /\b(\d{1,2}\+?\s*(years?|yrs?)(\s+of)?\s+(experience|in business)|since\s+(19|20)\d{2}|decades? of experience|family[- ]owned since)\b/i },
  { name: "customer count", re: /\b(\d[\d,]*\+?\s*(happy|satisfied)?\s*(customers|clients|homes|jobs)\s+(served|completed|and counting))\b/i },
  { name: "guarantee", re: /\b(guarantee[ds]?|warranty|money[- ]back|100%\s*satisfaction|satisfaction guaranteed|risk[- ]free)\b/i },
  { name: "pricing", re: /(\$\s?\d|\bfree estimates?\b|\bfree quotes?\b|\blowest price|\bcheapest|\baffordable rates?\b|\bbest price)/i },
  { name: "availability", re: /\b(24\/7|24 hours|same[- ]day (service|appointments?|response|turnaround)|emergency (service|calls?|repairs?)|available (any ?time|around the clock))\b/i },
  { name: "response time", re: /\b(within \d+\s*(minutes?|hours?)|\d+[- ]minute response|respond(s)? in under)\b/i },
];

export interface ClaimViolation {
  kind: string;
  match: string;
}

const STOPWORDS = new Set(["and", "the", "for", "with", "your", "our", "of", "in", "on", "to", "a", "an", "is", "are", "we", "you"]);

/** Words that carry the claim. Numbers always count; short function words never do. */
function claimTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+%/ ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w) && (/\d/.test(w) || w.length > 3));
}

/**
 * V4 (plan §8c S4): the owner "said it" only when EVERY claim-bearing word of the matched phrase appears
 * in their own text — numbers included. Saying "licensed" does not unlock "licensed and insured";
 * "12 years" does not unlock "15 years". Simple word stems are tolerated (license/licensed, estimate/estimates).
 */
function ownerSaidIt(match: string, ctx: ClaimContext): boolean {
  const hay = ` ${ctx.ownerText.join(" \n ").toLowerCase().replace(/[^a-z0-9+%/ ]/g, " ")} `;
  const needle = match.toLowerCase().replace(/\s+/g, " ").trim();
  if (!needle) return false;
  if (hay.includes(` ${needle} `)) return true;
  const tokens = claimTokens(needle);
  if (tokens.length === 0) return false;
  return tokens.every((t) => {
    if (/\d/.test(t)) return new RegExp(`(^|\\D)${t.replace(/[+%/]/g, "\\$&")}(\\D|$)`).test(hay);
    const stem = t.replace(/(ed|es|s|ing)$/, "");
    return stem.length >= 3 && new RegExp(`\\b${stem}\\w{0,3}\\b`).test(hay);
  });
}

/** Returns every unsupported claim found in `text`. Empty array = clean. */
export function findUnsupportedClaims(text: string, ctx: ClaimContext): ClaimViolation[] {
  const out: ClaimViolation[] = [];
  const sup = text.match(SUPERLATIVES);
  if (sup) out.push({ kind: "superlative", match: sup[0] });
  for (const { name, re } of CREDENTIAL_PATTERNS) {
    const m = text.match(re);
    if (m && !ownerSaidIt(m[0], ctx)) out.push({ kind: name, match: m[0] });
  }
  return out;
}

/** §13.1 — no repeating the city or state name for search purposes. More than 2 mentions per output field is stuffing. */
export function isKeywordStuffed(text: string, ctx: ClaimContext): boolean {
  const count = (needle?: string) => {
    if (!needle) return 0;
    const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    return (text.match(re) ?? []).length;
  };
  return count(ctx.city) > 2 || count(ctx.state) > 2;
}

/** Scan every string field of a structured output. */
export function validateGeneratedOutput(output: Record<string, unknown>, ctx: ClaimContext): ClaimViolation[] {
  const violations: ClaimViolation[] = [];
  const visit = (v: unknown) => {
    if (typeof v === "string") {
      violations.push(...findUnsupportedClaims(v, ctx));
      if (isKeywordStuffed(v, ctx)) violations.push({ kind: "keyword stuffing", match: ctx.city ?? ctx.state ?? "" });
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(visit);
  };
  visit(output);
  return violations;
}

/** What the owner sees when a draft still contains a claim after the repair attempt. Actionable, not a dead end. */
export function claimsGuidance(v: ClaimViolation): string {
  if (v.kind === "superlative") return `We left out "${v.match}" — we never use words like that, because customers don't trust them.`;
  if (v.kind === "keyword stuffing") return `The draft repeated "${v.match}" too often. Please try again.`;
  return `We left out "${v.match}" because you haven't told us it's true. If it is, add it in Your Business under "Why you", then try again.`;
}
