import Link from "next/link";
import { getPlanContext } from "@/lib/plan-context";
import { getManagedState } from "@/lib/managed/entitlement";
import { publicationFor } from "@/lib/site/publish";
import { AutoRefresh } from "./auto-refresh";

// After Stripe Checkout returns. The verified webhook activates Managed and publishes; this page just
// waits for that to land (a few seconds), then hands off to the dashboard.

export default async function ManagedSuccessPage() {
  const ctx = await getPlanContext();
  const [state, pub] = await Promise.all([getManagedState(ctx.business.id), publicationFor(ctx.business.id)]);
  const ready = state.entitled && pub?.live;
  return (
    <div className="space-y-5 text-center">
      {!ready && <AutoRefresh everyMs={3000} />}
      <h1 className="text-2xl font-bold tracking-tight">{ready ? "Your website is live" : "Setting up your hosting…"}</h1>
      {ready ? (
        <>
          <a href={pub!.url} target="_blank" rel="noopener noreferrer" className="tap inline-flex min-h-11 items-center break-all font-medium underline">{pub!.url}</a>
          <p className="text-[15px] text-ink-700">Next: connect your own domain. We'll show you exactly which two records to add.</p>
          <Link href="/site/managed" className="tap inline-flex h-12 w-full items-center justify-center rounded-xl bg-ink-900 font-semibold text-white">Connect my domain</Link>
        </>
      ) : (
        <p className="text-[15px] text-ink-700">Confirming your payment and publishing your approved website. This usually takes a few seconds.</p>
      )}
    </div>
  );
}
