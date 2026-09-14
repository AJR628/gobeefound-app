import type { z } from "zod";

/** A prompt is two channels: rules (instructions) and owner data (input). Never mixed. */
export interface PromptParts {
  instructions: string;
  input: string;
}

export type AiOperation = "routine" | "site";

export interface StructuredRequest<T> {
  prompt: PromptParts;
  schema: z.ZodType<T>;
  /** Short identifier for the schema, e.g. "website_copy". */
  schemaName: string;
  operation?: AiOperation;
  maxOutputTokens?: number;
  timeoutMs?: number;
  /** Stable per-tenant key; hashed before it reaches the provider. Never an email. */
  userKey?: string;
}

export interface GenerationMeta {
  provider: "openai" | "anthropic";
  model: string;
  promptVersion: string;
  requestId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  reasoningTokens: number | null;
  durationMs: number;
  attempts: number;
}

export interface StructuredResult<T> {
  data: T;
  meta: GenerationMeta;
}
