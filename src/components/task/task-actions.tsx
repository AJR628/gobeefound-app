"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { markAwaitingVerification, markComplete, saveForLater, skipTask, unComplete } from "@/app/(app)/t/[taskId]/actions";

// §10.2 element 13 — footer actions. §10.5 skip asks exactly one question with three answers.

export function TaskActions({
  taskId,
  status,
  supportsAwaitingVerification,
}: {
  taskId: string;
  status: "not_started" | "saved_for_later" | "complete" | "skipped" | "awaiting_verification";
  supportsAwaitingVerification?: boolean;
}) {
  const [skipping, setSkipping] = useState(false);

  if (status === "complete") {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-good-500/30 bg-good-500/5 p-4">
        <span className="font-medium text-good-500">✓ Done</span>
        <form action={unComplete.bind(null, taskId)}>
          <button type="submit" className="h-11 px-3 text-sm text-ink-500 underline">Mark as not done</button>
        </form>
      </div>
    );
  }

  if (status === "skipped") {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-100/50 p-4">
        <span className="text-ink-700">Not part of your plan</span>
        <form action={unComplete.bind(null, taskId)}>
          <button type="submit" className="h-11 px-3 text-sm text-ink-500 underline">Add it back</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status === "awaiting_verification" && (
        <p className="rounded-xl bg-honey-50 px-4 py-3 text-sm text-ink-700">
          Waiting on verification. We've moved your next step to another area meanwhile. Come back and mark this done when it clears.
        </p>
      )}
      <form action={markComplete.bind(null, taskId)}>
        <Button type="submit" fullWidth size="lg">✓ Mark complete</Button>
      </form>
      {supportsAwaitingVerification && status !== "awaiting_verification" && (
        <form action={markAwaitingVerification.bind(null, taskId)}>
          <Button type="submit" variant="ghost" fullWidth className="border border-ink-300 bg-white">I've done my part — waiting on them</Button>
        </form>
      )}

      {!skipping ? (
        <div className="flex justify-center gap-6 text-sm">
          <form action={saveForLater.bind(null, taskId)}>
            <button type="submit" className="h-11 text-ink-500 underline">Save for later</button>
          </form>
          <button type="button" onClick={() => setSkipping(true)} className="h-11 text-ink-500 underline">Skip this step</button>
        </div>
      ) : (
        <form action={skipTask.bind(null, taskId)} className="rounded-2xl border border-ink-100 bg-white p-4">
          <p className="mb-3 text-sm font-medium">Why are you skipping this?</p>
          <div className="grid gap-2">
            <button type="submit" name="reason" value="already_done" className="min-h-12 rounded-xl border border-ink-300 px-4 text-left text-[15px] hover:border-ink-900">
              <span className="block font-medium">Already done</span>
              <span className="block text-xs text-ink-500">We'll count it as complete.</span>
            </button>
            <button type="submit" name="reason" value="not_doing" className="min-h-12 rounded-xl border border-ink-300 px-4 text-left text-[15px] hover:border-ink-900">
              <span className="block font-medium">Not doing this</span>
              <span className="block text-xs text-ink-500">It leaves your plan and your percentage.</span>
            </button>
            <button type="submit" name="reason" value="later" className="min-h-12 rounded-xl border border-ink-300 px-4 text-left text-[15px] hover:border-ink-900">
              <span className="block font-medium">Come back later</span>
              <span className="block text-xs text-ink-500">Stays in your plan; we'll bring it back up.</span>
            </button>
          </div>
          <button type="button" onClick={() => setSkipping(false)} className="mt-3 h-11 text-sm text-ink-500 underline">Cancel</button>
        </form>
      )}
    </div>
  );
}
