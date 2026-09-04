import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegistrar } from "@/components/PwaRegistrar";
import { LanguageProvider } from "@/components/LanguageProvider";

export const metadata: Metadata = {
  title: "Pest Mantra — Technician",
  description: "Pest Mantra Field Service Management System — Technician App",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/pest-mantra-icon.svg", apple: "/pest-mantra-icon.svg" },
};

// Mobile-first: this app is used on a technician's own phone in
// the field, not resized/zoomed like a desktop browser tab.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#17233f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body><LanguageProvider><PwaRegistrar />{children}</LanguageProvider></body>
    </html>
  );
}
