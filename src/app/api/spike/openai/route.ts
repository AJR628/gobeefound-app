import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { requireUser } from "@/lib/current-user";

// Phase 0 connectivity spike. NOT a product route. Active only when SPIKE_ENABLED=1 and the
// Netlify build context is not production. Requires a signed-in user. Proves, from a real Netlify
// deploy preview: (1) which env the platform injected, (2) that a strict-schema Responses call
// succeeds with the pinned base URL, (3) real usage/request-id fields, (4) optional image call.
// Delete this file when Phase 2 lands.

export const dynamic = "force-dynamic";

const PINNED_BASE_URL = "https://api.openai.com/v1";

const spikeSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
});

function envReport() {
  return {
    OPENAI_API_KEY_set: Boolean(process.env.OPENAI_API_KEY),
    OPENAI_BASE_URL_present: Boolean(process.env.OPENAI_BASE_URL), // gateway injection indicator
    OPENAI_BASE_URL_host: process.env.OPENAI_BASE_URL ? new URL(process.env.OPENAI_BASE_URL).host : null,
    NETLIFY_AI_GATEWAY_URL_present: Boolean(process.env.NETLIFY_AI_GATEWAY_URL),
    ANTHROPIC_API_KEY_set: Boolean(process.env.ANTHROPIC_API_KEY),
    CONTEXT: process.env.CONTEXT ?? null,
    DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL ?? null,
    node: process.version,
  };
}

function describeError(e: unknown) {
  const err = e as { name?: string; status?: number; code?: string; type?: string; message?: string; request_id?: string; requestID?: string; headers?: Record<string, string> };
  return {
    name: err?.name ?? "Error",
    status: err?.status ?? null,
    code: err?.code ?? null,
    type: err?.type ?? null,
    requestId: err?.request_id ?? err?.requestID ?? err?.headers?.["x-request-id"] ?? null,
    message: typeof err?.message === "string" ? err.message.slice(0, 300) : null,
  };
}

export async function GET(request: Request) {
  if (process.env.SPIKE_ENABLED !== "1" || process.env.CONTEXT === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await requireUser();

  const url = new URL(request.url);
  const wantImage = url.searchParams.get("image") === "1";
  const model = process.env.OPENAI_MODEL_ROUTINE ?? "gpt-5.6-luna";
  const imageModel = process.env.OPENAI_MODEL_IMAGE ?? "gpt-image-1-mini";

  const report: Record<string, unknown> = { env: envReport(), pinnedBaseURL: PINNED_BASE_URL, model };

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ...report, ok: false, reason: "OPENAI_API_KEY is not set in this deploy context." }, { status: 500 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: PINNED_BASE_URL, maxRetries: 0, timeout: 25_000 });
  report.clientBaseURL = client.baseURL;

  // 1. Structured text call
  const t0 = Date.now();
  try {
    const { data, request_id } = await client.responses
      .parse({
        model,
        instructions: "You write plain copy for a local service business. Use only the facts given. No superlatives.",
        input: "FACTS\nBusiness name: Spike Test Plumbing\nType of work: plumber\nBased in: Testville, CO\n\nWrite a headline under 10 words and a one-sentence subheadline.",
        text: { format: zodTextFormat(spikeSchema, "spike") },
        max_output_tokens: 200,
        store: false,
      })
      .withResponse();
    report.text = {
      ok: true,
      durationMs: Date.now() - t0,
      requestId: request_id,
      responseId: data.id,
      modelReturned: data.model,
      status: data.status,
      incomplete: data.incomplete_details ?? null,
      usage: data.usage ?? null,
      parsed: data.output_parsed ?? null,
    };
  } catch (e) {
    report.text = { ok: false, durationMs: Date.now() - t0, error: describeError(e) };
  }

  // 2. Optional image call (costs money; opt in with ?image=1)
  if (wantImage) {
    const t1 = Date.now();
    try {
      const { data, request_id } = await client.images
        .generate({ model: imageModel, prompt: "Minimal flat vector mark for a plumbing company, single color, no text.", n: 1, size: "1024x1024", quality: "low", background: "transparent", output_format: "png" })
        .withResponse();
      const first = data.data?.[0];
      report.image = {
        ok: true,
        durationMs: Date.now() - t1,
        requestId: request_id,
        usage: data.usage ?? null,
        bytesBase64: first?.b64_json?.length ?? 0,
        hasUrl: Boolean(first?.url),
      };
    } catch (e) {
      report.image = { ok: false, durationMs: Date.now() - t1, error: describeError(e) };
    }
  }

  const ok = (report.text as { ok: boolean }).ok && (!wantImage || (report.image as { ok: boolean }).ok);
  return NextResponse.json({ ok, ...report }, { status: ok ? 200 : 502 });
}
