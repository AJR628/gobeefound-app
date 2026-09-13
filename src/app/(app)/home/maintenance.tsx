import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/current-user";

// §8.8 — post-launch maintenance list. A CHECKLIST ONLY: no monitoring, no scheduling, no email.
// Checks are stored as TaskState rows keyed `maintenance.<item>.<YYYY-MM>`; the month key in the
// id is what makes them "reset monthly" — a date comparison at render time, not a job (§3).

const ITEMS = [
  { id: "photos", label: "Add new job photos to Google and your site" },
  { id: "reviews", label: "Reply to any new reviews" },
  { id: "ask", label: "Ask recent happy customers for a review" },
  { id: "form", label: "Submit your own contact form to confirm it works" },
  { id: "hours", label: "Update hours before any holidays" },
  { id: "services", label: "Refresh your services if they've changed" },
  { id: "consistency", label: "Confirm your phone and address match everywhere" },
] as const;

function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function toggle(itemId: string, checked: boolean): Promise<void> {
  "use server";
  const { business } = await requireBusiness();
  const taskId = `maintenance.${itemId}.${monthKey()}`;
  if (checked) {
    await db.taskState.upsert({
      where: { businessId_taskId: { businessId: business.id, taskId } },
      create: { businessId: business.id, taskId, status: "complete", completedAt: new Date() },
      update: { status: "complete", completedAt: new Date() },
    });
  } else {
    await db.taskState.deleteMany({ where: { businessId: business.id, taskId } });
  }
  revalidatePath("/home");
}

export function MaintenanceList({ businessId, states }: { businessId: string; states: { taskId: string; status: string }[] }) {
  void businessId;
  const key = monthKey();
  const done = new Set(states.filter((s) => s.taskId.startsWith("maintenance.") && s.taskId.endsWith(key) && s.status === "complete").map((s) => s.taskId.split(".")[1]));
  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <section aria-labelledby="maint" className="rounded-[var(--radius-card)] border border-ink-100 bg-white p-5">
      <h2 id="maint" className="text-xs font-semibold uppercase tracking-wide text-ink-500">This month · {monthName}</h2>
      <p className="mt-1 text-sm text-ink-500">Twenty minutes to keep everything accurate. Resets each month.</p>
      <ul className="mt-3 divide-y divide-ink-100">
        {ITEMS.map((it) => {
          const checked = done.has(it.id);
          return (
            <li key={it.id}>
              <form action={toggle.bind(null, it.id, !checked)}>
                <button type="submit" className="tap flex w-full items-center gap-3 py-3 text-left text-[15px]">
                  <span aria-hidden className={`flex h-6 w-6 items-center justify-center rounded-md border ${checked ? "border-good-500 bg-good-500 text-white" : "border-ink-300"}`}>{checked ? "✓" : ""}</span>
                  <span className={checked ? "text-ink-500 line-through" : ""}>{it.label}</span>
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
