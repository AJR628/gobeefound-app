# GoBeeFound — application

The persistent digital operating profile for a local business. **Launch** is the guided onboarding
that builds it; the **website builder** turns it into a real site; **Managed** hosts that site.
Spec: *GoBeeFound V1 — Implementation Specification V3.1 FINAL* as amended by
`docs/SPEC-V4-SCOPE-AMENDMENT.md` (V4 wins on conflict). Agent rules: `AGENTS.md`.

Lives at `app.gobeefound.com` (Netlify). Public customer websites will live on a **separate
origin**, `sites.gobeefound.com` and customer domains (V4 §I). The marketing site
(`gobeefound.com`) is a separate static repo.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Prisma → Supabase Postgres · Supabase Auth
(email + Google sign-in) · Supabase Storage · Stripe (Launch one-time; Managed subscription) ·
Resend · PostHog · OpenAI (server-only provider module; Anthropic until Phase 2 completes) ·
Vitest · Playwright · Netlify Next.js runtime.

## Local development

```bash
cp .env.example .env.local     # fill in values (see below)
npm install
npm run db:generate
npm run db:migrate             # applies migrations against DATABASE_URL
npm run dev
```

## Tests and guardrails

```bash
npm test                       # everything (unit + content + guardrails)
npm run content:validate       # what `npm run build` runs first — a content error fails the deploy
npm run typecheck
```

Repo-wide guardrails (§21.11 as amended) run on every build:
- **Schema:** every Prisma model is on the authorized closed list (11 V1 + the V4 models in
  `AGENTS.md §17.1`); no future entities; the only recurring product is `ManagedSubscription`.
- **Forbidden strings:** `$450`, `$49`/`$29` as prices, "Vault", "Autopilot", "Monitor" as a
  product, `America/Denver`; **plus** no provider/model names or token counts in customer-facing
  source, and no copy claiming GoBeeFound acted on a Google Business Profile.
- **Content:** every task's `canonicalFields` must be producible by its declared tool.

## One-time operator setup

### Supabase
1. Create a project. Copy `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) for Prisma.
2. Run `npx prisma migrate deploy`, then paste `supabase/rls.sql` into the SQL editor.
3. **Auth → Providers:** enable Email, and Google (authentication only — no Business Profile scopes).
   Set Site URL to `https://app.gobeefound.com` and add `https://app.gobeefound.com/auth/callback` to redirect URLs.
4. **Auth → SMTP:** point Supabase's auth emails at Resend so all transactional email leaves from one place.
5. **Storage:** create a **private** bucket named per `SUPABASE_LOGO_BUCKET` (default `logos`).

### Stripe
1. One product "GoBeeFound Launch" with **two one-time prices**: $79 (founding) and $169 (standard).
   Put their IDs in `STRIPE_PRICE_ID_LAUNCH_FOUNDING` / `STRIPE_PRICE_ID_LAUNCH_STANDARD`.
2. Set `LAUNCH_ACTIVE_PRICE=founding`. **Flip it to `standard` by hand** after roughly the first 50
   paying customers — there is deliberately no automatic counter and no scarcity UI (§4.1).
   Before flipping, confirm the standard price ID points at a real $169 one-time price.
3. Webhook endpoint `https://app.gobeefound.com/api/stripe/webhook`, events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`.
   (Managed subscription events are added in the Managed phase.) Put the signing secret in `STRIPE_WEBHOOK_SECRET`.

### Netlify
New site from this repo. `netlify.toml` declares the Next.js plugin and `npm run build`.
Add every variable in `.env.example` under Site settings → Environment variables. Add the
`app` subdomain in the existing gobeefound.com DNS.

**AI Gateway:** Netlify injects `OPENAI_API_KEY`/`OPENAI_BASE_URL` into functions unless you set
them. The app pins `https://api.openai.com/v1` in code, so injected base URLs are ignored — but
set **your own** `OPENAI_API_KEY` explicitly and, preferably, turn off Netlify AI features for the
team so billing is unambiguous.

### Resend, PostHog, OpenAI
Verify `gobeefound.com` as a sending domain in Resend. Create a PostHog project (US cloud).
Issue an OpenAI API key **with a project spend limit** and put it in `OPENAI_API_KEY` (server-only).

## Runbooks (there is no admin UI — §3)

**Redeem a Launch credit toward a $900 done-for-you build (§15.5).** When a Launch customer buys a
build, discount the invoice by `Purchase.amountCents` and mark it redeemed:

```sql
update "Purchase" set "creditRedeemedAt" = now()
where "userId" = '<user uuid>' and status = 'paid' and "creditRedeemedAt" is null;
```

**Refund (Launch).** Issue the refund in Stripe. The `charge.refunded` webhook flips `Purchase.status`;
entitlement derives to `free` automatically and no user data is deleted.

