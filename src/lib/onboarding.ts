import { z } from "zod";
import { ARCHETYPE_IDS, US_STATES } from "@/content";
import { db } from "./db";

// §6.1 — the canonical eight questions. Q1–Q5 required; Q6–Q8 default to `unsure`.

const STATE_CODES = US_STATES.map((s) => s.code) as [string, ...string[]];
const yesNoUnsure = z.enum(["yes", "no", "unsure"]).default("unsure");

export const onboardingDraftSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(), // Q1
  trade: z.enum(ARCHETYPE_IDS).optional(), // Q2
  city: z.string().trim().min(1).max(80).optional(), // Q3
  state: z.enum(STATE_CODES).optional(), // Q3 — explicit, never inferred (§12.4)
  serviceAreaType: z.enum(["atCustomer", "atMyLocation", "both"]).optional(), // Q4
  alreadyServing: z.boolean().optional(), // Q5
  hasDomain: yesNoUnsure, // Q6
  hasWebsite: yesNoUnsure,
  hasEmail: yesNoUnsure,
  hasPhone: yesNoUnsure,
  hasGBP: yesNoUnsure, // Q7
  hasSocial: yesNoUnsure,
  hasReviews: yesNoUnsure, // Q8
});
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

/** Completion requires Q1–Q5 (every non-nullable Business column + displayName seed). */
export const onboardingCompleteSchema = onboardingDraftSchema.extend({
  displayName: z.string().trim().min(1, "What's your business called?").max(120),
  trade: z.enum(ARCHETYPE_IDS, { message: "Pick the kind of work you do." }),
  city: z.string().trim().min(1, "Which city are you based in?").max(80),
  state: z.enum(STATE_CODES, { message: "Pick your state." }),
  serviceAreaType: z.enum(["atCustomer", "atMyLocation", "both"], { message: "Do customers come to you, or do you go to them?" }),
  alreadyServing: z.boolean({ message: "Are you already serving customers?" }),
});
export type OnboardingComplete = z.infer<typeof onboardingCompleteSchema>;

export const REQUIRED_QUESTION_KEYS = ["displayName", "trade", "city", "state", "serviceAreaType", "alreadyServing"] as const;

export function screenOneComplete(d: Partial<OnboardingDraft>): boolean {
  return REQUIRED_QUESTION_KEYS.every((k) => d[k] !== undefined && d[k] !== null && d[k] !== "");
}

/**
 * §6.2 — one transaction, FK order: Business → OnboardingAnswers → BusinessProfile.
 * BusinessProfile gets displayName from Q1 and schema defaults for everything else
 * (hideAddress=false, serviceAreas=[], services=[]; all other columns null, including timezone).
 */
export async function completeOnboarding(userId: string, data: OnboardingComplete) {
  return db.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        ownerId: userId,
        trade: data.trade,
        city: data.city,
        state: data.state,
        serviceAreaType: data.serviceAreaType,
        alreadyServing: data.alreadyServing,
        stage: "launching",
      },
    });
    await tx.onboardingAnswers.create({
      data: {
        businessId: business.id,
        hasDomain: data.hasDomain,
        hasWebsite: data.hasWebsite,
        hasEmail: data.hasEmail,
        hasPhone: data.hasPhone,
        hasGBP: data.hasGBP,
        hasSocial: data.hasSocial,
        hasReviews: data.hasReviews,
      },
    });
    await tx.businessProfile.create({
      data: { businessId: business.id, displayName: data.displayName },
    });
    return business;
  });
}

/**
 * §11.7 — editing answers later is non-destructive: only Business facts and OnboardingAnswers
 * change. TaskState rows are untouched; the plan recomputes at render. displayName is NOT
 * overwritten here — the canonical record (Your Business) owns it after onboarding.
 */
export async function updateOnboarding(businessId: string, data: OnboardingComplete) {
  return db.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: businessId },
      data: {
        trade: data.trade,
        city: data.city,
        state: data.state,
        serviceAreaType: data.serviceAreaType,
        alreadyServing: data.alreadyServing,
      },
    });
    await tx.onboardingAnswers.update({
      where: { businessId },
      data: {
        hasDomain: data.hasDomain,
        hasWebsite: data.hasWebsite,
        hasEmail: data.hasEmail,
        hasPhone: data.hasPhone,
        hasGBP: data.hasGBP,
        hasSocial: data.hasSocial,
        hasReviews: data.hasReviews,
        revisedAt: new Date(),
      },
    });
  });
}
