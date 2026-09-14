// V4 §A3 — bounded AI logo generation. Structured inputs only (no free-text prompt), a small closed set of
// mark styles, cheap model, few candidates. Runs through the same pinned client, timeouts, and error
// mapping as text. Never blocks the builder: upload / text / none / existing always work without it.
import "server-only";
import OpenAI from "openai";
import { AiError } from "./errors";
import { mapProviderError, OPENAI_BASE_URL } from "./provider";

import { LOGO_STYLES, type LogoStyle } from "../site/logo-styles";
export { LOGO_STYLES, LOGO_STYLE_LABEL, type LogoStyle } from "../site/logo-styles";

export interface LogoRequest {
  businessName: string;
  tradeNoun: string;
  style: LogoStyle;
  primaryHex: string; // validated #rrggbb
  candidates: 1 | 2;
  userKey: string;
}

export interface LogoResult {
  images: Uint8Array[];
  model: string;
  requestId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
}

function sanitize(s: string): string {
  return s.replace(/[^\p{L}\p{N} '&.-]/gu, "").slice(0, 60);
}

/** The prompt is assembled from validated fields only; owner text is limited to the business name. */
export function logoPrompt(req: LogoRequest): string {
  const name = sanitize(req.businessName);
  const trade = sanitize(req.tradeNoun);
  const shape = { mark: `a single flat vector symbol suggesting a ${trade}, no text`, wordmark: `the words "${name}" as a bold, clean wordmark, no other elements`, badge: `a round badge containing the words "${name}", simple line work`, monogram: `a monogram of the initials of "${name}", geometric, no other text` }[req.style];
  return `Minimal professional logo for a small local ${trade} business: ${shape}. Flat design, one colour (${req.primaryHex}) on a transparent background, centred, generous margin, no gradients, no photorealism, no watermark, no extra text.`;
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new AiError("config", { internal: "OPENAI_API_KEY is not set" });
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: OPENAI_BASE_URL, maxRetries: 0 });
  }
  return client;
}

export function imageModel(): string {
  return process.env.OPENAI_MODEL_IMAGE ?? "gpt-image-1-mini";
}

export async function generateLogoCandidates(req: LogoRequest, deps: { generate?: (body: Record<string, unknown>) => Promise<{ data: { data?: { b64_json?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } }; request_id: string | null }> } = {}): Promise<LogoResult> {
  const model = imageModel();
  const started = Date.now();
  const body = { model, prompt: logoPrompt(req), n: req.candidates, size: "1024x1024", quality: "low", background: "transparent", output_format: "png" };
  try {
    const call = deps.generate ?? (async (b: Record<string, unknown>) => {
      const r = await getClient().images.generate(b as never, { timeout: 40_000 }).withResponse();
      return { data: r.data as never, request_id: r.request_id };
    });
    const { data, request_id } = await call(body);
    const images = (data.data ?? []).map((d) => d.b64_json).filter((s): s is string => Boolean(s)).map((b64) => new Uint8Array(Buffer.from(b64, "base64")));
    if (!images.length) throw new AiError("schema", { requestId: request_id, internal: "image response had no b64 data" });
    return { images, model, requestId: request_id, inputTokens: data.usage?.input_tokens ?? null, outputTokens: data.usage?.output_tokens ?? null, durationMs: Date.now() - started };
  } catch (e) {
    throw mapProviderError(e);
  }
}