**Quarterly content review (§22.5).** Re-verify tasks 2.2, 2.3, 3.4, 4.1–4.6, 5.1, 6.2 and
`src/content/state-resources.ts`; update each `lastReviewed`. Porkbun announced a .com increase
effective 2026-11-01 — the approximate price phrasing already absorbs it.

**Raise a customer's AI allowance (V4 §E).** Founding-period increases are manual. Record the
adjustment, then apply it — both in one transaction so the audit trail always matches the limit:

```sql
begin;
insert into "AiAllowanceAdjustment" ("businessId","bucket","delta","source","reason")
values ('<business uuid>', 'edits', 20, 'operator', 'founding tester — requested more edits');
update "AiAllowance" set "editsLimit" = "editsLimit" + 20, "updatedAt" = now()
 where "businessId" = '<business uuid>';
commit;
```
Buckets: `builds` (`buildsLimit`), `edits` (`editsLimit`), `logos` (`logosLimit`).

**AI cost and health report (V4 §E, plan §18).** Everything is in `AiUsage`; costs are estimates in
USD micro-dollars from `src/lib/ai/pricing.ts`.

```sql
-- spend and outcomes per day, last 14 days
select date_trunc('day',"createdAt") d, count(*) attempts,
       count(*) filter (where outcome='ok') ok,
       count(*) filter (where outcome='error') errors,
       count(*) filter (where outcome in ('claims_rejected','contact_rejected')) rejected,
       round(sum("estimatedCostMicros")/1e6::numeric, 4) est_usd,
       percentile_cont(0.95) within group (order by "durationMs") p95_ms
  from "AiUsage" where "createdAt" > now() - interval '14 days'
 group by 1 order by 1 desc;

-- failures by kind, last 24h (kind = AiError.kind; config/quota mean WE must act)
select "errorKind", count(*) from "AiUsage"
 where outcome='error' and "createdAt" > now() - interval '1 day' group by 1 order by 2 desc;

-- one owner's support reference → the exact attempt
select * from "AiUsage" where "generationId"::text like '<first 8 chars of the code>%';
```
Alert threshold to watch by hand until Phase 8: est_usd per day above $5, or any `config`/`quota` kind.

### Managed hosting (V4 §F/§I) — operator setup

1. **Stripe:** create a recurring price, $19/month, product "GoBeeFound Managed Website" → `STRIPE_PRICE_ID_MANAGED_MONTHLY`.
   Add these webhook events to the existing endpoint: `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Enable the **Customer Portal**
   (Settings → Billing → Customer portal) so owners can fix a card.
2. **Second Netlify site** from this same repo for `sites.gobeefound.com`, `SITE_ROLE=public`, and ONLY the
   public env subset (see `.env.example` header). Add `sites.gobeefound.com` as its custom domain. Put its site
   id in `NETLIFY_PUBLIC_SITE_ID` and a personal access token in `NETLIFY_API_TOKEN` **on the app site**.
3. **Supabase:** run the `gbf_public` role statements in `supabase/rls.sql` and put its pooled connection
   string in `DATABASE_URL_PUBLIC` on the public site. Create the public bucket (`site-assets`) via the
   bucket statement in `rls.sql`.
4. **DNS:** `sites.gobeefound.com` → CNAME to the public Netlify site.

**Cancellation / expiry** are automatic (webhook): cancel = live to period end; payment failure = 7-day grace
with an email; then unpublish (soft) and release domains. Reactivation republishes the same version.

**Unpublish a site now** (abuse report, legal, or owner request):
```sql
update "SitePublication" set "unpublishedAt" = now() where "businessId" = '<business uuid>';
```
then purge the public site's cache for tag `site-<business uuid>` (Netlify → the public site → Deploys →
Purge cache, or `POST https://api.netlify.com/api/v1/purge`).

**Remove a custom domain by hand:** mark it removed and delete both aliases (apex + www) from the public
site's domain settings in Netlify.
```sql
update "CustomDomain" set state = 'removed', "removedAt" = now() where domain = '<domain>';
```

**Founding-cohort domain cap:** `ALIAS_COHORT_CAP` (20) in `src/lib/netlify.ts`. When reached, new
connections are refused with a friendly message and a log line — that is the signal to finish Phase 7.

## Content status

35 module tasks + the confirmation step. Tasks 3.3 and 3.4 are `contentStatus: "draft"`; they are
replaced by the website builder entry and the Managed domain-connection flow (V4 §D, §I). Drafts
render with a visible "Content in progress" badge.

## What is deliberately not here

No open-ended AI chat, no Google/Meta API or platform OAuth, no CRM or lead inbox, no admin
dashboard, no recurring billing other than GoBeeFound Managed, no scheduled jobs until Managed
health checks exist. See `AGENTS.md §3` and `docs/SPEC-V4-SCOPE-AMENDMENT.md §C`.
