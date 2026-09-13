// §11 — plan computation. One static lookup table + three mechanisms. No rules engine.

import {
  ALL_TASKS,
  ARCHETYPE_BY_ID,
  MODULES,
  VERIFY_VARIANT_MAP,
  type ArchetypeId,
  type ModuleId,
  type OnboardingAnswers,
  type ServiceAreaType,
  type TaskDefinition,
} from "@/content";

export interface PlanInput {
  trade: ArchetypeId;
  serviceAreaType: ServiceAreaType;
  answers: OnboardingAnswers;
}

export interface PlanTask {
  taskId: string;
  moduleId: ModuleId;
  order: number;
  isRequired: boolean;
  /** Renders as an "adapted" step (§10.6). Never represented as skipped. */
  isVerifyVariant: boolean;
  definition: TaskDefinition;
}

export interface Plan {
  tasks: PlanTask[];
  /** Full module order, with name_domain_assets always second (§11.4). */
  moduleOrder: ModuleId[];
  /** Required MODULE tasks only — excludes the confirm step (§11.5). */
  requiredTotal: number;
  /** Number of tasks in the plan rendering as verify variants (§10.6). */
  adaptedCount: number;
  /** Task IDs hidden by the archetype (shown under "Not part of your plan" if state exists). */
  hiddenTaskIds: string[];
}

export function computeModuleOrder(trade: ArchetypeId): ModuleId[] {
  const archetype = ARCHETYPE_BY_ID[trade];
  const [first, ...rest] = archetype.modulePriority;
  const order: ModuleId[] = [first!, "name_domain_assets", ...rest];
  // Every module appears exactly once.
  for (const m of MODULES) if (!order.includes(m.id)) order.push(m.id);
  return order;
}

function answerIsYes(answers: OnboardingAnswers, key: keyof OnboardingAnswers): boolean {
  // `unsure` is treated as `no` (§11.1).
  return answers[key] === "yes";
}

export function computeVerifyVariantTaskIds(answers: OnboardingAnswers): Set<string> {
  const ids = new Set<string>();
  for (const key of Object.keys(VERIFY_VARIANT_MAP) as (keyof typeof VERIFY_VARIANT_MAP)[]) {
    if (answerIsYes(answers, key)) {
      for (const id of VERIFY_VARIANT_MAP[key]) ids.add(id);
    }
  }
  return ids;
}

export function computePlan(input: PlanInput): Plan {
  const archetype = ARCHETYPE_BY_ID[input.trade];
  const promote = new Set(archetype.promoteToRequired);
  const hide = new Set(archetype.hide);
  const variantIds = computeVerifyVariantTaskIds(input.answers);
  const moduleOrder = computeModuleOrder(input.trade);
  const moduleRank = new Map(moduleOrder.map((m, i) => [m, i]));

  const tasks: PlanTask[] = ALL_TASKS.filter((t) => !hide.has(t.id))
    .map((t) => {
      const isRequired = t.isRequired || promote.has(t.id);
      const isVerifyVariant = variantIds.has(t.id) && Boolean(t.verifyVariant);
      return { taskId: t.id, moduleId: t.moduleId, order: t.order, isRequired, isVerifyVariant, definition: t };
    })
    .sort((a, b) => {
      const mr = moduleRank.get(a.moduleId)! - moduleRank.get(b.moduleId)!;
      return mr !== 0 ? mr : a.order - b.order;
    });

  return {
    tasks,
    moduleOrder,
    requiredTotal: tasks.filter((t) => t.isRequired).length,
    adaptedCount: tasks.filter((t) => t.isVerifyVariant).length,
    hiddenTaskIds: [...hide],
  };
}

export function planTasksForModule(plan: Plan, moduleId: ModuleId): PlanTask[] {
  return plan.tasks.filter((t) => t.moduleId === moduleId);
}
