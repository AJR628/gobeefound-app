import { ARCHETYPE_BY_ID, MILESTONES, MODULE_BY_ID } from "@/content";
import { requireBusiness } from "@/lib/current-user";
import { computePlan, planTasksForModule } from "@/lib/plan";
import { Card, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markPlanSeen } from "../onboarding/actions";

// §6 step 5 — the plan reveal. Every module, every task TITLE, counts, ordering, milestones.
// Verify variants are "adapted" steps and are never described with the word s-k-i-p-p-e-d (§10.6, §21.11).

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ delta?: string }> }) {
  const { delta } = await searchParams;
  const { business, profile, onboarding } = await requireBusiness();
  const plan = computePlan({ trade: business.trade, serviceAreaType: business.serviceAreaType, answers: onboarding });
  const archetype = ARCHETYPE_BY_ID[business.trade];
  const firstName = profile.displayName.split(" ")[0];
  const deltaNum = delta ? Number.parseInt(delta, 10) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Here's your launch plan{firstName ? `, ${firstName}` : ""}.</h1>
        <p className="mt-2 text-[15px] text-ink-700">
          <strong>{plan.requiredTotal} steps</strong>, built for a {archetype.tradeNoun} in {business.city}.
          {plan.adaptedCount > 0 && (
            <>
              {" "}
              We adapted <strong>{plan.adaptedCount} {plan.adaptedCount === 1 ? "step" : "steps"}</strong> because you've already started{" "}
              {plan.adaptedCount === 1 ? "it" : "them"}.
            </>
          )}
        </p>
        {Number.isFinite(deltaNum) && deltaNum !== 0 && (
          <p className="mt-2 rounded-lg bg-honey-50 px-3 py-2 text-sm text-ink-700">
            Your plan now {deltaNum > 0 ? "includes" : "has"} {Math.abs(deltaNum)} {deltaNum > 0 ? "new" : "fewer"} {Math.abs(deltaNum) === 1 ? "step" : "steps"}. Nothing you've completed was lost.
          </p>
        )}
      </div>

      <form action={markPlanSeen}>
        <Button type="submit" fullWidth size="lg">
          Start your plan
        </Button>
      </form>

      <div>
        <SectionLabel>The path</SectionLabel>
        <ol className="flex flex-wrap gap-2">
          {MILESTONES.map((m, i) => (
            <li key={m.id} className="rounded-full border border-ink-300 bg-white px-3 py-1.5 text-sm">
              <span className="mr-1.5 text-ink-500">{i + 1}</span>
              {m.label}
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-3">
        <SectionLabel>Your plan</SectionLabel>
        {plan.moduleOrder.map((moduleId) => {
          const mod = MODULE_BY_ID[moduleId];
          const tasks = planTasksForModule(plan, moduleId);
          const required = tasks.filter((t) => t.isRequired);
          const optional = tasks.filter((t) => !t.isRequired);
          return (
            <Card key={moduleId}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-base font-bold">{mod.name}</h2>
                <span className="text-xs text-ink-500">
                  {required.length > 0 ? `${required.length} required` : "optional"}
                  {mod.isFree ? " · free" : ""}
                </span>
              </div>
              <p className="mb-3 text-sm text-ink-500">{mod.objective}</p>
              <ul className="space-y-1.5">
                {required.map((t) => (
                  <li key={t.taskId} className="flex items-start gap-2 text-[15px]">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-900" />
                    <span>
                      {t.isVerifyVariant ? t.definition.verifyVariant!.title : t.definition.title}
                      {t.isVerifyVariant && <span className="ml-2 rounded bg-honey-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-700">adapted</span>}
                    </span>
                  </li>
                ))}
                {optional.length > 0 && (
                  <li className="pt-1 text-sm text-ink-500">
                    + {optional.length} optional: {optional.map((t) => t.definition.title).join(" · ")}
                  </li>
                )}
              </ul>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-sm text-ink-500">
        Module 1 and Your Business are free. Everything else unlocks with Launch — no card needed until then.
      </p>
    </div>
  );
}
