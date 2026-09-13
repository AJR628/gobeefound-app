import Link from "next/link";
import { CONFIRM_STEP, MODULE_BY_ID } from "@/content";
import { getPlanContext } from "@/lib/plan-context";
import { planTasksForModule } from "@/lib/plan";
import { ServiceOffer } from "@/components/service-offer";
import { Card, SectionLabel } from "@/components/ui/card";
import { MaintenanceList } from "./maintenance";

// §9 — /home is a next-action screen with progress context beneath it. Not a dashboard.
// Launching state: Next Step card → progress + milestones → module cards → tools → one offer.
// Launched state: maintenance list; percentage, milestones, and Next Step hidden (§9.3).

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function HomePage() {
  const ctx = await getPlanContext();
  const { business, profile, plan, progress, milestones, nextStep, entitlement } = ctx;
  const firstName = profile.displayName.split(" ")[0];
  const byId = new Map(ctx.states.map((s) => [s.taskId, s]));
  const websiteDone = planTasksForModule(plan, "website").filter((t) => t.isRequired).every((t) => ["complete", "skipped"].includes(byId.get(t.taskId)?.status ?? ""));
  const daysSince = Math.floor((Date.now() - business.createdAt.getTime()) / 86_400_000);
  const lastSeenGap = Math.floor((Date.now() - ctx.user.lastSeenAt.getTime()) / 86_400_000);

  if (business.stage === "launched") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{greeting()}, {firstName}.</h1>
        <MaintenanceList businessId={business.id} states={ctx.taskStateRows} />
        <Card>
          <SectionLabel>Your plan — complete</SectionLabel>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/launched" className="tap inline-flex items-center font-medium underline">Presence Summary</Link>
            <Link href="/plan" className="tap inline-flex items-center font-medium underline">See your plan</Link>
            <Link href="/your-business" className="tap inline-flex items-center font-medium underline">Your Business</Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        {lastSeenGap >= 7 && daysSince > 7 && <p className="mb-1 text-sm text-ink-500">Welcome back. Picking up where you left off.</p>}
        <h1 className="text-2xl font-bold tracking-tight">{greeting()}, {firstName}.</h1>
      </div>

      {/* NEXT STEP — the most prominent element by a wide margin (§9.2) */}
      {nextStep.kind === "task" ? (
        <section aria-labelledby="next-step" className="rounded-[var(--radius-card)] border-2 border-ink-900 bg-white p-5">
          <h2 id="next-step" className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Next step</h2>
          <h3 className="text-xl font-bold leading-snug">
            {nextStep.task.isVerifyVariant ? nextStep.task.definition.verifyVariant!.title : nextStep.task.definition.title}
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{nextStep.task.definition.whyItMatters}</p>
          <p className="mt-3 text-sm text-ink-500">{nextStep.task.definition.timeEstimate}</p>
          <Link href={`/t/${nextStep.task.taskId}`} className="tap mt-4 flex h-13 w-full items-center justify-center rounded-xl bg-ink-900 text-base font-semibold text-white">
            Start this step →
          </Link>
        </section>
      ) : nextStep.kind === "confirm" ? (
        <section aria-labelledby="next-step" className="rounded-[var(--radius-card)] border-2 border-honey-400 bg-honey-50 p-5">
          <h2 id="next-step" className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Final step</h2>
          <h3 className="text-xl font-bold leading-snug">{CONFIRM_STEP.title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{CONFIRM_STEP.whyItMatters}</p>
          <p className="mt-3 text-sm text-ink-500">{CONFIRM_STEP.timeEstimate}</p>
          <Link href="/confirm" className="tap mt-4 flex h-13 w-full items-center justify-center rounded-xl bg-ink-900 text-base font-semibold text-white">
            Review and confirm →
          </Link>
        </section>
      ) : null}

      {/* PROGRESS — one bar, one count, five milestones */}
      <section aria-labelledby="progress">
        <SectionLabel id="progress">Your progress</SectionLabel>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={progress.percentage} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-honey-400 transition-[width]" style={{ width: `${progress.percentage}%` }} />
        </div>
        <p className="mt-2 text-sm text-ink-700">
          <strong>{progress.percentage}%</strong> · {progress.completedRequired} of {progress.denominator} steps done
        </p>
        <ol className="mt-3 space-y-1.5">
          {milestones.map((m, i) => {
            const isHere = !m.reached && milestones.slice(0, i).every((x) => x.reached);
            return (
              <li key={m.milestone.id} className="flex items-center gap-2 text-[15px]">
                <span aria-hidden className={m.reached ? "text-good-500" : "text-ink-300"}>{m.reached ? "✓" : "○"}</span>
                <span className={m.reached ? "text-ink-700" : isHere ? "font-medium" : "text-ink-500"}>{m.milestone.label}</span>
                {isHere && <span className="text-xs text-ink-500">← you're here</span>}
              </li>
            );
          })}
        </ol>
      </section>

      {/* MODULE CARDS — locked cards show real counts (§9.2) */}
      <section aria-labelledby="plan">
        <SectionLabel id="plan">Your plan</SectionLabel>
        <ul className="grid grid-cols-2 gap-3">
          {plan.moduleOrder.map((moduleId) => {
            const mod = MODULE_BY_ID[moduleId];
            const tasks = planTasksForModule(plan, moduleId).filter((t) => t.isRequired);
            const done = tasks.filter((t) => byId.get(t.taskId)?.status === "complete").length;
            const total = tasks.filter((t) => byId.get(t.taskId)?.status !== "skipped").length;
            const locked = !mod.isFree && entitlement !== "launch";
            const state = total === 0 ? "optional" : done === total ? "done" : done > 0 ? "active" : "todo";
            const glyph = locked ? "🔒" : state === "done" ? "✓" : state === "active" ? "●" : "○";
            return (
              <li key={moduleId}>
                <Link href={`/m/${moduleId}`} className="tap flex min-h-24 flex-col justify-between rounded-[var(--radius-card)] border border-ink-100 bg-white p-4 hover:border-ink-300">
                  <span className="flex items-start gap-2 text-[15px] font-semibold leading-snug">
                    <span aria-hidden className={state === "done" ? "text-good-500" : "text-ink-500"}>{glyph}</span>
                    {mod.name}
                  </span>
                  {state === "optional" ? (
                    <span className="text-xs text-ink-500">optional</span>
                  ) : (
                    <span className="mt-2">
                      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-ink-100"><span className="block h-full rounded-full bg-honey-400" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></span>
                      <span className="mt-1 block text-xs text-ink-500">{done}/{total}{state === "done" ? " · Done" : ""}</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          {progress.allRequiredComplete && (
            <li>
              <Link href="/confirm" className="tap flex min-h-24 flex-col justify-between rounded-[var(--radius-card)] border border-honey-400 bg-honey-50 p-4">
                <span className="text-[15px] font-semibold leading-snug">Confirm & finish</span>
                <span className="text-xs text-ink-500">Final step</span>
              </Link>
            </li>
          )}
        </ul>
      </section>

      {/* TOOLS — three buttons; locked tools show a lock rather than disappearing */}
      <section aria-labelledby="tools">
        <SectionLabel id="tools">Your tools</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/tools/website-copy", label: "Website copy" },
            { href: "/tools/descriptions", label: "Descriptions" },
            { href: "/tools/review-requests", label: "Review requests" },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="tap inline-flex h-11 items-center gap-1.5 rounded-xl border border-ink-300 bg-white px-4 text-sm font-medium hover:border-ink-900">
              {entitlement !== "launch" && <span aria-hidden>🔒</span>} {t.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ONE service offer, at the bottom, only while the website module is incomplete (§9.2) */}
      {!websiteDone && <ServiceOffer placement="home_footer" businessId={business.id} />}
    </div>
  );
}
