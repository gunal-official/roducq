import type { MetadataRoute } from "next";

// Relative imports (not the "@/…" alias) so the offline test suite can
// import this module directly under node --test, like the content modules.
import { VS_PAGE_LIST } from "./(marketing)/vs/[slug]/vs-pages.ts";
import { getSiteUrl } from "../lib/site.ts";

/**
 * Sitemap for the public marketing surface only. Authenticated app
 * routes, tokenised share/invite/invoice links and API routes are
 * excluded (and disallowed in robots.ts) — they are not indexable
 * content. URLs resolve against lib/site.ts, so production correctness
 * depends on NEXT_PUBLIC_SITE_URL being set (see
 * docs/PRODUCTION_LAUNCH_READINESS.md §9).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();
  const paths = [
    "/",
    "/about",
    "/pricing",
    "/vs",
    "/changelog",
    "/security",
    ...VS_PAGE_LIST.map((entry) => `/vs/${entry.slug}`),
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified,
  }));
}
