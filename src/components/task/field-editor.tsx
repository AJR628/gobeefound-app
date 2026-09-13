"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { BusinessProfileField, AssetType } from "@/content";
import { FIELD_LABEL, FIELD_USAGE_NOTE, type Hours, type Service } from "@/lib/canonical";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { ChoiceGroup } from "@/components/ui/choice";
import { saveTaskFields, type SaveFieldsState } from "@/app/(app)/t/[taskId]/actions";

// §10.2 element 12 — "Save your info". Prefilled from the canonical record (P16).
// Complex values are serialized into hidden inputs; the server validates everything (§16.6).

type Values = Partial<Record<BusinessProfileField, unknown>>;

export function FieldEditor({
  taskId,
  fields,
  initial,
  serviceAreaType,
  createsAsset,
  existingAssetUrl,
}: {
  taskId: string;
  fields: BusinessProfileField[];
  initial: Values;
  serviceAreaType: "atCustomer" | "atMyLocation" | "both";
  createsAsset?: AssetType;
  existingAssetUrl?: string | null;
}) {
  const bound = saveTaskFields.bind(null, taskId);
  const [state, formAction, pending] = useActionState<SaveFieldsState, FormData>(bound, undefined);
  const visible = fields.filter((f) => f !== "logoUrl");

  if (visible.length === 0 && !createsAsset) return null;

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-ink-100 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Save your info</h2>

      {visible.map((f) => (
        <Field key={f} field={f} initial={initial} serviceAreaType={serviceAreaType} error={state?.errors?.[f]} />
      ))}

      {fields.includes("logoUrl") && (
        <p className="text-sm text-ink-500">
          Have a logo file? Upload it in <a href="/your-business" className="underline">Your Business</a> (PNG or JPEG).
        </p>
      )}

      {createsAsset && (
        <div>
          <Label htmlFor="assetUrl">{ASSET_PROMPT[createsAsset]}</Label>
          <Input id="assetUrl" name="assetUrl" type="url" inputMode="url" defaultValue={existingAssetUrl ?? ""} placeholder="https://" />
          <p className="mt-1.5 text-xs text-ink-500">We save the link exactly as you give it. We never guess or look it up.</p>
          <FieldError>{state?.errors?.assetUrl}</FieldError>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state?.ok && <span className="text-sm text-good-500">Saved to Your Business.</span>}
      </div>
    </form>
  );
}

const ASSET_PROMPT: Record<AssetType, string> = {
  website: "Your website address",
  gbp: "Your Google Business Profile link",
  facebook: "Your Facebook page link",
  instagram: "Your Instagram link",
  booking: "Your booking link",
  other: "Link",
};

function Field({
  field,
  initial,
  serviceAreaType,
  error,
}: {
  field: BusinessProfileField;
  initial: Values;
  serviceAreaType: "atCustomer" | "atMyLocation" | "both";
  error?: string;
}) {
  const label = FIELD_LABEL[field];
  const note = FIELD_USAGE_NOTE[field];
  const v = initial[field];

  switch (field) {
    case "hours":
      return <HoursEditor initial={(v as Hours | null) ?? null} error={error} />;
    case "timezone":
      return <TimezoneSelect initial={(v as string | null) ?? null} error={error} />;
    case "hideAddress":
      return (
        <AddressEditor
          hideAddress={initial.hideAddress as boolean | undefined}
          streetAddress={(initial.streetAddress as string | null) ?? ""}
          serviceAreaType={serviceAreaType}
          error={error}
        />
      );
    case "streetAddress":
      return null; // rendered by AddressEditor alongside hideAddress (task 4.3 owns both)
    case "services":
      return <ServicesEditor initial={(v as Service[]) ?? []} error={error} />;
    case "serviceAreas":
    case "differentiators":
      return (
        <div>
          <Label htmlFor={field}>{label}</Label>
          <textarea
            id={field}
            name={field}
            rows={4}
            defaultValue={Array.isArray(v) ? (v as string[]).join("\n") : ""}
            placeholder="One per line"
            className="w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-base focus:border-ink-900 focus:outline-none"
          />
          {note && <p className="mt-1.5 text-xs text-ink-500">{note}</p>}
          <FieldError>{error}</FieldError>
        </div>
      );
    case "brandColors": {
      const c = (v as { primary?: string; secondary?: string } | null) ?? {};
      return <ColorsEditor initial={{ primary: c.primary ?? "#1f2328", secondary: c.secondary ?? "#f5b800" }} error={error} />;
    }
    case "preferredContact":
      return <PreferredContactEditor initial={(v as string | null) ?? null} error={error} />;
    case "shortDescription":
    case "gbpDescription":
    case "longDescription":
    case "idealCustomer":
    case "responseCommitment":
    case "pricingApproach":
      return (
        <div>
          <Label htmlFor={field}>{label}</Label>
          <textarea
            id={field}
            name={field}
            rows={field === "longDescription" ? 6 : 3}
            defaultValue={(v as string | null) ?? ""}
            className="w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-base focus:border-ink-900 focus:outline-none"
          />
          {note && <p className="mt-1.5 text-xs text-ink-500">{note}</p>}
          <FieldError>{error}</FieldError>
        </div>
      );
    default: {
      const type = field === "email" ? "email" : field === "phone" ? "tel" : field === "domain" || field === "reviewLink" ? "url" : "text";
      return (
        <div>
          <Label htmlFor={field}>{label}</Label>
          <Input id={field} name={field} type={type} defaultValue={(v as string | null) ?? ""} inputMode={type === "tel" ? "tel" : type === "email" ? "email" : undefined} />
          {note && <p className="mt-1.5 text-xs text-ink-500">{note}</p>}
          <FieldError>{error}</FieldError>
        </div>
      );
    }
  }
}

