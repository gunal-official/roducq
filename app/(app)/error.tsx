"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/page";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Step 14: also report to Sentry when configured — lazy import so the
    // SDK chunk is never loaded with SENTRY_DSN unset (fully inert).
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/nextjs").then((Sentry) => {
        Sentry.captureException(error);
      });
    }
  }, [error]);

  return (
    <EmptyState
      headingAs="h1"
      icon={AlertTriangle}
      title="Something went wrong"
      description={
        error.message || "An unexpected error occurred. Please try again."
      }
      tone="muted"
      action={
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
