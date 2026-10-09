// Server-side Sentry init (Step 14), imported by instrumentation.ts only
// when SENTRY_DSN is set. Guarded here too (register() calls this lazily).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}
