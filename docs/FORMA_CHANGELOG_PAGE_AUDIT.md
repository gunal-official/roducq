# Forma `/changelog` Recreation & Verified Release History Audit (`/changelog`)

- **Date:** 2026-10-26
- **Branch:** `arena/d1b4526c-roducq` (branched from `main` @ `cf393b570326dd253991003cbd6bfc34ce58aa43`, PR #63)
- **Target route:** `/changelog` (`app/(marketing)/changelog/page.tsx`)
- **Reference captured:** `https://forma-visuvate.framer.website/changelog` (GitHub Actions Chromium capture run `40266046680`, documented in `docs/FORMA_CHANGELOG_REFERENCE.md`)
- **Real-browser verification run:** GitHub Actions Chromium run `40270900437` (`Playwright Chromium 153.0.8010.12`, artifacts archived on `arena/forma-changelog-capture` under `docs/screenshots/forma-changelog-reference/`)

---

## 1. Reference Structure Summary (`docs/FORMA_CHANGELOG_REFERENCE.md`)

Live Forma `/changelog` was captured across all seven required widths (`320`, `375`, `390`, `768`, `1024`, `1200`, `1440px`) with computed DOM/CSS geometry, light/dark CSS custom properties, SVG asset extraction, hover/click probes, and WAAPI animation instrumentation:

| Order | Landmark / Band | Measured Reference Geometry & Behavior | Roducq Implementation |
| --- | --- | --- | --- |
| 1 | `<header>` (Showcase bar) | Sticky `top: 0`, `bg: #ffffff` (dark `#191423`), centered nav links, active `Changelog` `2px` `#1b1426` bottom indicator, `1px solid #ece7f5` bottom border on scroll | Shared `components/marketing/SiteHeader.tsx` (`showcase` gate widened with `changelog`, `aria-current="page"`) |
| 2 | `Hero` (`ChangelogHero`) | `bg: #ffffff` (dark `#191423`); padding `92px 0 72px` (`>=1024px`) / `56px 0 44px` (`<1024px`); `14px/1.2` `#5332d6` eyebrow -> `10px` -> `Manrope 600 -0.03em` `67.2px` (`>=1200`) / `45.4px` (`1024`) / `44px` (`<=768`) inline dark + gradient `<h1>` (wraps to 2 centered lines `<768px`) -> `32px` -> `640px` lead (`19px/1.65` `>=1024`, `16.5px/1.65` `<1024`) | `components/marketing/landing/changelog/ChangelogHero.tsx` + `.lm-hero-accent-inline` in `app/(marketing)/landing.css` |
| 3 | `Updates` (`ChangelogFeed`) | Canvas `#faf9fc` (dark `#140f1d`), `padding: 0 24px 40px`, `max-width: 980px`; centered `role="group"` filter pills (`gap: 6px`, `r: 999px`, `14px/1.55`) -> `28px` spacer -> chronological `<article>` list (`1px solid #eae6f1` top hairline, `45px 0 44px` padding, no vertical rail/dots/card boxes/pagination); `210px` `sticky top: 110px` `Meta` + `40px` gap + `flex-1` `Body` at `>=1200px`, stacked `gap: 12px` static below `1200px` | `components/marketing/landing/changelog/ChangelogFeed.tsx` (`All updates`, `New`, `Improved`, `Fixed` functional filters + `aria-live="polite"`) |
| 4 | `Closing CTA` (`ChangelogClosingCta`) | `bg: #ffffff` (dark `#191423`), `120px/96px` (`>=1200`) / `60px/64px` (`<1200`) outer padding; `.lm-solutions-stage` radial+150deg purple card (`r: 28px` / `22px`) + `Getting started` 4-step checklist miniature (`r: 18px`) | `components/marketing/landing/changelog/ChangelogClosingCta.tsx` reusing `ChecklistRows variant="card"` |
| 5 | `<footer>` | Shared quiet marketing footer + `Back to top` + giant wordmark | Shared `components/marketing/SiteFooter.tsx` (`Product -> Changelog` added in `FOOTER`) |

---

## 2. Roducq Release History Audit & Classification Summary

Full repository history (`git log` across all 63 merged PRs, `32` SQL migrations under `supabase/migrations/`, `0` git tags/GitHub releases, `48` `vercel[bot]` Production deployments via `gh api repos/gunal-official/roducq/deployments`, and live HTTP 200 verification on `https://roducq.nanexi.com`) was audited before implementation.

### 2.1 Published Entries (`8` `VERIFIED RELEASED` Milestones, Newest First)

Every published entry on `/changelog` is backed by a merged commit on `main`, a GitHub PR link, a confirmed Vercel `Production` deployment ID, and working-tree symbol assertions enforced by `tests/components/changelog-page.test.ts`:

| # | Release Date | PR Source | Merge Commit | Prod Deployment ID | Badges | Title | Evidence Checked in Tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `October 26, 2026` | [`PR #63`](https://github.com/gunal-official/roducq/pull/63) | `cf393b5` | `7323560435` | `NEW` | *Integrations directory and connection guide* | `app/(marketing)/integrations/content.ts` (`INTEGRATIONS`), `page.tsx` (`IntegrationsPage`) |
| 2 | `October 26, 2026` | [`PR #62`](https://github.com/gunal-official/roducq/pull/62) | `f196a92` | `7322223828` | `NEW` | *Features overview across all six workflow pillars* | `app/(marketing)/features/content.ts` (`FEATURES`), `page.tsx` (`FeaturesPage`) |
| 3 | `October 25, 2026` | [`PRs #55–#59`](https://github.com/gunal-official/roducq/pull/55) | `d2266eb` | `7316434663` | `NEW` | *Solutions pages by practice type* | `app/(marketing)/solutions/content.ts` (`CATEGORIES`, `SECTION_NAV`), `page.tsx` (`SolutionsPage`) |
| 4 | `October 18, 2026` | [`PRs #52–#54`](https://github.com/gunal-official/roducq/pull/52) | `3315a1f` | `7211564488` | `NEW`, `FIXED` | *Dedicated pricing page and faster mobile hero paint* | `app/(marketing)/pricing/page.tsx` (`PricingPage`), `SiteFooter.tsx` (`SiteFooter`) |
| 5 | `October 18, 2026` | [`PRs #46–#51`](https://github.com/gunal-official/roducq/pull/46) | `6212b4e` | `7210772595` | `NEW`, `IMPROVED` | *Redesigned marketing home and social preview cards* | `app/(marketing)/home/content.ts` (`HERO`), `app/opengraph-image.tsx` (`Image`) |
| 6 | `October 16, 2026` | [`PRs #24–#40`](https://github.com/gunal-official/roducq/pull/40) | `2926fce` | `7180260725` | `IMPROVED`, `FIXED` | *Workspace visual refresh and security hardening* | `components/app-shell/nav-items.ts` (`NAV_ITEMS`), `next.config.mjs` (`headers`) |
| 7 | `October 10, 2026` | [`PRs #20, #22, #23`](https://github.com/gunal-official/roducq/pull/22) | `7f41589` | `7076938607` | `NEW` | *File intake uploads, global workspace search, and /vs comparisons* | `lib/search.ts` (`SEARCH_GROUPS`), `app/(marketing)/vs/[slug]/vs-pages.ts` (`VS_PAGE_LIST`) |
| 8 | `October 2, 2026` | [`PRs #1–#9`](https://github.com/gunal-official/roducq/pull/9) | `8fbfac3` | `6978823397` | `NEW`, `IMPROVED` | *Core client-ops pipeline, PDF exports, and roducq launch* | `supabase/migrations/20260922000000_workspace_auth_init.sql` (`workspaces`), `20260922123000_briefs_schema.sql` (`briefs`) |

### 2.2 Human-Approved Content Corrections Enforced

1. **Entry 3 (`/solutions`) audience categories:** Uses Roducq's exact four practice labels from `app/(marketing)/solutions/content.ts` (`Solo practices`, `Design studios`, `Agencies`, `Consultancies`) — never `"solo consultants"`, `"retainer teams"`, or `"multi-lead consultancies"`.
2. **Entry 5 (Marketing Home Redesign) brand neutrality:** Removed all `"Forma"` branding; uses `"a unified visual design system"`.
3. **Entry 6 (Workspace Refresh) brand neutrality & exact screen list:** Removed all `"Forma"` branding; uses `"a unified workspace design system"` and lists the exact 12 signed-in `NAV_ITEMS` screens (`Pipeline, Intake, Inbox, Briefs, Proposals, Plans, Updates, Invoices, Time, Contracts, Reports, and Settings`).
4. **Entry 7 (Global Workspace Search) verified record types:** Audited `lib/search.ts` (`SEARCH_GROUPS`) and `lib/data/search.ts` (`globalSearch`), confirming supported searchable record types are **`briefs, proposals, plans, updates, invoices, and contracts`**. `"tasks"` is not a searchable record type and is omitted (locked by `changelog-page.test.ts`).

### 2.3 Excluded Items & Rationale

| Candidate / PR Range | Classification | Reason Excluded from Public `/changelog` |
| --- | --- | --- |
| PRs #42–#45 (Slack import, Notion import, Gmail/Outlook OAuth inbox, signed outbound webhooks) | `MERGED, DEPLOYMENT UNCONFIRMED` | Code and migrations are merged, but live production OAuth client credentials and scheduled cron secrets cannot be verified from public endpoints without authenticated operator secrets. |
| PR #41 (`/forgot-password` & `/reset-password` PKCE recovery) | `MERGED, DEPLOYMENT UNCONFIRMED` | Public UI route renders HTTP 200, but end-to-end live recovery email delivery depends on production Supabase SMTP settings not inspectable without credentials. |
| PRs #60–#61 (Lighthouse gap investigation docs) & `*-reference` / `*-verify` CI workflows | Internal engineering / docs | Internal capture/benchmarking documentation, not customer-facing product changes. |
| Razorpay live billing (`lib/razorpay.ts`, `/api/razorpay/*`) | `IN DEVELOPMENT` (intentionally disabled) | Live paid checkout remains intentionally disabled (`NEXT_PUBLIC_RAZORPAY_LIVE_ENABLED` off); Closing CTA footnote explicitly states `"live paid checkout is not enabled yet."` |
| Semantic version numbers (`Version 2.3`..`Version 1.9`) & `Beta` badge | Not applicable (`0` git tags/releases) | Replaced with truthful GitHub PR links (`PR #63`..`PRs #1–#9`); `Beta` omitted because none of the 8 approved entries is beta-gated. |

---

## 3. Design System, Accessibility, and Motion / LCP Implementation

- **Tokens (`app/(marketing)/landing.css` & `tailwind.config.ts`):**
  - Added `--lm-size-28-8: 28.8px` (`text-lm-28-8`) and `--lm-size-24: 24px` (`text-lm-24`) for entry `<h2>` headings (`1.1` line-height), keeping `--lm-size-11` unset so `SectionHeading.tsx` on other routes stays untouched while reusing `text-lm-chip` (`11px`) for uppercase badges.
  - Added light & dark tokens `--lm-changelog-rule` (`#eae6f1` / `#261f33`), `--lm-changelog-amber-surface` (`#fdf3e2` / `#2b1f0b`), `--lm-changelog-amber-ink` (`#8a5200` / `#f5c26b`), and `--lm-changelog-fixed-ink` (`#11703a` / `#6ee7a0`). All badge and muted text pairs achieve **WCAG 2.1 AA contrast `>= 4.96:1` in light mode and `>= 7.05:1` in dark mode** (`NEW`: `6.44:1` / `8.16:1`; `IMPROVED`: `5.81:1` / `9.83:1`; `FIXED`: `5.56:1` / `>8.8:1`).
  - Added named layout tokens `max-w-lm-changelog` (`980px`) and spacing steps `2.25` (`9px`), `11.25` (`45px`), `15` (`60px`), `23` (`92px`), `27.5` (`110px`), and `52.5` (`210px`) — zero raw `#hex`/`rgb()` literals and zero fixed `w-[100px+]` classes in `/changelog` components.
- **Motion & PR #53 Mobile LCP Safety:**
  - Recreated only the animations verified on Forma `/changelog`: the Hero entrance ladder (`0ms` eyebrow `800ms`, `50ms`/`100ms` dark `<h1>` words `900ms`, `350ms` inline gradient phrase `900ms` `28px` rise, `450ms` lead `800ms`) and the shared header scroll hairline.
  - Every hero keyframe (`lm-hero-in`, `lm-hero-mask`) keeps **`opacity: 1` at `0%` and `100%`**, revealing via `clip-path: inset(...)` + `translateY(...)` so Blink records LCP on the first frame without waiting for animations.
  - `@media (prefers-reduced-motion: reduce)` disables `.lm-hero-word`, `.lm-hero-accent`, and `.lm-hero-accent-inline` animations immediately.
  - Category filtering (`All updates` `8`, `New` `7`, `Improved` `3`, `Fixed` `2`) updates synchronously with `aria-pressed`, `>= 44×44px` (`min-h-11 min-w-11`) touch targets, visible `focus-visible` rings, `aria-live="polite"` result-count announcements, and zero artificial filter/scroll animations.
  - With JavaScript disabled (`javaScriptEnabled: false`), all 8 `<article>` entries, hero copy, filter pills, and Closing CTA render visibly at `opacity: 1` from SSR HTML.

---

## 4. Real-Browser Verification Results (`Playwright Chromium 153.0.8010.12`)

### 4.1 LCP Performance (`3` Fresh Runs per Scenario, Budget `< 2,500ms`)

> *Note on instrumentation:* `lighthouse` CLI is not installed in `package.json` and external npm/CDN fetches are restricted in the verification workflow, so `PerformanceObserver` (`largest-contentful-paint`, `layout-shift`, `paint`) paired with CDP `Network.emulateNetworkConditions` (`1.6 Mbps` down / `750 Kbps` up / `150ms` RTT) and `Emulation.setCPUThrottlingRate` (`4×`) is reported directly from `changelog-verification.json`.

| Scenario | `/changelog` LCP Median (Runs) | `/changelog` CLS | `/` Control LCP Median (Runs) | `/` Control CLS | Pass (`< 2.5s`) |
| --- | --- | --- | --- | --- | --- |
| **A. Mobile unthrottled** (`412×823 @1.75x`) | **`72ms`** (`96, 72, 72ms`) | `0` | **`112ms`** (`128, 104, 112ms`) | `0` | PASS |
| **B. Mobile throttled** (`Slow 4G + 4× CPU`) | **`932ms`** (`932, 924, 948ms`) | `0` | **`1,028ms`** (`1032, 1028, 1028ms`) | `0` | PASS |
| **C. Desktop unthrottled** (`1440×900`) | **`80ms`** (`80, 80, 88ms`) | `0` | **`168ms`** (`176, 168, 168ms`) | `0` | PASS |
| **D. Desktop throttled** (`Slow 4G + 4× CPU`) | **`940ms`** (`936, 940, 944ms`) | `0` | **`1,084ms`** (`1096, 1084, 1084ms`) | `0` | PASS |
| **E. Mobile `prefers-reduced-motion: reduce`** | **`68ms`** (`68, 76, 64ms`) | `0` | **`128ms`** (`128, 132, 128ms`) | `0` | PASS |

### 4.2 Responsive, Accessibility, No-JS & Functional Matrix

| Check | Scope | Result |
| --- | --- | --- |
| Horizontal overflow (`scrollWidth - clientWidth`) | `320, 375, 390, 768, 1024, 1200, 1440px` × Light & Dark (`14` viewports on `/changelog` + `14` on `/`) | **`0px` overflow, `0` offending elements across all 28 checks** |
| Touch target minimum (`>= 44×44px`) | Filter chips, external PR links, Closing CTA links across `320–1440px` | **`0` undersized targets at any width** |
| Sticky vs stacked `Meta` column | `static` at `320–1024px`; `sticky` (`top: 110px`, `width: 210px`) at `1200px` & `1440px` | **Exact match across all 14 light/dark viewports** |
| Three-step Hero `<h1>` scale | `44px` (`320–768px`), `45.4px` (`1024px`), `67.2px` (`1200–1440px`) | **Exact match across all 14 light/dark viewports** |
| `axe-core` (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, `best-practice`) | `/changelog` Light & Dark; `/` Light & Dark | **`0` violations (`40` passes Light, `40` passes Dark on `/changelog`; `41`/`41` on `/`)** |
| Functional filter & keyboard suite | Pointer clicks + `Tab` / `Enter` / `Space` across `All updates` (`8`), `New` (`7`), `Improved` (`3`), `Fixed` (`2`), `aria-live="polite"`, focus ring, `aria-current="page"` | **100% pass, `0` console/page errors** |
| JavaScript disabled (`javaScriptEnabled: false`) | `/changelog` at `390×844` | **`8/8` articles visible (`opacity: 1`), `5/5` hero nodes `opacity: 1`, `lm-js: false`, Closing CTA visible** |
| Automated repo gates | `npm test` (`1,221` tests / `302` suites), `npx tsc --noEmit`, `npm run lint`, `npm run build` | **All pass (`0` failures, `0` warnings)** |

---

## 5. Remaining Gaps / Optional Follow-Ups

- **Pagination / Load-more:** Neither Forma's `/changelog` reference (`8` entries, all rendered inline) nor Roducq's verified release feed (`8` entries) uses pagination today. Once verified release entries grow past ~20 items, an accessible server/URL-backed page size can be evaluated.
- **Unconfirmed integrations & recovery flows (`PRs #41–#45`):** Remain intentionally excluded from `/changelog` until production OAuth/SMTP/cron environment configuration is confirmed end-to-end by an operator.
