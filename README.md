# GoBeeFound — V1 application

The persistent digital operating profile for a local business. **Launch** is the guided onboarding
that builds it. Spec: *GoBeeFound V1 — Implementation Specification V3.1 FINAL*. Agent rules: `AGENTS.md`.

Lives at `app.gobeefound.com` (Netlify). The marketing site (`gobeefound.com`) is a separate static repo.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Prisma → Supabase Postgres · Supabase Auth
(email + Google sign-in) · Supabase Storage (logo only) · Stripe Checkout · Resend · PostHog ·
Anthropic (three generators) · Vitest · Netlify Next.js runtime.

## Local development

```bash
cp .env.example .env.local     # fill in values (see below)
npm install
npm run db:generate
npm run db:migrate             # creates the 11 tables against DATABASE_URL
npm run dev
```

## Tests and guardrails

```bash
npm test                       # everything (unit + content + guardrails)
npm run content:validate       # what `npm run build` runs first — a content error fails the deploy
```

Three repo-wide guardrails (§21.11) run on every build: exactly 11 Prisma models; no future
entities (Observation, Finding, Subscription, ActionLog, PermissionGrant, AssetCredential);
no forbidden strings ($450, $49/$29 as Launch prices, "Vault", "Autopilot", "Monitor" as a
product, `America/Denver`).

## One-time operator setup

### Supabase
1. Create a project. Copy `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) for Prisma.
2. Run `npx prisma migrate deploy`, then paste `supabase/rls.sql` into the SQL editor.
3. **Auth → Providers:** enable Email, and Google (authentication only — no Business Profile scopes).
   Set Site URL to `https://app.gobeefound.com` and add `https://app.gobeefound.com/auth/callback` to redirect URLs.
4. **Auth → SMTP:** point Supabase's auth emails (confirmation, password reset) at Resend so all
   four transactional emails leave from one place.
5. **Storage:** create a **private** bucket named per `SUPABASE_LOGO_BUCKET` (default `logos`).

### Stripe
1. One product "GoBeeFound Launch" with **two one-time prices**: $79 (founding) and $99 (standard).
   Put their IDs in `STRIPE_PRICE_ID_LAUNCH_FOUNDING` / `STRIPE_PRICE_ID_LAUNCH_STANDARD`.
2. Set `LAUNCH_ACTIVE_PRICE=founding`. **Flip it to `standard` by hand** after roughly the first 50
   paying customers — there is deliberately no automatic counter and no scarcity UI (§4.1).
3. Webhook endpoint `https://app.gobeefound.com/api/stripe/webhook`, events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`.
   Put the signing secret in `STRIPE_WEBHOOK_SECRET`.

### Netlify
New site from this repo. `netlify.toml` declares the Next.js plugin and `npm run build`.
Add every variable in `.env.example` under Site settings → Environment variables. Add the
`app` subdomain in the existing gobeefound.com DNS.

### Resend, PostHog, Anthropic
Verify `gobeefound.com` as a sending domain in Resend. Create a PostHog project (US cloud).
Issue an Anthropic API key **with a spend limit**.

## Runbooks (there is no admin UI in V1 — §3)

**Redeem a Launch credit toward a $900 website build (§15.5).** When a Launch customer buys a
build, discount the invoice by `Purchase.amountCents` and mark it redeemed:

```sql
update "Purchase" set "creditRedeemedAt" = now()
where "userId" = '<user uuid>' and status = 'paid' and "creditRedeemedAt" is null;
```

**Refund.** Issue the refund in Stripe. The `charge.refunded` webhook flips `Purchase.status`;
entitlement derives to `free` automatically and no user data is deleted.

**Quarterly content review (§22.5).** Re-verify tasks 2.2, 2.3, 3.4, 4.1–4.6, 5.1, 6.2 and
`src/content/state-resources.ts`; update each `lastReviewed`. Porkbun announced a .com increase
effective 2026-11-01 — the approximate price phrasing already absorbs it.

## Content status

35 module tasks + the confirmation step. Two tasks (3.3, 3.4) are `contentStatus: "draft"`
pending the owner's decision on the single recommended DIY website build route (P1). Drafts
render with a visible "Content in progress" badge.

## What is deliberately not here

No monitoring, no scheduled jobs, no subscriptions, no platform-data OAuth, no Google/Meta API,
no AI advisor, no CRM, no admin dashboard. See `AGENTS.md` §3.
