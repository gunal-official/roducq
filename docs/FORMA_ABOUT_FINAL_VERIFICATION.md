# Forma About Recreation — Final Visual Fidelity & Production Verification

**Verdict: PASS.** PR #77 is merged and deployed; production serves
the redesigned five-section About page; the deployed build renders
identically (Δ = 0 px on every measured section at every width) to
the build reviewed in the PR; visual fidelity vs the Forma reference
matches the approved measurements; functionality, accessibility, and
PR #53 performance gates all pass. No new defects were found, so no
code changes are proposed. This milestone changed documentation and
evidence only.

**Method in one paragraph.** The development sandbox's egress
allowlist cannot reach `roducq.nanexi.com` or the Framer host from a
browser, so the Chromium audit ran against a local production build
(`npm run build` + `npm start`) of the exact merge commit that
Vercel deployed, and the live site was verified through GitHub's
deployment records plus a live HTTPS fetch of `/about` content.
Commit identity makes this equivalent to auditing production code;
the one thing not measured is real-user field performance (labelled
`[UNVERIFIED]` in §6). Labels: **[MEASURED]** read from a live page
or API in this session · **[INFERRED]** concluded from measured
identity · **[UNVERIFIED]** not measurable here.

Tooling: Chromium 153.0.8010.0 (Sparticuz build) via
`playwright-core`; axe-core from the repository's own devDependencies
(WCAG 2.1/2.2 A + AA + best-practice tag set); harnesses
`scripts/capture-about-reference.mjs` and
`scripts/verify-marketing-consistency.mjs`; harness run recorded
2026-10-28T13:04:22Z. Evidence index in §8.

## 1. Deployment verification

| Check | Result |
|---|---|
| PR #77 state **[MEASURED]** | **MERGED** 2026-10-28T12:55:58Z, `arena/38893169-roducq` → `main` |
| Merge commit **[MEASURED]** | `6fea05dac7e165df5c2316b063291b7468edfb8b` |
| Latest Production deployment **[MEASURED]** | GitHub deployment `7385937934`, environment `Production`, **sha `6fea05d`**, created 2026-10-28T12:56:55Z (57 s after merge); latest status **success** ("Deployment has completed") |
| Vercel commit status **[MEASURED]** | `success` on the merge commit |
| CI on merge commit **[MEASURED]** | GitHub Actions `verify`: completed/success |
| Live `/about` content **[MEASURED]** | HTTPS fetch of `https://roducq.nanexi.com/about` returns the redesigned page: H1 "Why we are building roducq", story "Where the context gets lost", "How we make product decisions" with principles 01–05, cards linking `/changelog`, `/vs`, `mailto:hello@roducq.dev`, CTA "Try roducq with your own client work" with Create account / See pricing and the "Illustrative example · fictional client" caption |
| Deployed render = reviewed render **[MEASURED]** | Fresh capture of the merge-commit build vs the PR-#77 evidence (`forma-about-reference/roducq-metrics.json`): **Δ = 0 px** on page height and every section height at all 14 width×theme combinations |

Production access was available (GitHub API + live fetch), so no
part of Phase 1 is `[UNVERIFIED]`.

## 2. Visual fidelity vs the Forma reference

Captured fresh at 320/375/390/768/1024/1200/1440 × light/dark into
`docs/screenshots/forma-about-final/` (full-page PNGs + metrics) and
compared against the reference capture
(`docs/screenshots/forma-about-reference/forma-metrics.json`) and
the approved measurements in `docs/FORMA_ABOUT_REFERENCE.md` /
`docs/FORMA_ABOUT_REDESIGN.md`. Side-by-side montages:
`compare-1440-light.png`, `compare-1024-light.png`,
`compare-390-light.png`, `compare-1440-light-top.png` (same folder).

**Exact matches [MEASURED]:**
- H1 computed font size at every width (67.2 ≥1200 / 45.4 @1024 /
  44 below) — identical to the reference.
- Hero band height at desktop widths: 385 px @1440/1200, 363 @1024,
  285 @768 — identical to the reference. (Roducq's hero starts
  63 px lower because of the shared announcement band + header,
  which are Roducq shell, verified unchanged.)
