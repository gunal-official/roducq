import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
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
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});

export const metadata: Metadata = {
  title: "roducq",
  description: "roducq — intake, briefs, proposals, and plans for client work.",
};

/* viewport-fit=cover lets iOS report real safe-area insets, which the fixed
   phone tab bar and drawer pad against (env(safe-area-inset-*)). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
