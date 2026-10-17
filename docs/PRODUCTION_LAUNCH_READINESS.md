# roducq — production launch readiness (landing page QA)

Milestone: production landing-page QA, performance measurement and launch
readiness. This is a **measurement and hardening pass, not a redesign**:
the Forma-matched appearance and motion system from PR #48 / PR #49 are
preserved. Every change below is tied to a verified defect or a measured
cost, and the sections are labelled **[verified]**, **[automated]**,
**[manual]**, **[recommendation]** or **[untested]** so nothing simulated
is presented as a real production measurement.

---

## 1. Repository baseline

| | |
| --- | --- |
| Starting point | `main` @ `a3272fe` — PR #49 ("Final Forma Fidelity Audit & Polish") confirmed **MERGED** via `gh pr view 49` (merged 2026-10-17) before any work began, so this milestone builds on the latest `main`, including PR #48. |
| Framework | Next.js 16.3.6 (Turbopack build), React 18.3.1, `motion` 14.3.0, Node v22.22.3 |
| Session branch | `arena/2e9e64e9-roducq` (Arena session branch; the suggested `arena/roducq-production-qa` name is superseded by the session's fixed branch) |
| Setup note | The checkout initially had no `node_modules`; pre-install `lint`/`tsc` failures were purely that. After `npm ci`: |

**[verified] Baseline gates (after `npm ci`, before changes):**

| Gate | Result |
| --- | --- |
| `npm run lint` | pass |
| `npx tsc --noEmit` | pass |
| `npm test` | **1,104 pass / 0 fail** — matches the previous milestone's claim |
| `npm run build` | pass (36 routes; `/` static) |

Existing evidence carried forward (not re-claimed as new): 
`docs/ANIMATION_NOTES.md`, `docs/FORMA_FINAL_FIDELITY_AUDIT.md`,
`docs/screenshots/forma-final/`.

## 2. Methodology — and its hard limit

- Performance evidence in this milestone comes from the **production
  build's emitted assets** (byte-accurate gzip sizes of exactly what the
  landing route loads), the **rendered production HTML**, and
  **`npm run verify:production`** (new, `scripts/verify-production.mjs`),
  which smokes a running `next start` server over HTTP.
- **[untested] Lighthouse and real-browser Core Web Vitals could not be
  run in this sandbox.** `npx playwright-core install chromium` fails:
  the sandbox egress policy resets the connection to
  `cdn.playwright.dev` (`ECONNRESET`), the same restriction documented
  in `docs/FORMA_FINAL_FIDELITY_AUDIT.md` §1.1. Firefox and WebKit
  binaries are likewise unavailable. **No Lighthouse score is reported
  anywhere in this document, because none was measured.** The correct
  procedure (Lighthouse against the deployed preview, throttled Moto G
  Power / Slow 4G + desktop profiles; `scripts/verify-motion.mjs` for
  Chromium motion/overflow evidence; CrUX / `web-vitals` RUM for field
  INP) is listed as a launch task in §14.
- Local loopback timing from `verify:production` (3 samples of `/`:
  TTFB+transfer ≈ 7–13 ms) is recorded only as proof the static route is
  served from the prerender cache (`x-nextjs-cache: HIT`). It is **not**
  TTFB evidence for real users.

## 3. Core Web Vitals — status per metric

| Metric | Target | Status |
| --- | --- | --- |
| LCP | ≤ 2.5 s | **[manual/structural]** The LCP candidate is the hero `<h1>` text — there are no `<img>` elements anywhere on the landing route (all visuals are DOM/SVG mocks), and the one font that paints it (Manrope, 25 KB) is preloaded. Nothing in the measured payload suggests an LCP risk, but **no LCP time is claimed** without a browser. |
| CLS | ≤ 0.1 | **[manual/structural]** Animations animate only `transform`/`opacity`/SVG stroke (asserted by `tests/components/home.test.ts`); reveals never change layout, fonts use `display: swap` with metric fallbacks, and the server HTML is complete before hydration. Browser-measured CLS remains **[untested]**. |
| INP | ≤ 200 ms | **[untested]** Lighthouse cannot measure field INP, and no browser was available for interaction timing. The interactive surface is small (Radix mobile dialog, theme toggle, native `<details>` FAQ), but no INP number is claimed. Field measurement is a §14 launch task. |
| FCP / TTFB / TBT | — | **[untested]** in a browser. Asset-level contributors are measured in §4–§6 instead. |

