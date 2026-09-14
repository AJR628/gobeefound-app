import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlanContext } from "@/lib/plan-context";
import { getOrCreateDraft } from "@/lib/site/draft";
import { derivePublicFacts } from "@/lib/site/facts";
import { ReviewForm } from "./review-form";

// V4 §D — the approval gate. Every public fact, one by one, confirmed by the owner before a SiteVersion
// exists. This is the honesty guarantee and where the publish-time claims re-scan surfaces.

export default async function ReviewPage() {
  const ctx = await getPlanContext();
  if (ctx.entitlement !== "launch") redirect("/site");
  const draft = await getOrCreateDraft(ctx.business.id, ctx.profile);
  if (!draft.copy) redirect("/site");
  const facts = derivePublicFacts(ctx.business, ctx.profile, draft.setup);

  const items: { label: string; value: string; fixHref: string }[] = [
    { label: "Business name", value: facts.businessName, fixHref: "/your-business" },
    { label: "Phone", value: facts.phone ?? "Not shown", fixHref: "/t/1.4" },
    { label: "Email", value: facts.email ?? "Not shown", fixHref: "/t/2.3" },
    { label: "Address", value: facts.address ?? "Hidden", fixHref: "/t/4.3" },
    { label: "Service area", value: facts.serviceAreas.join(", ") || "Not shown", fixHref: "/t/1.2" },
    { label: "Services", value: facts.services.map((s) => s.name).join(", "), fixHref: "/t/1.3" },
    { label: "Hours", value: draft.setup.sections.hours ? facts.hours ?? "Not shown" : "Not shown", fixHref: "/t/1.5" },
    { label: "Google reviews link", value: facts.reviewLink ?? "Not shown", fixHref: "/t/5.1" },
    { label: "Visitors will", value: draft.setup.primaryAction === "call" ? "Call you" : draft.setup.primaryAction === "text" ? "Text you" : `Send a message to ${facts.email ?? "(no email yet)"}`, fixHref: "/site#setup" },
  ];

  return (
    <div className="space-y-5">
      <nav className="text-sm text-ink-500"><Link href="/site" className="tap inline-flex items-center underline">← Your website</Link></nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Check every detail</h1>
        <p className="mt-1 text-[15px] text-ink-700">These are the facts that will be public. Tick each one to confirm it's right. Anything wrong — fix it first; it updates everywhere.</p>
      </header>
      <ReviewForm items={items} needsEmailConfirm={draft.setup.primaryAction === "form"} email={facts.email} />
    </div>
  );
}
