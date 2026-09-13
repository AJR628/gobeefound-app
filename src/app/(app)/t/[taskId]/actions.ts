"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MODULE_BY_ID, TASK_BY_ID } from "@/content";
import { db } from "@/lib/db";
import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { saveCanonicalFields } from "@/lib/canonical";
import { computePlan } from "@/lib/plan";
import { evaluateMilestones } from "@/lib/progress";
import { daysSince, track } from "@/lib/analytics/server";

async function reachedMilestones(business: { id: string; trade: never; serviceAreaType: never; stage: "launching" | "launched" } | { id: string; trade: string; serviceAreaType: string; stage: "launching" | "launched" }, onboarding: Parameters<typeof computePlan>[0]["answers"]) {
  const rows = await db.taskState.findMany({ where: { businessId: business.id } });
  const plan = computePlan({ trade: business.trade as Parameters<typeof computePlan>[0]["trade"], serviceAreaType: business.serviceAreaType as Parameters<typeof computePlan>[0]["serviceAreaType"], answers: onboarding });
  return new Set(evaluateMilestones(plan, rows.map((r) => ({ taskId: r.taskId, status: r.status, skipReason: r.skipReason })), business.stage).filter((m) => m.reached).map((m) => m.milestone.id));
}

// §10.5 skip handling, §18.2 TaskState machine, §5.4 Decision log writes.

async function requireTaskAccess(taskId: string) {
  const task = TASK_BY_ID[taskId];
  if (!task) redirect("/home");
  const ctx = await requireBusiness();
  const isFree = MODULE_BY_ID[task.moduleId].isFree;
  if (!isFree && (await getEntitlement(ctx.user.id)) !== "launch") redirect("/unlock");
  return { task, ...ctx };
}

function revalidateTask(taskId: string, moduleId: string) {
  revalidatePath("/home");
  revalidatePath(`/m/${moduleId}`);
  revalidatePath(`/t/${taskId}`);
  revalidatePath("/your-business");
}

export async function markComplete(taskId: string): Promise<void> {
  const { task, user, business, onboarding } = await requireTaskAccess(taskId);
  const before = await reachedMilestones(business, onboarding);
  await db.taskState.upsert({
    where: { businessId_taskId: { businessId: business.id, taskId } },
    create: { businessId: business.id, taskId, status: "complete", completedAt: new Date() },
    update: { status: "complete", skipReason: null, completedAt: new Date() },
  });
  const days = daysSince(business.createdAt);
  await track(user.id, "task_completed", { taskId, moduleId: task.moduleId, daysSinceSignup: days });
  const after = await reachedMilestones(business, onboarding);
  for (const id of after) if (!before.has(id)) await track(user.id, "milestone_reached", { milestoneId: id, daysSinceSignup: days });
  revalidateTask(taskId, task.moduleId);
  redirect("/home");
}

export async function unComplete(taskId: string): Promise<void> {
  const { task, business } = await requireTaskAccess(taskId);
  await db.taskState.update({
    where: { businessId_taskId: { businessId: business.id, taskId } },
    data: { status: "not_started", skipReason: null, completedAt: null },
  });
  revalidateTask(taskId, task.moduleId);
}

export async function saveForLater(taskId: string): Promise<void> {
  const { task, user, business } = await requireTaskAccess(taskId);
  await track(user.id, "task_saved_for_later", { taskId });
  await db.taskState.upsert({
    where: { businessId_taskId: { businessId: business.id, taskId } },
    create: { businessId: business.id, taskId, status: "saved_for_later", skipReason: "later" },
    update: { status: "saved_for_later", skipReason: "later" },
  });
  revalidateTask(taskId, task.moduleId);
  redirect("/home");
}

const skipReason = z.enum(["already_done", "not_doing", "later"]);

/** One question, three answers (§10.5). Every skip writes a Decision row. */
export async function skipTask(taskId: string, formData: FormData): Promise<void> {
  const reason = skipReason.parse(formData.get("reason"));
  const { task, user, business } = await requireTaskAccess(taskId);
  await track(user.id, "task_skipped", { taskId, skipReason: reason });

  const status = reason === "already_done" ? "complete" : reason === "not_doing" ? "skipped" : "saved_for_later";
  await db.$transaction([
    db.taskState.upsert({
      where: { businessId_taskId: { businessId: business.id, taskId } },
      create: { businessId: business.id, taskId, status, skipReason: reason, completedAt: status === "complete" ? new Date() : null },
      update: { status, skipReason: reason, completedAt: status === "complete" ? new Date() : null },
    }),
    db.decision.create({
      data: {
        businessId: business.id,
        context: "task_skip",
        contextId: taskId,
        proposedAction: task.title,
        outcome: reason === "already_done" ? "accepted" : reason === "not_doing" ? "rejected" : "deferred",
        reason,
      },
    }),
  ]);
  revalidateTask(taskId, task.moduleId);
  redirect("/home");
}

/** Only tasks declaring supportsAwaitingVerification (3.4, 4.2) may enter this state (§18.2). */
export async function markAwaitingVerification(taskId: string): Promise<void> {
  const { task, business } = await requireTaskAccess(taskId);
  if (!task.supportsAwaitingVerification) return;
  await db.taskState.upsert({
    where: { businessId_taskId: { businessId: business.id, taskId } },
    create: { businessId: business.id, taskId, status: "awaiting_verification" },
    update: { status: "awaiting_verification", skipReason: null },
  });
  revalidateTask(taskId, task.moduleId);
  redirect("/home");
}

export type SaveFieldsState = { ok?: boolean; errors?: Record<string, string> } | undefined;

/** Element 12 — "Save your info". Writes only the task's declared canonicalFields (P16 write path). */
export async function saveTaskFields(taskId: string, _prev: SaveFieldsState, formData: FormData): Promise<SaveFieldsState> {
  const { task, user, business } = await requireTaskAccess(taskId);
  const raw: Record<string, unknown> = {};
  for (const field of task.canonicalFields) {
    const v = formData.get(field);
    if (v === null) continue;
    const s = String(v);
    switch (field) {
      case "hideAddress":
        raw[field] = s === "true";
        break;
      case "serviceAreas":
      case "differentiators":
        raw[field] = s.split("\n").map((x) => x.trim()).filter(Boolean);
        break;
      case "services":
      case "hours":
      case "brandColors":
        try { raw[field] = s ? JSON.parse(s) : null; } catch { raw[field] = null; }
        break;
      default:
        raw[field] = s;
    }
  }
  const result = await saveCanonicalFields(business.id, raw, "owner_entered");
  if (!result.ok) return { ok: false, errors: result.errors };
  for (const fieldKey of Object.keys(raw)) await track(user.id, "business_field_edited", { fieldKey, source: "task" });
  const suggested = formData.get("timezoneSuggested");
  if (typeof raw.timezone === "string" && raw.timezone && typeof suggested === "string" && suggested) {
    await track(user.id, "timezone_confirmed", { matchedBrowserSuggestion: raw.timezone === suggested });
  }

  // Asset declaration folded into the task that creates it (§8 — no separate URL tasks).
  const assetUrl = formData.get("assetUrl");
  if (task.createsAsset && typeof assetUrl === "string" && assetUrl.trim()) {
    const { declareAsset } = await import("@/lib/assets");
    const r = await declareAsset(business.id, task.createsAsset, assetUrl);
    if (!r.ok) return { ok: false, errors: { assetUrl: r.error } };
    await track(user.id, "asset_declared", { assetType: task.createsAsset });
  }

  revalidateTask(taskId, task.moduleId);
  return { ok: true };
}
