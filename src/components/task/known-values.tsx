import Link from "next/link";
import { FIELD_SOURCE_TASK, type ReusableField } from "@/content";
import { FIELD_LABEL, formatCanonicalValue } from "@/lib/canonical";
import { CopyButton } from "@/components/copy-button";

/**
 * §10.2 element 5 — "Your details, ready to use". Renders every reusesFields value that exists,
 * each with a copy control; empty ones link to the task that fills them. This is P16 made visible.
 */
export function KnownValues({
  fields,
  profile,
  business,
  currentTaskId,
}: {
  fields: ReusableField[];
  profile: Record<string, unknown>;
  business: { city: string; state: string };
  currentTaskId: string;
}) {
  const rows = fields.map((f) => {
    const raw = f === "city" ? business.city : f === "state" ? business.state : profile[f];
    const text = formatCanonicalValue(f, raw);
    const sourceTask = f === "city" || f === "state" ? null : FIELD_SOURCE_TASK[f];
    return { field: f, text, sourceTask };
  });
  if (rows.every((r) => !r.text)) return null;

  return (
    <section aria-labelledby="known-values" className="rounded-2xl border border-honey-100 bg-honey-50 p-4">
      <h2 id="known-values" className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
        Your details, ready to use
      </h2>
      <ul className="divide-y divide-honey-100">
        {rows.map((r) => (
          <li key={r.field} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="text-xs text-ink-500">{FIELD_LABEL[r.field]}</div>
              {r.text ? (
                <div className="truncate text-[15px] font-medium">{r.text}</div>
              ) : (
                <div className="text-sm text-ink-500">
                  Not set yet
                  {r.sourceTask && r.sourceTask !== currentTaskId && (
                    <>
                      {" · "}
                      <Link href={`/t/${r.sourceTask}`} className="underline">
                        add it
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
            {r.text && <CopyButton value={r.text} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
