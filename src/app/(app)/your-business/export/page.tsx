import Link from "next/link";
import { BUSINESS_PROFILE_FIELDS } from "@/content";
import { getPlanContext } from "@/lib/plan-context";
import { ASSET_LABEL } from "@/lib/assets";
import { FIELD_LABEL, formatCanonicalValue } from "@/lib/canonical";
import { PrintButton } from "@/components/print-button";

// §20.5 — the free print view: every fact and URL, legible, prints to PDF from any browser.
// The designed Presence Summary at /launched is the paid artifact; this is the plain one.

export default async function ExportPage() {
  const ctx = await getPlanContext();
  const p = ctx.profile as unknown as Record<string, unknown>;
  const rows = BUSINESS_PROFILE_FIELDS
    .filter((f) => f !== "logoUrl" && !(f === "streetAddress" && ctx.profile.hideAddress))
    .map((f) => ({ label: FIELD_LABEL[f], value: formatCanonicalValue(f, p[f]) }))
    .filter((r) => r.value);

  return (
    <div className="space-y-6">
      <nav className="no-print text-sm text-ink-500"><Link href="/your-business" className="tap inline-flex items-center underline">← Your Business</Link></nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Export your business data</h1>
        <p className="mt-1 text-[15px] text-ink-700">Everything you've entered is yours — free, forever, even after a refund.</p>
      </header>

      <div className="no-print flex flex-wrap gap-3">
        <a href="/your-business/export/json" className="tap inline-flex h-12 items-center rounded-xl bg-ink-900 px-5 font-semibold text-white">Download JSON</a>
        <PrintButton />
      </div>

      <section className="rounded-2xl border border-ink-100 bg-white p-5 print:border-0 print:p-0">
        <h2 className="text-lg font-bold">{ctx.profile.displayName}</h2>
        <p className="text-sm text-ink-500">{ctx.business.city}, {ctx.business.state} · exported {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}</p>
        <dl className="mt-4 divide-y divide-ink-100">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[9rem_1fr] gap-3 py-2 text-[15px]">
              <dt className="text-ink-500">{r.label}</dt>
              <dd className="whitespace-pre-wrap break-words">{r.value}</dd>
            </div>
          ))}
          {ctx.profile.hideAddress && (
            <div className="grid grid-cols-[9rem_1fr] gap-3 py-2 text-[15px]"><dt className="text-ink-500">Address</dt><dd>Not shown publicly</dd></div>
          )}
        </dl>
        {ctx.assets.length > 0 && (
          <>
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink-500">Online</h3>
            <dl className="divide-y divide-ink-100">
              {ctx.assets.map((a) => (
                <div key={a.id} className="grid grid-cols-[9rem_1fr] gap-3 py-2 text-[15px]">
                  <dt className="text-ink-500">{a.label ?? ASSET_LABEL[a.type]}</dt>
                  <dd className="break-all">{a.url}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>
    </div>
  );
}
