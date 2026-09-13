// §16.4 — versioned prompt templates. Inputs are canonical values assembled in code;
// the owner never supplies free-form prompt text. House style and prohibitions are stated
// here AND enforced deterministically after generation (src/lib/claims.ts).

export const PROMPT_VERSION = "2026-09-13.1";

export const HOUSE_RULES = `You write plain, specific copy for a small local service business. Rules, which are absolute:
- Use ONLY the facts provided below. Do not invent, assume, or embellish anything.
- NEVER claim or imply: licenses, certifications, insurance, bonding, years in business, number of customers, awards, guarantees, warranties, prices, "free estimates", availability (24/7, same-day, emergency), or response times — unless that exact fact appears in the owner's own words below.
- NEVER use superlatives: premier, best, leading, #1, top-rated, award-winning, world-class, unmatched.
- Do not repeat the city or state name more than twice in any single field. Never write for search engines.
- Short sentences. Concrete nouns. Second person when addressing the customer. No adjective inflation. No exclamation marks.
- Sound like a competent tradesperson talking to a neighbor, not a marketing agency.
Return ONLY a JSON object matching the requested shape. No preamble, no markdown fences.`;

export interface BusinessFacts {
  displayName: string;
  tradeNoun: string;
  city: string;
  state: string;
  services: { name: string; description?: string }[];
  serviceAreas: string[];
  idealCustomer?: string | null;
  differentiators?: string[] | null;
  phone?: string | null;
  domain?: string | null;
  hours?: string | null; // pre-formatted
  reviewLink?: string | null;
  preferredContact?: string | null;
}

export function factsBlock(f: BusinessFacts): string {
  const lines = [
    `Business name: ${f.displayName}`,
    `Type of work: ${f.tradeNoun}`,
    `Based in: ${f.city}, ${f.state}`,
    `Services: ${f.services.map((s) => (s.description ? `${s.name} — ${s.description}` : s.name)).join("; ") || "(none listed)"}`,
    `Service area: ${f.serviceAreas.join(", ") || "(not listed)"}`,
    f.idealCustomer ? `Who they help (owner's words): ${f.idealCustomer}` : null,
    f.differentiators?.length ? `Why customers choose them (owner's words): ${f.differentiators.join("; ")}` : null,
    f.phone ? `Phone: ${f.phone}` : null,
    f.domain ? `Website: ${f.domain}` : null,
    f.hours ? `Hours: ${f.hours}` : null,
    f.preferredContact ? `Preferred contact: ${f.preferredContact}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export const WEBSITE_COPY_PROMPT = (f: BusinessFacts, extra: { visitorAction: string }) => `${HOUSE_RULES}

FACTS
${factsBlock(f)}
What the owner wants a visitor to do next: ${extra.visitorAction}

Write website copy for a one-page site. Shape:
{
  "headline": string,          // what you do and where, under 12 words
  "subheadline": string,       // one plain sentence expanding the headline
  "serviceBlurbs": [{ "name": string, "blurb": string }],  // one per service, blurb under 25 words
  "about": string,             // 2–4 sentences, first person, uses only the owner's own reasons
  "callToAction": string       // under 10 words, matches the owner's preferred next step
}`;

export const DESCRIPTIONS_PROMPT = (f: BusinessFacts) => `${HOUSE_RULES}

FACTS
${factsBlock(f)}

Write three descriptions of the same business. Shape:
{
  "short": string,   // under 250 characters — a social media bio
  "google": string,  // under 750 characters — a Google Business Profile description; plain, no keyword stuffing, no promotional language
  "long": string     // 3–5 sentences — a website about section, first person
}`;

export const REVIEW_REQUESTS_PROMPT = (f: BusinessFacts) => `${HOUSE_RULES}

FACTS
${factsBlock(f)}
Review link: ${f.reviewLink}

Write review-request messages. Never offer anything in exchange for a review and never suggest asking only happy customers. Shape:
{
  "sms": string,            // under 160 characters INCLUDING the review link, warm and direct
  "emailSubject": string,   // under 8 words
  "emailBody": string,      // 3–4 short sentences, includes the review link once, first person
  "spokenLine": string,     // one sentence the owner can say at the end of a job
  "negativeReply": string   // a calm 2–4 sentence public reply template to a negative review: acknowledge, one fact if needed, offer a call. No arguing.
}`;
