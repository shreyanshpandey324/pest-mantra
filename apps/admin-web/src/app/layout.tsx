import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

/**
 * Self-hosted via next/font/google instead of a manual <link> to
 * fonts.googleapis.com (flagged by @next/next/no-page-custom-font):
 * a hand-written <link> only loads for the page it's rendered on
 * and costs a render-blocking round trip to Google's font CDN on
 * every navigation. next/font downloads these at build time, self
 * -hosts them, and inlines the @font-face + preload — no runtime
 * request to Google at all, with the same families/weights/swap
 * behavior as before. Each loader exposes its family through a CSS
 * variable (applied on <html> below) that globals.css's
 * --font-sans / --font-display / --font-mono tokens fall back to.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans-loaded",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display-loaded",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono-loaded",
});

export const metadata: Metadata = {
  title: "Pest Mantra — Field Ops",
  description: "Pest Mantra Field Service Management System — Admin Dashboard",
  robots: { index: false, follow: false }, // internal ops tool, never indexed
  formatDetection: { telephone: false }, // avoid auto-linking phone numbers shown in tables/cards
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1115",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}