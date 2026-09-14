import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { AppNavMenu, AppNavTabs } from "./nav";
import { AnalyticsProvider } from "@/lib/analytics/client";

// §7 global chrome: top bar (mark → /home, percentage, menu) + fixed four-tab bottom bar.
// Onboarding-completeness is enforced by each page via requireBusiness(), not here, so that
// /onboarding and /account remain reachable without a business (§18.1 route guards).

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col">
      <AnalyticsProvider userId={user.id} />
      <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-ink-100 bg-paper/95 px-4 backdrop-blur">
        <Link href="/home" className="tap flex items-center gap-2 font-bold tracking-tight">
          <span aria-hidden>🐝</span> gobeefound
        </Link>
        <AppNavMenu supportEmail={process.env.SUPPORT_EMAIL} />
      </header>
      <main className="flex-1 px-4 pb-24 pt-5">{children}</main>
      <AppNavTabs />
    </div>
  );
}
