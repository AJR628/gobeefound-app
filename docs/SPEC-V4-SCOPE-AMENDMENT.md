# GoBeeFound — V4 Scope Amendment

**Status:** Authorized by the owner, 2026-09-14. Supersedes the named sections of
*GoBeeFound V1 — Implementation Specification V3.1 FINAL*. Where V3.1 and this amendment
conflict, **this amendment wins**. Sections of V3.1 not named here are unchanged.

This document is deliberately short. It defines *what is now in scope*, the *boundaries that
still hold*, and the *behaviour customers can rely on*. Implementation detail lives in code
and in `AGENTS.md`.

---

## A. What changes, in one paragraph

GoBeeFound now builds and hosts the owner's website. The Website Copy Builder becomes a
**guided AI website builder** that produces a validated `SiteSpec` rendered by trusted
application code, previewed live in the owner's browser, edited manually without limit,
revised by AI within a bounded allowance, and approved by the owner. After approval the owner
chooses **GoBeeFound Managed ($19/month)** — hosting, publishing, custom-domain connection,
HTTPS, version history — or **exports the site** and takes it with them. The AI provider moves
from Anthropic to OpenAI behind one server-only module. Recurring billing is authorized for
**exactly one product**: Managed. The $900 done-for-you build remains, repositioned as a
different amount of the owner's time, not a fallback.

## B. V3.1 statements superseded

| V3.1 statement | Now |
|---|---|
| §3 "Website builder or site hosting — not built" | Built. Guided builder + Managed hosting. |
| §3 "Recurring subscriptions or recurring billing — Stripe one-time only, no `Subscription` table, no plan enum" | **One** recurring product: `ManagedSubscription`, product enum with exactly one value `managed_website`. Nothing else recurring. Launch stays one-time. |
| §3 "AI advisor, AI chat, 'ask me anything' — the three generators are templated tools" | Structured, task-scoped, schema-bound AI features are in scope (site generation, section rewrites, descriptions, bounded logo generation). **An open-ended chat surface remains prohibited.** |
| §3 "General photo or file storage — one exception: the logo" | Published-site assets (logo, one hero photo, favicon) are in scope, per business, small, validated, copied into a public bucket only at publish. Still no general file storage. |
| §3 "Never fetch a declared URL" | GoBeeFound performs DNS/HTTPS lookups **only** on a domain the owner has explicitly submitted for connection, and only to verify it. |
| §17.1 "Exactly these 11 tables" | The authorized table set is the closed list in `tests/guardrails/schema.test.ts` (11 V1 + the V4 models). Still a closed list; still guardrail-enforced. |
| P16 "No external publishing" | GoBeeFound publishes the website. Everything else (Google, Facebook, Instagram) remains owner-applied by hand. Enter once → reuse everywhere still governs. |

## C. What still holds (unchanged prohibitions)

No open-ended AI chat. No Google Business Profile API. No platform-data OAuth. No scraping.
No CRM or lead inbox. No admin UI (runbooks). No invented metrics or scores. No teams,
multi-business, i18n, native apps, gamification, dark mode, artificial scarcity. No job
infrastructure **until** Managed health checks are implemented (section K) — and then only for
those named checks. No recurring billing for Launch or anything other than Managed.

## D. The website journey (canonical)

```
existing business context → guided design questions → Build my website
→ live preview (real renderer; desktop + mobile) → limited AI revisions + unlimited manual edits
→ owner approval (every public fact reviewed) → hosting fork
→ GoBeeFound Managed ($19/mo)   |   Take my website with me (export)
```

Rules:
1. **Enter once, reuse everywhere.** The builder starts from `BusinessProfile`/`Business`. It
   never re-asks name, services, service areas, phone, email, hours, address visibility,
   domain, descriptions, preferred contact, logo, brand colours, or any other canonical fact.
2. **Guided, not chat.** Pre-generation questions are selectable/visual: theme, colours, logo
   path (existing / upload / text / none / bounded AI), hero style, featured services, primary
   action (call / text / contact), section visibility, voice. No blank prompt boxes.
