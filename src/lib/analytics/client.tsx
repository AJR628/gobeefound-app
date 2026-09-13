"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// §19 — client side: PostHog's automatic pageview capture only, plus the three UI-only events
// (known_value_copied, referral_link_copied, presence_summary_downloaded). No session recording (§19.3).

let initialized = false;

export function AnalyticsProvider({ userId }: { userId?: string }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (!initialized) {
      posthog.init(key, {
        api_host: "https://us.i.posthog.com",
        capture_pageview: true,
        autocapture: false,
        disable_session_recording: true,
        persistence: "localStorage+cookie",
      });
      initialized = true;
    }
    if (userId) posthog.identify(userId); // internal UUID, never email
  }, [userId]);
  return null;
}

const CLIENT_ALLOW: Record<string, readonly string[]> = {
  known_value_copied: ["taskId", "fieldKey"],
  referral_link_copied: [],
  presence_summary_downloaded: [],
  generator_output_copied: ["toolId"],
};

export function captureClient(event: keyof typeof CLIENT_ALLOW, props: Record<string, unknown> = {}): void {
  if (!initialized) return;
  const allowed = new Set(CLIENT_ALLOW[event]);
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) if (allowed.has(k)) clean[k] = v;
  posthog.capture(event, clean);
}
