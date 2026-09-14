"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { db } from "@/lib/db";
import { mergeServiceDescriptions, saveEditedOutput, TOOL_SAVE_MAP } from "@/lib/generators";
import { saveCanonicalFields, type Service } from "@/lib/canonical";
import { track } from "@/lib/analytics/server";

// §13.1 / V4 — the approval path. The browser sends WHICH draft and the edited TEXT. Which canonical
// fields receive which output keys is decided HERE from TOOL_SAVE_MAP (plan §8c S1) — never by the client.

const payload = z.object({
  id: z.string().uuid(),
  edited: z.record(z.string(), z.unknown()),
});

/** Persist edits (both versions kept) and write the tool's approved outputs into Your Business. */
export async function acceptGeneratedOutput(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = payload.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something went wrong saving that." };
  const { user, business, profile } = await requireBusiness();
  if ((await getEntitlement(user.id)) !== "launch") return { ok: false, error: "Launch required." };

  const row = await db.generatedContent.findFirst({ where: { id: parsed.data.id, businessId: business.id } });
  if (!row) return { ok: false, error: "That draft wasn't found." };

  const original = row.output as Record<string, unknown>;
  await saveEditedOutput(business.id, row.id, parsed.data.edited, original);
  const editedFields = Object.keys(parsed.data.edited).filter((k) => JSON.stringify(parsed.data.edited[k]) !== JSON.stringify(original[k]));
  if (editedFields.length) await track(user.id, "generator_output_edited", { toolId: row.toolType, fieldsEdited: editedFields });

  const patch: Record<string, unknown> = {};
  for (const [field, outputKey] of Object.entries(TOOL_SAVE_MAP[row.toolType])) {
    const v = parsed.data.edited[outputKey!];
    if (field === "services") {
      const existing = Array.isArray(profile.services) ? (profile.services as Service[]) : [];
      const merged = mergeServiceDescriptions(existing, v);
      if (JSON.stringify(merged) !== JSON.stringify(existing)) patch.services = merged;
    } else if (typeof v === "string" && v.trim()) {
      patch[field] = v;
    }
  }
  if (Object.keys(patch).length) {
    const r = await saveCanonicalFields(business.id, patch, "generated_approved");
    if (!r.ok) return { ok: false, error: Object.values(r.errors)[0] };
  }
  revalidatePath("/your-business");
  return { ok: true };
}
