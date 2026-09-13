import { describe, expect, it } from "vitest";
import { computeModuleOrder, computePlan } from "@/lib/plan";
import type { OnboardingAnswers } from "@/content";

const NONE: OnboardingAnswers = {
  hasDomain: "no", hasWebsite: "no", hasEmail: "no", hasPhone: "no", hasGBP: "no", hasSocial: "no", hasReviews: "no",
};
const UNSURE: OnboardingAnswers = {
  hasDomain: "unsure", hasWebsite: "unsure", hasEmail: "unsure", hasPhone: "unsure", hasGBP: "unsure", hasSocial: "unsure", hasReviews: "unsure",
};
const ALL_YES: OnboardingAnswers = {
  hasDomain: "yes", hasWebsite: "yes", hasEmail: "yes", hasPhone: "yes", hasGBP: "yes", hasSocial: "yes", hasReviews: "yes",
};

describe("§11.5 required totals (module tasks only; confirm excluded)", () => {
  it.each([
    ["handyman", 29],
    ["cleaning", 29],
    ["other", 29],
    ["pet_services", 29],
    ["licensed_trade", 30],
    ["landscaping", 30],
    ["mobile_service", 30],
    ["beauty", 31],
    ["photography", 31],
    ["food", 31],
  ] as const)("%s → %i required", (trade, expected) => {
    expect(computePlan({ trade, serviceAreaType: "atCustomer", answers: NONE }).requiredTotal).toBe(expected);
  });
});

describe("§10.6 adaptedCount", () => {
  it("is 0 when every answer is no", () => {
    expect(computePlan({ trade: "handyman", serviceAreaType: "atCustomer", answers: NONE }).adaptedCount).toBe(0);
  });
  it("treats unsure as no (§11.1)", () => {
    expect(computePlan({ trade: "handyman", serviceAreaType: "atCustomer", answers: UNSURE }).adaptedCount).toBe(0);
  });
  it("is the count of verify variants when every answer is yes (10 mapped tasks)", () => {
    const plan = computePlan({ trade: "handyman", serviceAreaType: "atCustomer", answers: ALL_YES });
    expect(plan.adaptedCount).toBe(10);
    // Variants remain in the plan and remain required — they are NOT skipped.
    const v = plan.tasks.filter((t) => t.isVerifyVariant);
    expect(v.every((t) => t.isRequired || t.taskId === "6.2")).toBe(true);
    expect(plan.requiredTotal).toBe(29);
  });
  it("hasWebsite adapts 3.1, 3.3, 3.4 but leaves 3.5 and 3.6 as full tasks", () => {
    const plan = computePlan({ trade: "handyman", serviceAreaType: "atCustomer", answers: { ...NONE, hasWebsite: "yes" } });
    const byId = new Map(plan.tasks.map((t) => [t.taskId, t]));
    expect(byId.get("3.1")!.isVerifyVariant).toBe(true);
    expect(byId.get("3.3")!.isVerifyVariant).toBe(true);
    expect(byId.get("3.4")!.isVerifyVariant).toBe(true);
    expect(byId.get("3.5")!.isVerifyVariant).toBe(false);
    expect(byId.get("3.6")!.isVerifyVariant).toBe(false);
  });
});

describe("§11.4 module order", () => {
  it("always places name_domain_assets second", () => {
    for (const trade of ["handyman", "photography", "food", "other"] as const) {
      const order = computeModuleOrder(trade);
      expect(order[0]).toBe("foundation");
      expect(order[1]).toBe("name_domain_assets");
      expect(new Set(order).size).toBe(7);
    }
  });
  it("photography leads with website then social after foundation", () => {
    expect(computeModuleOrder("photography").slice(0, 4)).toEqual(["foundation", "name_domain_assets", "website", "social"]);
  });
  it("plan tasks are sorted by module priority then order", () => {
    const plan = computePlan({ trade: "beauty", serviceAreaType: "atMyLocation", answers: NONE });
    const firstSocialIdx = plan.tasks.findIndex((t) => t.moduleId === "social");
    const firstGoogleIdx = plan.tasks.findIndex((t) => t.moduleId === "google");
    expect(firstSocialIdx).toBeLessThan(firstGoogleIdx);
  });
});
