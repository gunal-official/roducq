# /solutions — Final verification

Verification record for the Roducq `/solutions` page, run 2026-10-19 (UTC) against
`main` at `fd1a573`, with this branch's fixes applied. The page was **not redesigned**.
Visual design, approved copy, mockups, animations, responsive layouts and sticky
behaviour are unchanged. Only verification defects were fixed (section 3).

Reference: `https://forma-visuvate.framer.website/solutions` (visual reference only).

---

## 1. Summary

| Area | Result |
| --- | --- |
| Unit / contract tests (`npm test`) | **1144 / 1144 pass**, 0 fail, 0 skipped (was 1143 / 1144 before the `vs-comparisons` fix, §3.1) |
| `tsc --noEmit` | **Pass** |
| `npm run lint` | **Pass** |
| `npm run build` | **Pass**, `/solutions` prerendered static (○) |
| Responsive, no horizontal overflow | **Pass**: 0 px at 320, 375, 390, 768, 1024, 1199, 1200, 1280, 1440 px, light and dark |
| Cross-page regression (`/`, `/solutions`, `/pricing`, `/about`, `/vs`, `/vs/notion`) | **Pass**: 36 / 36 cases (6 routes × 2 themes × 3 widths): status 200, 0 px overflow, one `h1`, header, footer and theme toggle present, 0 page errors |
| Sticky showcase, ≥ 1200 px | **Pass**: top 150 px, stage 710 px tall, 700 ms crossfade + 80 ms delay, `cubic-bezier(0.2, 0.7, 0.2, 1)`, 500 ms fill, 0 hold violations |
| Reduced motion | **Pass** after one fix (§3.2) |
| No-JS | **Pass**: status 200, 0 px overflow, all four categories and eight disclosure strings in raw SSR HTML |
| PR #53 LCP, scenarios A–D on `/` and `/solutions` | **Pass**: all medians < 2.5 s, one valid LCP candidate in every run, no `NO_LCP` |
| axe-core, `/solutions` | **0 violations** in freeze mode (24 scans), reduced-motion mode (24 scans), and live mode (24 scans) on the final build. An earlier live run showed a transient status-pill result (§7) |
| Content audit | **Pass** for the checks listed in §9 |
| Dependency audit | 13 advisories (3 moderate, 10 high). **All pre-exist in the lockfile on `main`.** Not fixed (§8) |
| Lighthouse performance score | **Not a pass or fail**: scores measured in this sandbox are well below PR #54's recorded values, and I have not isolated the cause (§5.4) |

Safari and Firefox were **not tested**. No real mobile device was tested.

---

## 2. Branch, PR and scope

- The session branch is `arena/5ee5532f-roducq`. Its base is `main` at `fd1a573`. The
  branch was not switched, and nothing was pushed anywhere else.
- The earlier branch `arena/b35d9da6-roducq` (head `282b957`) was already merged as
  **PR #58**, so there was nothing to re-open for it. This PR contains only verification
  fixes, the harness, the evidence and this document.
- The PR is titled **"Roducq — Final Solutions page refinement and regression verification"**.
  It is left **open and unmerged**. It is not deployed.

## 3. Changes in this branch

### 3.1 `tests/components/vs-comparisons.test.ts`: stale header assertion

The baseline `npm test` failed at line 96 (`header and footer both link to /vs`). PR #56
added a `/solutions`-only nav, `SOLUTIONS_NAV`, selected by pathname. The assertion
still required the literal `NAV.map`. Every other route still renders `NAV`, which contains
the `/vs` link. The assertion now checks `const items = solutions ? SOLUTIONS_NAV : NAV;`
and `items.map`. The test checks the same contract (both headers link to `/vs`) and is
not weakened. The change is documented in the comment above the assertion.

### 3.2 `app/(marketing)/landing.css`: dark-mode closing-CTA contrast

axe reported `color-contrast` (serious) on both closing-CTA buttons in dark mode, at
every width. The label `#2a1570` sat on the dark card at **1.14–1.15:1**. Scoped to
`.dark .rdq-marketing`, the label now uses the band's muted lavender, `#efebff`, which is
**14.36:1** on the card. Light-mode values are unchanged.

### 3.3 `app/(marketing)/landing.css`: reduced-motion category headlines

Found during this verification. In reduced-motion mode, the four category headlines
(`.lm-word-blur > span`) read `opacity: 0` at load. The reduced-motion block restated
`opacity: 1`, but the word-dissolve rules that follow it in the file have the same
specificity and win the cascade. The words stayed hidden until the band's Reveal fired,
about **300 ms after load**. The first headline sits partly on screen at 1440×900
(top at 810 px), so the fix matters.

