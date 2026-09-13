// §5.1 / §5.2 — the ONE write path for canonical values, with provenance for tracked fields.
// Tasks (element 12) and /your-business both call saveCanonicalFields. There is exactly one
// stored copy of every fact; editing clears lastConfirmedAt (the value is no longer attested).

import { z } from "zod";
import { BUSINESS_PROFILE_FIELDS, TRACKED_FIELDS, type BusinessProfileField } from "@/content";
import { db } from "./db";

export const hoursSchema = z.record(
  z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  z.union([z.literal("closed"), z.object({ open: z.string().regex(/^\d{2}:\d{2}$/), close: z.string().regex(/^\d{2}:\d{2}$/) })]),
);
export type Hours = z.infer<typeof hoursSchema>;

export const serviceSchema = z.object({ name: z.string().trim().min(1).max(80), description: z.string().trim().max(200).optional() });
export type Service = z.infer<typeof serviceSchema>;

const text = (max: number) => z.string().trim().max(max).nullable();

/** Zod schema per canonical column. Server-side validation for every write (§16.6). */
export const canonicalFieldSchemas = {
  displayName: z.string().trim().min(1).max(120),
  legalName: text(160),
  phone: text(40),
  email: z.string().trim().email().nullable(),
  streetAddress: text(200),
  hideAddress: z.boolean(),
  serviceAreas: z.array(z.string().trim().min(1).max(80)).max(30),
  hours: hoursSchema.nullable(),
  timezone: z.string().trim().min(1).max(64).nullable(), // owner-confirmed IANA; never defaulted (§12.4)
  services: z.array(serviceSchema).max(30),
  pricingApproach: text(200),
  idealCustomer: text(300),
  differentiators: z.array(z.string().trim().min(1).max(160)).max(6).nullable(),
  logoUrl: text(400),
  brandColors: z.object({ primary: z.string().regex(/^#[0-9a-fA-F]{6}$/), secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).nullable(),
  shortDescription: text(300),
  gbpDescription: text(750),
  longDescription: text(3000),
  domain: text(253),
  pageTitle: text(70),
  metaDescription: text(170),
  reviewLink: text(400),
  preferredContact: z.enum(["call", "text", "form", "any"]).nullable(),
  responseCommitment: text(160),
} satisfies Record<BusinessProfileField, z.ZodTypeAny>;

export type CanonicalPatch = Partial<{ [K in BusinessProfileField]: z.infer<(typeof canonicalFieldSchemas)[K]> }>;

const TRACKED = new Set<string>(TRACKED_FIELDS);

/**
 * Validate and write a patch of canonical fields. For each Surface-Map-tracked field that
 * received a non-empty value, upsert its provenance row with setAt = now and lastConfirmedAt
 * cleared. An empty tracked value removes its provenance row (no row without a value, §5.2).
 */
export async function saveCanonicalFields(
  businessId: string,
  rawPatch: Record<string, unknown>,
  source: "owner_entered" | "generated_approved" = "owner_entered",
): Promise<{ ok: true } | { ok: false; errors: Record<string, string> }> {
  const patch: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const [key, value] of Object.entries(rawPatch)) {
    if (!(BUSINESS_PROFILE_FIELDS as readonly string[]).includes(key)) continue;
    const schema = canonicalFieldSchemas[key as BusinessProfileField];
    const normalized = typeof value === "string" && value.trim() === "" && key !== "displayName" ? null : value;
    const parsed = schema.safeParse(normalized);
    if (!parsed.success) errors[key] = parsed.error.issues[0]?.message ?? "Check this value.";
    else patch[key] = parsed.data;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  if (Object.keys(patch).length === 0) return { ok: true };

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.businessProfile.update({ where: { businessId }, data: patch as never });

    for (const [key, value] of Object.entries(patch)) {
      if (!TRACKED.has(key)) continue;
      const empty = value === null || value === undefined || (Array.isArray(value) && value.length === 0);
      if (empty) {
        await tx.fieldProvenance.deleteMany({ where: { businessId, fieldKey: key } });
      } else {
        await tx.fieldProvenance.upsert({
          where: { businessId_fieldKey: { businessId, fieldKey: key } },
          create: { businessId, fieldKey: key, source, setAt: now },
          update: { source, setAt: now, lastConfirmedAt: null, confirmedVia: null },
        });
      }
    }

    // §5.5 — while the address is hidden it is not tracked; drop any stale provenance row.
    if (patch.hideAddress === true) {
      await tx.fieldProvenance.deleteMany({ where: { businessId, fieldKey: "streetAddress" } });
    }
  });

  return { ok: true };
}

// ---------- display helpers (P16 "Your details, ready to use") ----------

const DAY_LABEL: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const hour = ((h! + 11) % 12) + 1;
  const ampm = h! >= 12 ? "pm" : "am";
  return m ? `${hour}:${String(m).padStart(2, "0")}${ampm}` : `${hour}${ampm}`;
}