## 4. JavaScript bundle findings **[verified from build output]**

Initial JS referenced by the production `/` HTML (14 scripts):

| | Raw | Gzip |
| --- | --- | --- |
| All referenced scripts | 786 KB | 248 KB |
| Modern browsers (excl. the `noModule` legacy polyfill chunk, 109 KB raw / 38 KB gzip, which modern browsers do not download) | 676 KB | **210 KB** |

Largest contributors: Next/React runtime chunk (242 KB raw / 75 KB gzip),
framework chunk (162/44), the Motion runtime chunk (129/43 — `motion/react`,
kept by design), legacy polyfill (109/38, `noModule`). CSS for the route:
105 KB + 10 KB raw (19 KB + 2 KB gzip). Landing HTML: 317 KB raw /
**39 KB gzip** (static, CDN-cacheable; the raw size is the RSC payload +
the inlined workspace mock, not wire cost under compression).

Findings:

1. **[fixed, P2] Unused font preload.** The root layout preloaded *both*
   Manrope (25 KB) and Fira Code (36 KB) on every route. The landing page
   never paints with Fira Code (mono surfaces live in the authenticated
   app). `app/layout.tsx` now sets `preload: false` on Fira Code.
   Verified in rebuilt production HTML: font preloads on `/` are now
   exactly `[manrope]`. Fira Code still loads on demand where
   `font-mono` renders.
2. **[recommendation, P2] Sentry client weight.** The browser Sentry SDK
   is inlined into the shared client chunks even when no DSN is
   configured (initialisation is correctly gated in
   `instrumentation-client.ts`). Lazy-loading it only when a DSN exists
   would cut landing JS, but it changes error-reporting wiring; left as
   a measured recommendation, not a speculative change.
3. **[observation]** No images, no third-party requests, no dynamic
   imports on the landing route; Motion is imported only by
   `Reveal.tsx`/`MotionProvider.tsx`. Nothing else in the bundle audit
   justified a code change under the "optimise only on measurements"
   rule.

## 5. Animation performance **[manual — code audit]**

Audited `MotionProvider.tsx`, `Reveal.tsx`, `SectionHeading.tsx`,
`app/(marketing)/landing.css`:

- One `useInView` observer per `Reveal`, `once: true`, 8% threshold —
  no repeated initialisation, no scroll listeners, cleanup handled by
  Motion. Animatable properties are compositor-only
  (transform/opacity/stroke-dashoffset).
- Continuous work is limited to: the 1000 ms linear connector dash
  march (reference-measured; only inside a revealed diagram) and the
  14 s lilac drift (disabled ≤ 767 px and under reduced motion). The
  drift animates two large `blur(110px)` blooms on desktop — the one
  paint-cost item worth a browser profile at launch; **not altered**,
  because no recording in this environment demonstrates jank and the
  milestone forbids timing/appearance changes on speculation.
- Reduced motion: `MotionConfig reducedMotion="user"` + per-component
  `useReducedMotion()` + the CSS kill-switch block; behaviour is
  asserted by tests (§13) and was browser-verified in PR #48/#49's
  harness. No change made; none needed on the evidence available.

## 6. Accessibility audit

