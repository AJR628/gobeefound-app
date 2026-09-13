// §16.4 — the thin AI provider interface. Server-side only. Typed in, typed out, Zod-validated.
// One retry on malformed output, then a plain failure. 30s timeout. No streaming. No model choice.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const MODEL = "claude-sonnet-4-5";
const TIMEOUT_MS = 30_000;

export const websiteCopySchema = z.object({
  headline: z.string().min(1).max(200),
  subheadline: z.string().min(1).max(400),
  serviceBlurbs: z.array(z.object({ name: z.string().min(1), blurb: z.string().min(1).max(400) })).min(1).max(30),
  about: z.string().min(1).max(2000),
  callToAction: z.string().min(1).max(120),
});
export type WebsiteCopy = z.infer<typeof websiteCopySchema>;

export const descriptionsSchema = z.object({
  short: z.string().min(1).max(300),
  google: z.string().min(1).max(750),
  long: z.string().min(1).max(3000),
});
export type Descriptions = z.infer<typeof descriptionsSchema>;

export const reviewRequestsSchema = z.object({
  sms: z.string().min(1).max(200),
  emailSubject: z.string().min(1).max(120),
  emailBody: z.string().min(1).max(1500),
  spokenLine: z.string().min(1).max(300),
  negativeReply: z.string().min(1).max(1200),
});
export type ReviewRequests = z.infer<typeof reviewRequestsSchema>;

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS, maxRetries: 0 });
  return client;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json");
  return JSON.parse(trimmed.slice(start, end + 1));
}

export class GenerationError extends Error {
  constructor(message = "We couldn't generate that just now. Please try again.") {
    super(message);
    this.name = "GenerationError";
  }
}

/** Runs the prompt, parses JSON, validates against the schema. Retries exactly once on malformed output. */
export async function generateStructured<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await anthropic().messages.create({
        model: MODEL,
        max_tokens: 1500,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      });
      const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      const parsed = schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
      lastError = parsed.error;
    } catch (e) {
      lastError = e;
    }
  }
  void lastError;
  throw new GenerationError();
}
