import { describe, expect, it } from "vitest";
import { onboardingCompleteSchema, onboardingDraftSchema, screenOneComplete } from "@/lib/onboarding";

const full = {
  displayName: "Dave's Detail",
  trade: "mobile_service",
  city: "Aurora",
  state: "CO",
  serviceAreaType: "atCustomer",
  alreadyServing: true,
} as const;

describe("§6.1 onboarding required fields", () => {
  it("Q1–Q5 are required for completion", () => {
    expect(onboardingCompleteSchema.safeParse(full).success).toBe(true);
    for (const k of Object.keys(full)) {
      const { [k]: _omit, ...rest } = full as Record<string, unknown>;
      expect(onboardingCompleteSchema.safeParse(rest).success, `missing ${k} should fail`).toBe(false);
    }
  });
  it("Q6–Q8 default to unsure and are never required", () => {
    const parsed = onboardingCompleteSchema.parse(full);
    expect(parsed.hasDomain).toBe("unsure");
    expect(parsed.hasReviews).toBe("unsure");
  });
  it("state must be a real US state code, never inferred", () => {
    expect(onboardingCompleteSchema.safeParse({ ...full, state: "XX" }).success).toBe(false);
    expect(onboardingCompleteSchema.safeParse({ ...full, state: "DC" }).success).toBe(true);
  });
  it("screenOneComplete gates Continue on all five", () => {
    expect(screenOneComplete(full)).toBe(true);
    expect(screenOneComplete({ ...full, state: undefined })).toBe(false);
    expect(screenOneComplete({ ...full, alreadyServing: undefined })).toBe(false);
  });
  it("draft schema accepts partial answers (autosave)", () => {
    expect(onboardingDraftSchema.partial().safeParse({ city: "Aurora" }).success).toBe(true);
  });
});
