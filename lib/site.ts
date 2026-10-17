/**
 * Canonical site origin for the public SEO surface — `metadataBase`,
 * canonical URLs, Open Graph URLs, the sitemap and robots.txt.
 *
 * RESOLUTION ORDER (first set wins):
 *   1. NEXT_PUBLIC_SITE_URL — the operator's production domain. This is a
 *      REQUIRED production setting (see .env.local.example): canonical and
 *      social URLs are only as correct as this value.
 *   2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL — domains the deployment
 *      platform itself reports, never a guessed roducq domain.
 *   3. http://localhost:3000 — local development fallback.
 *
 * This module deliberately never hardcodes a roducq production domain:
 * the domain is deployment configuration, not source code. It is read on
 * every call (not cached at module scope) so tests and builds can stub
 * the environment.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

/** True when the resolved origin is the local development fallback. */
export function isLocalSiteUrl(): boolean {
  return getSiteUrl().includes("localhost") || getSiteUrl().includes("127.0.0.1");
}

/**
 * The generated social card (app/opengraph-image.tsx). Every marketing
 * page references it explicitly: a page-level `openGraph` block replaces
 * the root layout's in Next's metadata resolution, images included, so
 * inheriting it silently drops og:image (verified in the production
 * build — docs/PRODUCTION_LAUNCH_READINESS.md §9).
 */
export const SOCIAL_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "roducq — the workspace that does the client writing",
} as const;

/** Twitter/X twin of SOCIAL_IMAGE (app/twitter-image.tsx). */
export const TWITTER_IMAGE = "/twitter-image";
