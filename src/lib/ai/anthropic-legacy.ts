// LEGACY — the V1 Anthropic path, kept for exactly one release behind AI_PROVIDER=anthropic so the
// OpenAI migration can be rolled back with an env flip and no deploy. Removed in Phase 2.1 along with
// @anthropic-ai/sdk and ANTHROPIC_API_KEY. Do not extend.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { PROMPT_VERSION } from "@/content/prompts";
import { AiError } from "./errors";
import type { GenerationMeta, StructuredRequest, StructuredResult } from "./types";

const MODEL = "claude-sonnet-4-5";
const TIMEOUT_MS = 30_000;

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new AiError("config", { internal: "ANTHROPIC_API_KEY is not set" });
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS, maxRetries: 0 });
  }
  return client;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new AiError("schema", { internal: "no json object in output" });
  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function anthropicGenerateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
  const started = Date.now();
  const prompt = `${req.prompt.instructions}\n\n${req.prompt.input}\n\nReturn ONLY a JSON object matching the requested shape. No preamble, no markdown fences.`;
  let lastError: AiError | null = null;
  let usage = { inputTokens: 0, outputTokens: 0 };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await anthropic().messages.create({ model: MODEL, max_tokens: req.maxOutputTokens ?? 1500, temperature: 0.4, messages: [{ role: "user", content: prompt }] });
      usage = { inputTokens: usage.inputTokens + (res.usage?.input_tokens ?? 0), outputTokens: usage.outputTokens + (res.usage?.output_tokens ?? 0) };
      const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      const parsed = req.schema.safeParse(extractJson(text));
      if (!parsed.success) throw new AiError("schema", { internal: parsed.error.issues[0]?.message });
      const meta: GenerationMeta = { provider: "anthropic", model: MODEL, promptVersion: PROMPT_VERSION, requestId: res.id ?? null, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cachedTokens: null, reasoningTokens: null, durationMs: Date.now() - started, attempts: attempt };
      return { data: parsed.data, meta };
    } catch (e) {
      const err = e as { status?: number; name?: string; message?: string };
      lastError =
        e instanceof AiError
          ? e
          : err.status === 401 || err.status === 403
            ? new AiError("config", { providerStatus: err.status, internal: err.message })
            : err.status === 429
              ? new AiError("rate_limit", { providerStatus: 429, internal: err.message })
              : /timeout/i.test(err.name ?? "")
                ? new AiError("timeout", { internal: err.message })
                : new AiError("unavailable", { providerStatus: err.status ?? null, internal: `${err.name}: ${err.message}` });
      console.info(JSON.stringify({ ts: new Date().toISOString(), evt: "ai_call", outcome: "error", provider: "anthropic", kind: lastError.kind, attempt, internal: lastError.detail.internal ?? null }));
      if (!lastError.retryable) break;
    }
  }
  throw lastError ?? new AiError("unknown");
}
