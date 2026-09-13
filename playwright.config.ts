import { defineConfig, devices } from "@playwright/test";

// §21 [E2E] criteria. Runs against a started app with a real Supabase project (CI / local with .env).
// Mobile-first: the primary project is a 375px phone (P13, §21.11).

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["iPhone 12"], viewport: { width: 375, height: 667 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
