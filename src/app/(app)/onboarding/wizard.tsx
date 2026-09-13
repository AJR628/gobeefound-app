"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ARCHETYPES, US_STATES } from "@/content";
import { screenOneComplete, type OnboardingDraft } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { ChoiceGroup, YesNoUnsureRow } from "@/components/ui/choice";
import { saveDraft, submitOnboarding, type CompleteState } from "./actions";

// §6.1 — eight questions, two screens. Q1–Q5 required (Screen 1); Q6–Q8 Yes/No/Not sure (Screen 2).
// Every answer autosaves. Back preserves answers. Buttons, not dropdowns, wherever answers are few.

type Draft = Partial<OnboardingDraft>;
type YNU = "yes" | "no" | "unsure";

export function OnboardingWizard({ initial, editMode }: { initial: Draft; editMode: boolean }) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [screen, setScreen] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave: immediate for taps, debounced for typing.
  const update = useCallback((patch: Draft, debounce = false) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const run = () => void saveDraft(patch);
    if (debounce) saveTimer.current = setTimeout(run, 400);
    else run();
  }, []);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const canContinue = screenOneComplete(draft);

  function submit() {
    startTransition(async () => {
      const result: CompleteState = await submitOnboarding(draft as OnboardingDraft);
      if (result?.errors) {
        setErrors(result.errors);
        setScreen(1);
      }
    });
  }

  const ynu = (k: keyof Draft, label: string) => (
    <YesNoUnsureRow key={k} label={label} value={(draft[k] as YNU | undefined) ?? undefined} onChange={(v) => update({ [k]: v })} />
  );

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-1.5" aria-label={`Step ${screen} of 2`}>
          <span className={`h-1.5 w-8 rounded-full ${screen === 1 ? "bg-ink-900" : "bg-ink-300"}`} />
          <span className={`h-1.5 w-8 rounded-full ${screen === 2 ? "bg-ink-900" : "bg-ink-300"}`} />
        </div>
        {editMode && (
          <Link href="/account" className="text-sm text-ink-500 underline">
            Cancel
          </Link>
        )}
      </div>

      {screen === 1 ? (
        <section className="space-y-7">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{editMode ? "Your answers" : "First, tell us about your business."}</h1>
            <p className="mt-1 text-ink-500">
              {editMode ? "Change anything here. Your progress is never deleted." : "We'll remember all of it so you never have to type it twice."}
            </p>
          </div>

          <div>
            <Label htmlFor="displayName">What's your business called?</Label>
            <Input
              id="displayName"
              value={draft.displayName ?? ""}
              onChange={(e) => update({ displayName: e.target.value }, true)}
              autoComplete="organization"
              disabled={editMode}
              placeholder="e.g. Dave's Aurora Detail"
            />
            {editMode && <p className="mt-1.5 text-xs text-ink-500">Change your name in Your Business.</p>}
            <FieldError>{errors.displayName}</FieldError>
          </div>

          <div>
            <Label>What kind of work do you do?</Label>
            <ChoiceGroup
              name="trade"
              value={draft.trade}
              columns={2}
              onChange={(v) => update({ trade: v })}
              options={ARCHETYPES.map((a) => ({ value: a.id, label: a.name }))}
            />
            <FieldError>{errors.trade}</FieldError>
          </div>

          <div>
            <Label>Where are you based?</Label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                aria-label="City"
                value={draft.city ?? ""}
                onChange={(e) => update({ city: e.target.value }, true)}
                autoComplete="address-level2"
                placeholder="City"
              />
              <select
                aria-label="State"
                value={draft.state ?? ""}
                onChange={(e) => update({ state: e.target.value || undefined })}
                className="h-12 rounded-xl border border-ink-300 bg-white px-3 text-base focus:border-ink-900 focus:outline-none"
              >
                <option value="">State</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code}
                  </option>
                ))}
              </select>
            </div>
            <FieldError>{errors.city ?? errors.state}</FieldError>
          </div>

          <div>
            <Label>Do customers come to you, do you go to them, or both?</Label>
            <ChoiceGroup
              name="serviceAreaType"
              value={draft.serviceAreaType}
              onChange={(v) => update({ serviceAreaType: v })}
              options={[
                { value: "atCustomer", label: "I go to my customers", hint: "Mobile or on-site work" },
                { value: "atMyLocation", label: "Customers come to me", hint: "A shop, studio, or storefront" },
                { value: "both", label: "Both" },
              ]}
            />
            <FieldError>{errors.serviceAreaType}</FieldError>
          </div>

          <div>
            <Label>Are you already serving customers?</Label>
            <ChoiceGroup
              name="alreadyServing"
              value={draft.alreadyServing === undefined ? undefined : draft.alreadyServing ? "yes" : "no"}
              columns={2}
              onChange={(v) => update({ alreadyServing: v === "yes" })}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "Not yet" },
              ]}
            />
            <FieldError>{errors.alreadyServing}</FieldError>
          </div>

          <Button fullWidth size="lg" disabled={!canContinue} onClick={() => setScreen(2)}>
            Continue
          </Button>
        </section>
      ) : (
        <section className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">What do you already have?</h1>
            <p className="mt-1 text-ink-500">"Not sure" is a fine answer. We'll adapt your plan either way.</p>
          </div>

          <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white px-4">
            {ynu("hasDomain", "A domain name")}
            {ynu("hasWebsite", "A website")}
            {ynu("hasEmail", "A business email address")}
            {ynu("hasPhone", "A business phone number")}
          </div>

          <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white px-4">
            {ynu("hasGBP", "A Google Business Profile")}
            {ynu("hasSocial", "Facebook or Instagram")}
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white px-4">{ynu("hasReviews", "Any customer reviews yet")}</div>

          <div className="flex gap-3">
            <Button variant="ghost" className="border border-ink-300 bg-white" onClick={() => setScreen(1)}>
              Back
            </Button>
            <Button fullWidth size="lg" disabled={pending} onClick={submit}>
              {pending ? "Building your plan…" : editMode ? "Update my plan" : "Build my plan"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
