import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// §18.1 — `/`: signed in → /home, else → marketing site.
export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/home");
  redirect(process.env.NEXT_PUBLIC_MARKETING_URL ?? "/login");
}
