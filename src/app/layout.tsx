import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsProvider } from "@/lib/analytics/client";

export const metadata: Metadata = {
  title: "GoBeeFound",
  description: "Get your local business established online — one step at a time.",
  robots: { index: false, follow: false }, // The app is not a marketing surface.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh">
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
