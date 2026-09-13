// §21.11 — required forbidden-strings test over content files and app source.
// Scoped to rendered strings and content; comments are stripped before scanning.
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

describe("§21.11 forbidden-strings test", () => {
  it("scans at least the content directory", () => {
    expect(files.some((f) => f.includes(`${path.sep}src${path.sep}content${path.sep}`))).toBe(true);
  });

  for (const { name, re } of FORBIDDEN) {
    it(`contains no "${name}"`, () => {
      const hits = files.filter((f) => re.test(stripComments(readFileSync(f, "utf8"))));
      expect(hits, `found in: ${hits.map((h) => path.relative(ROOT, h)).join(", ")}`).toEqual([]);
    });
  }

  it("the /plan route never says 'skipped' (verify variants are 'adapted', §10.6)", () => {
    const planFiles = files.filter((f) => /[\\/]src[\\/]app[\\/]plan[\\/]/.test(f));
    const hits = planFiles.filter((f) => /\bskipped\b/i.test(stripComments(readFileSync(f, "utf8"))));
    expect(hits).toEqual([]);
  });
});
