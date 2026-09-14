// §16.3 — build-time content validation. Runs as part of `npm run build`.
// A content error must fail the build, not surface at runtime.
import { describe, expect, it } from "vitest";
import {
  ALL_TASKS,
  ARCHETYPES,
  ASSET_TYPES,
  BUSINESS_PROFILE_FIELDS,
  MILESTONES,
  MODULES,
  MODULE_IDS,
  SERVICE_PLACEMENTS,
  SURFACE_MAP,
  TASK_BY_ID,
  TOOL_IDS,
  TOOL_OUTPUT_FIELDS,
  US_STATES,
  VERIFY_VARIANT_MAP,
} from "@/content";

/**
 * Tasks whose declared canonicalFields are NOT yet producible by their tool. Each entry is a known,
 * tracked defect — remove the entry when the tool is fixed. An empty object is the goal.
 * 3.6: declares pageTitle/metaDescription but points at `descriptions`, which writes
 *      shortDescription/gbpDescription/longDescription. Fixed by the website builder (Phase 4/5).
 */
const KNOWN_TOOL_FIELD_MISMATCH: Record<string, string> = {
  "3.6": "descriptions tool cannot write pageTitle/metaDescription — fixed in Phase 4/5",
};

const taskIds = new Set(ALL_TASKS.map((t) => t.id));
const profileFields = new Set<string>(BUSINESS_PROFILE_FIELDS);
const reusable = new Set<string>([...BUSINESS_PROFILE_FIELDS, "city", "state"]);

describe("content: identity and counts", () => {
  it("has 35 module task definitions (36 authored with the confirm step)", () => {
    expect(ALL_TASKS).toHaveLength(35);
  });
  it("task IDs are unique", () => {
    expect(taskIds.size).toBe(ALL_TASKS.length);
  });
  it("module IDs are unique and cover MODULE_IDS", () => {
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(MODULES.length);
    expect([...MODULE_IDS].sort()).toEqual(MODULES.map((m) => m.id).sort());
  });
  it("only Module 1 is free", () => {
    expect(MODULES.filter((m) => m.isFree).map((m) => m.id)).toEqual(["foundation"]);
  });
  it("every task belongs to a real module and orders are unique within a module", () => {
    for (const m of MODULES) {
      const orders = ALL_TASKS.filter((t) => t.moduleId === m.id).map((t) => t.order);
      expect(new Set(orders).size).toBe(orders.length);
    }
    for (const t of ALL_TASKS) expect(MODULE_IDS).toContain(t.moduleId);
  });
});

