// §8.7 / §12.3 — the confirmation step. Outside module structure, outside the percentage.
// Rendered as its own card on /home once all required module tasks are complete.

export const CONFIRM_STEP = {
  id: "confirm",
  title: "Confirm everything we know about your business",
  timeEstimate: "5 minutes",
  intro: "This is what GoBeeFound knows about your business. Have a read. Anything wrong?",
  whyItMatters:
    "Everything above is accurate today. Confirming it gives you a known-good record to check against later — and it's the last step before you're launched.",
  confirmLabel: "Yes — this is all correct",
  somethingWrongLabel: "Something's wrong",
} as const;

export const CONFIRM_STEP_ID = CONFIRM_STEP.id;
