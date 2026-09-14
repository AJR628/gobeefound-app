# GoBeeFound — Working Instructions for the Implementing Agent

**Sources of truth:** *GoBeeFound V1 — Implementation Specification V3.1 FINAL* **as amended by
`docs/SPEC-V4-SCOPE-AMENDMENT.md`. Where they conflict, V4 wins.** Read the amendment first.
The sections below are reproduced because they are the ones most likely to be violated by a
helpful agent. If anything you are about to build conflicts with them, stop.

---

## Who this is for

Every screen is used by a non-technical local-business owner on a phone. Guided, short,
selectable, honest. Never a blank AI prompt box. Never jargon. Never a compromise on the
quality of what we publish under their name.

---

## §3 — DO NOT BUILD (as amended)

Do not build any of the following, and do not build a partial, stubbed, flagged, or
scaffolded version of any of them. If a task appears to require one, raise it.

| Not built | Note |
|---|---|
| Open-ended AI chat, "ask me anything", an AI advisor | AI features are structured, task-scoped, and schema-bound: site generation, section rewrites, descriptions, review kit, bounded logo generation. No free-form chat surface. |
| Recurring billing for anything other than **GoBeeFound Managed ($19/month)** | Exactly one recurring product, one `ManagedSubscription` model, one `ManagedProduct` value. Launch stays one-time. No generic tiers, no plan enums, nothing named "Monitor" or "Autopilot". |
| Customer-purchasable AI credit packs | The data model allows them (`AiAllowanceAdjustment`); the UI does not exist in this release. Operator runbook only. |
| Job runner, cron, queue, scheduled functions | **Not until Managed health checks are implemented** (V4 §K), and then only for those named checks. Domain verification is on demand. |
| Platform-data OAuth | No authorizing GoBeeFound against a customer's Google, Facebook, or Instagram. (Google **sign-in** for authentication IS permitted.) |
| Google Business Profile API integration | Not even behind a flag. The app never claims to have created, verified, edited, connected, or published a profile. |
| Meta / Facebook / Instagram API integration | Same |
| Scraping Google or Meta | Prohibited outright |
| Automatic discovery of a business's online assets | The owner declares assets. The **only** URL GoBeeFound ever fetches is a domain the owner explicitly submitted for connection, to verify it. |
| Autonomous actions on external systems | GoBeeFound publishes only to GoBeeFound-controlled hosting. |
| CRM, lead management, lead inbox | The contact form is a stateless email relay. No message content is stored. |
| Social scheduling or publishing | — |
| Invoicing, quoting, customer payments | — |
| Rank tracking, SEO scores, presence scores, health grades | No invented metrics. The launch percentage is the only number. |
| Teams, roles, multi-user; multi-business | One owner, one business |
| Native mobile apps | Responsive web only |
| Gamification | Milestones are the only progress affordance |
| A CMS | Content is TypeScript in `/src/content` |
| Admin dashboard or any admin UI | Manual runbooks in README |
| i18n / localization | US English only |
| General photo or file storage | Permitted: the logo, plus published-site assets (one hero photo, favicon) — small, validated, per business. Nothing else. |
| Separate brand / design system | Extend gobeefound identity. Site **themes** for customer websites are a closed, curated set. |
| Email marketing, drip, nudges, re-engagement | Transactional emails only (incl. Managed payment-failure and expiry notices) |
| In-app notifications, in-app search, dark mode | — |
| Artificial scarcity, countdowns, "N left" for **pricing** | Applies to the $79 founding price. (Allowance displays like "4 website builds left" are a usage meter, not scarcity marketing.) |
| Executable output from the model | The model never emits HTML, JavaScript, CSS, URLs, phone numbers, email addresses, or canonical facts. `SiteSpec` is prose + structure, rendered by trusted components. |
| Customer-facing tokens, costs, or model names | Never shown. Guardrail-tested. |

Still forbidden as tables/enums/env vars/flags: `Observation`, `Finding`, a generic
`Subscription`, `ActionLog`, `PermissionGrant`, `AssetCredential`, `Entitlement`, or a
`confidence` column on `FieldProvenance`.

