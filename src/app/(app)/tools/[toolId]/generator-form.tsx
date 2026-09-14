"use client";

import { useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import type { ToolId } from "@/content";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/input";
import { CopyButton } from "@/components/copy-button";
import { PrintButton } from "@/components/print-button";
import { acceptGeneratedOutput } from "../actions";

// §13 / V4 §E — prefill → ask only the unknowns → generate → EDITABLE draft → save/copy.
// Output is structured fields; each is editable and copyable independently. Every "Write it" click mints
// ONE Idempotency-Key, so a retry of the same click never charges twice. The owner sees "N AI edits left";
// never tokens, dollars, or model names.

type Question = { key: string; label: string; forField?: string };
type Output = Record<string, unknown>;
type Allowance = { label: string; used: number; limit: number };

type TextField = { key: string; label: string; multiline?: boolean; savesToProfile?: boolean; maxChars?: number; hint?: string };
/** A list of { [nameKey], [textKey] } items. Editable lists write into Your Business; read-only lists are copy-only. */
type ListField = { key: string; label: string; nameKey: string; textKey: string; editable: boolean; savesToProfile?: boolean; intro?: string };

const TEXT_FIELDS: Record<ToolId, TextField[]> = {
  website_copy: [
    { key: "headline", label: "Headline" },
    { key: "subheadline", label: "Subheadline" },
    { key: "about", label: "About", multiline: true, savesToProfile: true },
    { key: "callToAction", label: "Call to action" },
  ],
  descriptions: [{ key: "short", label: "Bio (Facebook & Instagram)", multiline: true, savesToProfile: true, maxChars: 250 }],
  review_requests: [
    { key: "sms", label: "Text message", multiline: true },
    { key: "emailSubject", label: "Email subject" },
    { key: "emailBody", label: "Email", multiline: true },
    { key: "spokenLine", label: "What to say at the end of a job" },
    { key: "negativeReply", label: "Reply to a negative review", multiline: true },
  ],
  seo_meta: [
    { key: "pageTitle", label: "Page title", savesToProfile: true, maxChars: 60, hint: "Shows in the browser tab and as the blue link in Google." },
    { key: "metaDescription", label: "Page description", multiline: true, savesToProfile: true, maxChars: 155, hint: "The sentence under your name in Google results." },
  ],
  gbp_kit: [{ key: "description", label: "Google Business Profile description", multiline: true, savesToProfile: true, maxChars: 750 }],
};

const LIST_FIELDS: Record<ToolId, ListField[]> = {
  website_copy: [{ key: "serviceBlurbs", label: "Services", nameKey: "name", textKey: "blurb", editable: true, savesToProfile: true }],
  descriptions: [],
  review_requests: [],
  seo_meta: [],
  gbp_kit: [
    { key: "serviceDescriptions", label: "Services — one line each", nameKey: "name", textKey: "description", editable: true, savesToProfile: true },
    { key: "categorySuggestions", label: "Categories to look for", nameKey: "name", textKey: "why", editable: false, intro: "Type each of these into Google's category box and pick the closest match Google offers. Google decides what's available — these are starting points." },
    { key: "photoChecklist", label: "Photo checklist", nameKey: "shot", textKey: "caption", editable: false, intro: "Real photos from your phone. Copy a caption when you upload each one." },
  ],
};

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function GeneratorForm({
  toolRoute,
  tool,
  questions,
  reviewLink,
  displayName,
  allowanceLabel,
  allowanceExhausted,
}: {
  toolRoute: string;
  tool: ToolId;
  questions: Question[];
  reviewLink: string | null;
  displayName: string;
  allowanceLabel: string;
  allowanceExhausted: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ id: string; output: Output } | null>(null);
  const [edited, setEdited] = useState<Output>({});
  const [error, setError] = useState<string | null>(null);
  const [supportRef, setSupportRef] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [qr, setQr] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<Allowance>({ label: allowanceLabel, used: allowanceExhausted ? 1 : 0, limit: allowanceExhausted ? 1 : 2 });
  const [idemKey, setIdemKey] = useState<string>(() => newKey());

  useEffect(() => {
    if (tool === "review_requests" && reviewLink) QRCode.toDataURL(reviewLink, { width: 240, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [tool, reviewLink]);

  const exhausted = allowance.used >= allowance.limit;

  function generate() {
    setError(null);
    setSupportRef(null);
    setSaved(false);
    start(async () => {
      const res = await fetch(`/api/generate/${toolRoute}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey },
        body: JSON.stringify(answers),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; output?: Output; error?: string; allowance?: Allowance; generationId?: string };
      if (j.allowance) setAllowance(j.allowance);
      if (!res.ok || !j.ok || !j.output || !j.id) {
        setError(j.error ?? "We couldn't generate that just now. Please try again.");
        if (j.generationId && res.status >= 500) setSupportRef(j.generationId.slice(0, 8));
        // A 5xx/429 keeps its key so retrying the SAME intent is idempotent; a 4xx means the input must change.
        if (res.status < 500 && res.status !== 429) setIdemKey(newKey());
        return;
      }
      setResult({ id: j.id, output: j.output });
      setEdited(j.output);
      setIdemKey(newKey());
    });
  }

  function save() {
    if (!result) return;
    start(async () => {
      const r = await acceptGeneratedOutput({ id: result.id, edited });
      if (!r.ok) return setError(r.error ?? "Couldn't save.");
      setSaved(true);
    });
  }

  function updateListItem(list: ListField, i: number, value: string) {
    const items = [...((edited[list.key] as Record<string, string>[]) ?? [])];
    items[i] = { ...items[i]!, [list.textKey]: value };
    setEdited({ ...edited, [list.key]: items });
  }

  const allAnswered = questions.every((q) => (answers[q.key] ?? "").trim().length > 0);

  if (!result) {
    return (
      <div className="space-y-5 rounded-2xl border border-ink-100 bg-white p-4">
        {questions.length > 0 ? (
          <>
            <p className="text-sm text-ink-500">We know the rest. Just these:</p>
            {questions.map((q) => (
              <div key={q.key}>
                <Label htmlFor={q.key}>{q.label}</Label>
                <textarea id={q.key} rows={q.key === "differentiators" ? 3 : 2} value={answers[q.key] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} className="w-full rounded-xl border border-ink-300 px-4 py-3 text-base focus:border-ink-900 focus:outline-none" />
              </div>
            ))}
          </>
        ) : (
          <p className="text-sm text-ink-500">Everything this needs is already in Your Business.</p>
        )}
        <FieldError>{error}</FieldError>
        {supportRef && <p className="text-xs text-ink-500">If this keeps happening, tell us this code: {supportRef}</p>}
        <Button fullWidth size="lg" onClick={generate} disabled={pending || !allAnswered || exhausted}>{pending ? "Writing…" : exhausted ? "No AI edits left" : "Write it"}</Button>
        <p className="text-center text-xs text-ink-500">{allowance.label}{exhausted ? " · You can still edit everything by hand." : ""}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-honey-50 px-4 py-3 text-sm text-ink-700">Read this over before you use it — make sure every word is true for your business. Edit anything that doesn't sound like you. Editing by hand is always free.</p>

      {LIST_FIELDS[tool].filter((l) => l.editable).map((list) => {
        const items = (edited[list.key] as Record<string, string>[] | undefined) ?? [];
        if (!items.length) return null;
        return (
          <section key={list.key} className="rounded-2xl border border-ink-100 bg-white p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{list.label}</h2>
            <ul className="space-y-3">
              {items.map((item, i) => (
                <li key={i}>
                  <div className="flex items-center justify-between gap-3"><span className="text-[15px] font-medium">{item[list.nameKey]}</span><CopyButton value={item[list.textKey] ?? ""} /></div>
                  <textarea rows={2} value={item[list.textKey] ?? ""} onChange={(e) => updateListItem(list, i, e.target.value)} className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-[15px] focus:border-ink-900 focus:outline-none" />
                </li>
              ))}
            </ul>
            {list.savesToProfile && <p className="mt-2 text-xs text-ink-500">Saved to your services in Your Business when you save.</p>}
          </section>
        );
      })}

      {TEXT_FIELDS[tool].map((f) => {
        const value = String(edited[f.key] ?? "");
        const over = f.maxChars !== undefined && value.length > f.maxChars;
        return (
          <section key={f.key} className="rounded-2xl border border-ink-100 bg-white p-4">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">{f.label}</h2>
              <CopyButton value={value} event={{ name: "generator_output_copied", props: { toolId: tool } }} />
            </div>
            <textarea rows={f.multiline ? 4 : 1} value={value} onChange={(e) => setEdited({ ...edited, [f.key]: e.target.value })} className="w-full rounded-lg border border-ink-100 px-3 py-2 text-[15px] focus:border-ink-900 focus:outline-none" />
            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-ink-500">
              <span>{f.hint ?? (f.savesToProfile ? "Saved to Your Business when you save." : "")}</span>
              {f.maxChars !== undefined && <span className={over ? "text-bad-500" : ""}>{value.length}/{f.maxChars}{over ? " — may get cut off" : ""}</span>}
            </div>
          </section>
        );
      })}

      {LIST_FIELDS[tool].filter((l) => !l.editable).map((list) => {
        const items = (edited[list.key] as Record<string, string>[] | undefined) ?? [];
        if (!items.length) return null;
        return (
          <section key={list.key} className="rounded-2xl border border-ink-100 bg-white p-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">{list.label}</h2>
            {list.intro && <p className="mb-3 text-sm text-ink-700">{list.intro}</p>}
            <ul className="space-y-3">
              {items.map((item, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-medium">{item[list.nameKey]}</p>
                    <p className="text-sm text-ink-700">{item[list.textKey]}</p>
                  </div>
                  <CopyButton value={list.key === "categorySuggestions" ? (item[list.nameKey] ?? "") : (item[list.textKey] ?? "")} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {tool === "review_requests" && reviewLink && (
        <section className="rounded-2xl border border-ink-100 bg-white p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">QR code & printable card</h2>
          <div className="flex items-start gap-4">
            {qr && <img src={qr} alt="QR code to your review link" className="h-32 w-32" />}
            <div className="text-sm text-ink-700">
              <p>Scans straight to your review link. Print the card and keep a stack in the truck.</p>
              <div className="mt-3"><PrintButton label="Print review card" /></div>
            </div>
          </div>
          <ReviewCard displayName={displayName} qr={qr} line={String(edited.spokenLine ?? "")} />
        </section>
      )}

      <FieldError>{error}</FieldError>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <button type="button" onClick={() => { setResult(null); setSaved(false); }} className="h-11 px-3 text-sm text-ink-500 underline">Start over</button>
        {saved && <span className="text-sm text-good-500">Saved.</span>}
        <span className="ml-auto text-xs text-ink-500">{allowance.label}</span>
      </div>
    </div>
  );
}

/** Half-page printable card — print stylesheet only, no PDF library (§16.1). */
function ReviewCard({ displayName, qr, line }: { displayName: string; qr: string | null; line: string }) {
  return (
    <div className="review-card mt-4 rounded-xl border border-dashed border-ink-300 p-5 print:fixed print:inset-0 print:m-8 print:border-2 print:border-solid">
      <style>{`@media print { body * { visibility: hidden; } .review-card, .review-card * { visibility: visible; } }`}</style>
      <div className="flex items-center gap-5">
        {qr && <img src={qr} alt="" className="h-28 w-28" />}
        <div>
          <p className="text-lg font-bold">{displayName}</p>
          <p className="mt-1 text-[15px]">Happy with the work? A quick Google review helps more than you'd think.</p>
          <p className="mt-2 text-sm text-ink-500">Scan the code — it takes a minute.</p>
          {line && <p className="mt-2 text-xs text-ink-500 print:hidden">Say: “{line}”</p>}
        </div>
      </div>
    </div>
  );
}