**[automated]** The existing suite already asserts the landing contrast
contract (every text token ≥ 4.5:1 on its washes — independently
recomputed in this milestone with the WCAG luminance formula: e.g.
muted `#7a659f` = 5.01:1 on white cards, 4.71:1 on canvas; the 4.38:1
canvas-alt pairing is never used for real text — body copy uses the
`muted-readable` step), 44 px targets, focus ring, `aria-hidden`
decoratives, and reduced-motion end states.

**[manual]** Landmarks (header/nav/main/footer + labelled footer navs),
skip link, single `h1`, Radix dialog semantics (focus trap, Escape,
focus return), native `<details>` FAQ keyboard behaviour, theme-toggle
`aria-pressed`, `role="img"` workspace frame with a full text
alternative, mailto links announcing "(opens your email client)".

**[fixed, P1] Heading-outline defect.** The hero workspace mock rendered
its mock-UI greeting "Good morning, Priya" as a real `<h2>` inside the
`role="img"` frame. Assistive tech correctly ignored it (presentational
children), but it leaked a fake section into the document outline seen
by crawlers and heading-navigation tools. It is now a `<p>` with
identical classes — pixel-identical (Tailwind preflight + the utility
classes fully determine its rendering), AT experience unchanged.
Verified in rebuilt HTML: the outline is now exactly one `h1`, section
`h2`s and card `h3`s. Guarded by
`tests/components/production-readiness.test.ts`.

**[observation, not changed]** Integration cards use hover styling on
non-interactive `<li>` elements (the Forma reference used buttons; here
they are informational, with `aria-hidden` arrows). Making them links
would invent destinations; making them buttons would invent behaviour.
Recorded for a future design decision. The footer has no "Back to Top"
control; adding one is a visual change, so it is a recommendation (§14),
not a QA fix.

## 7. Responsive & browser QA

- **[automated]** Layout rules unchanged; the suite's responsive
  assertions (container token at all six widths, no fixed widths that
  can overflow 320 px, grid columns: Features 4 / Integrations 3 /
  Teams 4 / Pricing 4 / FAQ 2 at desktop) still pass.
- **[untested]** Fresh screenshots at 320/375/390/768/1024/1440 and
  Firefox/WebKit passes could not be produced in this sandbox (§2).
  PR #49's `docs/screenshots/forma-final/` evidence stands for the
  unchanged visuals; the only visual-adjacent change in this milestone
  is the `<h2>`→`<p>` swap with identical classes. Re-running
  `scripts/verify-motion.mjs` + `scripts/verify-responsive.mjs` on a
  Chromium-capable machine (or the GitHub-hosted runner, as in
  `.github/workflows/forma-reference.yml`) is a §14 launch task.

## 8. Functional smoke tests **[verified — `npm run verify:production`]**

Against `npm run build && npm start`, all green:

- `/`, `/about`, `/pricing`, `/vs`, `/vs/notion` → 200 with complete
  metadata (§9); unknown route → 404.
- All 11 internal links published on `/` resolve; `/intake`, `/briefs`,
  `/proposals`, `/plans` redirect to `/login` — the expected
  authentication behaviour, recorded, not a defect.
- Header/footer/hero/pricing/FAQ interactions themselves (menu, theme,
  accordion) are client behaviours covered by the test suite's source
  assertions and PR #48/#49 browser evidence; **[untested]** as live
  clicks in this sandbox (no browser, §2).

## 9. SEO & metadata **[verified]**

Before: title + description only. No canonical, no Open Graph, no
Twitter card, no sitemap, no robots file, no apple icon, no theme
color, no structured data.

Implemented (all Roducq-branded; no Forma identity anywhere):

- `lib/site.ts` — canonical origin resolution:
  `NEXT_PUBLIC_SITE_URL` → Vercel's platform-reported production URL →
  `VERCEL_URL` → localhost. **No production domain is hardcoded or
  guessed**; the domain is deployment configuration (§14, blocker B1).
