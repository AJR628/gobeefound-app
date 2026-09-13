import Link from "next/link";
import { redirect } from "next/navigation";
import { BUSINESS_PROFILE_FIELDS, MILESTONES } from "@/content";
import { getPlanContext } from "@/lib/plan-context";
import { ASSET_LABEL } from "@/lib/assets";
import { FIELD_LABEL, formatCanonicalValue } from "@/lib/canonical";
import { getLogoSignedUrl } from "@/lib/storage";
import { PrintButton } from "@/components/print-button";
import { CopyButton } from "@/components/copy-button";

// §6 step 11 — completion. The designed Presence Summary (paid artifact), print/download, referral ask.
// No service offer here (§15.3). No Monitor/subscription mention anywhere (§3).

export default async function LaunchedPage() {
  const ctx = await getPlanContext();
  if (ctx.entitlement !== "launch") redirect("/unlock?from=/launched");
  if (ctx.business.stage !== "launched") redirect("/home");
  const p = ctx.profile as unknown as Record<string, unknown>;
  const logo = await getLogoSignedUrl(ctx.profile.logoUrl);
  const summaryFields = BUSINESS_PROFILE_FIELDS.filter(
    (f) => !["logoUrl", "brandColors", "pageTitle", "metaDescription", "longDescription", "pricingApproach", "idealCustomer", "differentiators", "timezone", "legalName"].includes(f) && !(f === "streetAddress" && ctx.profile.hideAddress),
  );
  const marketing = process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://gobeefound.com";
  const referral = `${marketing}/launch`;

  return (
    <div className="space-y-7">
      <header className="no-print">
        <p className="text-xs font-semibold uppercase tracking-wide text-honey-600">Launched</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{ctx.profile.displayName} is established online.</h1>
        <p className="mt-2 text-[15px] text-ink-700">
          You did {ctx.progress.completedRequired} steps, set up {ctx.assets.length} online {ctx.assets.length === 1 ? "place" : "places"} where customers can find you, and confirmed every detail. That's the whole job.
        </p>
        <ol className="mt-4 flex flex-wrap gap-2">
          {MILESTONES.map((m) => <li key={m.id} className="rounded-full bg-good-500/10 px-3 py-1.5 text-sm text-good-500">✓ {m.label}</li>)}
        </ol>
      </header>

      <div className="no-print flex flex-wrap gap-3">
        <PrintButton label="Print your summary" event="presence_summary_downloaded" />
        <a href="/your-business/export/json" className="tap inline-flex h-12 items-center rounded-xl border border-ink-300 bg-white px-5 font-semibold">Download everything</a>
      </div>

      {/* PRESENCE SUMMARY — designed, one page, prints clean */}
      <section className="presence-summary rounded-[var(--radius-card)] border border-ink-100 bg-white p-6 print:border-0 print:p-0">
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{ctx.profile.displayName}</h2>
            <p className="text-ink-500">{ctx.business.city}, {ctx.business.state}</p>
          </div>
          {logo && <img src={logo} alt="" className="h-14 w-14 rounded-lg object-contain" />}
        </div>
        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-500">Your business</h3>
        <dl className="divide-y divide-ink-100">
          {summaryFields.map((f) => {
            const v = formatCanonicalValue(f, p[f]);
            if (!v) return null;
            return (
              <div key={f} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2 text-[15px]">
                <dt className="text-ink-500">{FIELD_LABEL[f]}</dt>
                <dd className="whitespace-pre-wrap break-words">{v}</dd>
              </div>
            );
          })}
          {ctx.profile.hideAddress && <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2 text-[15px]"><dt className="text-ink-500">Address</dt><dd className="text-ink-500">Not shown publicly</dd></div>}
        </dl>
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-500">Where you are online</h3>
        <dl className="divide-y divide-ink-100">
          {ctx.assets.map((a) => (
            <div key={a.id} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2 text-[15px]">
              <dt className="text-ink-500">{a.label ?? ASSET_LABEL[a.type]}</dt>
              <dd className="break-all">{a.url}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-xs text-ink-500">Confirmed {ctx.business.launchedAt?.toLocaleDateString("en-US", { dateStyle: "long" })} · gobeefound.com</p>
      </section>

      {/* REFERRAL — at peak satisfaction, worth more than a sales pitch (§15.3) */}
      <section className="no-print rounded-2xl border border-honey-100 bg-honey-50 p-5">
        <h2 className="text-[15px] font-semibold">Know someone else just starting out?</h2>
        <p className="mt-1 text-sm text-ink-700">Send them the same plan. It's free to start.</p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-white px-3 py-2.5 text-sm">{referral}</code>
          <CopyButton value={referral} label="Copy link" event={{ name: "referral_link_copied" }} />
        </div>
      </section>

      <p className="no-print text-center text-sm">
        <Link href="/home" className="tap inline-flex items-center text-ink-500 underline">Back to home</Link>
      </p>
      <style>{`@media print { body * { visibility: hidden; } .presence-summary, .presence-summary * { visibility: visible; } .presence-summary { position: fixed; inset: 0; margin: 2rem; } }`}</style>
    </div>
  );
}
