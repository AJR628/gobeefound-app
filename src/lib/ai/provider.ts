// V4 §J / plan §10 — THE server-only OpenAI provider. The only file that imports the OpenAI SDK.
// Responses API + strict Structured Outputs; explicit timeouts; no blind retries; usage and request
// ids captured on every attempt; every failure mapped to one AiError kind. No prompt or output is
// ever logged — they contain business data.
import "server-only";
import { createHash } from "node:crypto";
import OpenAI from "openai";
import type { Response as OpenAIResponse } from "openai/resources/responses/responses";
import { PROMPT_VERSION } from "@/content/prompts";
import { AiError, type AiErrorKind } from "./errors";
import { toStrictTextFormat } from "./json-schema";
import type { GenerationMeta, StructuredRequest, StructuredResult } from "./types";

/** Pinned. A platform-injected OPENAI_BASE_URL (e.g. an AI gateway) must never reroute traffic. */
export const OPENAI_BASE_URL = "https://api.openai.com/v1";

export const DEFAULT_MODELS = {
  routine: "gpt-5.6-luna",
  site: "gpt-5.6-sol",
} as const;

export function modelFor(operation: "routine" | "site"): string {
  return (operation === "site" ? process.env.OPENAI_MODEL_SITE : process.env.OPENAI_MODEL_ROUTINE) ?? DEFAULT_MODELS[operation];
}

const DEFAULT_TIMEOUT_MS: Record<"routine" | "site", number> = { routine: 25_000, site: 45_000 }; // Netlify sync ceiling is 60 s
const DEFAULT_MAX_OUTPUT: Record<"routine" | "site", number> = { routine: 2_000, site: 8_000 };
const TRUNCATION_RETRY_CAP = 8_192;

// ---------------------------------------------------------------------------------------------
// Client (lazy singleton, injectable for tests)
// ---------------------------------------------------------------------------------------------

/** The slice of the SDK we use, so tests can inject a fake without touching the network. */
export interface ResponsesClient {
  responses: {
    create(body: Record<string, unknown>, options?: { timeout?: number }): { withResponse(): Promise<{ data: OpenAIResponse; request_id: string | null }> };
  };
}

let singleton: OpenAI | null = null;
function realClient(): OpenAI {
  if (!singleton) {
    if (!process.env.OPENAI_API_KEY) throw new AiError("config", { internal: "OPENAI_API_KEY is not set" });
    singleton = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: OPENAI_BASE_URL, maxRetries: 0 });
    log({ evt: "ai_client_init", baseURLHost: new URL(singleton.baseURL).host, injectedBaseURL: Boolean(process.env.OPENAI_BASE_URL) });
  }
  return singleton;
}

/** SHA-256 of a stable tenant key — never an email, never the raw id. */
export function safetyIdentifier(userKey: string): string {
  return createHash("sha256").update(userKey).digest("hex");
}

// ---------------------------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------------------------

const QUOTA_CODES = new Set(["insufficient_quota", "credit_balance_exhausted", "organization_spend_limit_exceeded", "project_spend_limit_exceeded", "organization_usage_limit_exceeded", "billing_hard_limit_reached"]);

type ProviderErrorLike = { name?: string; status?: number; code?: string | null; type?: string | null; message?: string; request_id?: string | null; requestID?: string | null; headers?: { get?(k: string): string | null } | Record<string, string> };

function requestIdOf(e: ProviderErrorLike): string | null {
  if (e.request_id) return e.request_id;
  if (e.requestID) return e.requestID;
  const h = e.headers as { get?(k: string): string | null } | Record<string, string> | undefined;
  if (!h) return null;
  if (typeof (h as { get?: unknown }).get === "function") return (h as { get(k: string): string | null }).get("x-request-id");
  return (h as Record<string, string>)["x-request-id"] ?? null;
}

/** Pure. Exported for tests. */
export function mapProviderError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  const err = (e ?? {}) as ProviderErrorLike;
  const detail = { requestId: requestIdOf(err), providerStatus: err.status ?? null, providerCode: err.code ?? null, internal: `${err.name ?? "Error"}: ${(err.message ?? "").slice(0, 300)}`, cause: e };

  const name = err.name ?? "";
  if (/TimeoutError/i.test(name) || /timed? ?out/i.test(err.message ?? "")) return new AiError("timeout", detail);
  if (/ConnectionError/i.test(name)) return new AiError("unavailable", detail);

  const status = err.status;
  if (status === 401 || status === 403) return new AiError("config", detail);
  if (status === 429) {
    const code = err.code ?? err.type ?? "";
    return new AiError(QUOTA_CODES.has(code) || /quota|billing|spend/i.test(code) ? "quota" : "rate_limit", detail);
  }
  if (status === 400 || status === 404 || status === 422) return new AiError("config", { ...detail, internal: `invalid request: ${detail.internal}` });
  if (status !== undefined && status >= 500) return new AiError("unavailable", detail);
  return new AiError("unknown", detail);
}

// ---------------------------------------------------------------------------------------------
// Response interpretation
// ---------------------------------------------------------------------------------------------

function refusalText(res: OpenAIResponse): string | null {
  for (const item of res.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) if (part.type === "refusal") return part.refusal;
  }
  return null;
}

function usageOf(res: OpenAIResponse) {
  const u = res.usage;
  return {
    inputTokens: u?.input_tokens ?? null,
    outputTokens: u?.output_tokens ?? null,
    cachedTokens: u?.input_tokens_details?.cached_tokens ?? null,
    reasoningTokens: u?.output_tokens_details?.reasoning_tokens ?? null,
  };
}