Fix: an `@media (prefers-reduced-motion: reduce)` block at the end of the file restates
`opacity: 1; filter: none; animation: none;` for both `.lm-word-blur > span` selectors.
Measured after the fix, at t = 0 under reduced motion: all category words are at opacity 1
with no animation. Default-motion behaviour is unchanged. Category switching and the
progress fill still work under reduced motion (25 / 50 / 75 / 100 %, transitions ≈ 0 s).

### 3.4 Harness and evidence (no runtime change)

- `scripts/solutions-verification/`: axe, layout, cross-page, sticky, reduced-motion/no-JS
  and accessibility-interaction checks, plus a README. These use `@sparticuz/chromium`
  and `playwright-core`. `@sparticuz/chromium` is installed `--no-save`, so `package.json`
  and the lockfile are unchanged. Output goes to `verify-out/` (added to `.gitignore`).
- `docs/evidence/solutions-final/`: raw JSON and logs behind every number in this document.
- `docs/screenshots/solutions-final/`: viewport screenshots at 320, 390 (light and dark),
  768 dark, 1024, 1200, 1440 (light and dark), the sticky category-03 state at 1440, and the
  no-JS stage at 1440.

No application logic, routes, copy, mockups, pricing, billing, auth or backend code changed.

---

## 4. Gates

| Command | Result |
| --- | --- |
| `npm ci` | exit 0. Warning: eslint 9.39.5 unsupported by `eslint-config-next`; non-blocking |
| `npm test` | 1144 tests, 283 suites, **1144 pass**. Node prints `MODULE_TYPELESS_PACKAGE_JSON` warnings for the `.ts` test glob; these are not failures |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0. `○ /solutions` (static) |

## 5. Responsive, sticky, reduced motion, no-JS, LCP

### 5.1 Layout (9 widths × 2 themes, `layout.mjs`)

| Width | Light: overflow / h1 lines | Dark: overflow / h1 lines | Console errors | Forbidden copy hits |
| --- | --- | --- | --- | --- |
| 320 | 0 px / 4 | 0 px / 4 | 0 | 0 |
| 375 | 0 px / 4 | 0 px / 4 | 0 | 0 |
| 390 | 0 px / 4 | 0 px / 4 | 0 | 0 |
| 768 | 0 px / 2 | 0 px / 2 | 0 | 0 |
| 1024 | 0 px / 2 | 0 px / 2 | 0 | 0 |
| 1199 | 0 px / 2 | 0 px / 2 | 0 | 0 |
| 1200 | 0 px / 2 | 0 px / 2 | 0 | 0 |
| 1280 | 0 px / 2 | 0 px / 2 | 0 | 0 |
| 1440 | 0 px / 2 | 0 px / 2 | 0 | 0 |

Every row returned HTTP 200, four category articles, and three workflow steps per
category. The hero words had computed opacity 1 at first paint. The source is
`docs/evidence/solutions-final/layout-results.json`.

**1024 px**: checked for overflow and h1 line count only. There is **no visual comparison
against the reference at 1024 px**. The earlier decision log lists it as unverified and it
remains so for that reason.

### 5.2 Cross-page regression (`crosspage.mjs`)

36 of 36 cases pass: status 200, 0 px overflow, one `h1`, header, footer and theme toggle
present, 0 page errors. Routes: `/`, `/solutions`, `/pricing`, `/about`, `/vs`, `/vs/notion`.
Widths: 390, 1024, 1440. Themes: light, dark. Log: `docs/evidence/solutions-final/crosspage.log`.

### 5.3 Sticky showcase (≥ 1200 px)

Geometry (`sticky-geometry.json`, 1200 and 1440 px):

| Measure | 1200 | 1440 |
| --- | --- | --- |
| Sticky position / top | `sticky` / 150 px | `sticky` / 150 px |
| Stage size | 487 × 710 | 607 × 710 |
| Section height | 3168 px | 3168 px |
| Pinned scroll range | 500 → 2875 px | 500 → 2875 px |
| Hold violations | 0 | 0 |
| Release | 1:1 | 1:1 |

Settled state (`sticky-settled.json`), after each category is reached:

| Counter | Fill | Active layer | Stage opacity (layers 1–4) |
| --- | --- | --- | --- |
| 01 / 04 | 25 % | 0 | 1, 0, 0, 0 |
| 02 / 04 | 50 % | 1 | 0, 1, 0, 0 |
| 03 / 04 | 75 % | 2 | 0, 0, 1, 0 |
| 04 / 04 | 100 % | 3 | 0, 0, 0, 1 |

