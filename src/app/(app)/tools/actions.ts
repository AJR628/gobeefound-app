"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { db } from "@/lib/db";
import { saveEditedOutput } from "@/lib/generators";
import { saveCanonicalFields } from "@/lib/canonical";
import { track } from "@/lib/analytics/server";

const payload = z.object({
  id: z.string().uuid(),
  edited: z.record(z.string(), z.unknown()),
  /** Which canonical fields to write from the edited output, e.g. { longDescription: "about" }. */
  saveTo: z.record(z.string(), z.string()).default({}),
});

/** Persist edits (both versions kept) and optionally write chosen outputs into Your Business. */
export async function acceptGeneratedOutput(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = payload.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something went wrong saving that." };
  const { user, business } = await requireBusiness();
  if ((await getEntitlement(user.id)) !== "launch") return { ok: false, error: "Launch required." };

  const row = await db.generatedContent.findFirst({ where: { id: parsed.data.id, businessId: business.id } });
  if (!row) return { ok: false, error: "That draft wasn't found." };

  await saveEditedOutput(business.id, row.id, parsed.data.edited, row.output as Record<string, unknown>);
  const original = row.output as Record<string, unknown>;
  const editedFields = Object.keys(parsed.data.edited).filter((k) => JSON.stringify(parsed.data.edited[k]) !== JSON.stringify(original[k]));
  if (editedFields.length) await track(user.id, "generator_output_edited", { toolId: row.toolType, fieldsEdited: editedFields });

  const patch: Record<string, unknown> = {};
  for (const [field, outputKey] of Object.entries(parsed.data.saveTo)) {
    const v = parsed.data.edited[outputKey];
    if (typeof v === "string" && v.trim()) patch[field] = v;
  }
  if (Object.keys(patch).length) {
    const r = await saveCanonicalFields(business.id, patch, "generated_approved");
    if (!r.ok) return { ok: false, error: Object.values(r.errors)[0] };
  }
  revalidatePath("/your-business");
  return { ok: true };
}
