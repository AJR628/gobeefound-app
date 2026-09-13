import Link from "next/link";
import { TOOL_IDS } from "@/content";
import { getPlanContext } from "@/lib/plan-context";
import { missingFields, TOOL_META, TOOL_ROUTE } from "@/lib/generators";

// §7 /tools — three generators. Each card shows readiness; locked for free accounts.

export default async function ToolsPage() {
  const ctx = await getPlanContext();
  const locked = ctx.entitlement !== "launch";
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
        <p className="mt-1 text-ink-500">They already know your business. They only ask what they don't know.</p>
      </header>
      <ul className="space-y-3">
        {TOOL_IDS.map((tool) => {
          const meta = TOOL_META[tool];
          const missing = missingFields(tool, ctx.profile);
          return (
            <li key={tool}>
              <Link href={`/tools/${TOOL_ROUTE[tool]}`} className="tap block rounded-2xl border border-ink-100 bg-white p-4 hover:border-ink-300">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[15px] font-semibold">{locked && <span aria-hidden className="mr-1.5">🔒</span>}{meta.name}</h2>
                  <span className={`shrink-0 text-xs ${missing.length ? "text-ink-500" : "text-good-500"}`}>{missing.length ? `Needs ${missing.length} detail${missing.length > 1 ? "s" : ""}` : "Ready"}</span>
                </div>
                <p className="mt-1 text-sm text-ink-700">{meta.blurb}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
