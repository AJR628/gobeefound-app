// V4 §J — the single AI boundary the rest of the app talks to. Server-side only. Typed in, typed
// out, Zod-validated, with usage and request ids returned alongside the data.
//
// Provider selection is an env switch so the OpenAI migration is reversible without a deploy:
//   AI_PROVIDER=openai (default) | anthropic (legacy, one release only)
import "server-only";
import type { z } from "zod";
import type { PromptParts, StructuredRequest, StructuredResult } from "./ai/types";

export { AiError, GenerationError, isAiError, AI_USER_MESSAGES } from "./ai/errors";
export type { AiErrorKind } from "./ai/errors";
export { websiteCopySchema, descriptionsSchema, reviewRequestsSchema, seoMetaSchema, gbpKitSchema } from "./ai/schemas";
export type { WebsiteCopy, Descriptions, ReviewRequests, SeoMeta, GbpKit } from "./ai/schemas";
export type { PromptParts, GenerationMeta, StructuredResult, StructuredRequest } from "./ai/types";

export type AiProvider = "openai" | "anthropic";

export function aiProvider(): AiProvider {
  return process.env.AI_PROVIDER === "anthropic" ? "anthropic" : "openai";
}

export interface GenerateOptions {
  schemaName: string;
  operation?: "routine" | "site";
  maxOutputTokens?: number;
  timeoutMs?: number;
  /** Stable tenant key (business id). Hashed before use. */
  userKey?: string;
}

/** Runs the prompt through the configured provider. Throws AiError; never leaks provider detail. */
export async function generateStructured<T>(prompt: PromptParts, schema: z.ZodType<T>, opts: GenerateOptions): Promise<StructuredResult<T>> {
  const req: StructuredRequest<T> = { prompt, schema, ...opts };
  if (aiProvider() === "anthropic") {
    const { anthropicGenerateStructured } = await import("./ai/anthropic-legacy");
    return anthropicGenerateStructured(req);
  }
  const { openaiGenerateStructured } = await import("./ai/provider");
  return openaiGenerateStructured(req);
}
