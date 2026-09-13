"use client";

import { useState, useTransition } from "react";
import { saveProfileField } from "@/app/(app)/your-business/actions";
import { CopyButton } from "@/components/copy-button";

/**
 * §12.1 — tap to edit, save on blur, optimistic. No modal, no edit mode, no wizard.
 * Simple text and one-per-line list fields only; structured fields link to their task.
 */
export function InlineField({
  field,
  label,
  value,
  display,
  kind,
  usageNote,
  freshness,
  emptyHint,
}: {
  field: string;
  label: string;
  value: string; // editable text form (lists as one-per-line)
  display: string; // formatted for reading/copying
  kind: "text" | "textarea" | "list";
  usageNote?: string;
  freshness?: string;
  emptyHint?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(display);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function commit() {
    setEditing(false);
    if (draft === value && !error) return;
    const payload = kind === "list" ? draft.split("\n").map((s) => s.trim()).filter(Boolean) : draft;
    const optimistic = kind === "list" ? (payload as string[]).join(", ") : draft;
    setShown(optimistic);
    start(async () => {
      const r = await saveProfileField(field, payload);
      setError(r.ok ? null : r.error ?? "Check this value.");
      if (!r.ok) setShown(display);
    });
  }

  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-ink-500">{label}</div>
          {editing ? (
            kind === "text" ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === "Enter" && commit()}
                className="mt-0.5 h-11 w-full rounded-lg border border-ink-900 px-3 text-[15px] focus:outline-none"
              />
            ) : (
              <textarea
                autoFocus
                rows={kind === "list" ? 4 : 3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                placeholder={kind === "list" ? "One per line" : ""}
                className="mt-0.5 w-full rounded-lg border border-ink-900 px-3 py-2 text-[15px] focus:outline-none"
              />
            )
          ) : (
            <button type="button" onClick={() => { setDraft(value); setEditing(true); }} className="tap mt-0.5 block w-full text-left">
              {shown ? (
                <span className={`block text-[15px] font-medium ${kind === "textarea" ? "whitespace-pre-wrap" : "truncate"}`}>{shown}</span>
              ) : (
                <span className="block text-sm text-ink-500">Not set yet{emptyHint ? <> — {emptyHint}</> : null}</span>
              )}
            </button>
          )}
          {error && <p role="alert" className="mt-1 text-xs text-danger-500">{error}</p>}
          {!error && freshness && <p className="mt-1 text-xs text-ink-500">{freshness}</p>}
          {usageNote && <p className="mt-0.5 text-xs text-ink-500">{usageNote}</p>}
          {pending && <p className="mt-1 text-xs text-ink-500">Saving…</p>}
        </div>
        {shown && !editing && <CopyButton value={shown} />}
      </div>
    </div>
  );
}
