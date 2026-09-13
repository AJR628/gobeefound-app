import { expect, test } from "@playwright/test";

// Public-surface E2E (§21.1, §21.11). Needs only env vars, not a signed-in user.

test.describe("auth pages", () => {
  test("login renders at 375px with no horizontal scroll and ≥44px controls", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientW = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollW).toBeLessThanOrEqual(clientW);
    for (const btn of await page.getByRole("button").all()) {
      const box = await btn.boundingBox();
      if (box) expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("signup and reset-password render", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();
  });

  test("protected routes redirect to login with a return path", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login\?next=%2Fhome/);
    await page.goto("/your-business/assets");
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("no forbidden product words appear on public pages (§21.11)", async ({ page }) => {
    for (const path of ["/login", "/signup", "/reset-password"]) {
      await page.goto(path);
      const text = (await page.locator("body").innerText()).toLowerCase();
      expect(text).not.toMatch(/\bvault\b|\bautopilot\b|\$450|\$49\b|\$29\b/);
    }
  });
});

test.describe("webhook", () => {
  test("rejects unsigned requests (§21.8)", async ({ request }) => {
    const res = await request.post("/api/stripe/webhook", { data: { type: "checkout.session.completed" } });
    expect(res.status()).toBe(400);
  });
});
