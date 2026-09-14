// Derives the strict JSON Schema the model is constrained by from a Zod schema.
//
// OpenAI strict Structured Outputs guarantee SHAPE (keys, types, enums, required, no extra props) but
// support only a subset of JSON Schema keywords. Length/range constraints are enforced by Zod AFTER
// the call (src/lib/ai/provider.ts), so we strip them here rather than risk a 400 from the provider.
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

export interface StrictTextFormat {
  type: "json_schema";
  name: string;
  strict: true;
  schema: Record<string, unknown>;
}

/** Keywords strict mode may reject; Zod enforces them post-parse instead. */
const STRIPPED_KEYWORDS = new Set([
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "pattern",
  "format",
  "default",
  "$schema",
]);

function stripUnsupported(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupported);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (STRIPPED_KEYWORDS.has(k)) continue;
      out[k] = stripUnsupported(v);
    }
    // Strict mode requires every property to be required and no additional properties.
    if (out.type === "object" && out.properties && typeof out.properties === "object") {
      out.additionalProperties = false;
      out.required = Object.keys(out.properties as Record<string, unknown>);
    }
    return out;
  }
  return node;
}

/** `name` must be a short identifier ([a-zA-Z0-9_-], ≤64). */
export function toStrictTextFormat(schema: z.ZodTypeAny, name: string): StrictTextFormat {
  const fmt = zodTextFormat(schema, name) as unknown as { schema: Record<string, unknown> };
  return { type: "json_schema", name, strict: true, schema: stripUnsupported(fmt.schema) as Record<string, unknown> };
}
