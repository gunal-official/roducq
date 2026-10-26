/**
 * URL prefixes for authenticated application routes. Route groups such as
 * `(app)` do not appear in the URL, so keep this inventory at URL level.
 * `/onboarding` is under `(auth)` in the filesystem but also requires a
 * session. Public token routes use the singular `/invoice/` path and must
 * not be confused with the protected `/invoices` application section.
 */
export const APP_PREFIXES = [
  "/intake",
  "/briefs",
  "/proposals",
  "/plans",
  "/updates",
  "/invoices",
  "/time",
  "/contracts",
  "/reports",
  "/settings",
  "/onboarding",
  "/dashboard",
  "/search",
] as const;

/** Exact route or a child route; similarly named public paths do not match. */
export function isAppPath(pathname: string): boolean {
  return APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
