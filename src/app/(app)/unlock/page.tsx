import Link from "next/link";
import { getPlanContext } from "@/lib/plan-context";
import { Card } from "@/components/ui/card";
import { activePrice, expectedAmountCents } from "@/lib/purchase";
import { startCheckout } from "./actions";

// §14.3 / §4.1 — the purchase screen. Price comes from LAUNCH_ACTIVE_PRICE; never hardcoded copy.
// Two triggers reach here (Module 1 complete, or a locked task). Never a modal, never a countdown.

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
  const active = activePrice();
  const price = expectedAmountCents(active) / 100;
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
        <form action={startCheckout} className="mt-5">
          <input type="hidden" name="from" value={from && from.startsWith("/") ? from : "/home"} />
          <button type="submit" className="tap flex h-13 w-full items-center justify-center rounded-xl bg-ink-900 font-semibold text-white hover:bg-ink-700">
            Unlock Launch — ${price}
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-ink-500">Secure checkout by Stripe. Module 1 and Your Business stay free either way.</p>
      </Card>

      <p className="text-center text-sm">
        <Link href={from && from.startsWith("/") ? from : "/home"} className="tap inline-flex items-center text-ink-500 underline">Not now</Link>
      </p>
    </div>
  );
}
