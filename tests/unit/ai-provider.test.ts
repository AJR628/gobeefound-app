// V4 §J — provider policy tests. NO network: a fake ResponsesClient is injected. A guardrail below
// asserts the test environment has no provider key so an accidental real call fails loudly.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// `server-only` throws outside a React Server Components environment; neutralize it for unit tests.
vi.mock("server-only", () => ({}));

import { AiError } from "@/lib/ai/errors";
import { toStrictTextFormat } from "@/lib/ai/json-schema";
import { mapProviderError, openaiGenerateStructured, safetyIdentifier, type ResponsesClient } from "@/lib/ai/provider";

const schema = z.object({ headline: z.string().min(1).max(50), items: z.array(z.string()).min(1).max(3) });
const prompt = { instructions: "rules", input: "<facts>\nBusiness name: X\n</facts>" };
const good = { headline: "Plumbing in Testville", items: ["a"] };

type Reply = { data: Record<string, unknown>; request_id?: string | null } | { throws: unknown };

function fakeClient(replies: Reply[]) {
  const calls: Record<string, unknown>[] = [];
  const client: ResponsesClient = {
    responses: {
      create(body) {
        calls.push(body);
        const r = replies.shift();
        return {
          async withResponse() {
            if (!r) throw new Error("fake client: no more replies");
            if ("throws" in r) throw r.throws;
            return { data: r.data as never, request_id: r.request_id ?? "req_test" };
          },
        };
      },
    },
  };
  return { client, calls };
}

function okResponse(obj: unknown, extra: Record<string, unknown> = {}) {
  return {
    id: "resp_1",
    model: "gpt-test",
    status: "completed",
    output_text: JSON.stringify(obj),
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(obj) }] }],
    usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120, input_tokens_details: { cached_tokens: 10, cache_write_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } },
    ...extra,
  };
}

function providerError(status: number, code?: string, name = "APIError") {
  return Object.assign(new Error(`provider ${status}`), { name, status, code, request_id: "req_err" });
}

const noBackoff = { backoffMs: () => 0 };

beforeAll(() => {
  process.env.OPENAI_MODEL_ROUTINE = "gpt-test-routine";
});

describe("guardrail: no live provider in tests", () => {
  it("OPENAI_API_KEY is not set in the test environment", () => {
    expect(process.env.OPENAI_API_KEY).toBeUndefined();
  });
});

describe("toStrictTextFormat", () => {
  it("produces a strict json_schema format with every property required and no extras", () => {
    const f = toStrictTextFormat(schema, "test");
    expect(f.type).toBe("json_schema");
    expect(f.strict).toBe(true);
    expect(f.name).toBe("test");
    expect(f.schema.additionalProperties).toBe(false);
    expect((f.schema.required as string[]).sort()).toEqual(["headline", "items"]);
  });
  it("strips length/range keywords the strict subset may reject (Zod enforces them post-parse)", () => {
    const s = JSON.stringify(toStrictTextFormat(schema, "test").schema);
    expect(s).not.toMatch(/minLength|maxLength|minItems|maxItems/);
  });
});

describe("mapProviderError", () => {
  it("401/403 → config, not retryable", () => {
    const e = mapProviderError(providerError(401));
    expect(e.kind).toBe("config");
    expect(e.retryable).toBe(false);
    expect(e.detail.requestId).toBe("req_err");
  });
  it("429 rate limit → rate_limit, retryable", () => {
    expect(mapProviderError(providerError(429, "rate_limit_exceeded")).kind).toBe("rate_limit");
  });
  it("429 quota codes → quota, NOT retryable", () => {
    for (const code of ["insufficient_quota", "credit_balance_exhausted", "project_spend_limit_exceeded"]) {
      const e = mapProviderError(providerError(429, code));
      expect(e.kind, code).toBe("quota");
      expect(e.retryable).toBe(false);
    }
  });
  it("400 → config (our request is wrong); 500/503 → unavailable", () => {
    expect(mapProviderError(providerError(400)).kind).toBe("config");
    expect(mapProviderError(providerError(500)).kind).toBe("unavailable");
    expect(mapProviderError(providerError(503, "server_is_overloaded")).kind).toBe("unavailable");
  });
  it("timeout and connection errors map by class name", () => {
    expect(mapProviderError(Object.assign(new Error("Request timed out."), { name: "APIConnectionTimeoutError" })).kind).toBe("timeout");
    expect(mapProviderError(Object.assign(new Error("Connection error."), { name: "APIConnectionError" })).kind).toBe("unavailable");
  });
  it("never exposes the provider message as the user message", () => {
    const e = mapProviderError(providerError(500));
    expect(e.userMessage).not.toMatch(/provider 500/);
    expect(e.message).toBe(e.userMessage);
  });
});

