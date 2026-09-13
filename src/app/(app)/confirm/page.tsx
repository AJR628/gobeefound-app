import Link from "next/link";
import { redirect } from "next/navigation";
import { CONFIRM_STEP, FIELD_SOURCE_TASK, TRACKED_FIELDS, type BusinessProfileField } from "@/content";
import { getPlanContext } from "@/lib/plan-context";
import { getConfirmationBlockers } from "@/lib/confirmation";
import { ASSET_LABEL } from "@/lib/assets";
import { FIELD_LABEL, formatCanonicalValue } from "@/lib/canonical";
import { Button } from "@/components/ui/button";
import { confirmBaseline } from "./actions";

// §12.3 — the confirmation baseline. Unreachable until every required module task is complete.

export default async function ConfirmPage() {
  const ctx = await getPlanContext();
  if (ctx.entitlement !== "launch") redirect("/unlock?from=/confirm");
  if (ctx.business.stage === "launched") redirect("/launched");
  if (!ctx.progress.allRequiredComplete) redirect("/home");

  const blockers = getConfirmationBlockers(ctx.profile, ctx.plan);
  const p = ctx.profile as unknown as Record<string, unknown>;

  const identity: BusinessProfileField[] = ["displayName", "phone", "email", "streetAddress", "hours", "serviceAreas"];
  const what: BusinessProfileField[] = ["services", "gbpDescription", "shortDescription", "longDescription"];
  const show = (f: BusinessProfileField) => {
    if (f === "streetAddress") return true; // always shown; rendered as "not shown publicly" when hidden
    if (f === "shortDescription" && !ctx.plan.tasks.find((t) => t.taskId === "6.2")?.isRequired && !p.shortDescription) return false;
    return TRACKED_FIELDS.includes(f) || f === "services" || f === "longDescription";
  };

  const Row = ({ f }: { f: BusinessProfileField }) => {
    const value = f === "streetAddress" && ctx.profile.hideAddress ? "Not shown publicly" : formatCanonicalValue(f, p[f]);
    const task = FIELD_SOURCE_TASK[f];
    const missing = blockers.some((b) => b.fieldKey === f);
    return (
      <div className={`grid grid-cols-[7.5rem_1fr_auto] items-start gap-3 py-2.5 text-[15px] ${missing ? "text-danger-500" : ""}`}>
        <dt className="text-ink-500">{FIELD_LABEL[f]}</dt>
        <dd className={value ? "break-words" : "text-ink-500"}>{value || "Not set"}</dd>
        <dd>{task && <Link href={`/t/${task}`} className="text-sm underline">{missing ? "add" : "edit"}</Link>}</dd>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{CONFIRM_STEP.title}</h1>
        <p className="mt-1 text-[15px] text-ink-700">{CONFIRM_STEP.intro}</p>
      </header>

      {blockers.length > 0 && (
        <div className="rounded-2xl border border-danger-500/30 bg-danger-500/5 p-4">
          <p className="text-[15px] font-medium text-danger-500">A few things are still empty:</p>
          <ul className="mt-2 space-y-1 text-[15px]">
            {blockers.map((b) => (
              <li key={b.fieldKey}>• {FIELD_LABEL[b.fieldKey]} — <Link href={`/t/${b.taskId}`} className="underline">add it</Link></li>
            ))}
          </ul>
        </div>
      )}

      <section className="rounded-2xl border border-ink-100 bg-white px-4 py-2">
        <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Your business</h2>
        <dl className="divide-y divide-ink-100">{identity.filter(show).map((f) => <Row key={f} f={f} />)}</dl>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white px-4 py-2">
        <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink-500">What you do</h2>
        <dl className="divide-y divide-ink-100">{what.filter(show).map((f) => <Row key={f} f={f} />)}</dl>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white px-4 py-2">
        <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Where you are online</h2>
        <dl className="divide-y divide-ink-100">
          {ctx.assets.length === 0 && <p className="py-2.5 text-sm text-ink-500">No links saved yet. <Link href="/your-business/assets" className="underline">Add them</Link></p>}
          {ctx.assets.map((a) => (
            <div key={a.id} className="grid grid-cols-[7.5rem_1fr_auto] items-start gap-3 py-2.5 text-[15px]">
              <dt className="text-ink-500">{a.label ?? ASSET_LABEL[a.type]}</dt>
              <dd className="break-all"><a href={a.url} target="_blank" rel="noopener noreferrer" className="underline">{a.url.replace(/^https?:\/\//, "")}</a></dd>
              <dd><Link href="/your-business/assets" className="text-sm underline">edit</Link></dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-sm text-ink-700">{CONFIRM_STEP.whyItMatters}</p>

      <form action={confirmBaseline}>
        <Button type="submit" fullWidth size="lg" disabled={blockers.length > 0}>{CONFIRM_STEP.confirmLabel}</Button>
      </form>
      <p className="text-center text-sm">
        <Link href="/your-business" className="tap inline-flex items-center text-ink-500 underline">{CONFIRM_STEP.somethingWrongLabel} →</Link>
      </p>
    </div>
  );
}
