import { describe, expect, it } from "vitest";
import { computePlan } from "@/lib/plan";
import { computeProgress, evaluateMilestones, type TaskStateLike } from "@/lib/progress";
import type { OnboardingAnswers } from "@/content";

const NONE: OnboardingAnswers = {
  hasDomain: "no", hasWebsite: "no", hasEmail: "no", hasPhone: "no", hasGBP: "no", hasSocial: "no", hasReviews: "no",
};
const plan = computePlan({ trade: "handyman", serviceAreaType: "atCustomer", answers: NONE });
const requiredIds = plan.tasks.filter((t) => t.isRequired).map((t) => t.taskId);
const complete = (ids: string[]): TaskStateLike[] => ids.map((taskId) => ({ taskId, status: "complete" }));

describe("§9.2 percentage", () => {
  it("is 0 with nothing complete", () => {
    const p = computeProgress(plan, []);
    expect(p.percentage).toBe(0);
    expect(p.totalRequired).toBe(29);
  });
  it("is 100 with all required complete", () => {
    const p = computeProgress(plan, complete(requiredIds));
    expect(p.percentage).toBe(100);
    expect(p.allRequiredComplete).toBe(true);
  });
  it("removes not_doing skips from the denominator", () => {
    const states: TaskStateLike[] = [
      ...complete(requiredIds.slice(0, 14)),
      { taskId: requiredIds[14]!, status: "skipped", skipReason: "not_doing" },
    ];
    const p = computeProgress(plan, states);
    expect(p.denominator).toBe(28);
    expect(p.percentage).toBe(50);
  });
  it("keeps saved_for_later in the denominator", () => {
    const p = computeProgress(plan, [{ taskId: requiredIds[0]!, status: "saved_for_later" }]);
    expect(p.denominator).toBe(29);
  });
  it("optional tasks never change the percentage", () => {
    const base = computeProgress(plan, complete(requiredIds.slice(0, 10)));
    const withOptional = computeProgress(plan, [...complete(requiredIds.slice(0, 10)), ...complete(["1.6", "2.5", "7.5"])]);
    expect(withOptional.percentage).toBe(base.percentage);
    expect(withOptional.totalRequired).toBe(base.totalRequired);
  });
  it("ignores unknown taskIds", () => {
    const p = computeProgress(plan, [{ taskId: "99.9", status: "complete" }]);
    expect(p.completedRequired).toBe(0);
  });
  it("verify variants count in the denominator like any required task", () => {
    const adapted = computePlan({
      trade: "handyman", serviceAreaType: "atCustomer",
      answers: { ...NONE, hasDomain: "yes", hasEmail: "yes" },
    });
    expect(adapted.adaptedCount).toBe(2);
    expect(computeProgress(adapted, []).totalRequired).toBe(29);
  });
});

describe("§9.2 milestones", () => {
  it("foundation_set flips when Module 1 required tasks are complete", () => {
    const m = evaluateMilestones(plan, complete(["1.1", "1.2", "1.3", "1.4", "1.5"]), "launching");
    expect(m.find((x) => x.milestone.id === "foundation_set")!.reached).toBe(true);
    expect(m.find((x) => x.milestone.id === "reachable")!.reached).toBe(false);
  });
  it("reachable needs 1.4 and 2.3; findable needs 3.5 and 4.2; trusted needs 5.1 and 5.3", () => {
    const m = evaluateMilestones(plan, complete(["1.4", "2.3", "3.5", "4.2", "5.1"]), "launching");
    const get = (id: string) => m.find((x) => x.milestone.id === id)!.reached;
    expect(get("reachable")).toBe(true);
    expect(get("findable")).toBe(true);
    expect(get("trusted")).toBe(false);
  });
  it("launched flips only on stage", () => {
    expect(evaluateMilestones(plan, complete(requiredIds), "launching").at(-1)!.reached).toBe(false);
    expect(evaluateMilestones(plan, [], "launched").at(-1)!.reached).toBe(true);
  });
});