- Root layout: `metadataBase`, Open Graph/Twitter defaults, explicit
  `robots`, `themeColor` (light `--lm-canvas`, dark via the new
  `DARK_BACKGROUND` token mirror in `lib/design-tokens.ts`).
- Every marketing route (home, about, pricing, vs hub, all 9 vs pages):
  canonical + OG + Twitter matching its own title/description, each
  referencing the shared `SOCIAL_IMAGE`/`TWITTER_IMAGE` constants.
  (Verified production behaviour worth knowing: a page-level
  `openGraph` block *replaces* the root one including images — the
  first build shipped without `og:image` until every page referenced
  the image explicitly. The harness in §8 now guards this.)
- `app/opengraph-image.tsx` — 1200×630 PNG generated at build by
  `next/og` from the landing tokens and existing headline copy
  (visually inspected: on-brand, no invented claims);
  `app/twitter-image.tsx` re-exports it; `app/apple-icon.tsx` —
  180×180 PNG twin of `app/icon.svg` using `TOKENS.purple`.
- `app/sitemap.ts` — the 13 marketing URLs only; `app/robots.ts` —
  allow `/`, disallow `/api/`, authenticated app routes and tokenised
  `/invite/`, `/share/`, `/invoice/` links.
- Landing-page WebSite JSON-LD (name + the page's own published
  description; URL included only when a non-local origin is configured).

Verification: default build resolves canonical/OG against localhost;
a build with `NEXT_PUBLIC_SITE_URL=https://example.test` (an obvious
test fixture, not a claimed domain) resolves canonical,
`og:image`, `twitter:image`, all 13 sitemap URLs and the robots
sitemap line against that origin. The served social image returns
200 `image/png` (50,540 bytes) and the apple icon 200 `image/png`.

## 10. Security & deployment review **[verified/manual]**

- Production headers on `/` confirmed over HTTP: HSTS
  `max-age=31536000; includeSubDomains`, `nosniff`, `X-Frame-Options:
  DENY`, `Referrer-Policy`, CSP (`default-src 'self'` …), and — new in
  this milestone — **`X-Powered-By` absent** (`poweredByHeader: false`).
  Static chunks serve `Cache-Control: public, max-age=31536000,
  immutable`; prerendered pages serve via the Next cache. No client
  source maps are emitted for static chunks.
- Pre-existing note (unchanged): if Sentry is enabled, its ingest host
  must be added to CSP `connect-src` — already documented in
  `next.config.mjs`.
- `npm audit`: 13 known vulnerabilities (10 high, 3 moderate, 0
  critical), predominantly transitive build-tooling chains
  (micromatch/braces via tailwind/eslint) plus advisories against
  `next` and `sharp` themselves. **No dependency was auto-upgraded**:
  patch evaluation for `next`/`sharp` is a compatibility task of its
  own. Recorded as launch task L3 (§14).
- Env documentation: `.env.local.example` already separated public vs
  server-only values; this milestone adds the `NEXT_PUBLIC_SITE_URL`
  production requirement. A pattern scan found no committed secrets
  (matches were the Razorpay test-mode guard code itself).
- **Protected systems untouched** — confirmed by diff (§11): no
  Razorpay, checkout, billing, Supabase, auth, API, schema or
  subscription file appears. Production payments remain disabled;
  PR #44/#45 safeguards intact.

## 11. Changes implemented

