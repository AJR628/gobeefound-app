// §13 / V4 §J — the output contracts for every structured generator. Zod is the validation truth;
// the provider derives a strict JSON Schema from these for the model, then re-validates with them.
// Length caps mirror the canonical column caps in src/lib/canonical.ts where an output is saved.
import { z } from "zod";

export const websiteCopySchema = z.object({
  headline: z.string().min(1).max(200),
  subheadline: z.string().min(1).max(400),
  serviceBlurbs: z.array(z.object({ name: z.string().min(1).max(80), blurb: z.string().min(1).max(200) })).min(1).max(30),
  about: z.string().min(1).max(2000),
  callToAction: z.string().min(1).max(120),
});
export type WebsiteCopy = z.infer<typeof websiteCopySchema>;

/** The social bio. (Google description moved to gbp_kit; the website About lives in website_copy — one writer per field.) */
export const descriptionsSchema = z.object({
  short: z.string().min(1).max(300),
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

/** Task 3.6 — browser-tab title and search snippet. Caps match BusinessProfile.pageTitle/metaDescription. */
export const seoMetaSchema = z.object({
  pageTitle: z.string().min(1).max(70),
  metaDescription: z.string().min(1).max(170),
});
export type SeoMeta = z.infer<typeof seoMetaSchema>;

/**
 * Tasks 4.3–4.5 — the Google Profile Kit. Everything here is text the OWNER pastes into Google by hand.
 * Category suggestions are things to look for in Google's own picker; the app never claims they will be accepted.
 */
export const gbpKitSchema = z.object({
  description: z.string().min(1).max(750),
  serviceDescriptions: z.array(z.object({ name: z.string().min(1).max(80), description: z.string().min(1).max(200) })).min(1).max(30),
  categorySuggestions: z.array(z.object({ name: z.string().min(1).max(60), why: z.string().min(1).max(160) })).min(1).max(3),
  photoChecklist: z.array(z.object({ shot: z.string().min(1).max(80), caption: z.string().min(1).max(120) })).min(4).max(8),
});
export type GbpKit = z.infer<typeof gbpKitSchema>;
