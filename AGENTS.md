# GoBeeFound V1 — Working Instructions for the Implementing Agent

The sole source of truth is **GoBeeFound V1 — Implementation Specification V3.1 FINAL**.
These three sections are reproduced here because they are the ones most likely to be
violated by a helpful agent. If anything you are about to build conflicts with them, stop.

---

## §3 — DO NOT BUILD IN V1

Do not build any of the following, and do not build a partial, stubbed, flagged, or
scaffolded version of any of them. If a task appears to require one, the specification
is wrong — stop and raise it.

| Not built | Note |
|---|---|
| Website builder or site hosting | We tell the owner what a site needs and sell the $900 build |
| Monitoring or scheduled checks of any kind | Not one check |
| Job runner, cron, queue, scheduled functions | **No job infrastructure at all** |
| Observation or finding storage | Documented in §23, **not created** |
| Recurring subscriptions or recurring billing | Stripe one-time only. No dormant subscription code, no `Subscription` table, no plan enum |
| Platform-data OAuth | No authorizing GoBeeFound against a customer's Google, Facebook, or Instagram. (Google **sign-in** for authentication IS permitted.) |
| Google Business Profile API integration | Not even behind a flag |
| Meta / Facebook / Instagram API integration | Same |
| Scraping Google or Meta | Prohibited outright |
| Automatic discovery, search, or matching of a business's online assets | The owner declares assets. Never fetch a declared URL in V1. |
| AI advisor, AI chat, "ask me anything" | The three generators are templated tools, not an advisor |
| Autonomous or permissioned actions on any external system | No writes anywhere outside GoBeeFound |
| CRM or lead management | Taught habit + downloadable spreadsheet |
| Social scheduling or publishing | — |
| Invoicing, quoting, customer payments | — |
| Rank tracking, SEO scores, presence scores, health grades | No invented metrics. The launch percentage is the only number. |
| Teams, roles, multi-user | One owner per business |
| Multi-business support | One business per user |
| Native mobile apps | Responsive web only |
| Gamification (badges, streaks, points) | Milestones are the only progress affordance |
| A CMS | Content is TypeScript in `/src/content` |
| Admin dashboard or any admin UI | Manual runbooks |
| i18n / localization | US English only |
| General photo or file storage | **One exception: the logo.** PNG/JPEG, 2 MB, SVG rejected. |
| Separate brand / design system | Extend gobeefound identity |
| Email marketing, drip, nudges, re-engagement | Four transactional emails only |
| In-app notifications | — |
| In-app search | — |
| Dark mode | — |
| Artificial scarcity, countdowns, "N left" | Applies to the $79 founding price too |

Three specific temptations: no second progress metric; the Surface Map is authored
content, never user-editable; **no tables, migrations, enums, stub services, env vars,
or feature flags for anything in §17.4** (Observation, Finding, Subscription, ActionLog,
PermissionGrant, AssetCredential, or a `confidence` column on FieldProvenance).

---

## §17.1 — The exact 11 V1 tables

V1 creates exactly these Prisma models and no others:

1. `User`
2. `Business`
3. `OnboardingAnswers`
4. `BusinessProfile`
5. `FieldProvenance`
6. `ConnectedAsset`
7. `TaskState`
8. `GeneratedContent`
9. `Decision`
10. `Purchase`
11. `ServiceLead`

Entitlement is **derived** from `Purchase.status = 'paid'`. There is no `Entitlement` table.
`ConnectedAsset` has ONE state column, `connectionState` (declared | owner_verified |
connected); `connected` is reserved and unreachable — no code path may set it.
`BusinessProfile.timezone` is nullable with **no default**. `Purchase.userId` is nullable
(nulled on account deletion).

---

## §21.11 — Required repo-wide guardrail tests

These tests live in `tests/guardrails/` and must pass in CI:

1. **Forbidden-strings test.** Fails if built user-facing output or `/src/content` contains,
   case-insensitively on word boundaries: `$450` · `$49` · `$29` · `Vault` ·
   `Business Info Vault` · `Autopilot` · `Monitor` (as a product name) · `America/Denver` ·
   `skipped` on the `/plan` route. Documentation comments are out of scope.
2. **No-future-entity test.** Fails if `prisma/schema.prisma` contains `Observation`,
   `Finding`, `Subscription`, `ActionLog`, `PermissionGrant`, `AssetCredential`, or a
   `confidence` field on `FieldProvenance`.
3. **Table-count test.** `prisma/schema.prisma` defines exactly **11** models.

Also required: content build validation (§16.3) fails the build on any invalid ID,
field, or hardcoded geography.

---

## Binding UX invariant — enter once, reuse everywhere (P16)

No owner is ever asked to re-enter a fact GoBeeFound already knows. Any value in
`BusinessProfile` that a task needs is prefilled (element 12) and surfaced copyable
(element 5, "Your details, ready to use", driven by `reusesFields`). V1 is
enter once → reuse everywhere → owner applies externally by hand. No external publishing.

## Build order and priorities

Phases per §22.2. Within each phase: implement only that scope → run its acceptance
criteria → fix → commit → next. Optimize in this order: data-model correctness →
persistence/integrity → mobile UX → canonical-data reuse → task experience → tests →
visual polish. Raise to the owner only for a genuine spec contradiction, a missing
external credential, or a real security/data-integrity problem.

## Content status

Task definitions carry `contentStatus: 'draft' | 'complete'`. Drafts render with a visible
"Content in progress" badge and are excluded from the production definition of done.
Authoring order: handyman → cleaning → other → licensed_trade → remainder.
