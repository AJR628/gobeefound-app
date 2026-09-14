// Minimal chrome for the preview iframe: no app header, no tabs, no analytics. The root layout still
// wraps this (fonts, base styles); the site's own stylesheet is scoped to .s-body.
export default function SitePreviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
