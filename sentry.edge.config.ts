// Edge-runtime Sentry init (Step 14) — covers middleware. Imported by
// instrumentation.ts only when a DSN is set; inert otherwise.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}
