// V4 §J / plan §18 — the AI error taxonomy. Every failure the provider layer can produce maps to
// exactly one kind, with a user-safe message and an HTTP status. Internal detail (provider message,
// request id, cause) is for logs only and must never be rendered to the owner.

export type AiErrorKind =
  | "config" // 401/403, missing key — our misconfiguration
  | "rate_limit" // 429, genuine rate limit — retryable with backoff
  | "quota" // 429 with a billing/spend-limit code — NOT retryable
  | "timeout" // client deadline exceeded
  | "unavailable" // 5xx / connection failure
  | "refusal" // the model declined
  | "schema" // output failed strict validation after a repair attempt
  | "truncated" // output hit the token limit
  | "claims" // deterministic claims scanner rejected the output
  | "allowance" // the owner's allowance is exhausted (Phase 3)
  | "unknown";

/** Exactly what the owner sees. Plain, specific, never the provider's words. */
export const AI_USER_MESSAGES: Record<AiErrorKind, string> = {
  config: "The writing tool isn't set up correctly right now. We've been notified — please try again later.",
  rate_limit: "Lots of people are writing right now. Give it a moment and try again.",
  quota: "The writing tool is temporarily unavailable. We've been notified — please try again later.",
  timeout: "That took too long. Please try again.",
  unavailable: "The writing tool is having trouble right now. Please try again shortly.",
  refusal: "We couldn't write that from the details provided. Try adjusting what you've told us about your business.",
  schema: "We couldn't put that together cleanly. Please try again.",
  truncated: "That draft got cut off. Please try again.",
  claims: "The draft made a claim we can't back up. Please try again.",
  allowance: "You've used all of your AI drafts. You can still edit everything by hand.",
  unknown: "We couldn't generate that just now. Please try again.",
};

export const AI_HTTP_STATUS: Record<AiErrorKind, number> = {
  config: 500,
  rate_limit: 429,
  quota: 503,
  timeout: 504,
  unavailable: 502,
  refusal: 422,
  schema: 502,
  truncated: 502,
  claims: 422,
  allowance: 429,
  unknown: 502,
};

/** Whether ONE retry is permitted for this kind. Auth, validation, quota, refusal: never. */
export const AI_RETRYABLE: Record<AiErrorKind, boolean> = {
  config: false,
  rate_limit: true,
  quota: false,
  timeout: true,
  unavailable: true,
  refusal: false,
  schema: true, // one repair attempt, with a hint — not a blind re-run
  truncated: true, // one attempt with a larger output budget
  claims: false,
  allowance: false,
  unknown: false,
};

export interface AiErrorDetail {
  /** Provider request id (x-request-id), when known. Logged, returned to the owner as a support reference. */
  requestId?: string | null;
  /** Provider HTTP status, when known. */
  providerStatus?: number | null;
  /** Provider error code (e.g. insufficient_quota), when known. */
  providerCode?: string | null;
  /** Internal, log-only description. NEVER shown to the owner. */
  internal?: string;
  cause?: unknown;
}

export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly userMessage: string;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly detail: AiErrorDetail;

  constructor(kind: AiErrorKind, detail: AiErrorDetail = {}, userMessage?: string) {
    const msg = userMessage ?? AI_USER_MESSAGES[kind];
    super(msg);
    this.name = "AiError";
    this.kind = kind;
    this.userMessage = msg;
    this.httpStatus = AI_HTTP_STATUS[kind];
    this.retryable = AI_RETRYABLE[kind];
    this.detail = detail;
  }
}

/**
 * Backwards-compatible name used by generators.ts since V1. `message` is always the user-safe
 * message, so existing `e instanceof GenerationError ? e.message : …` call sites stay correct.
 */
export const GenerationError = AiError;
export type GenerationError = AiError;

export function isAiError(e: unknown): e is AiError {
  return e instanceof AiError;
}
