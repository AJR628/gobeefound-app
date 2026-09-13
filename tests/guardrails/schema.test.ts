// §21.11 — required repo-wide guardrails on the Prisma schema.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const schema = readFileSync(path.resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
const modelNames = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);

describe("§17.1 table-count test", () => {
  it("defines exactly 11 models", () => {
    expect(modelNames).toHaveLength(11);
  });
  it("defines exactly the 11 named V1 tables", () => {
    expect([...modelNames].sort()).toEqual(
      [
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
      ].sort(),
    );
  });
});

describe("§17.4 no-future-entity test", () => {
  const forbidden = ["Observation", "Finding", "Subscription", "ActionLog", "PermissionGrant", "AssetCredential", "Entitlement"];
  for (const name of forbidden) {
    it(`does not define a model or enum named ${name}`, () => {
      expect(schema).not.toMatch(new RegExp(`^(model|enum)\\s+${name}\\b`, "m"));
    });
  }
  it("FieldProvenance has no confidence column", () => {
    const block = schema.match(/model FieldProvenance \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(block).not.toMatch(/\bconfidence\b/);
  });
  it("ConnectedAsset has a single state column and no token/credential column", () => {
    const block = schema.match(/model ConnectedAsset \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(block).toMatch(/\bconnectionState\b/);
    expect(block).not.toMatch(/verificationState|connectionMethod|accessToken|refreshToken|credential/i);
  });
  it("BusinessProfile.timezone has no default", () => {
    const line = schema.split("\n").find((l) => /^\s*timezone\s+String\?/.test(l)) ?? "";
    expect(line).not.toMatch(/@default/);
    expect(schema).not.toMatch(/America\/Denver/);
  });
  it("Purchase.userId is nullable (anonymized retention on deletion)", () => {
    const block = schema.match(/model Purchase \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(block).toMatch(/userId\s+String\?/);
  });
});