describe("openaiGenerateStructured", () => {
  it("returns validated data with usage, model, request id, attempts", async () => {
    const { client, calls } = fakeClient([{ data: okResponse(good), request_id: "req_1" }]);
    const r = await openaiGenerateStructured({ prompt, schema, schemaName: "t", userKey: "biz-1" }, { client, ...noBackoff });
    expect(r.data).toEqual(good);
    expect(r.meta).toMatchObject({ provider: "openai", model: "gpt-test", requestId: "req_1", inputTokens: 100, outputTokens: 20, cachedTokens: 10, reasoningTokens: 0, attempts: 1 });
    expect(calls).toHaveLength(1);
  });

  it("sends the two prompt channels separately, strict format, store:false, hashed safety_identifier, no temperature", async () => {
    const { client, calls } = fakeClient([{ data: okResponse(good) }]);
    await openaiGenerateStructured({ prompt, schema, schemaName: "t", userKey: "biz-1", maxOutputTokens: 333 }, { client, ...noBackoff });
    const body = calls[0]!;
    expect(body.instructions).toBe("rules");
    expect(body.input).toBe(prompt.input);
    expect(body.model).toBe("gpt-test-routine");
    expect(body.max_output_tokens).toBe(333);
    expect(body.store).toBe(false);
    expect(body.safety_identifier).toBe(safetyIdentifier("biz-1"));
    expect(body.safety_identifier).not.toContain("biz-1");
    expect((body.text as { format: { strict: boolean } }).format.strict).toBe(true);
    expect(body).not.toHaveProperty("temperature");
  });

  it("does NOT retry a 401", async () => {
    const { client, calls } = fakeClient([{ throws: providerError(401) }, { data: okResponse(good) }]);
    await expect(openaiGenerateStructured({ prompt, schema, schemaName: "t" }, { client, ...noBackoff })).rejects.toMatchObject({ kind: "config" });
    expect(calls).toHaveLength(1);
  });

  it("does NOT retry a quota 429", async () => {
    const { client, calls } = fakeClient([{ throws: providerError(429, "insufficient_quota") }, { data: okResponse(good) }]);
    await expect(openaiGenerateStructured({ prompt, schema, schemaName: "t" }, { client, ...noBackoff })).rejects.toMatchObject({ kind: "quota" });
    expect(calls).toHaveLength(1);
  });

  it("retries exactly once on a genuine rate limit, then succeeds", async () => {
    const { client, calls } = fakeClient([{ throws: providerError(429, "rate_limit_exceeded") }, { data: okResponse(good) }]);
    const r = await openaiGenerateStructured({ prompt, schema, schemaName: "t" }, { client, ...noBackoff });
    expect(r.meta.attempts).toBe(2);
    expect(calls).toHaveLength(2);
  });

  it("retries once on 5xx and gives up after the second failure", async () => {
    const { client, calls } = fakeClient([{ throws: providerError(500) }, { throws: providerError(500) }, { data: okResponse(good) }]);
    await expect(openaiGenerateStructured({ prompt, schema, schemaName: "t" }, { client, ...noBackoff })).rejects.toMatchObject({ kind: "unavailable" });
    expect(calls).toHaveLength(2);
  });

  it("schema failure → one repair attempt with a hint appended to the DATA channel only", async () => {
    const { client, calls } = fakeClient([{ data: okResponse({ headline: "", items: [] }) }, { data: okResponse(good) }]);
    const r = await openaiGenerateStructured({ prompt, schema, schemaName: "t" }, { client, ...noBackoff });
    expect(r.data).toEqual(good);
    expect(calls).toHaveLength(2);
    expect(calls[1]!.instructions).toBe("rules");
    expect(String(calls[1]!.input)).toContain("did not match the required format");
  });

  it("schema failure twice → AiError schema", async () => {
    const { client } = fakeClient([{ data: okResponse({ nope: 1 }) }, { data: okResponse({ nope: 2 }) }]);
    await expect(openaiGenerateStructured({ prompt, schema, schemaName: "t" }, { client, ...noBackoff })).rejects.toMatchObject({ kind: "schema" });
  });

  it("non-JSON output_text is a schema failure, not a crash", async () => {
    const { client } = fakeClient([{ data: okResponse(good, { output_text: "Sure! Here you go: {" }) }, { data: okResponse(good, { output_text: "still not json" }) }]);
    await expect(openaiGenerateStructured({ prompt, schema, schemaName: "t" }, { client, ...noBackoff })).rejects.toMatchObject({ kind: "schema" });
  });

  it("truncation → retry once with a doubled output budget", async () => {
    const { client, calls } = fakeClient([{ data: okResponse(good, { status: "incomplete", incomplete_details: { reason: "max_output_tokens" } }) }, { data: okResponse(good) }]);
    const r = await openaiGenerateStructured({ prompt, schema, schemaName: "t", maxOutputTokens: 500 }, { client, ...noBackoff });
    expect(r.meta.attempts).toBe(2);
    expect(calls[0]!.max_output_tokens).toBe(500);
    expect(calls[1]!.max_output_tokens).toBe(1000);
  });

  it("refusal → AiError refusal, never retried", async () => {
    const refusal = okResponse(good, { output_text: "", output: [{ type: "message", content: [{ type: "refusal", refusal: "I can't help with that." }] }] });
    const { client, calls } = fakeClient([{ data: refusal }, { data: okResponse(good) }]);
    await expect(openaiGenerateStructured({ prompt, schema, schemaName: "t" }, { client, ...noBackoff })).rejects.toMatchObject({ kind: "refusal" });
    expect(calls).toHaveLength(1);
  });

  it("accumulates usage across a retry", async () => {
    const { client } = fakeClient([{ throws: providerError(500) }, { data: okResponse(good) }]);
    const r = await openaiGenerateStructured({ prompt, schema, schemaName: "t" }, { client, ...noBackoff });
    expect(r.meta.inputTokens).toBe(100); // the failed attempt returned no usage
  });

  it("AiError carries a user-safe message and an HTTP status", () => {
    const e = new AiError("quota", { internal: "secret provider text" });
    expect(e.httpStatus).toBe(503);
    expect(e.userMessage).not.toMatch(/secret/);
  });
});
