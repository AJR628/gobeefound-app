// §21.11 (as amended by docs/SPEC-V4-SCOPE-AMENDMENT.md) — repo-wide guardrails on the Prisma schema.
// The table list is a CLOSED, AUTHORIZED set. Adding a model means adding it here, in AGENTS.md §17.1,
// and in the V4 amendment — deliberately, in the same commit.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const schema = readFileSync(path.resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
const modelNames = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]!);
const enumNames = [...schema.matchAll(/^enum\s+(\w+)\s*\{/gm)].map((m) => m[1]!);

function block(kind: "model" | "enum", name: string): string {
  return schema.match(new RegExp(`^${kind} ${name} \\{[\\s\\S]*?\\n\\}`, "m"))?.[0] ?? "";
}

/** §17.1 — the 11 V1 tables. All must remain. */
const V1_MODELS = [
  "User",
  "Business",
  "OnboardingAnswers",
  "BusinessProfile",
  "FieldProvenance",
  "ConnectedAsset",
  "TaskState",
  "GeneratedContent",
  "Decision",
  "Purchase",
  "ServiceLead",
];

/** V4 §B / AGENTS.md §17.1 — the only additional models that may ever exist. They land by phase. */
const V4_MODELS = [
  "AiUsage",
  "AiAllowance",
  "AiAllowanceAdjustment",
  "SiteDraft",
  "SiteVersion",
  "SitePublication",
  "CustomDomain",
  "ManagedSubscription",
  "ContactRelayCounter",
];

const AUTHORIZED = new Set([...V1_MODELS, ...V4_MODELS]);

describe("§17.1 authorized-table test", () => {
  it("every model in the schema is on the authorized closed list", () => {
    const unauthorized = modelNames.filter((m) => !AUTHORIZED.has(m));
    expect(unauthorized, `unauthorized models: ${unauthorized.join(", ")}`).toEqual([]);
  });
  it("all 11 V1 models are still present", () => {
    for (const m of V1_MODELS) expect(modelNames, `missing V1 model ${m}`).toContain(m);
  });
  it("model names are unique", () => {
    expect(new Set(modelNames).size).toBe(modelNames.length);
  });
  it("never exceeds the authorized count", () => {
    expect(modelNames.length).toBeLessThanOrEqual(V1_MODELS.length + V4_MODELS.length);
  });
});

describe("§17.4 no-future-entity test", () => {
  const forbidden = ["Observation", "Finding", "Subscription", "ActionLog", "PermissionGrant", "AssetCredential", "Entitlement"];
  for (const name of forbidden) {
    it(`does not define a model or enum named exactly ${name}`, () => {
      expect(schema).not.toMatch(new RegExp(`^(model|enum)\\s+${name}\\b`, "m"));
    });
  }
  it("FieldProvenance has no confidence column", () => {
    expect(block("model", "FieldProvenance")).not.toMatch(/\bconfidence\b/);
  });
  it("ConnectedAsset has a single state column and no token/credential column", () => {
    const b = block("model", "ConnectedAsset");
    expect(b).toMatch(/\bconnectionState\b/);
    expect(b).not.toMatch(/verificationState|connectionMethod|accessToken|refreshToken|credential/i);
  });
  it("BusinessProfile.timezone has no default", () => {
    const line = schema.split("\n").find((l) => /^\s*timezone\s+String\?/.test(l)) ?? "";
    expect(line).not.toMatch(/@default/);
    expect(schema).not.toMatch(/America\/Denver/);
  });
  it("Purchase.userId is nullable (anonymized retention on deletion)", () => {
    expect(block("model", "Purchase")).toMatch(/userId\s+String\?/);
  });
});

describe("V4 §F — the single authorized recurring product", () => {
  it("the only model whose name contains 'Subscription' is ManagedSubscription", () => {
    const subs = modelNames.filter((m) => /subscription/i.test(m));
    expect(subs.every((m) => m === "ManagedSubscription"), `found: ${subs.join(", ")}`).toBe(true);
  });
  it("the only enum whose name contains 'Subscription' or 'Plan' is a Managed* enum", () => {
    const bad = enumNames.filter((e) => /subscription|plan\b|tier/i.test(e) && !/^Managed/.test(e));
    expect(bad).toEqual([]);
  });
  it("ManagedProduct, when present, has exactly one value: managed_website", () => {
    if (!enumNames.includes("ManagedProduct")) return;
    const values = block("enum", "ManagedProduct")
      .split("\n")
      .slice(1, -1)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//"));
    expect(values).toEqual(["managed_website"]);
  });
  it("Purchase (the one-time Launch product) gains no recurring columns", () => {
    expect(block("model", "Purchase")).not.toMatch(/subscription|recurring|interval|renew|periodEnd/i);
  });
  it("Product (Launch) enum stays one-time only", () => {
    const values = block("enum", "Product").split("\n").slice(1, -1).map((l) => l.trim()).filter(Boolean);
    expect(values).toEqual(["launch"]);
  });
});

describe("V4 §E — allowance model rules (when present)", () => {
  it("AiAllowance, when present, has no client-writable cost or token fields named as such", () => {
    if (!modelNames.includes("AiAllowance")) return;
    // Cost and tokens live on AiUsage (the ledger), never on the allowance row the UI reads.
    expect(block("model", "AiAllowance")).not.toMatch(/cost|tokens?\b/i);
  });
  it("ContactRelayCounter, when present, stores no message content or PII columns", () => {
    if (!modelNames.includes("ContactRelayCounter")) return;
    expect(block("model", "ContactRelayCounter")).not.toMatch(/message|email|name|phone|body|ip\b/i);
  });
});