- Five-band order, 45/55 split-story columns, five numbered
  principle rows with hairlines, three 18 px-radius cards,
  two-column gradient CTA (565 px text / 467 px checklist ≥1200),
  two-tone headings — all present and measured as specified.
- Hover: card shadow transitions in on hover (computed
  `box-shadow: none → rgba(33,20,56,0.06) 0 1px 2px`) **[MEASURED]**.
- Animations run on scroll and finish: after a full scroll pass +
  settle, 20 recorded animations, **0 still running**, 0 sections
  left at opacity 0 **[MEASURED]**.

**Approved content-driven differences (not inaccuracies):** story
574 vs 477 px and principles 855 vs 742 px @1440 (approved Roducq
copy is longer; principle titles wrap to two lines in the measured
300 px column); cards 389 vs 367; CTA 768 vs 751 (the approved
heading takes a balanced third line ≥1200 — the same 3-line shape
the reference itself takes at 390); page totals 3782 vs 3496 @1440
and 5927 vs 4703 @390 (copy length + announcement band + Roducq's
taller mobile footer). All were recorded in
`docs/FORMA_ABOUT_REDESIGN.md` §6 before merge. **No new visual
defect was found.**

## 3. Responsive results

Harness shell phase over 7 widths × 2 themes **[MEASURED]**:
horizontal overflow **0** in all 14 combinations, **0** page errors,
**0** tap targets below 44 px. Screenshots confirm clean stacking:
split band and CTA single-column <810, cards stacked <768, CTA
actions full-width at 390/375/320, checklist card intact at 320,
no clipped or overlapping text at any width.

## 4. Functionality

All verified by real interaction in Chromium against the deployed
build (`docs/evidence/forma-about-final/functionality.json`):

| Action | Result |
|---|---|
| Changelog card `href` + card-body click | `/changelog` ✓ |
| Compare card `href` + card-body click | `/vs` ✓ |
| Contact card `href` | `mailto:hello@roducq.dev` ✓ (name: "Get in touch (opens your email client)") |
| Create account `href` | `/signup` ✓ |
| See pricing `href` + click | `/pricing` ✓ |
| Header nav on `/about` | About link carries `aria-current="page"`; Features/Solutions/Integrations/Pricing/Changelog/Compare/Get started present ✓ |
| Mobile menu @390 | opens (`aria-expanded="true"`, nav links visible), Escape closes it ✓ |
| Theme toggle @390 | light `rgb(255,255,255)` → dark `rgb(33,27,41)` (`.ab-page` background, `light`→`dark` class + `color-scheme`), toggles back ✓ |

## 5. Accessibility

- **axe-core: 0 violations** in all 6 runs (320/768/1440 ×
  light/dark) **[MEASURED]**.
