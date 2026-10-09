/**
 * Next.js instrumentation hook (Step 14). Loads the Sentry server/edge
 * configs ONLY when SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN is configured —
 * with both unset this hook is
 * a no-op and the app behaves exactly as before (OPENAI_API_KEY-style
 * optional feature).
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
