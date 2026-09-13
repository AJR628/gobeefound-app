"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { requireBusiness } from "@/lib/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteLogo } from "@/lib/storage";

// §20.6 — hard delete of all business-scoped rows and the User row (cascades), the stored logo,
// and the auth user. Purchase rows are retained with userId set to null for accounting.

export async function deleteAccount(formData: FormData): Promise<void> {
  const { user, business, profile } = await requireBusiness();
  const typed = String(formData.get("confirm") ?? "").trim();
  if (typed !== profile.displayName.trim()) redirect("/account/delete?error=mismatch");

  await deleteLogo(business.id);

  await db.$transaction([
    db.purchase.updateMany({ where: { userId: user.id }, data: { userId: null } }), // explicit, though the FK is SetNull
    db.user.delete({ where: { id: user.id } }), // cascades Business → all business-scoped tables
  ]);

  // Remove the Supabase Auth identity so the email can't sign back in to a ghost account.
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    await admin.auth.admin.deleteUser(user.id);
  } catch {
    /* if this fails the DB rows are already gone; the auth user will be re-mirrored as a fresh account on next sign-in */
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(process.env.NEXT_PUBLIC_MARKETING_URL ?? "/login");
}
