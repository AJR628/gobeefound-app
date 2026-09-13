import { cache } from "react";
import { requireBusiness } from "./current-user";
import { db } from "./db";
import { getEntitlement } from "./entitlement";
import { computePlan, type Plan } from "./plan";
import { computeProgress, evaluateMilestones, type TaskStateLike } from "./progress";
import { selectNextStep } from "./next-step";

/** Everything /home, /m/*, /t/*, /confirm need, loaded once per request. */
export const getPlanContext = cache(async () => {
  const { user, business, profile, onboarding } = await requireBusiness();
  const [entitlement, taskStateRows, assets] = await Promise.all([
    getEntitlement(user.id),
    db.taskState.findMany({ where: { businessId: business.id } }),
    db.connectedAsset.findMany({ where: { businessId: business.id, removedAt: null } }),
  ]);
  const plan: Plan = computePlan({ trade: business.trade, serviceAreaType: business.serviceAreaType, answers: onboarding });
  const states: TaskStateLike[] = taskStateRows.map((r) => ({ taskId: r.taskId, status: r.status, skipReason: r.skipReason }));
  const progress = computeProgress(plan, states);
  const milestones = evaluateMilestones(plan, states, business.stage);
  const nextStep = selectNextStep(plan, states, business.stage);
  return { user, business, profile, onboarding, entitlement, plan, states, taskStateRows, progress, milestones, nextStep, assets };
});

export type PlanContext = Awaited<ReturnType<typeof getPlanContext>>;