3. **The model writes prose and structure only.** It never supplies HTML, JavaScript, CSS,
   phone numbers, email addresses, URLs, hours, or any canonical fact. Those are injected by
   the server from canonical data. Output is a strict-schema `SiteSpec`, re-validated with Zod,
   scanned by the deterministic claims checker, and rendered by trusted React components.
4. **One renderer.** Preview and the published site use the same component and stylesheet.
5. **Hosting is asked after approval, never before.**

## E. AI allowance (customer-facing contract)

- Launch includes **5 website builds**, **40 AI edits**, and **3 logo generations**.
- Managed includes **10 AI edits per billing month**.
- Manual editing is unlimited and never consumes allowance.
- Shown to customers as "4 website builds left" / "32 AI edits left". **Never** tokens, dollars,
  or model names.
- Failed generations (our fault or the provider's) do not consume allowance. A generation the
  owner simply dislikes does.
- Allowance increases are an operator runbook during founding. The data model permits future
  paid credit packs (`AiAllowanceAdjustment`), but **no purchasable packs ship in this release**.
- Numbers may be re-tuned after measured usage; the display contract does not change.

## F. GoBeeFound Managed — $19/month

Includes: hosting on a GoBeeFound public origin, publishing of approved versions, version
history and rollback, custom-domain connection designed for a non-technical owner, HTTPS
lifecycle, the monthly AI-edit allowance, and — once implemented and running — basic website
health checks. Managed is the recommended, frictionless path.

Lifecycle (customer-visible, must be honoured exactly):

| Event | Site | Data |
|---|---|---|
| Cancel | Stays live until the end of the paid period; export offered | Untouched |
| Payment fails | Stays live through a 7-day grace period; owner emailed | Untouched |
| Grace / period ends | Unpublished (offline); custom domain released | Draft, versions, business data retained |
| Reactivate | Republished | — |

A customer website is never taken offline the instant a payment fails.

## G. Take my website with me (export)

Every owner who has approved a site can download a functional static snapshot: HTML, the
site stylesheet, public assets, the `SiteSpec` JSON, and a README with plain deployment
instructions. Self-hosted sites do not receive hosting, publishing, domain connection, health
checks, or automatic publishing of later GoBeeFound edits. Managed-only features (the contact
form relay) are replaced in the export with a documented fallback.

## H. Contact form

Managed sites may offer a contact form. Submissions are validated, spam-filtered, and
**emailed via Resend to the business email the owner confirmed at approval**. GoBeeFound
stores no message content — no leads database, no inbox. Privacy language on the published
site and in GoBeeFound's policy states this. Exported sites use a call/text/email fallback.

## I. Domain connection

Managed owners never need a hosting account. Flow: confirm the stored domain → say where DNS
is managed → see the exact records with one-tap copy and a link to the provider → "I added
them — check my domain" → GoBeeFound verifies DNS and HTTPS server-side → clear success.
**Only the minimum records are ever requested. Nameserver changes are never instructed**, so
existing email (MX/SPF/DKIM) and other records are untouched. Verification is on demand.

Public sites are served from a **separate origin** (`sites.gobeefound.com` and customer
domains), isolated from the authenticated application. No authenticated route is reachable
through a customer domain. Only published `SiteVersion` data is ever exposed publicly.

Netlify domain aliases are permitted for the founding cohort only (hard-capped in code); the
durable multi-hostname layer is a separate decision recorded in the working plan.

## J. AI provider

OpenAI, via the official SDK, Responses API, strict Structured Outputs, behind one server-only
module. Explicit timeouts and output limits; no retries on auth, validation, quota, or
permanent errors; request IDs recorded; model and real token usage recorded per call; user-safe
error messages; owner text treated as data, not instructions; the deterministic claims scanner
retained and strengthened. No provider secret ever reaches the browser. No live provider calls
in CI.

## K. Later: Managed health checks

After the first end-to-end release. Initial checks: site reachable, HTTPS valid, DNS still
correct, published contact data still matches canonical data. Not advertised until running.
The job-infrastructure prohibition is amended only when these checks are implemented, and only
for them.

## L. The $900 done-for-you build

Retained. Presented at task 3.1 and at the builder entry as **"Have GoBeeFound do it for you —
$900"** beside **"Build it with GoBeeFound"**. Never shown mid-build or as a response to an AI
failure. The existing Launch credit toward it is unchanged.
