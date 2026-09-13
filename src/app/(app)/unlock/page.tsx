import Link from "next/link";
import { getPlanContext } from "@/lib/plan-context";
import { Card } from "@/components/ui/card";

// §14.3 / §4.1 — the purchase screen. Price comes from LAUNCH_ACTIVE_PRICE; never hardcoded copy.
// Stripe Checkout wiring lands in Phase 7; until then the button explains that.

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const ctx = await getPlanContext();
  if (ctx.entitlement === "launch") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">You already have Launch.</h1>
        <Link href={from && from.startsWith("/") ? from : "/home"} className="tap inline-flex items-center underline">Back to your plan</Link>
      </div>
    );
  }
  const active = process.env.LAUNCH_ACTIVE_PRICE === "standard" ? "standard" : "founding";
  const price = active === "standard" ? 99 : 79;
  const remaining = ctx.progress.denominator - ctx.progress.completedRequired;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Unlock the rest of your plan</h1>
        <p className="mt-2 text-[15px] text-ink-700">
          You've done {ctx.progress.completedRequired} {ctx.progress.completedRequired === 1 ? "step" : "steps"}. {remaining} to go — and everything you've saved so far stays exactly where it is.
        </p>
      </div>

      <Card>
        <p className="text-3xl font-bold tracking-tight">${price} <span className="text-base font-normal text-ink-500">once</span></p>
        {active === "founding" && <p className="mt-1 text-sm text-ink-500">Founding price while we're still improving it.</p>}
        <ul className="mt-4 space-y-2 text-[15px]">
          <li>✓ Every step in all seven modules</li>
          <li>✓ Website Copy Builder, Description Generator, Review Request Kit</li>
          <li>✓ Printable review card and lead tracker</li>
          <li>✓ Your confirmed record and Presence Summary</li>
        </ul>
        <p className="mt-4 text-sm text-ink-700">
          Not a subscription. And if you'd rather we build your website, <strong>the ${price} you pay here comes off the $900</strong> within 90 days.
        </p>
        <p className="mt-2 text-sm text-ink-500">30-day refund, no questions asked.</p>
        <button type="button" disabled className="tap mt-5 flex h-13 w-full items-center justify-center rounded-xl bg-ink-900 font-semibold text-white opacity-50">
          Checkout coming soon
        </button>
        <p className="mt-2 text-center text-xs text-ink-500">Payments are being connected. Module 1 and Your Business stay free meanwhile.</p>
      </Card>

      <p className="text-center text-sm">
        <Link href={from && from.startsWith("/") ? from : "/home"} className="tap inline-flex items-center text-ink-500 underline">Not now</Link>
      </p>
    </div>
  );
}
