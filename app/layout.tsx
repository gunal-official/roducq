import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// Ember Studio typography is fully self-hosted so the app renders offline
// and visitors never need a request to a public font CDN.
const playfair = localFont({
  src: "./fonts/playfair-display-latin-wght-normal.woff2",
  variable: "--font-playfair",
  weight: "400 900",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const sourceSans = localFont({
  src: "./fonts/source-sans-3-latin-wght-normal.woff2",
  variable: "--font-source-sans",
  weight: "200 900",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          playfair.variable,
          sourceSans.variable,
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