// ---------- sub-editors ----------

const DAYS: { k: keyof Hours; l: string }[] = [
  { k: "mon", l: "Mon" }, { k: "tue", l: "Tue" }, { k: "wed", l: "Wed" }, { k: "thu", l: "Thu" },
  { k: "fri", l: "Fri" }, { k: "sat", l: "Sat" }, { k: "sun", l: "Sun" },
];

function HoursEditor({ initial, error }: { initial: Hours | null; error?: string }) {
  const [hours, setHours] = useState<Hours>(
    initial ?? { mon: { open: "08:00", close: "18:00" }, tue: { open: "08:00", close: "18:00" }, wed: { open: "08:00", close: "18:00" }, thu: { open: "08:00", close: "18:00" }, fri: { open: "08:00", close: "18:00" }, sat: "closed", sun: "closed" },
  );
  return (
    <div>
      <Label>Hours you'll answer the phone</Label>
      <div className="divide-y divide-ink-100 rounded-xl border border-ink-300 bg-white">
        {DAYS.map(({ k, l }) => {
          const d = hours[k];
          const closed = d === "closed" || d === undefined;
          return (
            <div key={k} className="flex items-center gap-2 px-3 py-2">
              <span className="w-10 text-sm font-medium">{l}</span>
              <button
                type="button"
                onClick={() => setHours({ ...hours, [k]: closed ? { open: "08:00", close: "18:00" } : "closed" })}
                className={`h-9 rounded-md px-2 text-xs font-medium ${closed ? "bg-ink-100 text-ink-500" : "bg-good-500/10 text-good-500"}`}
              >
                {closed ? "Closed" : "Open"}
              </button>
              {!closed && typeof d === "object" && (
                <>
                  <input type="time" value={d.open} onChange={(e) => setHours({ ...hours, [k]: { ...d, open: e.target.value } })} className="h-9 rounded-md border border-ink-300 px-1 text-sm" />
                  <span className="text-ink-500">–</span>
                  <input type="time" value={d.close} onChange={(e) => setHours({ ...hours, [k]: { ...d, close: e.target.value } })} className="h-9 rounded-md border border-ink-300 px-1 text-sm" />
                </>
              )}
            </div>
          );
        })}
      </div>
      <input type="hidden" name="hours" value={JSON.stringify(hours)} />
      <p className="mt-1.5 text-xs text-ink-500">{FIELD_USAGE_NOTE.hours}</p>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function TimezoneSelect({ initial, error }: { initial: string | null; error?: string }) {
  // §12.4 — browser detection is a SUGGESTION. Nothing is stored until the owner saves this form.
  const [suggested, setSuggested] = useState<string | null>(null);
  useEffect(() => {
    try { setSuggested(Intl.DateTimeFormat().resolvedOptions().timeZone ?? null); } catch { /* ignore */ }
  }, []);
  const zones = useMemo(() => {
    try {
      const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
      const us = all.filter((z) => z.startsWith("America/") || z.startsWith("Pacific/Honolulu") || z.startsWith("US/"));
      return us.length ? us : all;
    } catch {
      return ["America/New_York", "America/Chicago", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"];
    }
  }, []);
  const [value, setValue] = useState<string>(initial ?? "");
  useEffect(() => { if (!initial && suggested && !value) setValue(suggested); }, [suggested, initial, value]);

  return (
    <div>
      <Label htmlFor="timezone">Time zone</Label>
      <select id="timezone" name="timezone" value={value} onChange={(e) => setValue(e.target.value)} className="h-12 w-full rounded-xl border border-ink-300 bg-white px-3 text-base focus:border-ink-900 focus:outline-none">
        <option value="">Choose your time zone</option>
        {zones.map((z) => (
          <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
        ))}
      </select>
      <input type="hidden" name="timezoneSuggested" value={suggested ?? ""} />
      {!initial && suggested && value === suggested && (
        <p className="mt-1.5 text-xs text-ink-500">Suggested from your device — check it's right before you save.</p>
      )}
      <FieldError>{error}</FieldError>
    </div>
  );
}

function AddressEditor({
  hideAddress,
  streetAddress,
  serviceAreaType,
  error,
}: {
  hideAddress: boolean | undefined;
  streetAddress: string;
  serviceAreaType: "atCustomer" | "atMyLocation" | "both";
  error?: string;
}) {
  // Task 4.3 owns this decision (§8, §12.4). Recommend hiding for service-area businesses.
  const recommendedHide = serviceAreaType === "atCustomer";
  const [hide, setHide] = useState<"hide" | "show">(hideAddress === undefined ? (recommendedHide ? "hide" : "show") : hideAddress ? "hide" : "show");
  return (
    <div>
      <Label>Should your address show publicly?</Label>
      <ChoiceGroup
        name="hideAddress"
        value={hide}
        onChange={setHide}
        options={[
          { value: "hide", label: "No — I go to my customers", hint: recommendedHide ? "Recommended for you. Google requires this for service-area businesses." : "Google hides it; you still give Google an address for verification." },
          { value: "show", label: "Yes — customers come to my location", hint: !recommendedHide ? "Recommended for you." : undefined },
        ]}
      />
      <input type="hidden" name="hideAddress" value={hide === "hide" ? "true" : "false"} />
      {hide === "show" && (
        <div className="mt-3">
          <Label htmlFor="streetAddress">Street address</Label>
          <Input id="streetAddress" name="streetAddress" defaultValue={streetAddress} autoComplete="street-address" />
          <p className="mt-1.5 text-xs text-ink-500">{FIELD_USAGE_NOTE.streetAddress}</p>
        </div>
      )}
      {hide === "hide" && <p className="mt-2 text-xs text-ink-500">You don't need to give us an address. Enter it directly in Google for verification only.</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}

function ServicesEditor({ initial, error }: { initial: Service[]; error?: string }) {
  const [services, setServices] = useState<Service[]>(initial.length ? initial : [{ name: "" }]);
  const update = (i: number, patch: Partial<Service>) => setServices(services.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div>
      <Label>Your services</Label>
      <div className="space-y-2">
        {services.map((s, i) => (
          <div key={i} className="rounded-xl border border-ink-300 bg-white p-2">
            <div className="flex gap-2">
              <Input aria-label={`Service ${i + 1} name`} value={s.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="e.g. TV mounting" />
              <button type="button" aria-label="Remove service" onClick={() => setServices(services.filter((_, j) => j !== i))} className="h-12 w-12 shrink-0 rounded-xl text-ink-500 hover:bg-ink-100">✕</button>
            </div>
            <input
              aria-label={`Service ${i + 1} description`}
              value={s.description ?? ""}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="One line, only if the name isn't obvious"
              className="mt-2 h-10 w-full rounded-lg border border-ink-100 px-3 text-sm focus:border-ink-900 focus:outline-none"
            />
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setServices([...services, { name: "" }])} className="mt-2 h-11 rounded-lg px-3 text-sm font-medium text-ink-700 hover:bg-ink-100">
        + Add a service
      </button>
      <input type="hidden" name="services" value={JSON.stringify(services.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), ...(s.description?.trim() ? { description: s.description.trim() } : {}) })))} />
      <p className="mt-1.5 text-xs text-ink-500">{FIELD_USAGE_NOTE.services}</p>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function ColorsEditor({ initial, error }: { initial: { primary: string; secondary: string }; error?: string }) {
  const [c, setC] = useState(initial);
  return (
    <div>
      <Label>Two colors</Label>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="color" value={c.primary} onChange={(e) => setC({ ...c, primary: e.target.value })} className="h-11 w-14 rounded-lg border border-ink-300" /> Main
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="color" value={c.secondary} onChange={(e) => setC({ ...c, secondary: e.target.value })} className="h-11 w-14 rounded-lg border border-ink-300" /> Accent
        </label>
      </div>
      <input type="hidden" name="brandColors" value={JSON.stringify(c)} />
      <FieldError>{error}</FieldError>
    </div>
  );
}

function PreferredContactEditor({ initial, error }: { initial: string | null; error?: string }) {
  const [v, setV] = useState<"call" | "text" | "form" | "any">((initial as "call" | "text" | "form" | "any" | null) ?? "call");
  return (
    <div>
      <Label>How would you rather be reached?</Label>
      <ChoiceGroup
        name="preferredContact"
        value={v}
        columns={2}
        onChange={setV}
        options={[
          { value: "call", label: "Call" },
          { value: "text", label: "Text" },
          { value: "form", label: "Website form" },
          { value: "any", label: "Any of these" },
        ]}
      />
      <input type="hidden" name="preferredContact" value={v} />
      <FieldError>{error}</FieldError>
    </div>
  );
}
