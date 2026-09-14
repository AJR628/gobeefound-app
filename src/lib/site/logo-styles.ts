// V4 §A3 — the closed set of AI logo styles. Client-safe (no provider code): imported by the setup wizard
// for its picker and by the server-only image module for prompt assembly.
export const LOGO_STYLES = ["mark", "wordmark", "badge", "monogram"] as const;
export type LogoStyle = (typeof LOGO_STYLES)[number];

export const LOGO_STYLE_LABEL: Record<LogoStyle, { label: string; hint: string }> = {
  mark: { label: "Simple symbol", hint: "One clean shape that suggests your trade" },
  wordmark: { label: "Your name, styled", hint: "The business name in a strong typeface" },
  badge: { label: "Badge", hint: "Name inside a circle or shield" },
  monogram: { label: "Initials", hint: "Your initials as a mark" },
};
