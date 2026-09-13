import { describe, expect, it } from "vitest";
import { computePlan } from "@/lib/plan";
import { selectNextStep } from "@/lib/next-step";
import type { TaskStateLike } from "@/lib/progress";
import type { OnboardingAnswers } from "@/content";

const NONE: OnboardingAnswers = {
  hasDomain: "no", hasWebsite: "no", hasEmail: "no", hasPhone: "no", hasGBP: "no", hasSocial: "no", hasReviews: "no",
};
const plan = computePlan({ trade: "handyman", serviceAreaType: "atCustomer", answers: NONE });
const requiredIds = plan.tasks.filter((t) => t.isRequired).map((t) => t.taskId);
const done = (ids: string[]): TaskStateLike[] => ids.map((taskId) => ({ taskId, status: "complete" }));

describe("§10.4 Next Step selection", () => {
  it("first visit → task 1.1 (§9.4)", () => {
    const n = selectNextStep(plan, [], "launching");
    expect(n.kind === "task" && n.task.taskId).toBe("1.1");
  });

  it("rule 1: saved_for_later with dependencies met wins", () => {
    const states: TaskStateLike[] = [...done(["1.1", "1.2"]), { taskId: "1.5", status: "saved_for_later" }];
    const n = selectNextStep(plan, states, "launching");
    expect(n.kind === "task" && n.task.taskId).toBe("1.5");
  });

  it("rule 3: skips a task whose dependency is unmet", () => {
    // Complete all of module 1 and 2 except 2.1; 2.2 depends on 2.1.
    const states = done(["1.1", "1.2", "1.3", "1.4", "1.5"]);
    const n = selectNextStep(plan, states, "launching");
    expect(n.kind === "task" && n.task.taskId).toBe("2.1");
  });

  it("rule 4: awaiting_verification on 4.2 routes to a different module", () => {
    // handyman order: foundation, name_domain, google, reviews, website, first_customers, social
    const states: TaskStateLike[] = [
      ...done(["1.1", "1.2", "1.3", "1.4", "1.5", "2.1", "2.2", "2.3", "2.4", "4.1"]),
      { taskId: "4.2", status: "awaiting_verification" },
    ];
    const n = selectNextStep(plan, states, "launching");
    expect(n.kind).toBe("task");
    if (n.kind === "task") {
      expect(n.task.taskId).not.toBe("4.2");
      expect(n.task.moduleId).not.toBe("google");
    }
  });

  it("rule 5: all required complete → confirm", () => {
    expect(selectNextStep(plan, done(requiredIds), "launching")).toEqual({ kind: "confirm" });
  });

  it("rule 6: launched → maintenance", () => {
    expect(selectNextStep(plan, [], "launched")).toEqual({ kind: "maintenance" });
  });

  it("not_doing skips count as done for selection", () => {
    const states: TaskStateLike[] = [{ taskId: "1.1", status: "skipped", skipReason: "not_doing" }];
    const n = selectNextStep(plan, states, "launching");
    expect(n.kind === "task" && n.task.taskId).toBe("1.2");
  });
});
