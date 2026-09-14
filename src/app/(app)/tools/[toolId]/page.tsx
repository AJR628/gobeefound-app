import Link from "next/link";
import { notFound } from "next/navigation";
import { FIELD_LABEL } from "@/lib/canonical";
import { getPlanContext } from "@/lib/plan-context";
import { allowanceView, missingFields, TOOL_BY_ROUTE, TOOL_META, TOOL_QUESTIONS } from "@/lib/generators";
import { readAllowance } from "@/lib/ai/allowance";
import { GeneratorForm } from "./generator-form";

export default async function ToolPage({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const tool = TOOL_BY_ROUTE[toolId];
  if (!tool) notFound();
  const ctx = await getPlanContext();
  const meta = TOOL_META[tool];

  if (ctx.entitlement !== "launch") {
    return (
      <div className="space-y-5">
        <nav className="text-sm text-ink-500"><Link href="/tools" className="tap inline-flex items-center underline">← Tools</Link></nav>
        <h1 className="text-2xl font-bold tracking-tight">{meta.name}</h1>
        <p className="text-[15px] text-ink-700">{meta.blurb}</p>
        <div className="rounded-2xl border border-ink-900 bg-white p-5 text-center">
          <p className="font-medium">This tool is part of Launch.</p>
          <Link href={`/unlock?from=${encodeURIComponent(`/tools/${toolId}`)}`} className="tap mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-ink-900 font-semibold text-white">Unlock Launch</Link>
        </div>
      </div>
    );
  }

  const missing = missingFields(tool, ctx.profile);
  const allowance = allowanceView("edits", await readAllowance(ctx.business.id));
  const p = ctx.profile as unknown as Record<string, unknown>;
  // P16 — ask only what we don't already know.
  const questions = TOOL_QUESTIONS[tool].filter((q) => {
    if (!q.forField) return true;
    const v = p[q.forField];
    return v === null || v === undefined || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);
  });

  return (
    <div className="space-y-5">
      <nav className="text-sm text-ink-500"><Link href="/tools" className="tap inline-flex items-center underline">← Tools</Link></nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{meta.name}</h1>
        <p className="mt-1 text-[15px] text-ink-700">{meta.blurb}</p>
      </header>

      {missing.length > 0 ? (
        <div className="rounded-2xl border border-honey-100 bg-honey-50 p-4">
          <p className="text-[15px] font-medium">A few details first.</p>
          <ul className="mt-2 space-y-1.5 text-[15px]">
            {missing.map((m) => (
              <li key={m.field}>• {FIELD_LABEL[m.field]} — <Link href={`/t/${m.taskId}`} className="underline">add it</Link></li>
            ))}
          </ul>
        </div>
      ) : (
        <GeneratorForm
          toolRoute={toolId}
          tool={tool}
          questions={questions}
          reviewLink={typeof p.reviewLink === "string" ? p.reviewLink : null}
          displayName={ctx.profile.displayName}
          allowanceLabel={allowance.label}
          allowanceExhausted={allowance.used >= allowance.limit}
        />
      )}
    </div>
  );
}
