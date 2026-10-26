/**
 * Production launch readiness — SEO surface, social images, crawl
 * files and the two measured performance/semantics corrections.
 *
 * These tests guard what docs/PRODUCTION_LAUNCH_READINESS.md claims:
 * the metadata system resolves against lib/site.ts (never a hardcoded
 * production domain), every marketing route carries canonical + social
 * metadata matching its own title/description, the sitemap lists the
 * marketing routes and only those, robots keeps crawlers out of the
 * app/API, the unused mono font is not preloaded, and the hero's mock
 * workspace contributes no heading to the document outline.
 *
 * Source-level + real imports, zero test deps, like home.test.ts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { getSiteUrl, isLocalSiteUrl } from "../../lib/site.ts";
import { VS_PAGE_LIST } from "../../app/(marketing)/vs/[slug]/vs-pages.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const MARKETING_METADATA: Array<{ file: string; canonical: string }> = [
  { file: "app/(marketing)/page.tsx", canonical: "/" },
  { file: "app/(marketing)/about/page.tsx", canonical: "/about" },
  { file: "app/(marketing)/pricing/page.tsx", canonical: "/pricing" },
  { file: "app/(marketing)/vs/page.tsx", canonical: "/vs" },
  { file: "app/(marketing)/changelog/page.tsx", canonical: "/changelog" },
];

describe("production readiness — site origin", () => {
  it("never hardcodes a roducq production domain", () => {
    const site = read("lib/site.ts");
    assert.match(site, /NEXT_PUBLIC_SITE_URL/);
    assert.doesNotMatch(site, /roducq\.(com|dev|app|io)/, "domain is deployment config, not source");
    assert.equal(getSiteUrl().endsWith("/"), false, "no trailing slash");
  });

  it("honours NEXT_PUBLIC_SITE_URL when set, localhost otherwise", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      process.env.NEXT_PUBLIC_SITE_URL = "https://example.test/";
      assert.equal(getSiteUrl(), "https://example.test");
      assert.equal(isLocalSiteUrl(), false);
      delete process.env.NEXT_PUBLIC_SITE_URL;
      if (!process.env.VERCEL_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        assert.equal(getSiteUrl(), "http://localhost:3000");
        assert.equal(isLocalSiteUrl(), true);
      }
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });
});

describe("production readiness — metadata", () => {
  it("the root layout resolves metadataBase from lib/site and sets social defaults", () => {
    const layout = read("app/layout.tsx");
    assert.match(layout, /metadataBase: new URL\(getSiteUrl\(\)\)/);
    assert.match(layout, /openGraph:/);
    assert.match(layout, /twitter:/);
    assert.match(layout, /summary_large_image/);
    assert.match(layout, /siteName: "roducq"/);
    assert.match(layout, /themeColor:/);
  });

  it("every marketing route declares canonical + OG + Twitter metadata", () => {
    for (const { file, canonical } of MARKETING_METADATA) {
      const src = read(file);
      assert.ok(
        src.includes(`canonical: "${canonical}"`) ||
          src.includes("canonical: `/vs/${slug}`"),
        `${file}: canonical ${canonical}`,
      );
      assert.match(src, /openGraph:/, `${file}: openGraph`);
      assert.match(src, /twitter:/, `${file}: twitter`);
      assert.match(src, /images: \[SOCIAL_IMAGE\]/, `${file}: og image (page blocks replace the root one)`);
      assert.match(src, /images: \[TWITTER_IMAGE\]/, `${file}: twitter image`);
    }
    const vsSlug = read("app/(marketing)/vs/[slug]/page.tsx");
    assert.match(vsSlug, /canonical: `\/vs\/\$\{slug\}`/);
  });

  it("the landing page emits WebSite JSON-LD with no invented claims", () => {
    const page = read("app/(marketing)/page.tsx");
    assert.match(page, /application\/ld\+json/);
    assert.match(page, /"@type": "WebSite"/);
    assert.match(page, /isLocalSiteUrl/, "localhost origins stay out of JSON-LD");
  });

  it("social images are generated brand routes, and the twitter image reuses the OG art", () => {
    for (const file of ["app/opengraph-image.tsx", "app/twitter-image.tsx", "app/apple-icon.tsx"]) {
      assert.ok(existsSync(new URL(`../../${file}`, import.meta.url)), file);
    }
    const og = read("app/opengraph-image.tsx");
    assert.match(og, /width: 1200/);
    assert.match(og, /height: 630/);
    assert.match(og, /#6246ea/, "landing accent token");
    assert.match(og, /#1b1426/, "landing dark-surface token");
    assert.doesNotMatch(og, /forma/i, "no reference branding in social art");
    assert.match(read("app/twitter-image.tsx"), /from "\.\/opengraph-image"/);
    const apple = read("app/apple-icon.tsx");
    assert.match(apple, /width: 180/);
    assert.match(apple, /TOKENS\.purple/, "same Forma purple token as app/icon.svg");
  });
});

describe("production readiness — crawl files", () => {
  it("the sitemap lists the marketing routes and only those", async () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
      const { default: sitemap } = await import("../../app/sitemap.ts");
      const urls = sitemap().map((entry) => entry.url);
      for (const path of ["/", "/about", "/pricing", "/vs", "/changelog"]) {
        assert.ok(urls.includes(`https://example.test${path}`), `sitemap ${path}`);
      }
      for (const entry of VS_PAGE_LIST) {
        assert.ok(urls.includes(`https://example.test/vs/${entry.slug}`), `sitemap /vs/${entry.slug}`);
      }
      assert.equal(urls.length, 5 + VS_PAGE_LIST.length);
      assert.ok(urls.every((u) => !u.includes("/dashboard") && !u.includes("/api")), "no app/API URLs");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });

  it("robots allows the marketing surface and disallows app, token and API routes", async () => {
    const { default: robots } = await import("../../app/robots.ts");
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rules?.disallow ?? [];
    const list = Array.isArray(disallow) ? disallow : [disallow];
    for (const path of ["/api/", "/dashboard", "/invite/", "/share/"]) {
      assert.ok(list.includes(path), `robots disallows ${path}`);
    }
    assert.match(String(result.sitemap), /\/sitemap\.xml$/);
  });
});

describe("production readiness — measured corrections", () => {
  it("the unused mono font is not preloaded; the text font still is", () => {
    const layout = read("app/layout.tsx");
    const firaBlock = layout.slice(layout.indexOf("const firaCode"), layout.indexOf("export const metadata"));
    assert.match(firaBlock, /preload: false/, "Fira Code must not preload on the landing page");
    const manropeBlock = layout.slice(layout.indexOf("const manrope"), layout.indexOf("const firaCode"));
    assert.doesNotMatch(manropeBlock, /preload: false/, "Manrope paints the landing page; keep its preload");
  });

  it("the hero workspace mock contributes no heading to the document outline", () => {
    const preview = read("components/marketing/landing/WorkspacePreview.tsx");
    assert.doesNotMatch(preview, /<h[1-6][\s>]/, "mock UI inside role=\"img\" must not use heading elements");
    assert.match(preview, /role="img"/, "the frame keeps its single accessible name");
    assert.match(preview, /Good morning, Priya/, "the greeting copy itself is unchanged");
  });

  it("responses do not advertise the framework", () => {
    assert.match(read("next.config.mjs"), /poweredByHeader: false/);
  });
});
