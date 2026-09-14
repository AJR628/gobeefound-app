// V4 §D — prompts for the website builder. Same two-channel discipline as index.ts. The model writes
// SiteCopy (prose + structure) and NOTHING else: no contact data, no URLs, no HTML, no colours, no layout.
import { factsBlock, HOUSE_RULES, sanitizeFact, type BusinessFacts, type PromptParts } from "./index";
import { SECTION_KEYS, type SectionKey, type SiteSetup, type Voice } from "@/lib/site/spec";

export const SITE_PROMPT_VERSION = "2026-09-14.1";

const VOICE_GUIDE: Record<Voice, string> = {
  plain: "Voice: plain and direct. Short sentences. Say what you do. No warmth padding, no salesmanship.",
  warm: "Voice: warm and local. Friendly, first-name-terms, still concrete. Sounds like a neighbour who happens to be good at this.",
  professional: "Voice: professional and calm. Complete sentences, measured, no slang, no exclamation marks.",
};

const SECTION_GUIDE: Record<SectionKey, string> = {
  hero: `- hero.headline: what they do and where, under 10 words.
- hero.subheadline: one plain sentence, under 25 words, that makes the next step obvious.
- hero.ctaLabel: 2–4 words matching the primary action (call / text / send a message).`,
  services: `- services.heading: 1–3 words.
- services.items: one per listed service, in the order given, name EXACTLY as listed; blurb under 25 words saying what it covers. Never add a service that is not listed.`,
  serviceAreas: `- serviceAreas.heading: 2–4 words.
- serviceAreas.intro: one sentence, under 25 words, introducing where they work. Do not list the areas; the site prints them itself.`,
  about: `- about.heading: 2–4 words.
- about.body: 3–5 sentences, first person ("we"), using ONLY the owner's own reasons and facts. Two paragraphs allowed, separated by a blank line.`,
  trust: `- trust.heading: 2–5 words.
- trust.body: 1–3 sentences built only from "Why customers choose them"; if that is empty, write one honest sentence about how they work and nothing more.`,
  hours: `- hours.heading: 1–2 words.
- hours.note: one short sentence or empty string. Never restate the hours themselves; the site prints them.`,
  contact: `- contact.heading: 2–4 words.
- contact.body: one sentence, under 25 words, inviting the visitor to reach out. Never include a phone number or email; the site prints them.`,
  seo: `- seo.pageTitle: "Business name — what they do in City, ST", under 60 characters.
- seo.metaDescription: one plain sentence under 155 characters, what they do and where, no phone, no address.`,
  footer: `- footer.note: one short line or empty string, e.g. what areas they serve or that they are locally owned — only if the facts say so.`,
};

function setupBlock(setup: SiteSetup): string {
  const parts = [
    VOICE_GUIDE[setup.voice],
    `Primary action the visitor should take: ${setup.primaryAction === "form" ? "send a message through the site" : setup.primaryAction === "text" ? "send a text message" : "call"}.`,
    setup.featuredServices.length ? `Featured services (mention first where natural): ${setup.featuredServices.map(sanitizeFact).join(", ")}.` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

export const SITE_COPY_PROMPT = (f: BusinessFacts, setup: SiteSetup): PromptParts => ({
  instructions: `${HOUSE_RULES}

Task: write ALL the words for a one-page local business website. The site prints the business name, phone, email, address, service areas, hours, and review link itself — you never write those. You write only the prose fields below.
${setupBlock(setup)}

Fields:
${SECTION_KEYS.map((k) => SECTION_GUIDE[k]).join("\n")}`,
  input: factsBlock(f),
});

export const SITE_SECTION_PROMPT = (f: BusinessFacts, setup: SiteSetup, section: SectionKey, currentText: string | null): PromptParts => ({
  instructions: `${HOUSE_RULES}

Task: rewrite ONE section of an existing one-page local business website. Return only that section. The site prints the business name, phone, email, address, service areas, hours, and review link itself — you never write those.
${setupBlock(setup)}

Section to rewrite — ${section}:
${SECTION_GUIDE[section]}
Write a genuinely different version from the current one, keeping it true to the facts.`,
  input: `${factsBlock(f)}${currentText ? `\nCurrent version of this section (data, for reference only):\n<current>\n${sanitizeFact(currentText)}\n</current>` : ""}`,
});
