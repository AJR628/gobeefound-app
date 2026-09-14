"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChoiceGroup } from "@/components/ui/choice";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { PALETTES, THEMES } from "@/components/site/themes";
import { LOGO_STYLES, LOGO_STYLE_LABEL } from "@/lib/site/logo-styles";
import type { PaletteId, SiteSetup, ThemeId, Voice } from "@/lib/site/spec";
import { saveSetup } from "./actions";

// V4 §A3 — guided setup. Every question is a tap; nothing here is a fact GoBeeFound already knows
// (guardrail-tested). Changing a choice is free. The AI logo path is one of five and never blocks the rest.

type Allowance = { label: string; used: number; limit: number };

export function SetupWizard({
  setup,
  serviceNames,
  hasLogo,
  hasBrandColors,
  hasPhone,
  hasEmail,
  hasHours,
  hasAddress,
  hasReviewLink,
  logoUrl,
  heroUrl,
  logoAllowance,
  compact,
}: {
  setup: SiteSetup;
  serviceNames: string[];
  hasLogo: boolean;
  hasBrandColors: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasHours: boolean;
  hasAddress: boolean;
  hasReviewLink: boolean;
  logoUrl: string | null;
  heroUrl: string | null;
  logoAllowance: Allowance;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<SiteSetup>(setup);

  function apply(patch: Partial<SiteSetup>) {
    const next = { ...local, ...patch };
    setLocal(next);
    setError(null);
    start(async () => {
      const r = await saveSetup(patch);
      if (!r.ok) setError(r.error ?? "That didn't save.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Step n={1} title="Pick a style" hint="You can change this any time. It's free.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const t = THEMES[id];
            const active = local.theme === id;
            return (
              <button key={id} type="button" onClick={() => apply({ theme: id })} aria-pressed={active} className={`min-h-24 rounded-xl border p-3 text-left transition-colors ${active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-300 bg-white hover:border-ink-500"}`}>
                <span className="block text-base font-semibold" style={{ fontFamily: t.fontDisplay }}>{t.label}</span>
                <span className={`mt-1 block text-xs ${active ? "text-white/80" : "text-ink-500"}`}>{t.hint}</span>
              </button>
            );
          })}
        </div>
      </Step>

      <Step n={2} title="Colours">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {hasBrandColors && <Swatch id="brand" label="My brand colours" primary="#171210" accent="#f7a012" active={local.palette === "brand"} onPick={() => apply({ palette: "brand" })} />}
          {(Object.keys(PALETTES) as Exclude<PaletteId, "brand">[]).map((id) => (
            <Swatch key={id} id={id} label={PALETTES[id].label} primary={PALETTES[id].primary} accent={PALETTES[id].accent} active={local.palette === id} onPick={() => apply({ palette: id })} />
          ))}
        </div>
      </Step>

      <Step n={3} title="Logo" hint="You don't need one. Your name in a clean font works fine for year one.">
        <ChoiceGroup
          name="Logo"
          value={local.logoMode}
          columns={2}
          onChange={(v) => apply({ logoMode: v })}
          options={[
            ...(hasLogo ? [{ value: "existing" as const, label: "Use my logo", hint: "The one in Your Business" }] : []),
            { value: "text" as const, label: "Text logo", hint: "Your name, styled" },
            { value: "none" as const, label: "No logo" },
            { value: "upload" as const, label: "Upload a logo", hint: "PNG or JPEG" },
            { value: "generated" as const, label: "Design one for me", hint: logoAllowance.label },
          ]}
        />
        {local.logoMode === "upload" && <LogoUploader currentUrl={logoUrl} onDone={() => apply({ logoMode: "existing" })} />}
        {local.logoMode === "generated" && <LogoDesigner palette={local.palette} allowance={logoAllowance} currentUrl={logoUrl} />}
        {(local.logoMode === "existing" || local.logoMode === "generated") && logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Your logo" className="mt-3 h-16 w-auto rounded-lg border border-ink-100 bg-white object-contain p-1" />
        )}
      </Step>

      <Step n={4} title="Top of the page" hint="A photo of your vehicle or your best finished job works well. No photo is fine too.">
        <ChoiceGroup name="Hero" value={local.heroStyle} columns={2} onChange={(v) => (v === "text" ? apply({ heroStyle: "text" }) : setLocal({ ...local, heroStyle: "photo" }))} options={[{ value: "text", label: "Clean headline", hint: "Big words, no photo" }, { value: "photo", label: "With a photo" }]} />
        {local.heroStyle === "photo" && <HeroUploader currentUrl={heroUrl} />}
      </Step>

      {serviceNames.length > 1 && (
        <Step n={5} title="Star up to three services" hint="Starred services get a highlight. Everything else still shows.">
          <div className="flex flex-wrap gap-2">
            {serviceNames.map((name) => {
              const on = local.featuredServices.includes(name);
              return (
                <button key={name} type="button" aria-pressed={on} onClick={() => apply({ featuredServices: on ? local.featuredServices.filter((s) => s !== name) : local.featuredServices.length < 3 ? [...local.featuredServices, name] : local.featuredServices })} className={`min-h-11 rounded-full border px-4 text-sm font-medium ${on ? "border-ink-900 bg-ink-900 text-white" : "border-ink-300 bg-white hover:border-ink-500"}`}>
                  {on ? "★ " : ""}{name}
                </button>
              );
            })}
          </div>
        </Step>
      )}

      <Step n={6} title="What should a visitor do first?">
        <ChoiceGroup
          name="Primary action"
          value={local.primaryAction}
          columns={3}
          onChange={(v) => apply({ primaryAction: v })}
          options={[
            { value: "call", label: "Call", hint: hasPhone ? "Tap-to-call button" : "Add your phone in Your Business" },
            { value: "text", label: "Text", hint: hasPhone ? "Opens their messages" : "Add your phone in Your Business" },
            { value: "form", label: "Send a message", hint: hasEmail ? "Emailed to you" : "Add your email in Your Business" },
          ]}
        />
        {local.primaryAction === "form" && <p className="mt-2 text-xs text-ink-500">The message form works on a GoBeeFound-hosted site. If you export and host it yourself, it becomes a call/text/email link.</p>}
      </Step>

      <Step n={7} title="Show on the site">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Hours" on={local.sections.hours} disabled={!hasHours} hint={hasHours ? undefined : "Add hours in Your Business"} onChange={(v) => apply({ sections: { ...local.sections, hours: v } })} />
          <Toggle label="Service area" on={local.sections.serviceAreas} onChange={(v) => apply({ sections: { ...local.sections, serviceAreas: v } })} />
          <Toggle label="Street address" on={local.sections.address} disabled={!hasAddress} hint={hasAddress ? undefined : "Hidden — you chose not to show it"} onChange={(v) => apply({ sections: { ...local.sections, address: v } })} />
          <Toggle label="Google reviews link" on={local.sections.reviews} disabled={!hasReviewLink} hint={hasReviewLink ? undefined : "Add your review link in Module 5"} onChange={(v) => apply({ sections: { ...local.sections, reviews: v } })} />
        </div>
      </Step>

      <Step n={8} title="How should it sound?">
        <ChoiceGroup<Voice> name="Voice" value={local.voice} columns={3} onChange={(v) => apply({ voice: v })} options={[{ value: "plain", label: "Plain & direct" }, { value: "warm", label: "Warm & local" }, { value: "professional", label: "Professional" }]} />
      </Step>

      <FieldError>{error}</FieldError>
      {pending && !compact && <p className="text-xs text-ink-500">Saving…</p>}
    </div>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-4">
      <h3 className="text-[15px] font-semibold"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-honey-100 text-xs font-bold">{n}</span>{title}</h3>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Swatch({ id, label, primary, accent, active, onPick }: { id: string; label: string; primary: string; accent: string; active: boolean; onPick: () => void }) {
  return (
    <button type="button" aria-pressed={active} aria-label={label} onClick={onPick} className={`min-h-16 rounded-xl border p-2 text-left ${active ? "border-ink-900 ring-2 ring-ink-900" : "border-ink-300 hover:border-ink-500"}`}>
      <span className="flex h-6 overflow-hidden rounded-md"><span className="flex-1" style={{ background: primary }} /><span className="flex-1" style={{ background: accent }} /></span>
      <span className="mt-1 block truncate text-xs font-medium">{label}</span>
      <span className="sr-only">{id}</span>
    </button>
  );
}

function Toggle({ label, on, onChange, disabled, hint }: { label: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on && !disabled} disabled={disabled} onClick={() => onChange(!on)} className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-[15px] ${disabled ? "border-ink-100 text-ink-500" : on ? "border-ink-900 bg-ink-900 text-white" : "border-ink-300 bg-white"}`}>
      <span>{label}{hint && <span className="block text-xs opacity-80">{hint}</span>}</span>
      <span className="text-xs font-semibold">{disabled ? "—" : on ? "Shown" : "Hidden"}</span>
    </button>
  );
}

function LogoUploader({ currentUrl, onDone }: { currentUrl: string | null; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(file: File) {
    setError(null);
    if (file.size > 2 * 1024 * 1024) return setError("That file is over 2 MB. Please use a smaller image.");
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/logo", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Upload failed. Please try again.");
    onDone();
  }
  return (
    <div className="mt-3">
      <input ref={input} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : currentUrl ? "Replace logo" : "Choose a PNG or JPEG"}</Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function HeroUploader({ currentUrl }: { currentUrl: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(file: File) {
    setError(null);
    if (file.size > 4 * 1024 * 1024) return setError("That photo is over 4 MB. Please use a smaller one.");
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/site/hero", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Upload failed. Please try again.");
    router.refresh();
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {currentUrl && <img src={currentUrl} alt="Your photo" className="h-20 w-32 rounded-lg object-cover" />}
      <input ref={input} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : currentUrl ? "Replace photo" : "Choose a photo"}</Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function LogoDesigner({ palette, allowance, currentUrl }: { palette: PaletteId; allowance: Allowance; currentUrl: string | null }) {
  const router = useRouter();
  const [style, setStyle] = useState<(typeof LOGO_STYLES)[number]>("mark");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(allowance);
  const [candidates, setCandidates] = useState<{ path: string; url: string }[]>([]);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const exhausted = left.used >= left.limit;

  async function design() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/site/logo", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ style, palette }) });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; candidates?: { path: string; url: string }[]; error?: string; allowance?: Allowance };
    setBusy(false);
    if (j.allowance) setLeft(j.allowance);
    if (!res.ok || !j.ok) return setError(j.error ?? "We couldn't design that just now. You can still upload a logo or use a text logo.");
    setCandidates(j.candidates ?? []);
    setKey(crypto.randomUUID());
  }
  async function pick(path: string) {
    setBusy(true);
    const res = await fetch("/api/site/logo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) });
    setBusy(false);
    if (!res.ok) return setError("Couldn't save that one. Try another.");
    setCandidates([]);
    router.refresh();
  }
  return (
    <div className="mt-3 space-y-3">
      <ChoiceGroup name="Logo style" value={style} columns={2} onChange={setStyle} options={LOGO_STYLES.map((s) => ({ value: s, label: LOGO_STYLE_LABEL[s].label, hint: LOGO_STYLE_LABEL[s].hint }))} />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={busy || exhausted} onClick={design}>{busy ? "Designing…" : exhausted ? "No logo designs left" : "Design two options"}</Button>
        <span className="text-xs text-ink-500">{left.label}</span>
      </div>
      {candidates.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {candidates.map((c) => (
            <button key={c.path} type="button" disabled={busy} onClick={() => pick(c.path)} className="rounded-xl border border-ink-300 bg-white p-3 hover:border-ink-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.url} alt="Logo option" className="mx-auto h-28 w-28 object-contain" />
              <span className="mt-2 block text-sm font-medium">Use this one</span>
            </button>
          ))}
        </div>
      )}
      {currentUrl && candidates.length === 0 && <p className="text-xs text-ink-500">Your current logo is shown below. Design again to see new options.</p>}
      <FieldError>{error}</FieldError>
      {exhausted && <p className="text-xs text-ink-500">You can still upload a logo or use a text logo — both are always free.</p>}
    </div>
  );
}
