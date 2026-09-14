// §13 / V4 §J — the output contracts for every structured generator. Zod is the validation truth;
// the provider derives a strict JSON Schema from these for the model, then re-validates with them.
import { z } from "zod";

export const websiteCopySchema = z.object({
  headline: z.string().min(1).max(200),
  subheadline: z.string().min(1).max(400),
  serviceBlurbs: z.array(z.object({ name: z.string().min(1), blurb: z.string().min(1).max(400) })).min(1).max(30),
  about: z.string().min(1).max(2000),
  callToAction: z.string().min(1).max(120),
});
export type WebsiteCopy = z.infer<typeof websiteCopySchema>;

export const descriptionsSchema = z.object({
  short: z.string().min(1).max(300),
  google: z.string().min(1).max(750),
  long: z.string().min(1).max(3000),
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
