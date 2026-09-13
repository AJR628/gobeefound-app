import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { createSupabaseServerClient } from "./supabase/server";

/**
 * Resolves the signed-in Supabase user and mirrors it into our User table (§17.2 User.id = auth id).
 * Redirects to /login when unauthenticated. Cached per request.
 */
export const requireUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser || !authUser.email) redirect("/login");

  const provider = authUser.app_metadata?.provider === "google" ? "google" : "email";
  const user = await db.user.upsert({
    where: { id: authUser.id },
    create: { id: authUser.id, email: authUser.email, authProvider: provider },
    update: { lastSeenAt: new Date(), email: authUser.email },
  });
  return user;
});

/** The user's business with profile and onboarding answers, or null if onboarding is incomplete. */
export const getCurrentBusiness = cache(async (userId: string) => {
  return db.business.findUnique({
    where: { ownerId: userId },
    include: { profile: true, onboarding: true },
  });
});

/** For (app) pages: user + business, redirecting to /onboarding if the business doesn't exist yet. */
export async function requireBusiness() {
  const user = await requireUser();
  const business = await getCurrentBusiness(user.id);
  if (!business || !business.profile || !business.onboarding) redirect("/onboarding");
  return { user, business, profile: business.profile, onboarding: business.onboarding };
}
