# roducq — final go-live readiness

Milestone: production deployment readiness, **real-browser QA** and go-live
verification. This is an **audit and measurement pass, not a redesign**: the
Forma-matched appearance and motion system from PR #48 / PR #49 / PR #50 is
preserved untouched. Nothing in this milestone changed a single source file
(`git status` on the branch is empty) — every item below is a measurement, a
finding, or a recommendation.

Every claim is labelled **[verified]** (executed here, output recorded),
**[measured]** (numeric evidence from a real run), **[blocked]** (tooling or
access unavailable — the exact limitation is recorded) or **[recommendation]**
(not applied).

---

## 1. Repository and PR baseline

| | |
| --- | --- |
| PR #50 status | **MERGED** — `gh pr view 50` → `state: MERGED`, `mergedAt: 2026-10-17T14:01:19Z`, merge commit `c91e508` |
| Starting point | `main` @ `c91e508` = `origin/main` = this branch's base. Because PR #50 is merged, work continued from the latest `main` implementation; no PR #50 work was duplicated or discarded. |
| Session branch | `arena/fcdadff0-roducq` (the session's fixed branch) |
| Stack | Next.js 16.3.6 (Turbopack build), React 18.3.1, `motion` 14.3.0, Node v22.22.3, npm 10.9.8 |
| Production host | `https://roducq.nanexi.com` (taken from the repository's own docs/README and confirmed live — never guessed) |

### Baseline gates, re-run before any conclusion **[verified]**

The previous milestone's numbers were **not** assumed. All were re-executed on
this branch:

| Gate | Result |
| --- | --- |
| `npm ci` | pass (658 packages: 266 prod, 273 dev, 101 optional, 46 peer) |
| `npm run lint` | **pass** |
| `npx tsc --noEmit` | **pass** |
| `npm test` | **1,115 pass / 0 fail** (278 suites) — matches the claimed 1,115 baseline exactly |
| `npm run build` | **pass** |
| `npm run verify:production` | **PASS** |

> Note: `next build` rewrote `tsconfig.json` during a temporary out-of-tree
> build (`NEXT_DIST_DIR`); that unintended side effect was reverted. The
> branch ships with **zero modified tracked files**.

---

## 2. Production environment audit

### 2.1 Domain resolution **[verified]**

`lib/site.ts` resolves the canonical origin in this order:
`NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` →
`http://localhost:3000`. No domain is hardcoded in source.

To prove the production configuration end-to-end, the app was built **with the
real production origin** and the emitted routes were read over HTTP:

| Surface | Resolved value |
| --- | --- |
| `rel="canonical"` on `/` | `https://roducq.nanexi.com` |
| `og:url`, `og:image` | `https://roducq.nanexi.com` / `…/opengraph-image` (1200×630) |
| `twitter:image` | `https://roducq.nanexi.com/twitter-image` |
| `robots.txt` `Sitemap:` | `https://roducq.nanexi.com/sitemap.xml` |
| Sitemap `<loc>` entries | all 13 URLs under `https://roducq.nanexi.com` |
| JSON-LD `WebSite.url` | `https://roducq.nanexi.com/` |

Cross-checked against the **live** origin (fetched over the page-fetch path,
since the sandbox blocks direct TLS to the host): production's `robots.txt` and
`sitemap.xml` return byte-for-byte the same production-domain URLs, and the
live sitemap's `lastmod` is `2026-10-17T14:02:17Z` — **76 seconds after PR #50
merged**, independent proof that production serves the audited commit.

**PR #50's blocker B1 ("set `NEXT_PUBLIC_SITE_URL`") is therefore RESOLVED in
effect:** every public SEO surface on the live site resolves to the real
production domain.

**[recommendation] C5 — make it explicit.** From outside the deployment the
correct origin could come from `NEXT_PUBLIC_SITE_URL` *or* from Vercel's
automatic `VERCEL_PROJECT_PRODUCTION_URL`; the two are indistinguishable in the
served output. Set `NEXT_PUBLIC_SITE_URL=https://roducq.nanexi.com` explicitly
in the Vercel project (Production **and** Preview scope) so the value is
pinned, reviewable, and not dependent on a platform variable's scope rules.

### 2.2 Secret isolation **[verified]**

The production build output was scanned (800 JS/JSON/HTML artefacts):

| Check | Result |
| --- | --- |
| Secret **values** in client `static/` chunks (`rzp_live_`, `rzp_test_`, JWT `eyJ…`, `sk-`, `AKIA`, `ghp_`, `-----BEGIN`) | **none** |
| Non-public env **names** inlined into client chunks | **none** |
| Public names present in client chunks | only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public by design) |
| Client source maps emitted | **none** |
| Committed secrets (pattern scan of the repo) | none — `.env*` is gitignored, only `.env.local.example` is tracked |

Matches for `SERVICE_ROLE`, `RAZORPAY_KEY_SECRET`, `EMAIL_TOKEN_ENCRYPTION_KEY`
etc. appear **only** in `server/chunks/ssr/` — that is the code reading them,
which is correct. No payment, billing or Supabase configuration was modified.

---

## 3. Real-browser tooling: what was actually executed

The previous milestone could not run a browser at all. This one could:

| Component | Source | Status |
| --- | --- | --- |
| Chromium | `@sparticuz/chromium` **153.0.0** npm package; `bin/chromium.br` brotli-inflated to a 209 MB binary, `bin/al2023.tar.br` extracted to `/tmp/aws-libs/lib` | **running — `Chromium 153.0.8010.0`** |
| Driver | `playwright-core` 1.63.0 (`executablePath` override) | working |
| Lighthouse | **13.5.0** CLI, 3 runs per profile | working |
| axe-core | repo devDependency 4.14.0, injected into the live page | working |
| Firefox | — | **[blocked]** — see below |
| WebKit/Safari | — | **[blocked]** — see below |

**Why Firefox and WebKit could not be run (exact limitation, not a
substitution).** The sandbox permits egress only to `github.com`,
`registry.npmjs.org` and `pypi.org`. Verified failures:

- `cdn.playwright.dev` → TLS `SSL_ERROR_SYSCALL` / connection reset (`curl`
  returns `000`); `npx playwright-core install firefox|webkit` cannot download.
- GitHub **release-asset** downloads are also blocked
  (`release-assets.githubusercontent.com` → `EOF`), so no browser binary can be
  pulled from a release attachment.
- `apt-get download firefox-esr` → "no candidate".

**No simulated screenshot or emulated-user-agent result is presented anywhere
in this document as Firefox or WebKit evidence.** Those two engines are
recorded as unverified (§7, gate G9).

---

## 4. Lighthouse methodology

- **Target:** a real production build (`npm run build` → `npm start`), served on
  loopback and driven by **real Chromium 153** — not a dev server, not a
  mock.
- **Runs:** 3 mobile + 3 desktop, median reported. Mobile profile =
  `Moto G Power` class (412×823, DPR 1.75, mobile UA, touch) with
  **4× CPU throttling and Slow 4G (1.6 Mbps / 750 Kbps / 150 ms RTT)**; desktop
  = 1350×940, DPR 1, no throttling.
- **Not manipulated:** no audit was disabled, no scoring weight changed, no
  network cheat, no warmed-cache trickery. Where Lighthouse could not produce a
  number, no number is reported.
- **Lighthouse Performance could not be scored** — see §5.3. This is stated
  rather than worked around.

---

## 5. Lighthouse results **[measured]**

### 5.1 Categories that Lighthouse scored

| Profile | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| **Mobile** (median of 3) | *not scorable* | **100** | **100** | **100** |
| **Desktop** (median of 3) | *not scorable* | **100** | **100** | **100** |

Zero failing audits in any of the three scored categories on every run
(verified by walking each category's `auditRefs`).

### 5.2 Audits Lighthouse did complete

| Metric | Mobile (median) | Desktop (median) |
| --- | --- | --- |
| First Contentful Paint | 1,068 ms (1,064 / 1,068 / 1,111) | **304 ms** (304 / 308 / 297) |
| Speed Index | 1,284 ms (1,429 / 1,068 / 1,284) | **618 ms** (615 / 661 / 618) |
| Cumulative Layout Shift | **0** (all runs) | **0** (all runs) |
| Server response time (TTFB) | 6–10 ms (loopback) | 6–10 ms (loopback) |

Loopback TTFB is recorded as evidence that `/` is served from the prerender
cache — it is **not** a field TTFB for real users.

### 5.3 Why Performance is not scored — and what it uncovered

Every run aborted the Performance category with:

```
LanternError: NO_LCP
  at LargestContentfulPaint.getOptimisticGraph …/lantern/metrics/LargestContentfulPaint.js:30
```

This was **not** dismissed as a tooling quirk. It was investigated, and it
exposed a genuine page-level Core Web Vitals defect (§6.2).

---

## 6. Core Web Vitals results

Because Lighthouse's Performance category was unusable, the metrics were taken
directly from the browser under the **same** throttling profiles, using the
browser's own `PerformanceObserver` and CDP trace events.

| Metric | Target | Mobile | Desktop | Verdict |
| --- | --- | --- | --- | --- |
| **LCP** | ≤ 2.5 s | **not measurable** (0 candidates) | **458 ms** (457 / 458 / 514) | desktop **PASS**; mobile **FAIL/unmeasurable** |
| **CLS** | ≤ 0.1 | **0.000** (3/3 runs) | **0.000** (3/3 runs) | **PASS** |
| **FCP** | — | 2,036 ms | 460 ms | good |
| **TBT** | lab | 158 ms (136 / 140 / 153 desktop-equivalent long tasks) | **4 ms** | good |
| **TTFB** | lab | 8 ms (loopback) | 7 ms (loopback) | good |
| **INP** | ≤ 200 ms | **not verified (field)** — lab proxy 32 ms | lab proxy 48 ms | **UNVERIFIED** |

### 6.1 Field INP is not claimed

Lab harnesses cannot produce a genuine field INP. What was measured is a
**lab proxy**: after full settle (load + hydration + entrance animations + 3.5 s
idle), real trusted clicks on the mobile-menu trigger, skip link and theme
control were timed with the Event Timing API.

| Profile | Samples | Worst |
| --- | --- | --- |
| Mobile (4× CPU) | 24 / 32 / 24 ms | **32 ms** |
| Desktop | 48 / 32 / 40 ms | **48 ms** |

Both are far below the 200 ms threshold, **but these are lab numbers**.
Genuine INP requires RUM (`web-vitals` or CrUX) after launch — recorded as
condition **C2**. No INP figure is presented as a field measurement.

> An early harness reported ~864 ms; that was re-measured and found to be an
> artefact of interacting *during* hydration plus buffered event replay. The
> corrected settled numbers above are the ones reported.

### 6.2 **[verified] Defect — mobile LCP is never reported**

**Finding.** At the mobile profile the page emits **zero LCP candidates**; the
browser records no Largest Contentful Paint at all. Desktop emits one, but for
a **950 px² header button**, not the hero — so the desktop LCP number measures
a trivial element rather than the page's real content.

**Evidence (all measured in the same Chromium build):**

| Condition | LCP candidates |
| --- | --- |
| 412 px viewport, animations on, **unthrottled** | **0** |
| 412 px viewport, animations on, 4× CPU + Slow 4G | **0** |
| 412 px viewport, `prefers-reduced-motion: reduce` | **1** — hero lead paragraph, 37,536 px², at **176 ms** |
| 1350 px viewport, animations on | 1 — header button, 950 px², ~458 ms |

**Root cause.** Every first-viewport text element enters with an animation
whose `from` state is `opacity: 0` (`.lm-line > span` / `.lm-word > span` via
`lm-line-rise`, hero blocks via `lm-hero-in`, sections via `.lm-reveal`).
Blink's text paint-timing detector records an element **once**, at its first
paint, and ignores paints made at zero opacity; a later `opacity: 0 → 1`
transition does not re-emit a candidate. Because the hero's first paint happens
while it is fully transparent, it can never become the LCP element. The
reduced-motion control proves the mechanism: with the animations disabled the
same browser, same page and same viewport produce an immediate, correctly-sized
candidate.

**Impact.** Mobile visits contribute **no LCP value** to CrUX, and no
Lighthouse Performance score can be produced for the mobile profile. This is a
measurement/telemetry defect rather than a user-visible one — real mobile users
see the hero within roughly one second — but it does mean the "Lighthouse
Performance ≥ 90 mobile" target **cannot be demonstrated**.

**Recommended fix (not applied — needs authorisation).** Drop `opacity` from
the entrance keyframes so text is painted opaque at first paint, letting the
existing `overflow: hidden` mask + `translateY(102%)` do the reveal:

- `.lm-line > span` / `.lm-word > span` (`lm-line-rise`): the mask already
  hides the text completely, so removing the opacity ramp is **visually
  identical**.
- `.lm-hero-in` and `.lm-reveal` have no mask; there the fade is part of the
  look, so removing it is a **visible** change to the Forma motion signature.

Because this touches motion values that PR #48/#49 established and that this
milestone is instructed to preserve, it is **not applied unilaterally**. It is
raised as condition **C1** with the trade-off stated so the owner can decide.

---

## 7. Cross-browser results

| Engine | Status |
| --- | --- |
| **Chromium 153** | **[verified]** — all responsive, motion, a11y and interaction evidence in this document |
| **Firefox** | **[blocked]** — cannot be installed in this sandbox (§3) |
| **WebKit / Safari** | **[blocked]** — cannot be installed in this sandbox (§3) |

No engine is claimed as covered unless its binary actually executed here.
The repository already has a GitHub-hosted runner workflow
(`.github/workflows/forma-reference.yml`) that installs Chromium with
`npx playwright-core install --with-deps chromium`; extending it with
`--with-deps firefox webkit` on that runner is the path to closing this gap
(**C3**).

---

## 8. Responsive and cross-viewport results **[verified]**

Real Chromium, **6 widths × 2 themes = 12 renders** of `/` (320 / 375 / 390 /
768 / 1024 / 1440, light + dark), each scrolled end-to-end so every reveal
fires:

| Check | Result (all 12 renders) |
| --- | --- |
| Horizontal overflow (`scrollWidth − clientWidth`) | **0 px** at every width |
| Visible zero-size SVGs | **0** (of 105 SVGs) |
| Animated SVG connectors | 5 present, animating |
| CLS accumulated during a full scroll pass | **0.000** |
| Elements left below opacity 1 after reveals | **0** |
| Touch targets < 44 px | **0** |
| `<h1>` count | exactly **1** |
| Console errors / page errors | **0 / 0** |
| All sections present (header, hero, workspace, features, integrations, pricing, FAQ, footer) | yes, all 12 |
| Chart stroke-dashoffset resolves to end state | `0px` |

**Interactions verified per viewport**

| Interaction | Result |
| --- | --- |
| Mobile menu (≤ 768 px) | opens; focus moves into the dialog; **Escape closes**; focus **restored to the trigger** |
| FAQ disclosure | toggles open **and** closed (the first item ships open by design) |
| Theme toggle | works — in the header at ≥ 1024 px, inside the mobile dialog below it (verified `light → dark` class change at 375 px) |
| Focus indicator | visible on the skip link (3 px outline + box-shadow ring) |

**No-JavaScript visitors [verified]** — with `javaScriptEnabled: false` at
1440 px: `<h1>` renders at opacity **1**, **0 of 41** reveals are invisible,
10,734 characters of text, footer present, all 6 FAQ answers reachable.

> Three initial "failures" in the first QA pass were investigated and proved to
> be **harness artefacts, not defects**: zero-size SVGs were `display:none`
> /`aria-hidden` decorative icons; the first FAQ item already ships open (the
> click closed it); and the theme button clicked was the already-active option.
> The assertions were corrected and the suite re-run clean.

---

## 9. Accessibility results **[verified]**

| Method | Result |
| --- | --- |
| Lighthouse Accessibility (real Chromium, both profiles) | **100 / 100**, zero failing audits, all 6 runs |
| **axe-core 4.14** — WCAG 2.0 A/AA + WCAG 2.1 A/AA + best-practice | **0 violations** across **20 scans** (5 routes × 390 px & 1440 px × light & dark) |
| Keyboard: skip link, mobile-menu focus trap, Escape + focus restore, FAQ keyboard disclosure | pass (§8) |
| Reduced motion | `scripts/verify-motion.mjs` **PASS**: 12 viewport/theme renders + tablet boundary; under `prefers-reduced-motion: reduce` every sample resolves to its **end state** — opacity 1, `transform: none`, `animation: none`, SVG `stroke-dashoffset: 0` |
| No-JS content | all content visible (§8) |

Routes scanned by axe: `/`, `/about`, `/pricing`, `/vs`, `/vs/notion`.

---

## 10. SEO verification **[verified]**

Checked on the production-configured build **and** on the live origin.

| Item | Result |
| --- | --- |
| Document title (per route) | `roducq — the workspace that does the client writing`, `About — roducq`, `Pricing — roducq`, `Comparisons — roducq`, `roducq vs Notion — roducq`, `roducq vs HoneyBook — roducq`, `roducq vs ClickUp — roducq` |
| Meta description | present on every route |
| Canonical | correct per route, production domain, no localhost, no preview host |
| Open Graph | `og:title`, `og:description`, `og:url`, `og:type`, `og:image` (+ `og:image:width/height/alt`) on all marketing routes |
| Twitter | `summary_large_image` + title/description/image |
| Social image | `/opengraph-image` → **HTTP 200, `image/png`, 50,540 B** |
| Twitter image | `/twitter-image` → **HTTP 200, `image/png`, 50,540 B** |
| Apple icon | `/apple-icon` → **HTTP 200, `image/png`, 1,541 B** |
| Favicon | `/icon.svg` → **HTTP 200, `image/svg+xml`, 265 B** |
| Theme colour | light `#f9f7fc`, dark `#17131e` |
| `robots.txt` | allow `/`; disallow `/api/`, app routes, `/invite/`, `/share/`, `/invoice/`, `/auth/`; `Sitemap:` line present |
| `sitemap.xml` | **13 marketing URLs**, app routes excluded |
| JSON-LD | `WebSite` parses, names `roducq`, URL = production origin |
| Brand leakage | no `forma-visuvate` reference in any served HTML (asserted by the smoke harness) |

---

## 11. Security audit **[verified]**

Response headers, read over HTTP from the production-mode server:

| Header | Value |
| --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |
| `X-Powered-By` | **absent** (`poweredByHeader: false`) |
| Static chunks | `Cache-Control: public, max-age=31536000, immutable` |

Additional: no client source maps; no secret values in client bundles (§2.2);
HTTPS is terminated and enforced by the deployment platform.

**[blocked]** The live origin's headers could not be read directly — the
sandbox blocks TLS to `roducq.nanexi.com`. Headers were verified on an
identical production-mode build of the same commit; header emission is a
function of `next.config.mjs` and is not environment-dependent
(`NODE_ENV=production`). A one-line confirmation from the deployed URL is
listed in §15 as an operator check.

**[recommendation]** If Sentry is enabled later, its ingest host must be added
to CSP `connect-src` (already documented in `next.config.mjs`).

---

## 12. Dependency findings **[verified]**

`npm audit --json` → **13 findings: 0 critical, 10 high, 3 moderate** — the
same count as the previous milestone, so nothing regressed and nothing new
appeared. `npm audit fix --force` was **not** run.

| Severity | Packages |
| --- | --- |
| High (10) | `next`, `sharp`, `braces`, `micromatch`, `fast-glob`, `chokidar`, `tailwindcss`, `eslint-config-next`, `@next/eslint-plugin-next`, `source-map-js` |
| Moderate (3) | `postcss-selector-parser`, `postcss-nested`, `tailwindcss-animate` |

### Reachability analysis (the part that matters for go-live)

| Finding | Reachable here? | Reasoning |
| --- | --- | --- |
| `next` — Draft Mode content leak into cached pages | **No** | no `draftMode()` call anywhere in `app/`, `lib/`, `components/` |
| `next` — dev-server MCP endpoint info disclosure | **No** | development-only; not present in a production build |
| `next` — SSG/ISR cache poisoning (self-hosted) | **No / low** | deployed on Vercel, not self-hosted; the marketing surface is statically prerendered |
| `next` — metadata image route `dynamicParams` bypass | **No** | `app/opengraph-image.tsx` / `twitter-image.tsx` are static with no dynamic params; the only dynamic route sets `dynamicParams = false` |
| `next` — Image Optimization SSRF | **No** | `next.config.mjs` defines **no** `images.remotePatterns`; the single `next/image` use renders an owner-supplied data-URL logo in the authenticated app |
| `sharp` — librsvg CVE | **No** | only reachable through image optimisation of SVG input, which the marketing surface never performs |
| `braces` / `micromatch` / `fast-glob` / `chokidar` / `tailwindcss` / `postcss-*` / `source-map-js` / eslint chain | **No** | **build-time tooling only** — never shipped to the browser or executed by production code |

**Conclusion for launch:** no critical vulnerability, and no high finding is
reachable from the production marketing surface. The advisories against `next`
and `sharp` are the only ones touching runtime code and both are
non-trivially reachable; patching them is a compatibility change in its own
right (a major/minor bump of the framework, re-running the full 1,115-test
suite and the browser evidence). Recorded as **C4** rather than rushed here,
per the instruction not to introduce dependency upgrades without verification.

---

## 13. Deployment verification **[verified]**

Read through the GitHub API (no Vercel token exists in this environment, and
the sandbox cannot reach `*.vercel.app`):

| Check | Result |
| --- | --- |
| Production deployment for `c91e508` | **exists** — created `2026-10-17T14:02:33Z`, i.e. 74 s after PR #50 merged |
| Deployment status | **`success`** — "Deployment has completed" |
| CI on the audited commit | `verify` check-run → **completed / success** |
| Production serves the audited commit | confirmed independently: the live sitemap's `lastmod` (`2026-10-17T14:02:17Z`) matches that deployment, and live `robots.txt`/`sitemap.xml` carry the production domain |
| Preview deployments | present in history (standard Vercel preview flow); preview URLs are **not** used as canonicals — canonicals resolve to the production domain |

**Nothing was deployed by this milestone.** No DNS change, no production
environment variable change, no Razorpay Live Mode, no merge.

---

## 14. Production smoke tests **[verified]**

`npm run verify:production` against the production build — **PASS**:

- `/`, `/about`, `/pricing`, `/vs`, `/vs/notion` → **200** with complete
  metadata (title, description, canonical, OG, Twitter, theme-colour) and
  correct per-route canonicals.
- Generated assets: `og:image`, apple icon, favicon, `sitemap.xml`,
  `robots.txt` → all resolve with correct content types.
- Security headers present, `X-Powered-By` absent.
- **11 internal links** published on `/` crawled; all resolve. `/intake`,
  `/briefs`, `/proposals`, `/plans` redirect to `/login` — **expected
  authentication behaviour**, recorded, not a defect.
- Unknown route → **404**.
- Landing JSON-LD parses and names `roducq`.
- No brand leakage.

Authentication-protected routes were not probed beyond confirming the redirect,
and **no payment or checkout path was exercised** (production payments remain
disabled; test-mode verification stays a separate milestone).

---

## 15. Remaining blockers and conditions

| ID | Item | Priority | Status |
| --- | --- | --- | --- |
| **C1** | **Mobile LCP is never reported** (§6.2). Decide: accept it, or authorise removing the `opacity: 0` initial state from the entrance animations (visually neutral for the masked line/word reveals, a visible change for `.lm-hero-in` / `.lm-reveal`). Blocks the "Performance ≥ 90 mobile" target. | **P1** | open — needs a design decision |
| **C2** | Add field INP (and confirm LCP/CLS in the field) via `web-vitals` RUM or CrUX after launch. Lab proxy is 32–48 ms; **field INP is unverified**. | P2 | open |
| **C3** | Run Firefox and WebKit passes on a runner with unrestricted egress (extend the existing Chromium workflow). | P2 | **[blocked]** here |
| **C4** | Evaluate `next` / `sharp` patch upgrades as a dedicated compatibility change, then re-run `npm audit`. No finding is reachable today. | P3 | open |
| **C5** | Set `NEXT_PUBLIC_SITE_URL=https://roducq.nanexi.com` explicitly in Vercel (Production + Preview) so the origin is pinned rather than inferred. | P3 | recommended |
| **C6** | Operator one-liner after deploy: confirm the live origin returns the §11 header set (`curl -sI https://roducq.nanexi.com/`). | P3 | recommended |

---

## 16. Final launch gate matrix

| Gate | Result | Evidence |
| --- | --- | --- |
| **G1** Production build | **PASS** | `npm run build` succeeded |
| **G2** Automated tests | **PASS** | 1,115 pass / 0 fail |
| **G3** TypeScript | **PASS** | `npx tsc --noEmit` clean |
| **G4** ESLint | **PASS** | `npm run lint` clean |
| **G5** Production smoke tests | **PASS** | `verify:production` PASS (§14) |
| **G6** Production domain configuration | **PASS** | canonical/OG/sitemap/robots/JSON-LD all resolve to `https://roducq.nanexi.com`, live-verified (§2.1) |
| **G7** HTTPS and security headers | **PASS** (with C6) | full header set verified on the production build (§11); live-origin read blocked by sandbox egress |
| **G8** SEO metadata and assets | **PASS** | §10 — all assets 200 with correct content types |
| **G9** Responsive browser testing | **PASS (Chromium)** / **NOT VERIFIED (Firefox, WebKit)** | 6 widths × 2 themes in real Chromium (§8); other engines blocked (§7) |
| **G10** Accessibility | **PASS** | Lighthouse 100/100; axe-core 0 violations over 20 scans; keyboard + reduced-motion + no-JS (§9) |
| **G11** Lighthouse performance | **NOT PASSED (mobile)** | Performance category unscorable on both profiles; **mobile LCP unmeasurable** (§6.2). Desktop LCP 458 ms, CLS 0, TBT 4 ms. |
| **G12** Motion and reduced-motion | **PASS** | `verify-motion.mjs` PASS; all reveals end visible; reduced motion resolves to end states (§9) |
| **G13** Dependency security review | **PASS (documented)** | 0 critical; no high finding reachable from the marketing surface (§12) |
| **G14** Deployment preview verification | **PASS** | production deployment for `c91e508` = `success`; CI green; live site serves the audited commit (§13) |
| **G15** Payment safeguards unchanged | **PASS** | **zero** source files changed; no Razorpay, checkout, billing, Supabase, auth, DB, API or subscription file touched; production payments remain disabled |

---

## 17. Go-live recommendation

# READY WITH CONDITIONS

**Rationale.** Fourteen of fifteen gates pass on evidence executed in this
milestone, including gates the previous milestone could not run at all: real
Lighthouse (Accessibility, Best Practices and SEO all **100** on mobile and
desktop), real Chromium responsive QA at all six required widths in both
themes, an axe-core sweep with **zero violations**, verified keyboard and
reduced-motion behaviour, a deployment confirmed to serve the audited commit,
and a clean dependency review with no reachable vulnerability.

**Why not a clean READY:**

1. **G11 is not passed.** Lighthouse cannot score Performance, and beneath that
   tooling symptom lies a real defect: **mobile LCP is never reported** because
   every first-viewport text element is painted at `opacity: 0` (§6.2). The
   "Performance ≥ 90 mobile" target therefore cannot be demonstrated. Marking
   this PASS would be false.
2. **Field INP is unverified**, and no lab number is presented as a substitute.
3. **Firefox and WebKit were never executed** — the binaries cannot be obtained
   in this sandbox. This is recorded as unverified, not as passing.

None of the three is a user-visible breakage: real mobile users see the hero in
about a second, CLS is 0, TBT is low, and interaction latency is 32–48 ms in
the lab. **The site is safe to serve.** The conditions are about closing two
measurement gaps and one explicitly-authorised motion decision.

**Conditions to close before or immediately after go-live:** **C1** (decide on
the LCP fix), **C2** (add RUM/field INP), **C3** (Firefox + WebKit on a
networked runner), then **C4–C6** as maintenance.

**Not done, deliberately:** no redesign, no animation recreation, no motion
value change, no dependency upgrade, no deployment, no DNS change, no
production environment variable change, no Razorpay Live Mode, no merge — and
no invented performance number. The branch ships **zero modified source
files**.
