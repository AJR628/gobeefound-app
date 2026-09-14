"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { SECTION_LABELS, type SectionKey, type SiteCopy } from "@/lib/site/spec";
import { approveSection, saveCopy } from "./actions";

// V4 §D — section-level editing. Typing is free and instant. "Fresh take" asks the AI for one section only
// (one AI edit) and never touches approved or unrelated sections. Approving a section locks it against
// AI rewrites; the owner can still edit it by hand.

type Allowance = { label: string; used: number; limit: number };

const FIELD_LABELS: Record<string, string> = { headline: "Headline", subheadline: "Under the headline", ctaLabel: "Button text", heading: "Heading", intro: "Intro", body: "Text", note: "Note", pageTitle: "Page title", metaDescription: "Page description" };

export function SiteEditor({ copy, approved, visible, editsAllowance }: { copy: SiteCopy; approved: Partial<Record<SectionKey, boolean>>; visible: SectionKey[]; editsAllowance: Allowance }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<SiteCopy>(copy);
  const [dirty, setDirty] = useState<Set<SectionKey>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<SectionKey | null>(null);
  const [left, setLeft] = useState<Allowance>(editsAllowance);
  const [keys, setKeys] = useState<Partial<Record<SectionKey, string>>>({});
  const exhausted = left.used >= left.limit;

  function setField(section: SectionKey, field: string, value: string) {
    setDraft({ ...draft, [section]: { ...(draft[section] as Record<string, unknown>), [field]: value } } as SiteCopy);
    setDirty(new Set(dirty).add(section));
  }
  function setServiceBlurb(i: number, value: string) {
    const items = draft.services.items.map((it, idx) => (idx === i ? { ...it, blurb: value } : it));
    setDraft({ ...draft, services: { ...draft.services, items } });
    setDirty(new Set(dirty).add("services"));
  }

  function save(section: SectionKey) {
    setError(null);
    start(async () => {
      const r = await saveCopy({ [section]: draft[section] });
      if (!r.ok) return setError(r.error ?? "That didn't save.");
      const next = new Set(dirty);
      next.delete(section);
      setDirty(next);
      router.refresh();
    });
  }

  async function freshTake(section: SectionKey) {
    setError(null);
    setBusy(section);
    const key = keys[section] ?? crypto.randomUUID();
    setKeys({ ...keys, [section]: key });
    const res = await fetch("/api/site/section", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ section }) });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; spec?: { copy: SiteCopy }; error?: string; allowance?: Allowance };
    setBusy(null);
    if (j.allowance) setLeft(j.allowance);
    if (!res.ok || !j.ok || !j.spec) {
      setError(j.error ?? "We couldn't rewrite that just now.");
      if (res.status < 500 && res.status !== 429) setKeys({ ...keys, [section]: crypto.randomUUID() });
      return;
    }
    setDraft(j.spec.copy);
    setKeys({ ...keys, [section]: crypto.randomUUID() });
    router.refresh();
  }

  function toggleApproved(section: SectionKey) {
    start(async () => {
      await approveSection({ section, approved: !approved[section] });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-honey-50 px-4 py-3 text-sm text-ink-700">
        <span>Read every line. Change anything by hand — that's always free.</span>
        <span className="shrink-0 text-xs text-ink-500">{left.label}</span>
      </div>
      <FieldError>{error}</FieldError>

      {visible.concat(["seo"]).map((section) => {
        const locked = Boolean(approved[section]);
        const data = draft[section] as Record<string, unknown>;
        return (
          <section key={section} className={`rounded-2xl border bg-white p-4 ${locked ? "border-good-500" : "border-ink-100"}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">{SECTION_LABELS[section]}{locked ? " · approved" : ""}</h3>
              <div className="flex items-center gap-2">
                <button type="button" disabled={locked || busy === section || exhausted} onClick={() => freshTake(section)} className="h-9 rounded-lg border border-ink-300 px-3 text-xs font-medium hover:border-ink-900 disabled:opacity-50" title={locked ? "Approved sections aren't rewritten" : exhausted ? "No AI edits left" : "Ask for a different version of this section"}>
                  {busy === section ? "Writing…" : "Fresh take"}
                </button>
                <button type="button" onClick={() => toggleApproved(section)} disabled={pending} className={`h-9 rounded-lg px-3 text-xs font-semibold ${locked ? "bg-good-500 text-white" : "border border-ink-900 text-ink-900"}`}>
                  {locked ? "✓ Approved" : "Approve"}
                </button>
              </div>
            </div>

            {section === "services" ? (
              <div className="space-y-3">
                <TextField label="Heading" value={String(data.heading ?? "")} onChange={(v) => setField("services", "heading", v)} />
                {draft.services.items.map((it, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium">{it.name}</p>
                    <textarea rows={2} value={it.blurb} onChange={(e) => setServiceBlurb(i, e.target.value)} className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-[15px] focus:border-ink-900 focus:outline-none" />
                  </div>
                ))}
                <p className="text-xs text-ink-500">Service names come from Your Business. Add or rename services there.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(data).map(([field, value]) => (
                  <TextField key={field} label={FIELD_LABELS[field] ?? field} value={String(value ?? "")} multiline={String(value ?? "").length > 80 || field === "body"} maxChars={field === "pageTitle" ? 60 : field === "metaDescription" ? 155 : undefined} onChange={(v) => setField(section, field, v)} />
                ))}
              </div>
            )}

            {dirty.has(section) && (
              <div className="mt-3 flex items-center gap-3">
                <Button size="md" onClick={() => save(section)} disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
                <span className="text-xs text-ink-500">Free — no AI used.</span>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TextField({ label, value, onChange, multiline, maxChars }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; maxChars?: number }) {
  const over = maxChars !== undefined && value.length > maxChars;
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs text-ink-500"><span>{label}</span>{maxChars !== undefined && <span className={over ? "text-danger-500" : ""}>{value.length}/{maxChars}</span>}</span>
      <textarea rows={multiline ? 4 : 1} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-ink-100 px-3 py-2 text-[15px] focus:border-ink-900 focus:outline-none" />
    </label>
  );
}
