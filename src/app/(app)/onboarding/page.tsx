import { redirect } from "next/navigation";
import { getCurrentBusiness, requireUser } from "@/lib/current-user";
import { OnboardingWizard } from "./wizard";
import { readDraft } from "./actions";
import type { OnboardingDraft } from "@/lib/onboarding";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const user = await requireUser();
  const business = await getCurrentBusiness(user.id);

  // Existing business and not editing → nothing to do here.
  if (business && business.onboarding && business.profile && edit !== "1") redirect("/home");

  let initial: Partial<OnboardingDraft> = await readDraft();
  const editMode = Boolean(business && edit === "1");
  if (editMode && business?.onboarding && business.profile) {
    initial = {
      displayName: business.profile.displayName,
      trade: business.trade,
      city: business.city,
      state: business.state,
      serviceAreaType: business.serviceAreaType,
      alreadyServing: business.alreadyServing,
      hasDomain: business.onboarding.hasDomain,
      hasWebsite: business.onboarding.hasWebsite,
      hasEmail: business.onboarding.hasEmail,
      hasPhone: business.onboarding.hasPhone,
      hasGBP: business.onboarding.hasGBP,
      hasSocial: business.onboarding.hasSocial,
      hasReviews: business.onboarding.hasReviews,
    };
  }

  return <OnboardingWizard initial={initial} editMode={editMode} />;
}
