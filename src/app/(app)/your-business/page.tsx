import Link from "next/link";
import { FIELD_SOURCE_TASK, TRACKED_FIELDS, type BusinessProfileField } from "@/content";
import { getPlanContext } from "@/lib/plan-context";
import { db } from "@/lib/db";
import { FIELD_LABEL, FIELD_USAGE_NOTE, formatCanonicalValue } from "@/lib/canonical";
import { getLogoSignedUrl } from "@/lib/storage";
import { InlineField } from "@/components/your-business/inline-field";
import { LogoUpload } from "@/components/your-business/logo-upload";
import { CopyButton } from "@/components/copy-button";
import { ServiceOffer } from "@/components/service-offer";
import { Button } from "@/components/ui/button";
import { reconfirmAll } from "./actions";

// §12.1 — Your Business. One copy of every fact; inline edit; freshness on tracked fields;
// address display follows hideAddress; the single logo upload; quiet offer in the footer.

type Kind = "text" | "textarea" | "list" | "structured";

const SECTIONS: { title: string; fields: { key: BusinessProfileField; kind: Kind }[] }[] = [
  { title: "Identity", fields: [
    { key: "displayName", kind: "text" }, { key: "legalName", kind: "text" }, { key: "phone", kind: "text" }, { key: "email", kind: "text" },
    { key: "streetAddress", kind: "structured" }, { key: "serviceAreas", kind: "list" }, { key: "hours", kind: "structured" }, { key: "timezone", kind: "structured" },
  ]},
  { title: "What you do", fields: [
    { key: "services", kind: "structured" }, { key: "pricingApproach", kind: "text" }, { key: "idealCustomer", kind: "textarea" }, { key: "differentiators", kind: "list" },
  ]},
  { title: "Brand", fields: [
    { key: "logoUrl", kind: "structured" }, { key: "brandColors", kind: "structured" }, { key: "shortDescription", kind: "textarea" }, { key: "gbpDescription", kind: "textarea" }, { key: "longDescription", kind: "textarea" },
  ]},
  { title: "Web", fields: [{ key: "domain", kind: "text" }, { key: "pageTitle", kind: "text" }, { key: "metaDescription", kind: "textarea" }] },
  { title: "Reviews", fields: [{ key: "reviewLink", kind: "text" }] },
  { title: "How you work", fields: [{ key: "preferredContact", kind: "structured" }, { key: "responseCommitment", kind: "text" }] },
];

function rel(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function YourBusinessPage() {
  const ctx = await getPlanContext();
  const { business, profile } = ctx;
  const [provenance, logoUrl] = await Promise.all([
    db.fieldProvenance.findMany({ where: { businessId: business.id } }),
    getLogoSignedUrl(profile.logoUrl),
  ]);
  const prov = new Map(provenance.map((p) => [p.fieldKey, p]));
  const p = profile as unknown as Record<string, unknown>;
  const tracked = new Set<string>(TRACKED_FIELDS);
  const canReconfirm = business.stage === "launched";

  const freshnessFor = (key: string): string | undefined => {
    if (!tracked.has(key)) return undefined;
    if (key === "streetAddress" && profile.hideAddress) return undefined;
    const row = prov.get(key);
    if (!row) return undefined;
    if (row.lastConfirmedAt) return `You set this ${rel(row.setAt)} · confirmed ${rel(row.lastConfirmedAt)}`;
    if (business.stage === "launched") return "Changed since you confirmed";
    return `You set this ${rel(row.setAt)}`;
  };

  const taskLink = (key: string) => {
    const t = FIELD_SOURCE_TASK[key];
    return t ? <Link href={`/t/${t}`} className="underline">add it</Link> : null;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Your Business</h1>
        <p className="mt-1 text-ink-500">Everything GoBeeFound knows about your business, in one place.</p>
      </header>

      {canReconfirm && (
        <form action={reconfirmAll} className="flex items-center justify-between gap-3 rounded-2xl border border-honey-100 bg-honey-50 p-4">
          <p className="text-sm text-ink-700">Everything still right?</p>
          <Button type="submit" variant="secondary">Confirm this is all still right</Button>
        </form>
      )}

      {SECTIONS.map((s) => (
        <section key={s.title} aria-labelledby={`sec-${s.title}`} className="rounded-2xl border border-ink-100 bg-white px-4">
          <h2 id={`sec-${s.title}`} className="pt-4 text-xs font-semibold uppercase tracking-wide text-ink-500">{s.title}</h2>
          <div className="divide-y divide-ink-100">
            {s.fields.map(({ key, kind }) => {
              // §12.1 — address display follows hideAddress.
              if (key === "streetAddress") {
                const value = formatCanonicalValue("streetAddress", p.streetAddress);
                return (
                  <div key={key} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-ink-500">Address</div>
                      {profile.hideAddress ? (
                        <p className="mt-0.5 text-[15px]">Not shown publicly (service-area business) · <Link href="/t/4.3" className="text-sm underline">change</Link></p>
                      ) : value ? (
                        <p className="mt-0.5 text-[15px] font-medium">{value} · <Link href="/t/4.3" className="text-sm underline">edit</Link></p>
                      ) : (
                        <p className="mt-0.5 text-sm text-ink-500">Not set yet — <Link href="/t/4.3" className="underline">add it</Link></p>
                      )}
                      {!profile.hideAddress && freshnessFor(key) && <p className="mt-1 text-xs text-ink-500">{freshnessFor(key)}</p>}
                      {!profile.hideAddress && <p className="mt-0.5 text-xs text-ink-500">{FIELD_USAGE_NOTE.streetAddress}</p>}
                    </div>
                    {!profile.hideAddress && value && <CopyButton value={value} />}
                  </div>
                );
              }
              if (key === "logoUrl") return <LogoUpload key={key} signedUrl={logoUrl} />;

              const display = formatCanonicalValue(key, p[key]);
              if (kind === "structured") {
                const t = FIELD_SOURCE_TASK[key];
                return (
                  <div key={key} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-ink-500">{FIELD_LABEL[key]}</div>
                      {display ? (
                        <p className="mt-0.5 text-[15px] font-medium">{display} {t && <Link href={`/t/${t}`} className="ml-1 text-sm font-normal underline">edit</Link>}</p>
                      ) : (
                        <p className="mt-0.5 text-sm text-ink-500">Not set yet{t && <> — <Link href={`/t/${t}`} className="underline">add it</Link></>}</p>
                      )}
                      {freshnessFor(key) && <p className="mt-1 text-xs text-ink-500">{freshnessFor(key)}</p>}
                      {FIELD_USAGE_NOTE[key] && <p className="mt-0.5 text-xs text-ink-500">{FIELD_USAGE_NOTE[key]}</p>}
                    </div>
                    {display && <CopyButton value={display} />}
                  </div>
                );
              }
              const raw = p[key];
              const editable = kind === "list" && Array.isArray(raw) ? (raw as string[]).join("\n") : typeof raw === "string" ? raw : "";
              return (
                <InlineField
                  key={key}
                  field={key}
                  label={FIELD_LABEL[key]}
                  value={editable}
                  display={display}
                  kind={kind}
                  usageNote={FIELD_USAGE_NOTE[key]}
                  freshness={freshnessFor(key)}
                  emptyHint={taskLink(key)}
                />
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <Link href="/your-business/assets" className="tap inline-flex items-center font-medium underline">Your online assets</Link>
        <Link href="/your-business/export" className="tap inline-flex items-center font-medium underline">Export everything</Link>
      </div>

      <ServiceOffer placement="your_business_footer" businessId={business.id} />
    </div>
  );
}
