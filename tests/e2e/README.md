# E2E tests

These cover the `[E2E]` criteria in spec §21. They need a running app with a real Supabase
project (auth + database), so they do not run in the unit suite.

```bash
# one-time
npx playwright install chromium

# against a local build
npm run build && npx playwright test

# against a deployed preview
E2E_BASE_URL=https://deploy-preview-1--gobeefound-app.netlify.app npx playwright test
```

`public.spec.ts` needs no signed-in user. Signed-in flows (onboarding → plan → tasks → confirm →
launched, purchase + refund via Stripe CLI) should be added under `tests/e2e/flows/` using a
dedicated test account seeded through Supabase's admin API — never a real customer.
