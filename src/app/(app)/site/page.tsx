import Link from "next/link";
import { getPlanContext } from "@/lib/plan-context";
import { readAllowance } from "@/lib/ai/allowance";
import { allowanceView } from "@/lib/generators";
import { getOrCreateDraft, latestVersion } from "@/lib/site/draft";
import { derivePublicFacts, knownFactRows } from "@/lib/site/facts";
import { visibleSections } from "@/lib/site/spec";
import { getSignedUrl } from "@/lib/storage";
import { ServiceOffer } from "@/components/service-offer";
import { track } from "@/lib/analytics/server";
import { SetupWizard } from "./setup-wizard";
import { BuildButton } from "./build-button";
import { PreviewFrame } from "./preview-frame";
import { SiteEditor } from "./editor";

// V4 §D — the website builder. Journey on one screen, in order:
// what we know → two doors (build it / have us do it) → guided setup → Build → live preview → edit → approve.
// Hosting is never mentioned before approval.

export default async function SitePage() {
  const ctx = await getPlanContext();
  if (ctx.entitlement !== "launch") {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight">Your website</h1>
        <div className="rounded-2xl border border-ink-900 bg-white p-5 text-center">
          <p className="font-medium">The website builder is part of Launch.</p>
          <Link href="/unlock?from=%2Fsite" className="tap mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-ink-900 font-semibold text-white">Unlock Launch</Link>
        </div>
      </div>
    );
  }

  const [draft, allowance, version] = await Promise.all([getOrCreateDraft(ctx.business.id, ctx.profile), readAllowance(ctx.business.id), latestVersion(ctx.business.id)]);
  const facts = derivePublicFacts(ctx.business, ctx.profile, draft.setup);
  const rows = knownFactRows(facts);
  const services = Array.isArray(ctx.profile.services) ? (ctx.profile.services as { name: string }[]).map((s) => s.name) : [];
  const [logoUrl, heroUrl] = await Promise.all([getSignedUrl(ctx.profile.logoUrl), getSignedUrl(draft.setup.heroPhotoPath)]);
  const missing = rows.filter((r) => !r.present && ["Services", "Service area"].includes(r.label));
  const built = Boolean(draft.copy);
  await track(ctx.user.id, "builder_opened");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Your website</h1>
        <p className="mt-1 text-[15px] text-ink-700">{built ? "Read it, change it, approve it. Everything by hand is free." : "It starts from what you've already told us. A few taps, then we build it."}</p>
        {version && <p className="mt-1 text-xs text-good-500">Approved version {version.versionNumber} · <Link href="/site/publish" className="underline">choose how to host it</Link></p>}
      </header>

      <section className="rounded-2xl border border-ink-100 bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">What we already know</h2>
        <p className="mt-1 text-sm text-ink-700">Everything below goes on your site. We won't ask you for any of it again.</p>
        <ul className="mt-3 divide-y divide-ink-100">
          {rows.map((r) => (
            <li key={r.label} className="flex items-start justify-between gap-3 py-2 text-[15px]">
              <span className="text-ink-500">{r.label}</span>
              <span className={`text-right ${r.present ? "" : "text-ink-500"}`}>{r.present ? r.value : "Not yet"}</span>
            </li>
          ))}
        </ul>
        <Link href="/your-business" className="tap mt-3 inline-flex h-11 items-center text-sm underline">Fix anything in Your Business →</Link>
      </section>

      {missing.length > 0 && (
        <div className="rounded-2xl border border-honey-100 bg-honey-50 p-4">
          <p className="text-[15px] font-medium">A couple of details first.</p>
          <p className="mt-1 text-sm text-ink-700">The builder won't invent facts. Add your {missing.map((m) => m.label.toLowerCase()).join(" and ")} in Your Business, then come back.</p>
        </div>
      )}

      {!built && (
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-ink-900 bg-white p-4">
            <h2 className="text-lg font-bold">Build it with GoBeeFound</h2>
            <p className="mt-1 text-sm text-ink-700">Pick a look, tap Build, read it, approve it. Included with Launch. About 20 minutes of your time.</p>
            <a href="#setup" className="tap mt-3 inline-flex h-11 items-center font-semibold underline">Start below ↓</a>
          </div>
          <ServiceOffer placement="builder_entry" businessId={ctx.business.id} />
        </section>
      )}

      {built && draft.copy && (
        <section className="space-y-4">
          <PreviewFrame src="/site-preview" reloadKey={draft.copy.hero.headline.length + JSON.stringify(draft.setup).length} />
          <SiteEditor copy={draft.copy} approved={draft.approved} visible={visibleSections(draft.setup, facts).filter((s) => s !== "footer" || true)} editsAllowance={allowanceView("edits", allowance)} />
          <div className="rounded-2xl border border-ink-900 bg-white p-4">
            <h2 className="text-lg font-bold">Happy with it?</h2>
            <p className="mt-1 text-sm text-ink-700">Next you'll confirm every public detail — phone, email, hours, areas — and approve. Then you choose how to host it.</p>
            <Link href="/site/review" className="tap mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-ink-900 font-semibold text-white">Review & approve</Link>
          </div>
        </section>
      )}

      <section id="setup" className="space-y-3">
        <h2 className="text-lg font-bold">{built ? "Change the look" : "Choose the look"}</h2>
        <SetupWizard
          setup={draft.setup}
          serviceNames={services}
          hasLogo={Boolean(ctx.profile.logoUrl)}
          hasBrandColors={Boolean(facts.brandColors)}
          hasPhone={Boolean(facts.phone)}
          hasEmail={Boolean(facts.email)}
          hasHours={Boolean(facts.hours)}
          hasAddress={!ctx.profile.hideAddress && Boolean(ctx.profile.streetAddress)}
          hasReviewLink={Boolean(ctx.profile.reviewLink)}
          logoUrl={logoUrl}
          heroUrl={heroUrl}
          logoAllowance={allowanceView("logos", allowance)}
          compact={built}
        />
        {missing.length === 0 && <BuildButton allowance={allowanceView("builds", allowance)} rebuild={built} />}
      </section>
    </div>
  );
}
