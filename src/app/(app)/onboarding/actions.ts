"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentBusiness, requireUser } from "@/lib/current-user";
import { track } from "@/lib/analytics/server";
import { computePlan } from "@/lib/plan";
import {
  completeOnboarding,
  onboardingCompleteSchema,
  onboardingDraftSchema,
  updateOnboarding,
  type OnboardingDraft,
} from "@/lib/onboarding";

// Draft answers live in an httpOnly cookie so a refresh loses nothing (§6.2) without a 12th table.
const DRAFT_COOKIE = "gbf_onboarding_draft";
const PLAN_SEEN_COOKIE = "gbf_plan_seen";

export async function readDraft(): Promise<Partial<OnboardingDraft>> {
  const raw = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!raw) return {};
  try {
    const parsed = onboardingDraftSchema.partial().safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** Autosave a single answer (or a few). Merges into the draft cookie. */
const QUESTION_ID: Record<string, string> = {
  displayName: "Q1", trade: "Q2", city: "Q3", state: "Q3", serviceAreaType: "Q4", alreadyServing: "Q5",
  hasDomain: "Q6", hasWebsite: "Q6", hasEmail: "Q6", hasPhone: "Q6", hasGBP: "Q7", hasSocial: "Q7", hasReviews: "Q8",
};

export async function saveDraft(partial: Partial<OnboardingDraft>): Promise<void> {
  const user = await requireUser();
  const current = await readDraft();
  const merged = onboardingDraftSchema.partial().safeParse({ ...current, ...partial });
  if (!merged.success) return;
  for (const [k, v] of Object.entries(partial)) {
    if (QUESTION_ID[k]) await track(user.id, "onboarding_question_answered", { questionId: QUESTION_ID[k], wasUnsure: v === "unsure" });
  }
  (await cookies()).set(DRAFT_COOKIE, JSON.stringify(merged.data), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export type CompleteState = { errors?: Record<string, string> } | undefined;

/** Final submit. Creates (or, in edit mode, updates) the business and routes to /plan. */
export async function submitOnboarding(draft: OnboardingDraft): Promise<CompleteState> {
  const user = await requireUser();
  const parsed = onboardingCompleteSchema.safeParse(draft);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
    return { errors };
  }

  const existing = await getCurrentBusiness(user.id);
  const jar = await cookies();

  if (existing && existing.onboarding) {
    // Edit mode (§11.7): compute the delta in required steps for the /plan message.
    const before = computePlan({ trade: existing.trade, serviceAreaType: existing.serviceAreaType, answers: existing.onboarding }).requiredTotal;
    await updateOnboarding(existing.id, parsed.data);
    const after = computePlan({ trade: parsed.data.trade, serviceAreaType: parsed.data.serviceAreaType, answers: parsed.data }).requiredTotal;
    jar.delete(DRAFT_COOKIE);
    redirect(`/plan?delta=${after - before}`);
  }

  await completeOnboarding(user.id, parsed.data);
  const alreadyHasCount = (["hasDomain", "hasWebsite", "hasEmail", "hasPhone", "hasGBP", "hasSocial", "hasReviews"] as const).filter((k) => parsed.data[k] === "yes").length;
  await track(user.id, "onboarding_completed", { trade: parsed.data.trade, state: parsed.data.state, serviceAreaType: parsed.data.serviceAreaType, alreadyHasCount });
  jar.delete(DRAFT_COOKIE);
  redirect("/plan");
}

export async function markPlanSeen(): Promise<void> {
  (await cookies()).set(PLAN_SEEN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/home");
}

export async function hasSeenPlan(): Promise<boolean> {
  return (await cookies()).get(PLAN_SEEN_COOKIE)?.value === "1";
}