| Priority | Change | Files |
| --- | --- | --- |
| P1 (a11y/SEO) | Mock-UI greeting `<h2>` → `<p>` (identical rendering; outline fixed) | `components/marketing/landing/WorkspacePreview.tsx` |
| P1 (SEO) | Canonical + Open Graph + Twitter metadata on all marketing routes; `metadataBase`, robots defaults, theme-color | `app/layout.tsx`, `app/(marketing)/{page,about/page,pricing/page,vs/page,vs/[slug]/page}.tsx`, `lib/site.ts` |
| P1 (SEO) | Generated social + apple icons | `app/opengraph-image.tsx`, `app/twitter-image.tsx`, `app/apple-icon.tsx` |
| P1 (SEO) | Sitemap (13 marketing URLs) + robots (app/API/token disallow) | `app/sitemap.ts`, `app/robots.ts` |
| P2 (SEO) | WebSite JSON-LD on `/` | `app/(marketing)/page.tsx` |
| P2 (perf) | Stop preloading the unused Fira Code font (36 KB off every landing load) | `app/layout.tsx` |
| P3 (security) | `poweredByHeader: false` | `next.config.mjs` |
| — | `DARK_BACKGROUND` token mirror for theme-color | `lib/design-tokens.ts` |
| — | Launch smoke harness + docs for the production requirement | `scripts/verify-production.mjs` (`npm run verify:production`), `tests/components/production-readiness.test.ts` (+11 tests), `.env.local.example`, `package.json` script |

No visual token, animation timing, copy or layout value was changed.

## 12. Before / after

| Measure | Before | After |
| --- | --- | --- |
| Font preloads on `/` | Manrope 25 KB + Fira Code 36 KB | Manrope 25 KB only |
| Marketing metadata | title + description | + canonical, OG (incl. 1200×630 image), Twitter, theme-color |
| `/sitemap.xml`, `/robots.txt` | 404 (absent) | 200, marketing-only sitemap |
| Heading outline | fake `h2` "Good morning, Priya" from the mock | clean h1 → h2 → h3 |
| `X-Powered-By` | present | absent |
| Tests | 1,104 pass | **1,115 pass** (11 new) |
| Landing JS (gzip, modern) | 210 KB — unchanged; the saving is the 36 KB font, not JS | 210 KB |

## 13. Final verification results **[verified]**

| Gate | Result |
| --- | --- |
| `npm run lint` | pass |
| `npx tsc --noEmit` | pass |
| `npm test` | **1,115 pass / 0 fail** (1,104 baseline + 11 new; none deleted or weakened) |
| `npm run build` | pass (41 static pages incl. new `/sitemap.xml`, `/robots.txt`, `/opengraph-image`, `/twitter-image`, `/apple-icon` routes) |
| `npm run verify:production` | **PASS** (metadata, assets, headers, 11-link crawl, 404, JSON-LD) |
| `scripts/verify-motion.mjs` | **[untested]** — requires Chromium; the sandbox cannot download it (§2). Run at launch per §14. |
| Reduced motion / no-JS visibility | intact — CSS + Motion behaviour unchanged, still asserted by `home.test.ts`/`motion.test.ts` |

## 14. Remaining launch blockers & tasks

- **B1 (deployment config, blocking for SEO correctness):** set
  `NEXT_PUBLIC_SITE_URL` to the real production origin in the
  deployment environment. Until then canonical/OG/sitemap resolve
  against the platform-reported (possibly preview) hostname.
- **L2 (verification):** on a Chromium-capable runner, run Lighthouse
  (mobile + desktop) against the deployed preview and
  `scripts/verify-motion.mjs` / `scripts/verify-responsive.mjs`;
  confirm LCP/CLS against §3 targets and add field INP measurement
  (CrUX or `web-vitals` RUM) after launch. Profile the desktop drift
  blur (§5) in the same pass.
- **L3 (security maintenance):** evaluate `next`/`sharp` patch upgrades
  for the §10 audit findings as a dedicated compatibility change;
  re-run `npm audit` afterwards.
- **R1 (recommendations, non-blocking):** lazy-load the Sentry browser
  SDK when no DSN is configured (§4); decide whether integration cards
  should become real links (§6); consider a footer Back-to-Top control
  as a deliberate design change (§6).

## 15. What was not done, deliberately

No redesign, no new animations, no animation-timing changes, no
dependency upgrades, no changes to payment/auth/backend systems, and no
Lighthouse or INP figures — because none could be honestly measured in
this environment.
