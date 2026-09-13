import Link from "next/link";
import { requireUser, getCurrentBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { db } from "@/lib/db";
import { Card, SectionLabel } from "@/components/ui/card";

// §7 /account — deliberately boring. Credit display derives from Purchase.amountCents (§15.5).

function money(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default async function AccountPage() {
  const user = await requireUser();
  const [business, entitlement, purchase] = await Promise.all([
    getCurrentBusiness(user.id),
    getEntitlement(user.id),
    db.purchase.findFirst({ where: { userId: user.id, status: "paid" }, orderBy: { paidAt: "desc" } }),
  ]);

  const creditActive =
    purchase && !purchase.creditRedeemedAt && purchase.creditExpiresAt && purchase.creditExpiresAt > new Date();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Account</h1>

      <Card>
        <SectionLabel>Sign-in</SectionLabel>
        <p className="text-[15px]">{user.email}</p>
        <p className="mt-1 text-sm text-ink-500">Signed in with {user.authProvider === "google" ? "Google" : "email and password"}.</p>
        <Link href="/reset-password" className="tap mt-3 inline-flex items-center text-sm font-medium underline">
          Change password
        </Link>
      </Card>

      <Card>
        <SectionLabel>Launch</SectionLabel>
        {entitlement === "launch" && purchase ? (
          <>
            <p className="text-[15px]">
              Purchased {purchase.paidAt?.toLocaleDateString("en-US", { dateStyle: "medium" })} · {money(purchase.amountCents)}
            </p>
            {creditActive ? (
              <p className="mt-2 text-sm text-ink-700">
                You have <strong>{money(purchase.amountCents)} credit</strong> toward a GoBeeFound website. Valid until{" "}
                {purchase.creditExpiresAt!.toLocaleDateString("en-US", { dateStyle: "long" })}.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-[15px]">You're on the free plan.</p>
            <Link href="/unlock" className="tap mt-3 inline-flex items-center text-sm font-medium underline">
              See what Launch includes
            </Link>
          </>
        )}
      </Card>

      {business && (
        <Card>
          <SectionLabel>Your answers</SectionLabel>
          <p className="text-sm text-ink-700">Change your trade, location, or what you already have. Your progress is never deleted.</p>
          <Link href="/onboarding?edit=1" className="tap mt-3 inline-flex items-center text-sm font-medium underline">
            Edit onboarding answers
          </Link>
        </Card>
      )}

      <Card>
        <SectionLabel>Your data</SectionLabel>
        <p className="text-sm text-ink-700">Everything you've entered is yours. Export it any time — free, forever, even after a refund.</p>
        <Link href="/your-business/export" className="tap mt-3 inline-flex items-center text-sm font-medium underline">
          Export your business data
        </Link>
      </Card>

      <Card className="border-danger-500/30">
        <SectionLabel>Delete account</SectionLabel>
        <p className="text-sm text-ink-700">Permanently removes your account and business record. We'll offer an export first.</p>
        <Link href="/account/delete" className="tap mt-3 inline-flex items-center text-sm font-medium text-danger-500 underline">
          Delete my account
        </Link>
      </Card>
    </div>
  );
}
