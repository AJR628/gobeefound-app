"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { cancelManaged, publishNow, reactivateManaged } from "./actions";

export function ManagedControls({ canPublishNewer, latestVersion, cancelling, grace }: { canPublishNewer: boolean; latestVersion: number; cancelling: boolean; grace: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "That didn't work.");
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-ink-100 bg-white p-4">
      {canPublishNewer ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px]">Version {latestVersion} is approved but not live yet.</p>
          <Button onClick={() => run(() => publishNow({}))} disabled={pending}>{pending ? "Publishing…" : `Publish version ${latestVersion}`}</Button>
        </div>
      ) : (
        <p className="text-sm text-ink-700">Your latest approved version is live. Change anything on <a href="/site" className="underline">Your website</a>, approve it, and publish here.</p>
      )}
      <FieldError>{error}</FieldError>
      <div className="flex flex-wrap items-center gap-3 border-t border-ink-100 pt-3">
        {cancelling ? (
          <Button variant="secondary" onClick={() => run(reactivateManaged)} disabled={pending}>Keep hosting with GoBeeFound</Button>
        ) : confirm ? (
          <>
            <span className="text-sm text-ink-700">Your site stays live until the end of the month you've paid for. You can download it any time.</span>
            <Button variant="danger" onClick={() => run(cancelManaged)} disabled={pending}>Yes, stop renewing</Button>
            <button type="button" onClick={() => setConfirm(false)} className="h-11 px-3 text-sm underline">Never mind</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="h-11 text-sm text-ink-500 underline">{grace ? "Stop hosting instead" : "Cancel Managed hosting"}</button>
        )}
      </div>
    </section>
  );
}

export function VersionList({ versions }: { versions: { id: string; versionNumber: number; createdAt: string; current: boolean }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (versions.length < 2) return null;
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Earlier versions</h2>
      <p className="mt-1 text-sm text-ink-700">Go back to any version you approved. Nothing is lost.</p>
      <ul className="mt-3 divide-y divide-ink-100">
        {versions.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-[15px]">
            <span>Version {v.versionNumber} <span className="text-xs text-ink-500">· {new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>{v.current && <span className="ml-2 rounded-full bg-good-500 px-2 py-0.5 text-xs font-semibold text-white">Live</span>}</span>
            {!v.current && (
              <button type="button" disabled={pending} onClick={() => { setError(null); start(async () => { const r = await publishNow({ versionId: v.id }); if (!r.ok) setError(r.error ?? "Couldn't switch."); router.refresh(); }); }} className="h-10 rounded-lg border border-ink-300 px-3 text-sm font-medium hover:border-ink-900 disabled:opacity-50">
                Make this live
              </button>
            )}
          </li>
        ))}
      </ul>
      <FieldError>{error}</FieldError>
    </section>
  );
}
