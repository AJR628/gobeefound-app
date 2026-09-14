import Link from "next/link";
import { notFound } from "next/navigation";
import { MODULE_BY_ID, TASK_BY_ID, TOOL_ROUTES } from "@/content";
import { TOOL_META } from "@/lib/generators";
import { getPlanContext } from "@/lib/plan-context";
import { planTasksForModule } from "@/lib/plan";
import { Collapsible } from "@/components/collapsible";
import { KnownValues } from "@/components/task/known-values";
import { FieldEditor } from "@/components/task/field-editor";
import { TaskActions } from "@/components/task/task-actions";
import { ServiceOffer } from "@/components/service-offer";
import { STATE_RESOURCE_BY_CODE, FEDERAL_FALLBACK } from "@/content";

// §10.2 — fixed anatomy, identical order in every task. §14.2 — locked view shows title + why only.

export default async function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const task = TASK_BY_ID[taskId];
  if (!task) notFound();

  const ctx = await getPlanContext();
  const mod = MODULE_BY_ID[task.moduleId];
  const planTask = ctx.plan.tasks.find((t) => t.taskId === taskId);
  const state = ctx.states.find((s) => s.taskId === taskId);
  const status = state?.status ?? "not_started";
  const locked = !mod.isFree && ctx.entitlement !== "launch";
  const moduleTasks = planTasksForModule(ctx.plan, task.moduleId);
  const position = moduleTasks.findIndex((t) => t.taskId === taskId) + 1;
  const isVariant = Boolean(planTask?.isVerifyVariant && task.verifyVariant);
  const title = isVariant ? task.verifyVariant!.title : task.title;
  const profile = ctx.profile as unknown as Record<string, unknown>;
  const existingAsset = task.createsAsset ? ctx.assets.find((a) => a.type === task.createsAsset) : null;

  const substitute = (s: string) =>
    s.replace(/\byourbusiness\.com\b/g, (ctx.profile.domain as string | null) ?? "yourbusiness.com");

  if (locked) {
    return (
      <article className="space-y-5">
        <Crumb moduleName={mod.name} moduleId={mod.id} position={position} total={moduleTasks.length} />
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-ink-500">{task.timeEstimate}</p>
        <Section label="Why this matters">{task.whyItMatters}</Section>
        <div aria-hidden className="select-none space-y-3 blur-sm">
          <Section label="What you'll need">{task.whatYouNeed.join(" · ")}</Section>
          <Section label="Do this">{task.doThis}</Section>
        </div>
        <div className="rounded-2xl border border-ink-900 bg-white p-5 text-center">
          <p className="text-[15px] font-medium">This step is part of Launch.</p>
          <p className="mt-1 text-sm text-ink-500">Unlock the full plan, every tool, and your completion summary.</p>
          <Link href={`/unlock?from=${encodeURIComponent(`/t/${taskId}`)}`} className="tap mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-ink-900 font-semibold text-white">
            Unlock Launch
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="space-y-5">
      <Crumb moduleName={mod.name} moduleId={mod.id} position={position} total={moduleTasks.length} />

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {isVariant && <span className="rounded bg-honey-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-700">adapted</span>}
          {task.contentStatus === "draft" && <span className="rounded bg-warn-500/10 px-1.5 py-0.5 text-[11px] font-medium text-warn-500">Content in progress</span>}
          {!planTask && <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-500">Not part of your plan</span>}
        </div>
        <p className="mt-1 text-sm text-ink-500">{task.timeEstimate}</p>
      </header>

      {isVariant ? (
        <>
          <Section label="Why this matters">{task.whyItMatters}</Section>
          <KnownValues fields={task.reusesFields} profile={profile} business={ctx.business} currentTaskId={taskId} />
          <Section label={task.verifyVariant!.intro}>
            <ul className="mt-2 space-y-2">
              {task.verifyVariant!.checks.map((c, i) => (
                <li key={i} className="flex gap-2"><span aria-hidden className="text-ink-500">☐</span><span>{c}</span></li>
              ))}
            </ul>
          </Section>
        </>
      ) : (
        <>
          <Section label="Why this matters">{task.whyItMatters}</Section>
          <Section label="What you'll need">
            <ul className="space-y-1">{task.whatYouNeed.map((w, i) => <li key={i}>• {w}</li>)}</ul>
          </Section>
          <KnownValues fields={task.reusesFields} profile={profile} business={ctx.business} currentTaskId={taskId} />
          <Section label="Do this">{substitute(task.doThis)}</Section>

          {task.id === "1.6" && <StateResources stateCode={ctx.business.state} />}

          {task.primaryCta.toolId ? (
            <Link href={`/tools/${TOOL_ROUTES[task.primaryCta.toolId]}`} className="tap flex h-13 w-full items-center justify-center rounded-xl bg-ink-900 text-base font-semibold text-white">
              {task.primaryCta.label}
            </Link>
          ) : task.primaryCta.href?.startsWith("/") ? (
            <Link href={task.primaryCta.href} className="tap flex h-13 w-full items-center justify-center rounded-xl bg-ink-900 text-base font-semibold text-white">
              {task.primaryCta.label}
            </Link>
          ) : task.primaryCta.href ? (
            <a href={task.primaryCta.href} target="_blank" rel="noopener noreferrer" className="tap flex h-13 w-full items-center justify-center rounded-xl bg-ink-900 text-base font-semibold text-white">
              {task.primaryCta.label} ↗
            </a>
          ) : null}

          {task.toolId && !task.primaryCta.toolId && (
            <Link href={`/tools/${TOOL_ROUTES[task.toolId]}`} className="tap flex h-12 w-full items-center justify-center rounded-xl border border-ink-900 bg-white text-base font-semibold text-ink-900">
              Open the {TOOL_META[task.toolId].name}
            </Link>
          )}

          <div className="space-y-2">
            {task.steps.length > 0 && (
              <Collapsible title="Step by step">
                <ol className="space-y-3">{task.steps.map((s, i) => <Block key={i} n={i + 1} heading={s.heading} text={substitute(s.text)} />)}</ol>
              </Collapsible>
            )}
            {task.troubleshooting.length > 0 && (
              <Collapsible title="If something goes wrong">
                <ul className="space-y-3">{task.troubleshooting.map((s, i) => <Block key={i} heading={s.heading} text={s.text} />)}</ul>
              </Collapsible>
            )}
            {task.mistakes.length > 0 && (
              <Collapsible title="Common mistakes">
                <ul className="space-y-2">{task.mistakes.map((m, i) => <li key={i}>• {m}</li>)}</ul>
              </Collapsible>
            )}
            {task.alternatives.length > 0 && (
              <Collapsible title="Doing this a different way">
                <ul className="space-y-3">{task.alternatives.map((s, i) => <Block key={i} heading={s.heading} text={s.text} />)}</ul>
              </Collapsible>
            )}
            {task.sourceLinks.length > 0 && (
              <p className="px-1 text-xs text-ink-500">
                Official guides:{" "}
                {task.sourceLinks.map((l, i) => (
                  <span key={l.href}>{i > 0 && " · "}<a href={l.href} target="_blank" rel="noopener noreferrer" className="underline">{l.label}</a></span>
                ))}
              </p>
            )}
          </div>

          {task.serviceOffer === "task_3_1" && <ServiceOffer placement="task_3_1" businessId={ctx.business.id} />}
        </>
      )}

      <FieldEditor
        taskId={taskId}
        fields={task.canonicalFields}
        initial={profile}
        serviceAreaType={ctx.business.serviceAreaType}
        createsAsset={task.createsAsset}
        existingAssetUrl={existingAsset?.url}
      />

      <TaskActions taskId={taskId} status={status} supportsAwaitingVerification={task.supportsAwaitingVerification} />
    </article>
  );
}

function Crumb({ moduleName, moduleId, position, total }: { moduleName: string; moduleId: string; position: number; total: number }) {
  return (
    <nav className="flex items-center justify-between text-sm text-ink-500">
      <Link href={`/m/${moduleId}`} className="tap inline-flex items-center gap-1 underline">← {moduleName}</Link>
      {position > 0 && <span>Step {position} of {total}</span>}
    </nav>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</h2>
      <div className="text-[15px] leading-relaxed text-ink-900">{children}</div>
    </section>
  );
}

function Block({ n, heading, text }: { n?: number; heading?: string; text: string }) {
  return (
    <li className="flex gap-3">
      {n !== undefined && <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold">{n}</span>}
      <div>
        {heading && <div className="font-medium text-ink-900">{heading}</div>}
        <div>{text}</div>
      </div>
    </li>
  );
}

/** Task 1.6 — official resources for the owner's confirmed state, or the federal fallback (§12.4). */
function StateResources({ stateCode }: { stateCode: string }) {
  const r = STATE_RESOURCE_BY_CODE[stateCode];
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 text-[15px]">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Official resources for {r?.stateName ?? stateCode}</h2>
      {r ? (
        <ul className="space-y-2">
          <li><a className="underline" href={r.businessRegistrationUrl} target="_blank" rel="noopener noreferrer">Business registration ↗</a></li>
          <li><a className="underline" href={r.licensingUrl} target="_blank" rel="noopener noreferrer">Licensing ↗</a></li>
          <li><a className="underline" href={r.taxUrl} target="_blank" rel="noopener noreferrer">Business taxes ↗</a></li>
        </ul>
      ) : (
        <>
          <p className="mb-2 text-sm text-ink-500">We don't have {stateCode}-specific links yet. These federal resources will point you to your state's offices.</p>
          <ul className="space-y-2">
            <li><a className="underline" href={FEDERAL_FALLBACK.registerUrl} target="_blank" rel="noopener noreferrer">Register your business (SBA) ↗</a></li>
            <li><a className="underline" href={FEDERAL_FALLBACK.licensesUrl} target="_blank" rel="noopener noreferrer">Licenses and permits (SBA) ↗</a></li>
            <li><a className="underline" href={FEDERAL_FALLBACK.taxUrl} target="_blank" rel="noopener noreferrer">Small business taxes (IRS) ↗</a></li>
          </ul>
        </>
      )}
      <p className="mt-3 text-xs text-ink-500">GoBeeFound isn't qualified to give legal, tax, or insurance advice. These are the official places to check.</p>
    </div>
  );
}
