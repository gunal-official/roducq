import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// 2026-09 design guide. Body face: Inter via next/font/google — fetched once
// at build time and self-hosted from the deployment, so visitors never hit
// fonts.googleapis.com. Display face: Georgia/Times (tailwind `font-display`),
// system serifs with nothing to load.
//
// Build reliability: if CI/Vercel ever can't reach Google Fonts during
// `next build`, swap this for next/font/local pointing at a committed Inter
// woff2 (same --font-inter variable, no other change needed).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
          inter.variable,
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
