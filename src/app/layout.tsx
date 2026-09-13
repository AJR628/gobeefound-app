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
      <body className="min-h-dvh">
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