- **Incomplete (reported separately, as required):**
  `color-contrast` with 8 nodes in every run — exactly three
  selectors: `.lm-hero-accent-inline` (H1 gradient words),
  `.lm-line:nth-child(1) > span` (masked hero line),
  `.lm-text-gradient-soft` (CTA gradient phrase). axe cannot resolve
  `background-clip: text`. These are the same items manually
  resolved in `docs/FORMA_ABOUT_REDESIGN.md` §5 on identical tokens:
  weakest H1 gradient stop 3.92:1 (light) / 3.96:1 (dark) for large
  text; CTA soft-gradient weakest stop 4.95:1 on the panel mid-tone;
  solid `--lm-cta-muted` note 6.59:1 mid / 5.11:1 light-zone (the
  reference's 60%-white treatment would be ~3.22:1). Body slate
  4.96:1 light / ~6.70:1 dark; accent 7.51 / 9.07.
- **Heading hierarchy [MEASURED]:** one H1 → H2 (story) → H2
  (principles) → H3 ×5 (principle titles) → H3 ×3 (card titles) →
  H2 (CTA). No skipped levels.
- **Link names [MEASURED]:** all five About links take their
  accessible name from visible text ("Read the changelog", "Read the
  comparisons", "Get in touch (opens your email client)", "Create
  account", "See pricing"); no `aria-label` overrides.
- **Keyboard [MEASURED]:** real Tab walk — Skip to content →
  announcement → logo → nav (incl. About) → theme toggle → Get
  started → card links, in DOM order. Focus on a card link outlines
  the card: `2px solid rgb(98,70,234)`, 2 px offset, via
  `:focus-within`; the link's own outline is suppressed so exactly
  one clear indicator shows.
- **Touch targets [MEASURED]:** none below 44 px (harness);
  card hit area is the full card via the stretched link.
- **Reduced motion [MEASURED]:** 0 running animations, 0 hidden
  bands.
- **No JavaScript [MEASURED]:** H1 + 3 H2 + 5 sections, 2835 chars
  of text, zero elements at opacity 0.

## 6. Performance — PR #53 four-scenario LCP

Local production build of the deployed commit, 3 fresh runs each,
LCP from the page's own PerformanceObserver
(`docs/evidence/forma-about-final/about-consistency.json`):

| Scenario | Median | Samples | LCP candidate | CLS |
|---|---:|---|---|---:|
| A mobile unthrottled | **116 ms** | 116 / 108 / 156 | hero lead (`p.lm-hero-in`) | 0 |
| B mobile 4× CPU | **280 ms** | 296 / 256 / 280 | hero lead (`p.lm-hero-in`) | 0 |
| C desktop 1440×900 | **296 ms** | 296 / 284 / 300 | story first paragraph (`p.ab-body`) | 0 |
| D mobile reduced-motion | **132 ms** | 128 / 136 / 132 | hero lead (`p.lm-hero-in`) | 0 |

All medians are ~8–20× under the 2500 ms budget. In every run the
hero was observable at `opacity: 1` with `filter: none` at the early
read (no opacity-0 start, no blur — PR #53 rules). As recorded
pre-merge, the desktop candidate is the story's first paragraph
because the compact hero leaves it in the first viewport at
1440×900; it still paints at 296 ms with CLS 0.

Conditions caveat: these are lab numbers against `localhost` for the
deployed code. Production CDN/TTFB behaviour and real-user field
data were not measured — **[UNVERIFIED]** — but the page is a
statically prerendered route with no blocking assets beyond the
shared shell, and there is no code path by which deployment could
reintroduce an LCP delay that the lab run would not show.

## 7. Remaining limitations (unchanged from pre-merge, restated)

- Reference (Forma) dark theme remains **[UNVERIFIED]** — it is
  toggle-based and unreachable headlessly; Roducq dark uses the
  shared `lm-*` tokens and is axe-clean/mechanically verified here.
- Block entrances use the shared 620 ms `Reveal` vs the reference's
  measured ~800 ms — an approved cross-page standardisation recorded
  in the redesign doc, not a regression.
- Hover lift magnitudes are the inherited system treatment; the
  reference's hover is only qualitatively observable.
- Live-URL browser captures from this sandbox remain impossible
  (egress). Anyone with normal network access can reproduce every
  number here by running the same two harnesses against the live URL
  (`BASE_URL=https://roducq.nanexi.com`).

## 8. Evidence index

- `docs/evidence/forma-about-final/about-consistency.json` — shell /
  axe / LCP / motion harness report (this audit).
- `docs/evidence/forma-about-final/functionality.json` — interactive
  probe: destinations, clicks, hover, keyboard walk, focus
  measurements, mobile menu, theme toggle.
- `docs/screenshots/forma-about-final/` — 14 full-page captures of
  the merged build (7 widths × 2 themes), `roducq-metrics.json`,
  `roducq-animations.json`, and 4 reference-vs-Roducq montages.
- Pre-merge evidence (unchanged): `docs/FORMA_ABOUT_REFERENCE.md`,
  `docs/FORMA_ABOUT_REDESIGN.md`,
  `docs/screenshots/forma-about-reference/`,
  `docs/evidence/forma-about-audit/about-consistency-final.json`.

**Recommendation:** ship stands as-is. No fixes proposed; if the
owner later wants the two recorded fidelity deltas closed (800 ms
block entrances; a page-specific CTA-note colour experiment), both
are small, isolated, and can be handled as separate approvals.
