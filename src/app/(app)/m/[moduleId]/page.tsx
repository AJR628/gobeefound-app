import Link from "next/link";
import { notFound } from "next/navigation";
import { MODULE_BY_ID, TASK_BY_ID, type ModuleId, MODULE_IDS } from "@/content";
import { getPlanContext } from "@/lib/plan-context";
import { planTasksForModule } from "@/lib/plan";
import { Collapsible } from "@/components/collapsible";

// §7 — module page: objective, required vs optional counted separately, locked tasks show titles.

const GLYPH: Record<string, string> = { complete: "✓", skipped: "–", saved_for_later: "◔", awaiting_verification: "◔", not_started: "○" };

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  if (!(MODULE_IDS as readonly string[]).includes(moduleId)) notFound();
  const mod = MODULE_BY_ID[moduleId as ModuleId];
  const ctx = await getPlanContext();
  const tasks = planTasksForModule(ctx.plan, mod.id);
  const required = tasks.filter((t) => t.isRequired);
  const optional = tasks.filter((t) => !t.isRequired);
  const byId = new Map(ctx.states.map((s) => [s.taskId, s]));
  const locked = !mod.isFree && ctx.entitlement !== "launch";

  const doneRequired = required.filter((t) => byId.get(t.taskId)?.status === "complete").length;
  const notDoing = required.filter((t) => byId.get(t.taskId)?.status === "skipped").length;

  // §11.7 — tasks with recorded state that are no longer in the plan.
  const inPlan = new Set(tasks.map((t) => t.taskId));
  const offPlan = ctx.states
    .filter((s) => !inPlan.has(s.taskId) && TASK_BY_ID[s.taskId]?.moduleId === mod.id)
    .map((s) => TASK_BY_ID[s.taskId]!);

  const row = (taskId: string, title: string, adapted: boolean) => {
    const st = byId.get(taskId)?.status ?? "not_started";
    return (
      <li key={taskId}>
        <Link href={`/t/${taskId}`} className="tap flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-ink-100">
          <span aria-hidden className={`w-5 text-center ${st === "complete" ? "text-good-500" : "text-ink-500"}`}>{locked ? "🔒" : GLYPH[st]}</span>
          <span className={`flex-1 text-[15px] ${st === "complete" ? "text-ink-500 line-through" : ""}`}>{title}</span>
          {adapted && <span className="rounded bg-honey-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-700">adapted</span>}
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-500"><Link href="/home" className="tap inline-flex items-center underline">← Home</Link></nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{mod.name}</h1>
        <p className="mt-1 text-[15px] text-ink-700">{mod.objective}</p>
        <p className="mt-2 text-sm text-ink-500">
          {mod.isOptional && required.length === 0 ? "Optional for your kind of work." : `${doneRequired} of ${required.length - notDoing} required steps done`}
          {optional.length > 0 && ` · ${optional.length} optional`}
        </p>
      </header>

      {locked && (
        <p className="rounded-xl bg-honey-50 px-4 py-3 text-sm text-ink-700">
          This module is part of Launch. You can see every step; <Link href="/unlock" className="font-medium underline">unlock</Link> to open them.
        </p>
      )}

      <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white px-2">
        {required.map((t) => row(t.taskId, t.isVerifyVariant ? t.definition.verifyVariant!.title : t.definition.title, t.isVerifyVariant))}
      </ul>

      {optional.length > 0 && (
        <Collapsible title={`Optional / later (${optional.length})`}>
          <ul className="-mx-2 divide-y divide-ink-100">{optional.map((t) => row(t.taskId, t.definition.title, false))}</ul>
        </Collapsible>
      )}

      {offPlan.length > 0 && (
        <Collapsible title={`Not part of your plan (${offPlan.length})`}>
          <p className="text-sm text-ink-500">These aren't in your current plan but your progress on them is kept.</p>
          <ul className="-mx-2 divide-y divide-ink-100">{offPlan.map((t) => row(t.id, t.title, false))}</ul>
        </Collapsible>
      )}
    </div>
  );
}