/** "Mon–Fri 8am–6pm · Sat 8am–2pm · Sun closed" — groups consecutive days with identical hours. */
export function formatHours(hours: unknown): string {
  const parsed = hoursSchema.safeParse(hours);
  if (!parsed.success) return "";
  const h = parsed.data;
  const key = (d: (typeof DAY_ORDER)[number]) => {
    const v = h[d];
    if (!v) return "unset";
    return v === "closed" ? "closed" : `${v.open}-${v.close}`;
  };
  const groups: { start: string; end: string; k: string }[] = [];
  for (const d of DAY_ORDER) {
    const k = key(d);
    const last = groups.at(-1);
    if (last && last.k === k) last.end = d;
    else groups.push({ start: d, end: d, k });
  }
  return groups
    .filter((g) => g.k !== "unset")
    .map((g) => {
      const days = g.start === g.end ? DAY_LABEL[g.start] : `${DAY_LABEL[g.start]}–${DAY_LABEL[g.end]}`;
      if (g.k === "closed") return `${days} closed`;
      const [o, c] = g.k.split("-");
      return `${days} ${fmtTime(o!)}–${fmtTime(c!)}`;
    })
    .join(" · ");
}

/** Plain-text rendering of any canonical value for display and copying. */
export function formatCanonicalValue(field: BusinessProfileField | "city" | "state", value: unknown): string {
  if (value === null || value === undefined) return "";
  switch (field) {
    case "hours":
      return formatHours(value);
    case "serviceAreas":
    case "differentiators":
      return Array.isArray(value) ? (value as string[]).join(", ") : "";
    case "services":
      return Array.isArray(value) ? (value as Service[]).map((s) => s.name).join(", ") : "";
    case "hideAddress":
      return value ? "Address hidden (service-area business)" : "Address shown";
    case "brandColors": {
      const c = value as { primary?: string; secondary?: string };
      return [c.primary, c.secondary].filter(Boolean).join(" · ");
    }
    case "preferredContact": {
      const map: Record<string, string> = { call: "Call", text: "Text", form: "Website form", any: "Any" };
      return map[String(value)] ?? String(value);
    }
    default:
      return String(value);
  }
}

export const FIELD_LABEL: Record<BusinessProfileField | "city" | "state", string> = {
  displayName: "Business name",
  legalName: "Legal name",
  phone: "Phone",
  email: "Email",
  streetAddress: "Address",
  hideAddress: "Address visibility",
  serviceAreas: "Service area",
  hours: "Hours",
  timezone: "Time zone",
  services: "Services",
  pricingApproach: "Pricing approach",
  idealCustomer: "Who you help",
  differentiators: "Why you",
  logoUrl: "Logo",
  brandColors: "Brand colors",
  shortDescription: "Short description",
  gbpDescription: "Google description",
  longDescription: "Long description",
  domain: "Website",
  pageTitle: "Page title",
  metaDescription: "Page description",
  reviewLink: "Review link",
  preferredContact: "Preferred contact",
  responseCommitment: "Response commitment",
  city: "City",
  state: "State",
};

/** Where each fact is used — the P4 usage note. Derived from the Surface Map where tracked. */
export const FIELD_USAGE_NOTE: Partial<Record<BusinessProfileField, string>> = {
  phone: "Appears on your website, Google profile, and Facebook page.",
  email: "Appears on your website and is where quote requests arrive.",
  displayName: "Appears everywhere — website, Google, Facebook, Instagram.",
  streetAddress: "Shown on your website and Google profile when you choose to show it.",
  serviceAreas: "Appears on your website and Google profile.",
  hours: "Appears on your website, Google profile, and Facebook page.",
  domain: "Linked from your Google, Facebook, and Instagram profiles.",
  reviewLink: "Used in your review requests and on your website.",
  shortDescription: "Your Facebook and Instagram bios.",
  gbpDescription: "Your Google Business Profile description.",
  services: "Your website services section and your Google profile services.",
};
