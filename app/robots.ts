import type { MetadataRoute } from "next";

// Relative import (not the "@/…" alias) so the offline test suite can
// import this module directly under node --test.
import { getSiteUrl } from "../lib/site.ts";

/**
 * Robots directives: the marketing surface is indexable; everything
 * behind authentication, every tokenised link and the API are not
 * crawl targets. This is crawl hygiene only — access control remains
 * authentication + row-level security, never robots.txt.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/briefs",
        "/contracts",
        "/intake",
        "/invoices",
        "/plans",
        "/proposals",
        "/reports",
        "/search",
        "/settings",
        "/time",
        "/updates",
        "/invite/",
        "/share/",
        "/invoice/",
        "/auth/",
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
