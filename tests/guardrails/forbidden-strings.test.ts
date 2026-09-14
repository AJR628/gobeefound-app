// §21.11 (as amended by docs/SPEC-V4-SCOPE-AMENDMENT.md) — required forbidden-strings test over
// content files and app source. Scoped to rendered strings and content; comments are stripped first.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const SCAN_DIRS = ["src/content", "src/app", "src/components"].map((d) => path.join(ROOT, d));

function walk(dir: string): string[] {
  let out: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const p = path.join(dir, entry);
      const st = statSync(p);
      if (st.isDirectory()) out = out.concat(walk(p));
      else if (/\.(ts|tsx|md|json)$/.test(entry)) out.push(p);
    }
  } catch {
    /* dir may not exist yet */
  }
  return out;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: "$450", re: /\$450\b/ },
  { name: "$49 as a price", re: /\$49\b/ },
  { name: "$29 as a price", re: /\$29\b/ },
  { name: "Vault", re: /\bvault\b/i },
  { name: "Business Info Vault", re: /business info vault/i },
  { name: "Autopilot", re: /\bautopilot\b/i },
  { name: "Monitor as a product name", re: /\bGoBeeFound Monitor\b|\bMonitor\b(?= plan| tier| subscription)/ },
  { name: "America/Denver default", re: /America\/Denver/ },
];

const files = SCAN_DIRS.flatMap(walk);
const rel = (f: string) => path.relative(ROOT, f);

describe("§21.11 forbidden-strings test", () => {
  it("scans at least the content directory", () => {
    expect(files.some((f) => f.includes(`${path.sep}src${path.sep}content${path.sep}`))).toBe(true);
  });

  for (const { name, re } of FORBIDDEN) {
    it(`contains no "${name}"`, () => {
      const hits = files.filter((f) => re.test(stripComments(readFileSync(f, "utf8"))));
      expect(hits, `found in: ${hits.map(rel).join(", ")}`).toEqual([]);
    });
  }

  it("the /plan route never says 'skipped' (verify variants are 'adapted', §10.6)", () => {
    const planFiles = files.filter((f) => /[\\/]src[\\/]app[\\/]plan[\\/]/.test(f));
    const hits = planFiles.filter((f) => /\bskipped\b/i.test(stripComments(readFileSync(f, "utf8"))));
    expect(hits).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
// V4 additions
// ---------------------------------------------------------------------------------------------

/** Customer-facing source: everything under the scan dirs EXCEPT server route handlers (src/app/api). */
const UI_FILES = files.filter((f) => !/[\\/]src[\\/]app[\\/]api[\\/]/.test(f));

describe("V4 §E — no provider names, model names, or token counts reach the customer", () => {
  const patterns: { name: string; re: RegExp }[] = [
    { name: "OpenAI / Anthropic provider name", re: /\b(openai|anthropic)\b/i },
    { name: "model id", re: /\b(gpt-\d|claude[- ]\d|o[134]-mini|gpt-image)/i },
    { name: "token count", re: /\b\d[\d,]*\s+tokens?\b/i },
    { name: "sub-dollar cost", re: /\$0\.\d{2,}/ },
  ];
  for (const { name, re } of patterns) {
    it(`customer-facing source contains no ${name}`, () => {
      const hits = UI_FILES.filter((f) => re.test(stripComments(readFileSync(f, "utf8"))));
      expect(hits, `found in: ${hits.map(rel).join(", ")}`).toEqual([]);
    });
  }
});

describe("V4 §C — GoBeeFound never claims to have acted on a Google Business Profile", () => {
  // The app has no evidence of any GBP action (no API, no OAuth). Copy may instruct the OWNER to
  // create/verify/edit; it may never state that WE did. Scans task content, prompts, and UI.
  const CLAIM = /\b(we|gobeefound|our team)\s+(have\s+|has\s+|'ve\s+|will\s+|just\s+)?(created|verified|connected|published|edited|updated|set up|submitted)\s+(your\s+)?(google|gbp|business profile|profile)\b/i;
  it("no task content, prompt, or UI string asserts a GBP action by GoBeeFound", () => {
    const hits = files.filter((f) => CLAIM.test(stripComments(readFileSync(f, "utf8"))));
    expect(hits, `found in: ${hits.map(rel).join(", ")}`).toEqual([]);
  });
});
