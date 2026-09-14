import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlanContext } from "@/lib/plan-context";
import { getManagedState, managedStatusCopy } from "@/lib/managed/entitlement";
import { managedPriceId } from "@/lib/managed/stripe";
import { publicationFor } from "@/lib/site/publish";
import { dnsInstructions } from "@/lib/managed/domains";
import { db } from "@/lib/db";
import { DNS_PROVIDERS } from "@/content/dns-providers";
import { CopyButton } from "@/components/copy-button";
import { startManagedCheckout, openBillingPortal } from "./actions";
import { ManagedControls, VersionList } from "./controls";
import { DomainPanel } from "./domain-panel";

// V4 §F/§I — the Managed dashboard: status, live address, publish/rollback, domain connection, billing.

export default async function ManagedPage() {
  const ctx = await getPlanContext();
  if (ctx.entitlement !== "launch") redirect("/site");
  const [state, pub, versions, domains] = await Promise.all([
    getManagedState(ctx.business.id),
    publicationFor(ctx.business.id),
    db.siteVersion.findMany({ where: { businessId: ctx.business.id }, orderBy: { versionNumber: "desc" }, take: 10, select: { id: true, versionNumber: true, createdAt: true } }),
    db.customDomain.findMany({ where: { businessId: ctx.business.id, removedAt: null }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!versions.length) redirect("/site/review");

  if (!state.entitled) {
    const ready = Boolean(managedPriceId());
    return (
      <div className="space-y-5">
        <nav className="text-sm text-ink-500"><Link href="/site/publish" className="tap inline-flex items-center underline">← How to host it</Link></nav>
        <header>
          <h1 className="text-2xl font-bold tracking-tight">GoBeeFound Managed</h1>
          <p className="mt-1 text-[15px] text-ink-700">{managedStatusCopy(state)}</p>
        </header>
        <section className="rounded-2xl border-2 border-ink-900 bg-white p-5">
          <div className="flex items-baseline justify-between"><h2 className="text-lg font-bold">$19 a month</h2><span className="text-xs text-ink-500">Cancel any time</span></div>
          <ul className="mt-3 space-y-1.5 text-[15px] text-ink-700">
            <li>• Your approved website online within a minute, with HTTPS</li>
            <li>• Your own domain — we show you the exact records to add</li>
            <li>• Publish changes with one tap; go back to any earlier version</li>
            <li>• Contact form messages emailed straight to you</li>
            <li>• 10 AI edits a month</li>
          </ul>
          {ready ? (
            <form action={startManagedCheckout}><button type="submit" className="tap mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-ink-900 font-semibold text-white">Start hosting — $19/month</button></form>
          ) : (
            <div className="mt-4 rounded-xl bg-honey-50 p-3 text-sm text-ink-700">Managed hosting opens for founding members very soon. Your approved site is saved and ready.</div>
          )}
          {state.reason === "ended" || state.reason === "period_over" || state.reason === "grace_over" ? <p className="mt-3 text-xs text-ink-500">Reactivating brings your site back exactly as it was, including your domain settings.</p> : null}
        </section>
      </div>
    );
  }

  const latest = versions[0]!;
  const canPublishNewer = pub?.current ? latest.versionNumber > pub.current.versionNumber : true;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-500"><Link href="/site" className="tap inline-flex items-center underline">← Your website</Link></nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Your hosted website</h1>
        <p className="mt-1 text-[15px] text-ink-700">{managedStatusCopy(state)}</p>
      </header>

      <section className="rounded-2xl border border-ink-100 bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Live address</h2>
        {pub?.live ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <a href={pub.url} target="_blank" rel="noopener noreferrer" className="tap inline-flex min-h-11 items-center break-all font-medium underline">{pub.url}</a>
            <CopyButton value={pub.url} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-700">Publishing your approved website now — refresh in a moment.</p>
        )}
        {pub?.current && <p className="mt-1 text-xs text-ink-500">Showing version {pub.current.versionNumber}.</p>}
      </section>

      <ManagedControls canPublishNewer={canPublishNewer} latestVersion={latest.versionNumber} cancelling={state.reason === "cancelling"} grace={state.reason === "grace"} />
      <form action={openBillingPortal}><button type="submit" className="tap h-11 text-sm underline">{state.reason === "grace" ? "Fix my payment method" : "Update card or view invoices"}</button></form>

      <DomainPanel
        domains={domains.map((d) => ({ id: d.id, domain: d.domain, state: d.state, dnsProvider: d.dnsProvider, lastError: d.lastError, records: dnsInstructions(d.domain, d.verificationToken) }))}
        providers={DNS_PROVIDERS.map((p) => ({ id: p.id, label: p.label, dnsUrl: p.dnsUrl, tips: p.tips }))}
      />

      <VersionList versions={versions.map((v) => ({ id: v.id, versionNumber: v.versionNumber, createdAt: v.createdAt.toISOString(), current: pub?.current?.id === v.id }))} />

      <section className="rounded-2xl border border-ink-100 bg-white p-4 text-sm text-ink-700">
        <p><strong>Take it with you any time.</strong> <a href="/api/site/export" className="underline">Download the whole site</a> — it's yours, whether or not you keep hosting with us.</p>
      </section>
    </div>
  );
}
