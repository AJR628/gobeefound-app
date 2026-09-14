// V4 §E — server-side price table for cost ESTIMATION. USD per 1M tokens, from OpenAI's published
// pricing on 2026-09-13 (developers.openai.com/api/docs/pricing). A price change is an edit here, not a
// migration. Unknown models estimate to null rather than to a wrong number. Never shown to customers.

export interface ModelPrice {
  inputPerM: number;
  cachedInputPerM: number;
  outputPerM: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "gpt-6-astra": { inputPerM: 10, cachedInputPerM: 1, outputPerM: 50 },
  "gpt-5.6-sol": { inputPerM: 4, cachedInputPerM: 0.4, outputPerM: 20 },
  "gpt-5.6-terra": { inputPerM: 2, cachedInputPerM: 0.2, outputPerM: 12 },
  "gpt-5.6-luna": { inputPerM: 0.2, cachedInputPerM: 0.02, outputPerM: 1.2 },
  "gpt-5": { inputPerM: 1.25, cachedInputPerM: 0.125, outputPerM: 10 },
  "gpt-5-mini": { inputPerM: 0.25, cachedInputPerM: 0.025, outputPerM: 2 },
  "gpt-5-nano": { inputPerM: 0.05, cachedInputPerM: 0.005, outputPerM: 0.4 },
  "gpt-4.1": { inputPerM: 2, cachedInputPerM: 0.5, outputPerM: 8 },
  // Legacy path, for the one release it remains (Anthropic published pricing).
  "claude-sonnet-4-5": { inputPerM: 3, cachedInputPerM: 0.3, outputPerM: 15 },
};

/** Resolve a dated snapshot ("gpt-5.6-luna-2026-02-16") to its family price. */
export function priceFor(model: string | null | undefined): ModelPrice | null {
  if (!model) return null;
  if (MODEL_PRICES[model]) return MODEL_PRICES[model]!;
  const family = model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  return MODEL_PRICES[family] ?? null;
}

export interface UsageTokens {
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
}

/** USD micro-dollars (1e-6 USD). Cached tokens are billed at the cached rate; the rest at the input rate. */
export function estimateCostMicros(model: string | null | undefined, u: UsageTokens): number | null {
  const p = priceFor(model);
  if (!p || u.inputTokens === null || u.outputTokens === null) return null;
  const cached = Math.min(u.cachedTokens ?? 0, u.inputTokens);
  const uncached = u.inputTokens - cached;
  const usd = (uncached * p.inputPerM + cached * p.cachedInputPerM + u.outputTokens * p.outputPerM) / 1_000_000;
  return Math.round(usd * 1_000_000);
}
