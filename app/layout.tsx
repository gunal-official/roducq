import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { DARK_BACKGROUND } from "@/lib/design-tokens";
import { getSiteUrl, SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";
import { cn } from "@/lib/utils";

// Forma typography is self-hosted, so the authenticated app and marketing
// pages share Manrope without a request to a public font CDN.
const manrope = localFont({
  src: "./fonts/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const firaCode = localFont({
  src: "./fonts/fira-code-latin-wght-normal.woff2",
  variable: "--font-fira-code",
  weight: "300 700",
  display: "swap",
  // Not preloaded: Fira Code only renders code/mono surfaces inside the
  // authenticated app, so preloading its 36KB file on the landing page
  // (and every other route) spent LCP bandwidth on a font the page never
  // paints with. It still loads on demand where `font-mono` is used.
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});

export const metadata: Metadata = {
  // Resolves relative canonical / Open Graph URLs against the deployed
  // origin (lib/site.ts). Without NEXT_PUBLIC_SITE_URL in production this
  // falls back to the platform-reported or localhost origin — see
  // docs/PRODUCTION_LAUNCH_READINESS.md §9.
  metadataBase: new URL(getSiteUrl()),
  title: "roducq",
  description: "roducq — intake, briefs, proposals, and plans for client work.",
  applicationName: "roducq",
  // Social cards. The image itself is the file-convention route in
  // app/opengraph-image.tsx (also reused as the Twitter image), so no
  // per-page image wiring is needed. Per-page openGraph blocks on the
  // marketing routes override title/description only.
  openGraph: {
    type: "website",
    siteName: "roducq",
    locale: "en_US",
    title: "roducq",
    description: "roducq — intake, briefs, proposals, and plans for client work.",
    // Explicit, because the file convention in app/opengraph-image.tsx
    // generates the artwork but Next does not attach it to pages that
    // define their own openGraph block (verified in the production
    // build — see docs/PRODUCTION_LAUNCH_READINESS.md §9).
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "roducq",
    description: "roducq — intake, briefs, proposals, and plans for client work.",
    images: [TWITTER_IMAGE],
  },
  robots: { index: true, follow: true },
};

/* viewport-fit=cover lets iOS report real safe-area insets, which the fixed
   phone tab bar and drawer pad against (env(safe-area-inset-*)). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Browser-chrome tint matching the landing canvas tokens in
  // app/(marketing)/landing.css (--lm-canvas / dark forma background).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f7fc" },
    { media: "(prefers-color-scheme: dark)", color: DARK_BACKGROUND },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          manrope.variable,
          firaCode.variable,
          "min-h-screen bg-background font-sans text-foreground antialiased"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