Fill transition: `width 0.5s cubic-bezier(0.2, 0.7, 0.2, 1)`.

Crossfade timing, measured at 1200 px (samples in `sticky-settled.json`):
the incoming layer first rises at **≈ 95 ms** (after the 80 ms delay), is at 50 % at
**≈ 195 ms**, and is fully settled by **≈ 795 ms** (700 ms plus the 80 ms delay). The
minimum stage coverage during the transition is 0.75, so the stage does not go blank.

Below 1200 px the sticky column is `static` and all four inline mockups are visible, each
with its disclosure. No article overlaps. (`sticky-results.json` → `1199`.)

Method note: an earlier single-pass reading of the crossfade and fill was taken mid-transition
and is invalid. The settled and timed values above come from the dedicated pass.

### 5.4 Lighthouse and PR #53 LCP (`lcp-run.mjs`, final build)

Scenarios (same definitions as the repo's `scripts/verify-solutions-lcp.mjs`):
A = mobile 412×823 @1.75, unthrottled. B = A plus 4× CPU throttle (network not throttled).
C = desktop 1440×900. D = mobile plus `prefers-reduced-motion: reduce` (PerformanceObserver only).
Three runs each. Full data: `docs/evidence/solutions-final/lcp-results.json`.

| Route | Scenario | PO LCP, ms (3 runs) | PO median | LH LCP, ms (3 runs) | LH median | Max CLS (PO / LH) |
| --- | --- | --- | --- | --- | --- | --- |
| `/solutions` | A | 292 / 300 / 296 | **296** | 498 / 186 / 142 | **186** | 0 / 0 |
| `/solutions` | B | 472 / 532 / 504 | **504** | 410 / 148 / 177 | **177** | 0 / 0 |
| `/solutions` | C | 332 / 360 / 308 | **332** | 421 / 218 / 147 | **218** | 0 / 0 |
| `/solutions` | D | 344 / 328 / 336 | **336** | not run | — | 0 / — |
| `/` | A | 460 / 456 / 440 | **456** | 572 / 210 / 160 | **210** | 0 / 0.0759 (run 3) |
| `/` | B | 640 / 628 / 648 | **640** | 511 / 214 / 169 | **214** | 0 / 0 |
| `/` | C | 528 / 608 / 512 | **528** | 625 / 302 / 204 | **302** | 0 / 0 |
| `/` | D | 444 / 392 / 388 | **392** | not run | — | 0 / — |

- Every scenario has **one LCP candidate per run**. No run produced `NO_LCP`. Every median
  is well under the 2.5 s budget.
- Scenario D reports `reducedMotionActive = true` in every run.
- LCP element: the hero lead paragraph (`p.lm-hero-in`). In scenarios A–C its clip-path is
  `inset(0 -40px 100%)` at recording, so the element is registered before the mask opens.
  In scenario D the clip is `none`. This is the PR #53 mechanism. The reported LCP is the
  first paint of the element, not the end of the visible reveal, which finishes about 1.25 s
  after start on `/solutions`.
- The `/` A Lighthouse run 3 CLS of 0.0759 is below the 0.1 "good" threshold. The other five
  `/` A and B Lighthouse runs in this batch, and all PO runs, had CLS 0. I did not isolate the
  shift. Treat it as measured variance, not as a fixed result.

**Lighthouse performance category: not a pass or fail.** The category scores in this
sandbox were, per run: `/solutions` mobile (A, B) 76–84 and desktop (C) 64–70; `/` mobile
(A, B) 75–89 and desktop (C) 61–69. PR #54 recorded 100s for scenarios A and C on its machine. LCP values are in the
same range, but the category scores are much lower. I have **not** isolated the cause. The
likely explanations are CPU speed in this sandbox and the unthrottled profile, but I have not
measured the PR #54 build here to confirm. Running the same Lighthouse profile on the
`fd1a573`-era build and the current build, on the same machine, is the follow-up that would
settle it.

> **Follow-up, 2026-10-25 — resolved.** That experiment has now been run, against the
> PR #54 build (`3315a1fc`) and the PR #59 build (`d2266eb`), on one machine with one
> browser binary, one Lighthouse version, identical launch flags, viewport, CPU and
> network profiles, 40 interleaved runs. Result: **no regression.** Both builds score
> **100 (100–100, 5 runs each)** on `/` under the profile PR #54 recorded its 100s with,
> which also reproduces PR #54's 94–99 pattern for its 4× CPU scenario. Under stock
> Lighthouse mobile throttling the builds score 95 (#54) and 93 (#59) — inside the
> 76–97 spread that one build alone produces in a single session. The 76–84 / 64–70
> figures above are **not reproducible on either build** under any pinned condition,
> including 3× CPU oversubscription; the same code scored 66–73 with six busy-loop
> processes on the host. `/solutions` (which returns 404 on the PR #54 build) scores in
> the same band as `/`. Full records, controls and reproduction commands:
> `docs/PERF_PR54_VS_PR59_LIGHTHOUSE.md`, harness in `scripts/perf/`, evidence in
> `docs/evidence/perf-pr54-vs-pr59/`. No application code was changed by that follow-up.

### 5.5 Lighthouse tool limits

- Lighthouse 13.5.0 cannot emulate `prefers-reduced-motion`, so scenario D is PO-only.
- Lighthouse reports the user agent as HeadlessChrome. The emulated mobile UA is therefore
  **not verified**.
- `largest-contentful-paint-element` is undefined in this Lighthouse version. The LCP element
  was read from `lcp-breakdown-insight`.

### 5.6 Reduced motion and no-JS

Reduced motion (`reduced-motion-nojs.json`, 1440 px):
- Hero words: opacity 1, `clip-path: none`, no animation at t = 0.
- Category headlines: opacity 1, no animation at t = 0 (after the §3.3 fix; before it they were
  0 until ~300 ms).
- Sticky showcase still switches: counters 01 → 04 with fill 25 / 50 / 75 / 100 %, transitions
  effectively 0 s.

No-JS (`reduced-motion-nojs.json`, 390 and 1440 px):
- Status 200, 0 px overflow, one `h1` in the raw HTML, four categories, twelve workflow steps,
  and eight "Illustrative example · fictional client" strings in the raw HTML (four stage mockups and
  four inline mobile copies). At 1440 px, four of them are rendered as visible text (the stage layers).
- At 1440 px the four stage layers are all `opacity: 1` and `visible`. That is the no-JS
  fallback: the stage is a **static column of four mockups**, not an overlay. Each layer starts
  where the previous one ends (about 1 px overlap from rounding). A screenshot is in
  `docs/screenshots/solutions-final/nojs-1440-stage.png`. The cards touch with no vertical gap,
  and no content is hidden or covered. This is cosmetic, not a defect, and was not changed.

## 6. Accessibility

### 6.1 axe-core (`axe-run.mjs`, final build)

Scans are per route × theme × width. Rules tagged wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa
and best-practice.

| Mode | `/solutions` | `/` | Result |
| --- | --- | --- | --- |
| freeze (pill crossfade disabled) | 12 scans, 0 violations | 12 scans, 0 violations | **0 violations** (`axe-results-freeze.json`) |
| reduced (`prefers-reduced-motion`) | 12 scans, 0 violations | 12 scans, 0 violations | **0 violations** (`axe-results-reduced.json`) |
| live (no changes) | 12 scans, 0 violations | 12 scans, 0 violations | **0 violations** (`axe-results-live.json`) |

Each scan has one rule in the `incomplete` list, `color-contrast`. Those are nodes axe could
not resolve, most likely over gradient or translucent layers. They are **not** counted as passes
or violations. I did not re-derive the per-node breakdown (about 18 nodes per scan in an earlier
pass) in this verification. This is an open item.

**Live-mode note.** An earlier live run reported 4 violations, all on the status pill, at light 320,
390 and 768 and dark 1024. The pill was caught mid-crossfade, so the blended colours momentarily
failed contrast. The same code produced 0 violations in the final live run. The result depends
on timing, so **freeze mode is the deterministic gate**. The transient pill state is a known
limitation, not a settled defect.

### 6.2 Interaction (`a11y-interact.json`)

- Mobile menu is a dialog. Escape closes it and focus returns to "Open menu".
- Theme toggle is labelled "Switch to dark theme" and switches the root class `dark` / `light`.
- Focus rings are visible (2 px outline).
- Headings go H1 → H2 → H3. In-page anchors resolve.
- Repeated links (`/pricing`, `/signup`, `mailto:`) are intentional.
- Six exposed SVGs are decorative lucide check icons inside `aria-hidden="true"` ancestors.

This run was made before the §3.3 CSS change. That change only affects reduced-motion
word elements, which the interaction script does not inspect.

## 7. Content audit

Checks on the rendered `/solutions` HTML and the repo:

- No lorem, ipsum, placeholder or TODO text.
- No Forma or Framer references in the rendered page.
- No dollar amounts on `/solutions`. Plan references go to `/pricing`.
- Pricing on `/pricing` (`app/(marketing)/pricing/plans.ts`) matches the pricing spec:
  Starter $29/mo, Team $79/mo, Studio $199/mo. The spec's `pricing.pdf` is not in the repo.
  I checked against `docs/RODUCQ_PRICING_PAGE.md`, which records the PDF mapping.
- All eight mockup instances carry "Illustrative example · fictional client" (four in the
  sticky stage, four inline for mobile).
- Forbidden-copy check in `layout.mjs` (Forma, Framer, off-plan prices, Enterprise, Pro plan,
  testimonial, ★): 0 hits at every width.

Not audited here: sentence-by-sentence comparison of the approved copy against the reference
document. The copy was verified by the existing content tests in the suite, not by a fresh
line-by-line diff.

## 8. Dependency audit (`npm audit`, not fixed)

`npm audit`: **13 vulnerabilities (3 moderate, 10 high, 0 critical, 0 low)**. This branch does not
change `package.json` or `package-lock.json` (verified against `main`). **All advisories are
therefore present in the lockfile on `main`.** `npm audit fix --force` was **not** run. The
suggested automatic fixes include semver-major downgrades such as `eslint-config-next@14.2.35`,
which is the wrong direction for a Next 16 project.

| Package | Severity | Relation | Note | Fix suggested by npm |
| --- | --- | --- | --- | --- |
| `next` | high (advisories moderate) | direct, `^16.3.6` | Draft Mode leak with pending `use cache` (GHSA-3w37-wq28-93x7); SSG/ISR cache poisoning when self-hosted (GHSA-4jqv-mc3x-m676); dev-server MCP info disclosure (low) | npm reports a fix available (non-breaking). Not applied in this PR |
| `tailwindcss` | high | direct, `^3.4.14` | Via `chokidar`, `fast-glob`, `micromatch`, `postcss-nested`, `postcss-selector-parser` | npm offers no automatic fix |
| `tailwindcss-animate` | moderate | direct | Depends on `tailwindcss` | Follows `tailwindcss` |
| `eslint-config-next` | high | direct | Via `@next/eslint-plugin-next`. The suggested fix is a semver-major downgrade to 14.x | Do not apply the suggested fix |
| `@next/eslint-plugin-next` | high | transitive | Via the Next 16 stack | Follows `next` |
| `sharp` | high | transitive | Vulnerability in its librsvg dependency (GHSA-wq5f-xc86-pv6w, CVE-2026-96889) | npm reports a fix available. Not applied in this PR |
| `chokidar`, `braces`, `fast-glob`, `micromatch`, `source-map-js` | high | transitive | Dev-tooling chain | `source-map-js`: fix available. `chokidar`: none. Others: via the `eslint-config-next` downgrade only |
| `postcss-nested` | moderate | transitive | Via `tailwindcss` | npm reports a fix available. Not applied in this PR |
| `postcss-selector-parser` | moderate | transitive | Via `tailwindcss` | npm offers no automatic fix |

Recommended follow-up (not in this PR): a dependency-upgrade branch, reviewed separately, for
`next`, `tailwindcss` and `eslint-config-next`, followed by a full re-verification. Upgrading
`next` directly affects the production build and the LCP measurements in §5.4, so it should not
be bundled with this verification.

## 9. Limitations and things not done

- **Safari and Firefox: not tested.** Chromium only (153, via `@sparticuz/chromium`).
- **No real mobile device.** Emulated mobile only. The UA is not verified (§5.5).
- **1024 px:** overflow and h1 line count only. No visual comparison with the reference.
- **Repo LCP script not run.** `scripts/verify-solutions-lcp.mjs` launches Playwright's bundled
  Chromium, and that download was blocked in the sandbox. The scenarios A–D definitions match
  it exactly, and the measurements use the same PerformanceObserver method on the same build
  path through `@sparticuz/chromium`.
- **Lighthouse performance category:** see §5.4. Not a pass or fail.
- **axe `incomplete` nodes:** not re-derived (§6.1).
- **Lighthouse CLS 0.0759 on `/`:** one run, not isolated (§5.4).
- **Discoverability:** no marketing page (`/`, `/pricing`, `/about`, `/vs`) links to `/solutions`.
  The only link is in the `/solutions` header variant. This is a product decision and was
  flagged for the reviewer, not changed.
- **No-JS stage:** cards touch with no vertical gap (§5.6). Cosmetic, not changed.
- **Dependencies:** 13 advisories, unchanged in this PR (§8).

## 10. Reproduction

See `scripts/solutions-verification/README.md`. In short: `npm ci`, `npm run build`, start the
production server on port 3000, then run the scripts from the repo root. The raw outputs for
every number above are in `docs/evidence/solutions-final/`.
