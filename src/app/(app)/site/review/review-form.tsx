"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { approveWebsite } from "../actions";

export function ReviewForm({ items, needsEmailConfirm, email }: { items: { label: string; value: string; fixHref: string }[]; needsEmailConfirm: boolean; email: string | null }) {
  const router = useRouter();
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false));
  const [emailOk, setEmailOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const all = checked.every(Boolean) && (!needsEmailConfirm || emailOk);

  function approve() {
    setError(null);
    start(async () => {
      const r = await approveWebsite({ confirmedFacts: all, contactEmailConfirmed: emailOk });
      if (!r.ok) return setError(r.error ?? "Couldn't approve that.");
      router.push("/site/publish");
    });
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-start gap-3 p-4">
            <input id={`c${i}`} type="checkbox" checked={checked[i]} onChange={(e) => setChecked(checked.map((c, j) => (j === i ? e.target.checked : c)))} className="mt-1 h-6 w-6 shrink-0 accent-ink-900" />
            <label htmlFor={`c${i}`} className="flex-1 cursor-pointer">
              <span className="block text-xs text-ink-500">{it.label}</span>
              <span className="block text-[15px]">{it.value}</span>
            </label>
            <Link href={it.fixHref} className="tap inline-flex h-11 shrink-0 items-center text-sm underline">Fix</Link>
          </li>
        ))}
        {needsEmailConfirm && (
          <li className="flex items-start gap-3 bg-honey-50 p-4">
            <input id="email-ok" type="checkbox" checked={emailOk} disabled={!email} onChange={(e) => setEmailOk(e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-ink-900" />
            <label htmlFor="email-ok" className="flex-1 cursor-pointer">
              <span className="block text-xs text-ink-500">Contact form messages go to</span>
              <span className="block text-[15px]">{email ?? "Add your business email first"}</span>
              <span className="mt-1 block text-xs text-ink-500">Messages are emailed to you and not stored by GoBeeFound.</span>
            </label>
          </li>
        )}
      </ul>
      <FieldError>{error}</FieldError>
      <Button fullWidth size="lg" onClick={approve} disabled={!all || pending}>{pending ? "Approving…" : "Everything is right — approve my website"}</Button>
      <p className="text-center text-xs text-ink-500">You'll choose how to host it on the next screen.</p>
    </div>
  );
}
