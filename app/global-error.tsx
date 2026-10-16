"use client";

/**
 * Root-level error boundary (Step 14). Per Next.js App Router convention
 * this REPLACES the root layout when it triggers, so it must render its
 * own <html> and <body> — no Tailwind/globals are guaranteed, hence
 * inline styles only. Reports to Sentry when SENTRY_DSN is configured
 * (lazy import: with it unset, the SDK chunk is never loaded).
 *
 * Styling comes from lib/design-tokens.ts (Forma design system) rather
 * than hardcoded hex, so this page can't drift from the rest of the app.
 * Light tokens only: the theme class isn't available once the root
 * layout has been replaced.
 */

import { useEffect } from "react";

import { FONT_STACKS, RADIUS_CONTROL, TOKENS } from "@/lib/design-tokens";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/nextjs").then((Sentry) => {
        Sentry.captureException(error);
      });
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: FONT_STACKS.body,
          background: TOKENS.background,
          color: TOKENS.text,
          textAlign: "center",
          padding: "0 16px",
        }}
      >
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              fontFamily: FONT_STACKS.display,
              fontSize: 22,
              fontWeight: 600,
              margin: 0,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: TOKENS.secondaryText,
              marginTop: 8,
              maxWidth: 320,
            }}
          >
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              minHeight: 44,
              minWidth: 44,
              padding: "8px 16px",
              borderRadius: RADIUS_CONTROL,
              border: `1px solid ${TOKENS.purple}`,
              background: TOKENS.purple,
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