// ---------------------------------------------------------------------------------------------
// Logging — structured, single-line, no business data
// ---------------------------------------------------------------------------------------------

function log(fields: Record<string, unknown>): void {
  try {
    console.info(JSON.stringify({ ts: new Date().toISOString(), ...fields }));
  } catch {
    /* logging must never throw */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------------------------
// The call
// ---------------------------------------------------------------------------------------------

export interface ProviderDeps {
  client?: ResponsesClient;
  /** Overridable for tests. */
  backoffMs?: (attempt: number) => number;
}

/**
 * One structured generation. Policy:
 *  - attempt 1 → on a RETRYABLE failure, exactly one more attempt;
 *  - schema failure → the retry carries a repair hint;
 *  - truncation → the retry doubles the output budget (capped);
 *  - config / quota / refusal / claims → thrown immediately, never retried.
 */
export async function openaiGenerateStructured<T>(req: StructuredRequest<T>, deps: ProviderDeps = {}): Promise<StructuredResult<T>> {
  const operation = req.operation ?? "routine";
  const model = modelFor(operation);
  const timeout = req.timeoutMs ?? DEFAULT_TIMEOUT_MS[operation];
  const format = toStrictTextFormat(req.schema, req.schemaName);
  const backoff = deps.backoffMs ?? ((attempt) => 250 + Math.floor(Math.random() * 500) * attempt);
  const client: ResponsesClient = deps.client ?? (realClient() as unknown as ResponsesClient);

  let maxOutputTokens = req.maxOutputTokens ?? DEFAULT_MAX_OUTPUT[operation];
  let input = req.prompt.input;
  let lastError: AiError | null = null;
  const started = Date.now();
  let totals = { inputTokens: 0, outputTokens: 0, cachedTokens: 0, reasoningTokens: 0, sawUsage: false };
  let lastRequestId: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const t0 = Date.now();
    let kind: AiErrorKind | "ok" = "ok";
    try {
      const { data: res, request_id } = await client.responses
        .create(
          {
            model,
            instructions: req.prompt.instructions,
            input,
            text: { format },
            max_output_tokens: maxOutputTokens,
            store: false,
            ...(req.userKey ? { safety_identifier: safetyIdentifier(req.userKey) } : {}),
          },
          { timeout },
        )
        .withResponse();

      lastRequestId = request_id ?? res.id ?? null;
      const u = usageOf(res);
      if (u.inputTokens !== null) {
        totals = {
          inputTokens: totals.inputTokens + (u.inputTokens ?? 0),
          outputTokens: totals.outputTokens + (u.outputTokens ?? 0),
          cachedTokens: totals.cachedTokens + (u.cachedTokens ?? 0),
          reasoningTokens: totals.reasoningTokens + (u.reasoningTokens ?? 0),
          sawUsage: true,
        };
      }

      const refusal = refusalText(res);
      if (refusal) throw new AiError("refusal", { requestId: lastRequestId, internal: `refusal: ${refusal.slice(0, 200)}` });

      if (res.status === "incomplete" && res.incomplete_details?.reason === "max_output_tokens") {
        throw new AiError("truncated", { requestId: lastRequestId, internal: `truncated at ${maxOutputTokens}` });
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(res.output_text ?? "");
      } catch {
        throw new AiError("schema", { requestId: lastRequestId, internal: "output was not valid JSON" });
      }
      const parsed = req.schema.safeParse(parsedJson);
      if (!parsed.success) {
        const issues = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new AiError("schema", { requestId: lastRequestId, internal: `zod: ${issues}` });
      }

      const meta: GenerationMeta = {
        provider: "openai",
        model: res.model ?? model,
        promptVersion: PROMPT_VERSION,
        requestId: lastRequestId,
        inputTokens: totals.sawUsage ? totals.inputTokens : null,
        outputTokens: totals.sawUsage ? totals.outputTokens : null,
        cachedTokens: totals.sawUsage ? totals.cachedTokens : null,
        reasoningTokens: totals.sawUsage ? totals.reasoningTokens : null,
        durationMs: Date.now() - started,
        attempts: attempt,
      };
      log({ evt: "ai_call", outcome: "ok", provider: "openai", model: meta.model, schema: req.schemaName, operation, attempt, durationMs: Date.now() - t0, requestId: lastRequestId, inputTokens: meta.inputTokens, outputTokens: meta.outputTokens, reasoningTokens: meta.reasoningTokens });
      return { data: parsed.data, meta };
    } catch (e) {
      const mapped = mapProviderError(e);
      lastError = mapped;
      kind = mapped.kind;
      log({ evt: "ai_call", outcome: "error", kind, provider: "openai", model, schema: req.schemaName, operation, attempt, durationMs: Date.now() - t0, requestId: mapped.detail.requestId ?? lastRequestId, providerStatus: mapped.detail.providerStatus ?? null, providerCode: mapped.detail.providerCode ?? null, internal: mapped.detail.internal ?? null });

      if (!mapped.retryable || attempt === 2) break;

      // Shape the single retry to the failure.
      if (kind === "schema") {
        input = `${req.prompt.input}\n\nThe previous attempt did not match the required format. Produce every required field, respecting the stated lengths, and nothing else.`;
      } else if (kind === "truncated") {
        maxOutputTokens = Math.min(maxOutputTokens * 2, TRUNCATION_RETRY_CAP);
      }
      await sleep(backoff(attempt));
    }
  }

  throw lastError ?? new AiError("unknown");
}