describe("content: references resolve", () => {
  for (const t of ALL_TASKS) {
    describe(`task ${t.id}`, () => {
      it("dependsOn resolves", () => {
        for (const d of t.dependsOn) expect(taskIds.has(d), `${t.id} depends on unknown ${d}`).toBe(true);
      });
      it("canonicalFields are real BusinessProfile columns", () => {
        for (const f of t.canonicalFields) expect(profileFields.has(f), `${t.id}: ${f}`).toBe(true);
      });
      it("reusesFields are real BusinessProfile columns or city/state", () => {
        for (const f of t.reusesFields) expect(reusable.has(f), `${t.id}: ${f}`).toBe(true);
      });
      it("createsAsset / toolId / serviceOffer are valid enum values", () => {
        if (t.createsAsset) expect(ASSET_TYPES).toContain(t.createsAsset);
        if (t.toolId) expect(TOOL_IDS).toContain(t.toolId);
        if (t.primaryCta.toolId) expect(TOOL_IDS).toContain(t.primaryCta.toolId);
        if (t.serviceOffer) expect(SERVICE_PLACEMENTS).toContain(t.serviceOffer);
      });
      it("has a lastReviewed ISO date and a contentStatus", () => {
        expect(t.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(["draft", "complete"]).toContain(t.contentStatus);
      });
      it("visible prose stays under ~60 words (P3)", () => {
        const words = `${t.whyItMatters} ${t.doThis}`.split(/\s+/).filter(Boolean).length;
        expect(words, `${t.id} visible prose = ${words} words`).toBeLessThanOrEqual(110);
      });
    });
  }

  it("every task's canonicalFields are producible by its declared tool (V4 guardrail)", () => {
    const offenders: string[] = [];
    for (const t of ALL_TASKS) {
      if (!t.toolId || t.canonicalFields.length === 0) continue;
      const producible = new Set<string>(TOOL_OUTPUT_FIELDS[t.toolId]);
      const missing = t.canonicalFields.filter((f) => !producible.has(f));
      if (missing.length && !KNOWN_TOOL_FIELD_MISMATCH[t.id]) offenders.push(`${t.id}: ${missing.join(",")} not produced by ${t.toolId}`);
    }
    expect(offenders).toEqual([]);
  });

  it("known tool/field mismatches still exist (remove the entry once fixed)", () => {
    for (const [id, note] of Object.entries(KNOWN_TOOL_FIELD_MISMATCH)) {
      const t = TASK_BY_ID[id]!;
      const producible = new Set<string>(TOOL_OUTPUT_FIELDS[t.toolId!]);
      const stillBroken = t.canonicalFields.some((f) => !producible.has(f));
      expect(stillBroken, `${id} is fixed — delete its KNOWN_TOOL_FIELD_MISMATCH entry (${note})`).toBe(true);
    }
  });

  it("only 3.4 and 4.2 support awaiting_verification (§18.2)", () => {
    const ids = ALL_TASKS.filter((t) => t.supportsAwaitingVerification).map((t) => t.id).sort();
    expect(ids).toEqual(["3.4", "4.2"]);
  });

  it("task 4.3 owns address visibility: declares streetAddress AND hideAddress", () => {
    expect(TASK_BY_ID["4.3"]!.canonicalFields).toEqual(expect.arrayContaining(["streetAddress", "hideAddress"]));
    const others = ALL_TASKS.filter((t) => t.id !== "4.3" && t.canonicalFields.some((f) => f === "streetAddress" || f === "hideAddress"));
    expect(others.map((t) => t.id)).toEqual([]);
  });

  it("service placements task_3_1 and task_3_4 are declared by exactly those tasks", () => {
    expect(TASK_BY_ID["3.1"]!.serviceOffer).toBe("task_3_1");
    expect(TASK_BY_ID["3.4"]!.serviceOffer).toBe("task_3_4");
    for (const t of ALL_TASKS) if (t.moduleId === "foundation") expect(t.serviceOffer, `P11: ${t.id}`).toBeUndefined();
  });

  it("every verify-variant-mapped task actually defines a verifyVariant", () => {
    for (const ids of Object.values(VERIFY_VARIANT_MAP)) {
      for (const id of ids) expect(TASK_BY_ID[id]?.verifyVariant, `missing verifyVariant on ${id}`).toBeDefined();
    }
  });
});

describe("content: archetypes", () => {
  it("has 10 archetypes with valid overrides and module priority", () => {
    expect(ARCHETYPES).toHaveLength(10);
    for (const a of ARCHETYPES) {
      for (const id of [...a.promoteToRequired, ...a.hide]) expect(taskIds.has(id), `${a.id}: ${id}`).toBe(true);
      expect(a.modulePriority).not.toContain("name_domain_assets");
      expect(new Set(a.modulePriority).size).toBe(6);
      for (const m of a.modulePriority) expect(MODULE_IDS).toContain(m);
      expect(a.modulePriority[0]).toBe("foundation");
    }
  });
});

describe("content: surface map, milestones, states", () => {
  it("surface map fieldKeys are real columns and appearsOn are real asset types", () => {
    for (const s of SURFACE_MAP) {
      expect(profileFields.has(s.fieldKey)).toBe(true);
      for (const a of s.appearsOn) expect(ASSET_TYPES).toContain(a);
    }
    expect(SURFACE_MAP).toHaveLength(10);
  });
  it("milestone conditions reference real tasks / modules", () => {
    expect(MILESTONES).toHaveLength(5);
    for (const m of MILESTONES) {
      if (m.condition.type === "tasks_complete") for (const id of m.condition.taskIds) expect(taskIds.has(id)).toBe(true);
      if (m.condition.type === "module_required_complete") expect(MODULE_IDS).toContain(m.condition.moduleId);
    }
  });
  it("US_STATES has 51 entries (50 + DC)", () => {
    expect(US_STATES).toHaveLength(51);
    expect(new Set(US_STATES.map((s) => s.code)).size).toBe(51);
  });
});

describe("content: geographic neutrality (§12.4)", () => {
  it("no task or archetype hardcodes an IANA timezone or a state code as a value", () => {
    const blob = JSON.stringify({ ALL_TASKS, ARCHETYPES });
    expect(blob).not.toMatch(/America\/(Denver|Chicago|New_York|Los_Angeles)/);
  });
});