---

## §17.1 — The authorized tables (closed list)

**V1 (11):** `User`, `Business`, `OnboardingAnswers`, `BusinessProfile`, `FieldProvenance`,
`ConnectedAsset`, `TaskState`, `GeneratedContent`, `Decision`, `Purchase`, `ServiceLead`.

**V4 (up to 9, landing by phase):**
`AiUsage` (append-only ledger, one row per AI attempt incl. failures) ·
`AiAllowance` (per-business limits and counters) ·
`AiAllowanceAdjustment` (operator/purchase increases, audit trail) ·
`SiteDraft` (the mutable working draft) ·
`SiteVersion` (immutable approved/published snapshots) ·
`SitePublication` (slug, current version, publish state) ·
`CustomDomain` (domain → exactly one business, verification state, provider) ·
`ManagedSubscription` (the single recurring product) ·
`ContactRelayCounter` (content-free rate-limit counters).

No other model may exist. `tests/guardrails/schema.test.ts` enforces the list.
Launch entitlement is **derived** from `Purchase.status = 'paid'`. Managed entitlement is
**derived** from `ManagedSubscription` state + period end + grace. Neither is stored.
`ConnectedAsset` has ONE state column, `connectionState`; `connected` is reserved and
unreachable. `BusinessProfile.timezone` is nullable with **no default**. `Purchase.userId` is
nullable (nulled on account deletion).

---

## §21.11 — Required repo-wide guardrail tests

Live in `tests/guardrails/`, run by `npm run build`, so a violation fails the deploy.

1. **Forbidden-strings** — `$450` · `$49` · `$29` · `Vault` · `Business Info Vault` ·
   `Autopilot` · `Monitor` (as a product name) · `America/Denver` · `skipped` on `/plan`.
   **Added in V4:** no provider/model names or token counts in customer-facing source; no copy
   in which GoBeeFound claims to have created/verified/connected/published a Google profile.
2. **Schema** — every model is on the authorized closed list above; all 11 V1 models present;
   no future entity; the only model containing "Subscription" is `ManagedSubscription`;
   `ManagedProduct` has exactly one value; `Purchase` gains no recurring columns.
3. **Content build validation** (§16.3) — invalid IDs/fields/geography fail the build; every
   task's `canonicalFields` must be producible by its declared tool (`TOOL_OUTPUT_FIELDS`).

---

## Binding UX invariant — enter once, reuse everywhere (P16, amended)

No owner is ever asked to re-enter a fact GoBeeFound already knows. Any value in
`BusinessProfile` that a task or the website builder needs is prefilled and surfaced copyable.
**GoBeeFound now publishes the website itself.** Everything else (Google, Facebook, Instagram)
remains: enter once → reuse everywhere → owner applies externally by hand.

## AI rules (V4 §J)

One server-only provider module. Strict Structured Outputs. Zod re-validation. Deterministic
claims scan. Owner text is data inside a fenced block, never instructions. Explicit timeouts and
output limits. No retry on auth/validation/quota/permanent errors. Record model, prompt version,
real token usage, and request IDs on every attempt. User-safe error messages only. No
`NEXT_PUBLIC_*` AI secrets. No live provider calls in tests.

## Build order and priorities

Phases per the working plan (Amendment A): spike → spec/guardrails → OpenAI provider → usage,
allowance, observability, idempotency → repair generators → SiteSpec + guided builder + preview
+ export → Managed publishing + isolated public origin + domain flow → durable hostname layer →
health checks + hardening. Within each phase: implement only that scope → run tests → fix →
deploy/verify where appropriate → commit → next. Optimize in this order: data-model
correctness → persistence/integrity → tenant isolation → mobile UX → canonical-data reuse →
task experience → tests → visual polish. Raise to the owner only for a genuine contradiction
in the product contract, a missing external credential, or a real security/data-integrity
decision with no safe default.

## Content status

Task definitions carry `contentStatus: 'draft' | 'complete'`. Drafts render with a visible
"Content in progress" badge and are excluded from the production definition of done.
