import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlanContext } from "@/lib/plan-context";
import { latestVersion } from "@/lib/site/draft";

// V4 §D/§F/§G — the hosting fork. Shown ONLY after approval. Two doors: GoBeeFound Managed (recommended,
// frictionless) or take the website with you (export). Managed checkout arrives with the Managed phase;
// until its Stripe price exists the door is honest about that rather than hidden.

export default async function PublishPage() {
  const ctx = await getPlanContext();
  if (ctx.entitlement !== "launch") redirect("/site");
  const version = await latestVersion(ctx.business.id);
  if (!version) redirect("/site/review");
  const managedReady = Boolean(process.env.STRIPE_PRICE_ID_MANAGED_MONTHLY);

  return (
    <div className="space-y-5">
      <nav className="text-sm text-ink-500"><Link href="/site" className="tap inline-flex items-center underline">← Your website</Link></nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Your website is approved</h1>
        <p className="mt-1 text-[15px] text-ink-700">Version {version.versionNumber}, saved {version.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })}. Now choose how it goes online.</p>
      </header>

      <section className="rounded-2xl border-2 border-ink-900 bg-white p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">GoBeeFound Managed</h2>
          <span className="text-lg font-bold">$19<span className="text-sm font-medium text-ink-500">/month</span></span>
        </div>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-good-500">Recommended · easiest</p>
        <ul className="mt-3 space-y-1.5 text-[15px] text-ink-700">
          <li>• We host it and keep it online with HTTPS</li>
          <li>• Your own domain connected — we walk you through the two records, no hosting account needed</li>
          <li>• Change anything here and publish with one tap</li>
          <li>• Version history — go back to any earlier version</li>
          <li>• Contact form messages emailed straight to you</li>
          <li>• 10 AI edits a month included</li>
        </ul>
        <p className="mt-2 text-xs text-ink-500">Cancel any time. Your site stays live to the end of the month you've paid for, and you can export it whenever you like.</p>
        {managedReady ? (
          <Link href="/site/managed" className="tap mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-ink-900 font-semibold text-white">Host it with GoBeeFound — $19/month</Link>
        ) : (
          <div className="mt-4 rounded-xl bg-honey-50 p-3 text-sm text-ink-700">Managed hosting opens for founding members very soon. Your approved site is saved and ready — we'll let you know the moment it's on.</div>
        )}
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-5">
        <h2 className="text-lg font-bold">Take my website with me</h2>
        <p className="mt-1 text-[15px] text-ink-700">Download the whole site as files you own — the page, its styles, your images, and plain instructions for putting it online with any host. More technical, and entirely yours.</p>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-500">
          <li>• You handle hosting, your domain, and HTTPS with the host you choose</li>
          <li>• Later edits here mean exporting again</li>
          <li>• The message form becomes a call/text/email link</li>
        </ul>
        <a href="/api/site/export" className="tap mt-4 flex h-12 w-full items-center justify-center rounded-xl border border-ink-900 bg-white font-semibold text-ink-900">Download my website (.zip)</a>
      </section>
    </div>
  );
}
