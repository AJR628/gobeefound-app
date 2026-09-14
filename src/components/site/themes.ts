// V4 §D rule 4 — the closed design vocabulary the renderer understands. Themes control type, shape and
// rhythm; palettes control colour. The model never sees or chooses any of this.
import type { PaletteId, ThemeId } from "@/lib/site/spec";

export interface Palette {
  label: string;
  primary: string; // buttons, links, accents
  accent: string; // hero band / highlights
  bg: string;
  surface: string;
  text: string;
  muted: string;
}

/** `brand` is resolved at render time from BusinessProfile.brandColors; these are the curated set. */
export const PALETTES: Record<Exclude<PaletteId, "brand">, Palette> = {
  slate: { label: "Slate", primary: "#1f3a5f", accent: "#e8eef5", bg: "#ffffff", surface: "#f6f8fb", text: "#14202e", muted: "#5b6b7c" },
  forest: { label: "Forest", primary: "#2e6b3f", accent: "#e6f1e8", bg: "#ffffff", surface: "#f4f8f4", text: "#1a2a1e", muted: "#5c6f60" },
  ocean: { label: "Ocean", primary: "#0f6f8f", accent: "#e3f2f7", bg: "#ffffff", surface: "#f2f8fa", text: "#12242c", muted: "#587179" },
  sunset: { label: "Sunset", primary: "#c2560e", accent: "#fdeee2", bg: "#fffaf5", surface: "#fff3e8", text: "#2b1a10", muted: "#7a5c48" },
  earth: { label: "Earth", primary: "#6b4f2a", accent: "#f1e9dd", bg: "#fdfbf7", surface: "#f6f0e6", text: "#2a2118", muted: "#74655a" },
  charcoal: { label: "Charcoal", primary: "#f7a012", accent: "#2a2a2a", bg: "#171717", surface: "#222222", text: "#f5f5f5", muted: "#b5b5b5" },
};

export interface Theme {
  label: string;
  hint: string;
  fontDisplay: string;
  fontBody: string;
  radius: string;
  /** hero band style: "band" fills with accent; "plain" is type on background; "block" is a solid primary block */
  hero: "band" | "plain" | "block";
  weight: number;
}

export const THEMES: Record<ThemeId, Theme> = {
  clean: { label: "Clean", hint: "Lots of white space, calm type", fontDisplay: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", fontBody: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", radius: "12px", hero: "plain", weight: 700 },
  bold: { label: "Bold", hint: "Big headline, strong colour", fontDisplay: "'Arial Black', 'Helvetica Neue', Arial, sans-serif", fontBody: "'Helvetica Neue', Arial, sans-serif", radius: "6px", hero: "block", weight: 900 },
  warm: { label: "Warm", hint: "Soft corners, friendly feel", fontDisplay: "Georgia, 'Times New Roman', serif", fontBody: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", radius: "18px", hero: "band", weight: 700 },
  classic: { label: "Classic", hint: "Traditional, trustworthy", fontDisplay: "Georgia, 'Times New Roman', serif", fontBody: "Georgia, 'Times New Roman', serif", radius: "4px", hero: "plain", weight: 700 },
  modern: { label: "Modern", hint: "Sharp edges, tight grid", fontDisplay: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontBody: "'Helvetica Neue', Helvetica, Arial, sans-serif", radius: "0px", hero: "band", weight: 800 },
  trade: { label: "Trade", hint: "Straightforward, built for phones", fontDisplay: "'Trebuchet MS', 'Segoe UI', sans-serif", fontBody: "'Segoe UI', Tahoma, sans-serif", radius: "8px", hero: "block", weight: 800 },
};

export function resolvePalette(id: PaletteId, brand: { primary: string; secondary: string } | null): Palette {
  if (id !== "brand") return PALETTES[id];
  if (!brand) return PALETTES.slate;
  return { label: "Your brand", primary: brand.primary, accent: brand.secondary, bg: "#ffffff", surface: "#f7f7f7", text: "#151515", muted: "#5f5f5f" };
}

/** CSS custom properties for one site. Values are validated hex/known strings, never free text. */
export function themeVariables(theme: ThemeId, palette: Palette): Record<string, string> {
  const t = THEMES[theme];
  return {
    "--s-primary": palette.primary,
    "--s-accent": palette.accent,
    "--s-bg": palette.bg,
    "--s-surface": palette.surface,
    "--s-text": palette.text,
    "--s-muted": palette.muted,
    "--s-font-display": t.fontDisplay,
    "--s-font-body": t.fontBody,
    "--s-radius": t.radius,
    "--s-weight": String(t.weight),
  };
}

/** Serialise variables into an inline `style` string (used by the export document). */
export function themeStyleAttr(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v.replace(/[;{}<>]/g, "")}`)
    .join(";");
}
