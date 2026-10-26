# Forma `/changelog` — measured reference capture

**Captured:** 2026-10-26 (04:01 UTC, workflow run `40266046680`, job `121388597872`)
**Reference:** <https://forma-visuvate.framer.website/changelog>
**Instrument:** `scripts/capture-changelog-reference.mjs` on a GitHub-hosted
Ubuntu runner via `.github/workflows/forma-changelog-reference.yml`
**Browser:** Chromium 153.0.8010.12 (Playwright `chromium`, headless),
`--force-color-profile=srgb --font-render-hinting=none --hide-scrollbars`,
`deviceScaleFactor: 1`
**Evidence bundle:** branch `origin/arena/forma-changelog-capture`,
`docs/screenshots/forma-changelog-reference/` (0 capture failures, 0 console
errors, `overflowX: 0` across all 14 viewport × colour-scheme runs + dedicated
`prefers-reduced-motion: reduce` run)

Every value below is tagged:

- `[MEASURED]` — read directly from the rendered page in real Chromium
  (`getBoundingClientRect`, `getComputedStyle`, Framer's inline CSS custom
  properties and `<style>` blocks in `dom.html.gz`, Web Animations API,
  `Element.prototype.animate` hook, `IntersectionObserver` hook,
  `PerformanceObserver`, real pointer events, and section PNG screenshots).
- `[INFERRED]` — not directly exercised or read; reasoned from adjacent
  rendered evidence and named explicitly as an inference.
- `[UNVERIFIED]` — could not be established at all.

---

## 0. Capture method & artifact inventory

Because the development sandbox's network allowlist blocks
`forma-visuvate.framer.website` (while `fetch_page` returns stripped markdown
only), `scripts/capture-changelog-reference.mjs` ran real headless Chromium on
a GitHub Actions runner across all seven required widths (`1440×900`,
`1200×900`, `1024×768`, `768×1024`, `390×844`, `375×812`, `320×700`) in both
`light` and `dark` browser colour schemes, plus a dedicated
`prefers-reduced-motion: reduce` comparison pass at `390×844`.

| Artefact (per viewport × colour scheme) | What it proves |
| --- | --- |
| `chg-<vp>-<scheme>-structure.json` | Top-level landmark order, bounding boxes, paddings, headings, links, font inventory, and bounded DOM outline |
| `chg-<vp>-<scheme>-styles.json` | Computed properties for visible elements, `@keyframes`, and Framer `@media` queries |
| `chg-<vp>-<scheme>-changelog.json` | Hero node geometry, filter chip strip, full `<article>` entry subtrees, sticky left-rail nodes, badge pills, bullet markers, pagination check, hover/click probes, and footer |
| `chg-<vp>-<scheme>-svgs.json` | All 10 `<svg>` nodes (`outerHTML`, `viewBox`, bounding boxes, stroke/fill, SMIL/WAAPI animation checks) |
| `chg-<vp>-<scheme>-motion.json.gz` | Every `Element.prototype.animate()` invocation, `document.getAnimations()` first-seen WAAPI log with timing + keyframes, `IntersectionObserver` options, `MutationObserver` log, scroll trace |
| `chg-<vp>-<scheme>-dom.html.gz` | Settled hydrated DOM including Framer `--token-*` CSS custom properties, `[data-border="true"]::after` hairline rules, and `__framer__appearAnimationsContent` JSON |
| `forma-changelog-<vp>-<scheme>-full.png` & `-sec-00..04.png` | Full-page and per-landmark Chromium PNG renders |
| `chg-reduced-motion.json` | Side-by-side `no-preference` vs `reduce` animation call log |

Run summary (`changelog-run-notes.json`, `changelog-failures.json`): `0`
failures, `0` console errors, `0` horizontal overflow at every width `[MEASURED]`.

---

## 1. Page identity & breakpoints

| Field | Value | Evidence |
| --- | --- | --- |
| `<title>` | `Changelog — New features and fixes in Forma` | `[MEASURED]` |
| `<meta name="description">` | `Every Forma release in one place: new features, improvements, and bug fixes, most recent first, each described in plain language.` | `[MEASURED]` |
| `<h1>` count | `1` (`What’s new` + sibling highlight `in Forma` inside `Headline` row) | `[MEASURED]` |
| `<h2>` count | `8` (one per release `<article>`) | `[MEASURED]` |
| Document height (px) | `4284` (`1440`) / `4350` (`1200`) / `4944` (`1024`) / `4779` (`768`) / `5772` (`390`) / `5919` (`375`) / `6354` (`320`) | `[MEASURED]` |
| Framer media queries | Desktop `(min-width: 1200px)`, Tablet `(min-width: 810px) and (max-width: 1199.98px)`, Phone `(max-width: 809.98px)`, plus `(prefers-color-scheme: dark)` token block | `[MEASURED]` |
| Fonts rendered | `Manrope` (`h1`, `h2`, closing CTA display headline), `DM Sans` / `DM Sans Variable` (eyebrows, body copy, dates, versions, badges, filter pills, buttons, nav, footer) | `[MEASURED]` |

### Light vs dark theme behavior `[MEASURED]`

In Chromium, Framer's stylesheet declares both `body { --token-*: ... }` (light)
and `@media (prefers-color-scheme: dark) { body { --token-*: ... } }`, **but**
its custom header theme script (`Toggle dark mode`, `54×54` button in `<header>`)
locks the initial rendered canvas to light (`rgb(255, 255, 255)` background,
`rgb(27, 20, 38)` ink) even when Playwright's context sets `colorScheme: "dark"`
(`[MEASURED]` — all 7 dark-scheme captures rendered identical `bodyBg` and boxes
to light). Both Framer's light tokens and its stylesheet-declared dark tokens
are recorded in §9 below; Roducq's `.rdq-marketing` / `.dark .rdq-marketing`
token layer in `app/(marketing)/landing.css` supports live theme switching natively.

---

## 2. Full top-to-bottom section order & geometry `[MEASURED]`

The page comprises **five top-level landmarks** (`1` `<header>`, `3` `<section>`
bands, `1` `<footer>`). There is **no announcement bar** and **no sticky
sub-navigation strip** on `/changelog` `[MEASURED]`.

| # | Landmark | Box at `1440×900` (`x, y, w, h`) | Padding (`top / right / bottom / left`) | Inner max-width | Purpose |
| --- | --- | --- | --- | --- | --- |
| `0` | `<header>` | `0, 0, 1440, 69.7` | `0 / 48 / 0 / 48` | `1240px` (`x=100..1340`) | Sticky top navigation (`Features`, `Solutions`, `Integrations`, `Pricing`, active `Changelog` underlined with `2px` `#1b1426` bar, theme toggle, `Get started` CTA) |
| `1` | `<section name="Page Hero">` | `100, 69.7, 1240, 322.69` | `92 / 0 / 72 / 0` | `1240px` (lead `640px`) | Eyebrow `Changelog`, inline display headline `What’s new in Forma`, muted subtitle |
| `2` | `<section data-framer-name="Updates">` | `0, 392.39, 1440, 2527.78` | `0 / 24 / 40 / 24` | **`980px`** (`x=230..1210`) | Centered 4-pill filter row + `28px` spacer + 8 chronological `<article>` release entries |
| `3` | `<section name="Closing CTA">` | `0, 2920.17, 1440, 750.83` | `120 / 48 / 96 / 48` | `1240px` (`x=100..1340`) | Rounded `28px` purple gradient stage (`Try Forma with your own projects`) + `Getting started` (`2 of 4`) checklist card |
| `4` | `<footer>` | `0, 3671, 1440, 703.86` | `120 / 48 / 0 / 48` | `1240px` (`x=100..1340`) | Brand column + 4 link columns + copyright + `Back to top ↑` + oversized bottom wordmark |

### Responsive landmark padding & widths across all 7 viewports `[MEASURED]`

| Viewport | `<header>` (`h`, `padX`) | Band 1 Hero (`x`, `w`, `padY`) | Band 2 Updates (`inner x`, `inner w`, `pad`) | Band 3 Closing CTA (`pad top/right/bottom/left`) | `<footer>` (`pad top/right/bottom/left`) |
| --- | --- | --- | --- | --- | --- |
| `1440×900` | `69.7`, `48` | `100`, `1240`, `92 / 72` | `230`, `980`, `0 / 24 / 40 / 24` | `120 / 48 / 96 / 48` | `120 / 48 / 0 / 48` |
| `1200×900` | `69.7`, `48` | `48`, `1104`, `92 / 72` | `110`, `980`, `0 / 24 / 40 / 24` | `120 / 48 / 96 / 48` | `120 / 48 / 0 / 48` |
| `1024×768` | `69.7`, `24` | `42`, `940`, `92 / 72` | `24`, `976`, `0 / 24 / 40 / 24` | `80 / 42 / 80 / 42` | `96 / 24 / 0 / 24` |
| `768×1024` | `65.7`, `16` | `16`, `736`, `56 / 44` | `24`, `720`, `0 / 24 / 40 / 24` | `60 / 16 / 64 / 16` | `56 / 16 / 0 / 16` |
| `390×844` | `65.7`, `16` | `16`, `358`, `56 / 44` | `24`, `342`, `0 / 24 / 40 / 24` | `60 / 16 / 64 / 16` | `56 / 16 / 0 / 16` |
| `375×812` | `65.7`, `16` | `16`, `343`, `56 / 44` | `24`, `327`, `0 / 24 / 40 / 24` | `60 / 16 / 64 / 16` | `56 / 16 / 0 / 16` |
| `320×700` | `65.7`, `16` | `16`, `288`, `56 / 44` | `24`, `272`, `0 / 24 / 40 / 24` | `60 / 16 / 64 / 16` | `56 / 16 / 0 / 16` |

---

## 3. Band 1 — Hero composition `[MEASURED]`

Unlike `/solutions`, `/features`, and `/integrations` (whose heroes break the
gradient phrase onto a forced second line at `1440px`), `/changelog`'s hero
renders `What’s new` and gradient `in Forma` **inline on a single centered row**
at `1440px`, `1200px`, `1024px`, and `768px`, wrapping cleanly onto two centered
lines at `390px`, `375px`, and `320px` `[MEASURED]`.

Hero background is **solid `#ffffff`** — there is **no purple radial bloom, no
dot/line grid, and no preview mockup** in the hero `[MEASURED]`.

| Element | Box at `1440×900` (`x, y, w, h`) | Typography | Colour / Fill | Vertical rhythm |
| --- | --- | --- | --- | --- |
| Eyebrow `<p>` (`Changelog`) | `100, 161.7, 1240, 16.8` | `DM Sans`, `14px / 16.8px` (`1.2`), weight `600`, `letter-spacing: normal`, centered | `rgb(83, 50, 214)` (`#5332d6`) | `10px` spacer below (`y=178.5 -> 188.5`) |
| `<h1>` plain phrase (`What’s new`) | `413.53, 188.5, 347, 68.55` | `Manrope`, `67.2px / 68.54px` (`1.02`), weight `600`, `letter-spacing: -2.016px` (`-0.03em`) | `rgb(27, 20, 38)` (`#1b1426`) | Inline flex row (`gap ~11.4px`) with gradient highlight |
| Gradient highlight (`in Forma`) | `771.92, 188.5, 254.55, 68.55` (inner `span` padded `9.41px` with `-9.41px` margin so descenders never clip) | `Manrope`, `67.2px / 68.54px` (`1.02`), weight `600`, `letter-spacing: -2.016px` | `linear-gradient(90deg, #6246ea 0%, #8b5cf6 50%, #c084fc 100%)` (`-webkit-background-clip: text`) | `32px` spacer below (`y=257.05 -> 289.05`) |
| Lead `<p>` | `400, 289.05, 640, 31.34` | `DM Sans`, `19px / 31.35px` (`1.65`), weight `400`, centered, `max-width: 640px` | `rgb(104, 112, 131)` (`#687083`) | Ends at `y=320.39` (`72px` bottom padding to `392.39`) |

### Hero typography across all 7 widths `[MEASURED]`

| Viewport | Eyebrow | Headline (`font-size / line-height / letter-spacing`) | Headline wrapping | Lead (`font-size / line-height`, box `w × h`) |
| --- | --- | --- | --- | --- |
| `1440`, `1200` | `14px / 16.8px` (`600`) | `67.2px / 68.54px / -2.016px` (`600`) | 1 line (`What’s new in Forma`) | `19px / 31.35px`, `640 × 31.34` (1 line) |
| `1024` | `14px / 16.8px` (`600`) | `45.4px / 46.28px / -1.36px` (`600`) | 1 line (`What’s new in Forma`) | `19px / 31.35px`, `640 × 31.34` (1 line) |
| `768` | `14px / 16.8px` (`600`) | `44px / 44.88px / -1.32px` (`600`) | 1 line (`What’s new in Forma`) | `16.5px / 27.23px`, `640 × 27.23` (1 line) |
| `390` | `14px / 16.8px` (`600`) | `44px / 44.88px / -1.32px` (`600`) | 2 lines (`What’s new` / `in Forma`) | `16.5px / 27.23px`, `358 × 54.47` (2 lines) |
| `375` | `14px / 16.8px` (`600`) | `44px / 44.88px / -1.32px` (`600`) | 2 lines (`What’s new` / `in Forma`) | `16.5px / 27.23px`, `343 × 54.47` (2 lines) |
| `320` | `14px / 16.8px` (`600`) | `44px / 44.88px / -1.32px` (`600`) | 2 lines (`What’s new` / `in Forma`) | `16.5px / 27.23px`, `288 × 54.47` (2 lines) |

---

## 4. Band 2 — Filter chip row & timeline feed (`Updates`) `[MEASURED]`

### 4.1 Filter chip controls (`data-framer-name="Filters"`)

Centered at the top of the `980px` container (`display: flex; flex-wrap: wrap;
justify-content: center; align-items: center; gap: 6px`), followed by a `28px`
vertical spacer (`h: 28px`, `y: 432.09 -> 460.09` at `1440px`) `[MEASURED]`.

| Chip label | Variant | Box at `1440` (`w × h`) | Fill | Border (`data-border="true"::after`) | Radius / Padding | Label typography & colour |
| --- | --- | --- | --- | --- | --- | --- |
| `All updates` | `Active` (`framer-v-1wvcsw8`) | `104.53 × 39.70` | `#1b1426` (`rgb(27, 20, 38)`) | `1px solid #1b1426` | `999px`, `9px 16px` | `DM Sans`, `14px / 21.7px`, `400`, `#ffffff` |
| `New` | `Default` (`framer-v-1vasu3t`) | `60.03 × 39.70` | `#ffffff` (`rgb(255, 255, 255)`) | `1px solid #eae6f1` | `999px`, `9px 16px` | `DM Sans`, `14px / 21.7px`, `400`, `#687083` |
| `Improved` | `Default` (`framer-v-1vasu3t`) | `93.14 × 39.70` | `#ffffff` | `1px solid #eae6f1` | `999px`, `9px 16px` | `DM Sans`, `14px / 21.7px`, `400`, `#687083` |
| `Fixed` | `Default` (`framer-v-1vasu3t`) | `66.23 × 39.70` | `#ffffff` | `1px solid #eae6f1` | `999px`, `9px 16px` | `DM Sans`, `14px / 21.7px`, `400`, `#687083` |

- **Responsive wrapping `[MEASURED]`**: Fits on 1 row (`h = 39.70px`) at `1440`,
  `1200`, `1024`, `768`, and `390px`; wraps cleanly onto 2 centered rows
  (`h = 85.41px`, `row-gap: 6px`) at `375px` and `320px`.
- **Hover state `[MEASURED]`**: Pointer-over on inactive `New` chip changes its
  `<p>` label colour from `rgb(104, 112, 131)` (`#687083`) to `rgb(27, 20, 38)`
  (`#1b1426`), with `0` layout/box-shadow/transform shifts.
- **Filter click behavior (`[MEASURED]` + `[INFERRED]`)**: Clicking `All updates`
  left all 8 entries visible and triggered `0` WAAPI animations `[MEASURED]`.
  In the hydrated DOM (`dom.html.gz`), all 4 buttons use the same standalone
  Framer `framer-8ph4e` pill component as `/integrations` (§4.4 of
  `docs/FORMA_INTEGRATIONS_REFERENCE.md`), and `<section class="framer-3z30sm"
  data-framer-name="Updates">` declares `0` page-level filter variants in CSS
  (`.framer-RrYHw.framer-v-* = 0`) `[MEASURED]`. Whether Framer's runtime bundle
  attaches an imperative handler on the 3 inactive pills was not separately
  clicked in `probes.filterClicks` `[INFERRED — matches `/integrations` inert
  Framer chip pattern]`. Following the approved `/integrations` precedent,
  Roducq's recreation should wire real client-side `aria-pressed` filtering so
  no interactive button is inert while keeping `"all"` server-rendered for
  no-JS completeness.

### 4.2 Timeline architecture — two-column sticky editorial feed (no vertical rail) `[MEASURED]`

A critical finding from real Chromium measurement: **Forma's `/changelog` has NO
vertical timeline rail line, NO node dots along a spine, and NO boxed card
borders or drop shadows** `[MEASURED]`. Instead, it is an editorial feed inside a
centered `980px` column where **every `<article>` entry is separated by a `1px`
top horizontal rule (`#eae6f1`)** (including above the first entry, separating
it from the filter bar):

```
section[data-framer-name="Updates"]        padding: 0 24px 40px 24px
└── div[data-framer-name="Container"]      width: 100%; max-width: 980px; margin: 0 auto
    ├── div[data-framer-name="Filters"]    flex row, wrap, center, gap: 6px
    ├── div (spacer)                       height: 28px
    └── div (entries stack)                flex-direction: column; gap: 0
        └── article[name="Release"] × 8    border-top: 1px solid #eae6f1; padding: 45px 0 44px 0
            ├── div[data-framer-name="Meta"]   left column (210px wide, sticky top: 110px at >=1200px)
            │   ├── p (date)                   DM Sans 15px / 23.25px, 600, #1b1426
            │   └── p (version/sub-label)      DM Sans 13px / 24.8px, 400, #687083
            └── div[data-framer-name="Body"]   right column (730px wide at >=1200px, flex-1)
                ├── div[data-framer-name="Tags"]  flex row, gap: 6px (1–2 uppercase pills)
                ├── div (spacer)                  height: 14px
                ├── h2 (entry title)              Manrope 28.8px/31.68px (>=1200) | 24px/26.4px (<1200), 600, #1b1426
                ├── div (spacer)                  height: 12px
                ├── p (summary)                   DM Sans 16.5px / 28.05px, 400, #687083
                └── ul (optional bullets)         padding: 16px 0 8px 0; display: flex; flex-col; gap: 8px
                    └── li                        position: relative; padding-left: 18px
                        ├── div (dot)             5×5px circle (#687083), position: absolute; top: 10px; left: 5px
                        └── p (bullet text)       DM Sans 15.5px / 24.8px, 400, #687083
```

### 4.3 Two-column vs single-column responsive switch `[MEASURED]`

| Viewport | `<article>` `flex-direction` | `<article>` `gap` | `<article>` `padding` | Left `Meta` width & `position` | Right `Body` width | Entry `<h2>` (`size / leading / tracking`) |
| --- | --- | --- | --- | --- | --- | --- |
| `1440×900` | `row` | `40px` | `45px 0 44px 0` | `210px`, `sticky` (`top: 110px`) | `730px` | `28.8px / 31.68px / -0.864px` (`-0.03em`) |
| `1200×900` | `row` | `40px` | `45px 0 44px 0` | `210px`, `sticky` (`top: 110px`) | `730px` | `28.8px / 31.68px / -0.864px` |
| `1024×768` | **`column`** | **`12px`** | `45px 0 44px 0` | `100%` (`976px`), `relative` (`top: 0`) | `976px` | **`24px / 26.4px / -0.72px`** (`-0.03em`) |
| `768×1024` | `column` | `12px` | `45px 0 44px 0` | `100%` (`720px`), `relative` | `720px` | `24px / 26.4px / -0.72px` |
| `390×844` | `column` | `12px` | `45px 0 44px 0` | `100%` (`342px`), `relative` | `342px` | `24px / 26.4px / -0.72px` |
| `375×812` | `column` | `12px` | `45px 0 44px 0` | `100%` (`327px`), `relative` | `327px` | `24px / 26.4px / -0.72px` |
| `320×700` | `column` | `12px` | `45px 0 44px 0` | `100%` (`272px`), `relative` | `272px` | `24px / 26.4px / -0.72px` |

Notice the exact `1200px` threshold (`(min-width: 1200px)`): at `1440px` and
`1200px`, all 8 `Meta` blocks measure `position: sticky; top: 110px`
(`stickyCount: 8`); at `1024px` and below, all 8 stack vertically above the
badges (`stickyCount: 0`, `gap: 12px`) and `<h2>` steps from `28.8px` to `24px`
`[MEASURED]`.

---

## 5. Badges, media, hover, and pagination findings `[MEASURED]`

### 5.1 Release badge pills (`framer-gz3epd`) `[MEASURED]`

All four badge tones share identical geometry and typography:
- Container: `display: flex; padding: 3px 9px; border-radius: 999px; height: 23.05px; border: none`, row `gap: 6px` when multiple pills appear.
- Text: `DM Sans`, `11px / 17.05px` (`1.55`), `font-weight: 600`, `letter-spacing: 0.66px` (`0.06em`), `text-transform: uppercase`.

| Badge text | Light background (`--token-*`) | Light text colour (`--token-*`) | Stylesheet dark background | Stylesheet dark text colour |
| --- | --- | --- | --- | --- |
| `NEW` | `#efebff` (`rgb(239, 235, 255)`) | `#5332d6` (`rgb(83, 50, 214)`) | `rgba(167, 139, 250, 0.16)` (`#a78bfa29`) | `#c4b5fd` |
| `IMPROVED` | `#fdf3e2` (`rgb(253, 243, 226)`) | `#8a5200` (`rgb(138, 82, 0)`) | `#2b1f0b` | `#f5c26b` |
| `FIXED` | `#e7f7ed` (`rgb(231, 247, 237)`) | `#11703a` (`rgb(17, 112, 58)`) | `#12301f` | `#6ee7a0` |
| `BETA` | `#f2eef8` (`rgb(242, 238, 248)`) | `#545a6c` (`rgb(84, 90, 108)`) | `#211a2e` | `#8d95a9` |

### 5.2 Card media, hover, click, and pagination `[MEASURED]`

- **Media inside entries**: `0` `<img>` elements, `0` `<video>` elements, `0`
  `<canvas>` elements, and `0` mock UI frames inside `Updates` across all 8
  entries `[MEASURED]`. Entry 8 (`Dark theme`) also proves that the `<ul>`
  bullet list is optional (`0` bullets, `197.78px` total `<article>` height vs
  `307–340px` for 2–3-bullet entries) `[MEASURED]`.
- **Entry hover & click**: `probes.cardHover` on Entry 1 (`Focus time, across
  your whole calendar`) recorded **`0` computed-style changes**; `probes.cardClick`
  left the URL unchanged and opened `0` dialogs `[MEASURED]`. Entries on the
  reference have no links; if Roducq adds source PR/commit verification links
  for transparency, that will be a documented product-truthfulness addition
  with accessible focus/hover treatment.
- **Pagination / Load more**: `paginationCandidates = []` (`0` load-more,
  older/newer, or archive controls anywhere on the page) `[MEASURED]`.

### 5.3 Inventory of Forma's 8 reference entries (structural shape only — NEVER copy content) `[MEASURED]`

Recorded solely to document badge density (`1–2` pills), summary length (`1–2`
sentences), and bullet count (`0, 2, or 3` items):
1. `1` pill (`NEW`), `1` 2-sentence summary, `3` bullets (`340.22px` tall at `1440px`)
2. `2` pills (`NEW`, `IMPROVED`), `1` 2-sentence summary, `3` bullets (`340.22px`)
3. `1` pill (`IMPROVED`), `1` 2-sentence summary, `2` bullets (`307.42px`)
4. `2` pills (`NEW`, `BETA`), `1` 2-sentence summary, `2` bullets (`307.42px`)
5. `1` pill (`NEW`), `1` 1-sentence summary, `2` bullets (`307.42px`)
6. `1` pill (`FIXED`), `1` 1-sentence summary, `3` bullets (`312.17px`)
7. `1` pill (`NEW`), `1` 1-sentence summary, `2` bullets (`307.42px`)
8. `1` pill (`NEW`), `1` 2-sentence summary, `0` bullets (`197.78px`)

---

## 6. Band 3 — Closing CTA section `[MEASURED]`

Identical architectural stage to `/solutions` and `/integrations`
(`ClosingCta.tsx` / `IntegrationsClosingCta.tsx`):

| Element | Box at `1440×900` (`x, y, w, h`) | Style |
| --- | --- | --- |
| Outer `<section>` | `0, 2920.17, 1440, 750.83` | `padding: 120px 48px 96px` (`1024`: `80px 42px`; `<=768`: `60px 16px 64px`) |
| Rounded purple stage | `100, 3040.17, 1240, 534.83` | `border-radius: 28px`, `padding: 96px 72px`, `background: linear-gradient(150deg, #35278a 0%, #5139c9 52%, #7658ec 100%)`, `box-shadow: 0 2px 4px rgba(33,20,56,0.04), 0 40px 80px -30px rgba(58,28,110,0.32)` |
| Glow A (top-right) | `100, 3040.17, 1240, 534.83` | `radial-gradient(70% 60% at 100% 0%, rgba(205, 180, 255, 0.55) 0%, transparent 65%)` |
| Glow B (bottom-left) | `100, 3040.17, 1240, 534.83` | `radial-gradient(60% 60% at 0% 100%, rgba(240, 150, 225, 0.26) 0%, transparent 70%)` |
| Content 2-col row | `172, 3136.17, 1096, 342.83` | Left copy `565.28px` + `64px` gap + right checklist card `466.72px` (stacks at `<=1024px`) |
| Stage headline | `172, 3142.17, 565.28, 132.19` | `Manrope`, `64.8px / 66.1px`, `600`, `-2.268px`: white `Try Forma with` + gradient `linear-gradient(90deg, rgb(216,199,255) 0%, rgb(234,210,255) 50%, rgb(246,200,255) 100%)` `your own projects` |
| Stage lead `<p>` | `172, 3294.36, 565.28, 58.91` | `DM Sans`, `19px / 29.45px`, `400`, `rgba(255, 255, 255, 0.76)` (`20px` above, `36px` below) |
| Primary CTA (`<a>`) | `172, 3389.27, 146.53, 52.03` | `#ffffff` bg, `#2a1570` text, `radius: 10px`, `padding: 14px 26px`, `DM Sans Variable` `15.5px` (`wght 550`) |
| Secondary CTA (`<a>`) | `330.53, 3389.27, 150.23, 52.03` | `rgba(255,255,255,0.08)` bg, `1px solid rgba(255,255,255,0.3)`, `#ffffff` text, `radius: 10px`, `padding: 14px 26px`, `12px` button gap |
| Footnote `<p>` | `172, 3457.3, 565.28, 21.7` | `DM Sans`, `14px / 21.7px`, `400`, `rgba(255, 255, 255, 0.72)` (`16px` spacer above) |
| Right checklist card | `801.28, 3163.41, 466.72, 288.34` | `#ffffff` bg, `radius: 18px`, `padding: 24px`; header `Getting started` (`17px / 26.35px`, `600`, `#1b1426`) + `2 of 4` (`13px / 20.15px`, `500`, `#687083`); `6px` progress bar (`#eeeaf7` track, `50%` `#6246ea` fill); 4 checklist rows (`2` checked `#6246ea` `20×20` `r=6` boxes marked `Done`, `1` `#f3efff` `r=10` highlighted row marked `Next`, `1` unchecked row marked `Later`) |

---

## 7. Band 4 — Header & Footer chrome `[MEASURED]`

- **Header (`<header>`, `69.7px` desktop / `65.7px` `<=768px`)**: Sticky top bar,
  white surface, `1px` bottom hairline that fades from `opacity: 0` to `1` on
  scroll (`350ms cubic-bezier(0.2, 0.7, 0.2, 1)`). Desktop nav links:
  `Features`, `Solutions`, `Integrations`, `Pricing`, `Changelog` — on
  `/changelog`, `Changelog` renders a `2px`-tall `#1b1426` active underline bar
  (`73.05 × 2px` at `y = 50.47`) `[MEASURED]`.
- **Footer (`<footer>`, `703.86px` at `1440px`)**: Left brand column (`forma.`
  mark + tagline + `Start for free` pill) + 4 link columns (`Product`: Features,
  Integrations, Pricing, Changelog, Demo; `Teams`: Product and engineering,
  Design, Marketing, Operations; `Company`: About, Contact, Security; `Legal`:
  Privacy, Terms) + bottom bar (`© 2026 Forma. All rights reserved.` +
  `Back to top ↑`) + oversized cropped `forma.` wordmark `[MEASURED]`. Roducq
  reuses its shared `SiteHeader` and `SiteFooter` components with truthful
  Roducq destinations.

---

## 8. SVG inventory — 10 `<svg>` elements, 0 animations `[MEASURED]`

| Index | Location | Rendered box at `1440` | `viewBox` | Role / Paths | Animation |
| --- | --- | --- | --- | --- | --- |
| `0` | Header theme toggle (sun) | `1189.53, 26.33, 17.03 × 17.03` | `0 0 24 24` | `<circle r="4">` + 8 rays (`stroke-width="2"`) | None (`0` SMIL/WAAPI) |
| `1` | Header theme toggle (moon) | `1191.07, 27.86, 13.96 × 13.96` | `0 0 24 24` | Crescent `<path>` (`stroke-width="2"`) | None |
| `2` | Closing CTA checklist row 1 tick | `829.78, 3260.88, 11 × 11` | `0 0 24 24` | `<use href="#3338047389">` white checkmark (`stroke-width: 3`) | None |
| `3` | Closing CTA checklist row 2 tick | `829.78, 3310.13, 11 × 11` | `0 0 24 24` | `<use href="#3338047389">` white checkmark (`stroke-width: 3`) | None |
| `4` | Footer `Back to top` arrow | `1313, 4137.5, 13 × 13` | `0 0 24 24` | `<use href="#1247979269">` upward chevron (`stroke-width: 2`) | None |
| `5–9` | Hidden Framer `<svg>` symbol defs | `0 × 0` (`y = 900`) | `0 0 24 24` | Symbol definitions (`#1247979269` chevron, `#3338047389` check, plus unused template defs `#2137201399`, `#1926560507`, `#2658957108`) | None |

There are **`0` `<svg>` elements inside the Hero or the 8 timeline `<article>`
entries** `[MEASURED]`. Bullet markers in release entries are `5×5px` CSS
`border-radius: 50%` `<div>` dots (`#687083`), not SVGs `[MEASURED]`.

---

## 9. Colour & surface token table `[MEASURED]`

Extracted from `dom.html.gz` stylesheet variables and `getComputedStyle`:

| Role | Framer token ID | Light value (`[MEASURED]`) | Stylesheet dark value (`[MEASURED]`) | Roducq `landing.css` mapping |
| --- | --- | --- | --- | --- |
| Page background | `--token-cd63d2ec-...` | `#ffffff` | `#09070d` | `--lm-bg` |
| Surface / idle filter chip | `--token-7539d8ab-...` | `#ffffff` | `#120e19` | `--lm-surface` |
| Tinted canvas | `--token-69795ccf-...` | `#f9f7fc` | `#191323` | `--lm-canvas` |
| Hairline divider / idle chip border | `--token-110579cb-...` | `#eae6f1` | `#261f33` | `--lm-border` |
| Primary ink (headings, dates, active chip) | `--token-0e73501c-...` | `#1b1426` | `#f0ecf6` | `--lm-ink` |
| Secondary muted copy (lead, version, summaries, bullets) | `--token-26dbfae9-...` | `#687083` | `#8d95a9` | `--lm-muted-readable` / `--lm-muted` |
| Eyebrow & `NEW` badge ink | `--token-a76a7cf6-...` | `#5332d6` | `#c4b5fd` | `--lm-ink-accent` |
| `NEW` badge fill | `--token-8099445c-...` | `#efebff` | `rgba(167, 139, 250, 0.16)` | `--lm-surface-accent` |
| `IMPROVED` badge fill / ink | `--token-3b6f04c8` / `1e56cb18` | `#fdf3e2` / `#8a5200` | `#2b1f0b` / `#f5c26b` | Scoped changelog amber badge token |
| `FIXED` badge fill / ink | `--token-c5b4f0f0` / `41a12c1f` | `#e7f7ed` / `#11703a` | `#12301f` / `#6ee7a0` | `--lm-mint` / `--lm-success` |
| `BETA` / neutral badge fill / ink | `--token-55891fda` / `57aeb8c7` | `#f2eef8` / `#545a6c` | `#211a2e` / `#8d95a9` | `--lm-canvas-subtle` / `--lm-muted-readable` |
| Hero gradient (`90deg`) | `a02920e8 -> 42523954 -> 780a95ac` | `#6246ea -> #8b5cf6 -> #c084fc` | `#a78bfa -> #c4b5fd -> #f0abfc` | `.lm-gradient-text` |
| Closing stage gradient (`150deg`) | `0652ff0f -> 8e8f5df4 -> 6dc452e7` | `#35278a -> #5139c9 -> #7658ec` | `#1c1045 -> #2a1570 -> #4527b8` | `.lm-solutions-stage` |

---

## 10. Motion & animation inventory — exact timings & curves `[MEASURED]`

Captured via three independent instruments in Chromium (`__framer__appearAnimationsContent`,
`Element.prototype.animate` interception across a full-page scroll to bottom and
back to top, and `document.getAnimations()` WAAPI polling):

| Target element | Trigger | Properties on Forma | Delay | Duration | Easing | Iterations | Roducq Motion.dev + PR #53 LCP-safe adaptation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hero eyebrow `Changelog` (`if7ifv`) | Page load | `opacity: 0.001 -> 1`, `translateY(16px -> 0)` | `0ms` | `800ms` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | `1` | LCP-safe `opacity: 1` + `clipPath` / `translateY(16px -> 0)`, `800ms`, `[0.2, 0.7, 0.2, 1]` |
| Hero `<h1>` word 1 (`What’s`) | Page load | `opacity: 0.001 -> 1`, `filter: blur(10px -> 0px)` | `50ms` | `900ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | `1` | **PR #53 LCP-safe**: `opacity: 1` always, **no blur**, `clipPath: inset(0 0 112% 0) -> inset(0 0 -18% 0)` + `translateY(14px -> 0)`, `50ms` delay, `900ms`, `[0.16, 1, 0.3, 1]` |
| Hero `<h1>` word 2 (`new`) | Page load | `opacity: 0.001 -> 1`, `filter: blur(10px -> 0px)` | `100ms` | `900ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | `1` | **PR #53 LCP-safe**: `opacity: 1`, **no blur**, `clipPath` + `translateY(14px -> 0)`, `100ms` delay, `900ms`, `[0.16, 1, 0.3, 1]` |
| Hero gradient phrase (`in Forma`, `k6v9if`) | Page load | `opacity: 0.001 -> 1`, `translateY(28px -> 0)` | `350ms` | `900ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | `1` | **PR #53 LCP-safe**: `opacity: 1`, `clipPath` + `translateY(20px -> 0)`, `350ms` delay, `900ms`, `[0.16, 1, 0.3, 1]` |
| Hero lead `<p>` (`etf4e2`) | Page load | `opacity: 0.001 -> 1`, `translateY(16px -> 0)` | `450ms` | `800ms` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | `1` | **PR #53 LCP-safe**: `opacity: 1`, `clipPath` + `translateY(14px -> 0)`, `450ms` delay, `800ms`, `[0.2, 0.7, 0.2, 1]` |
| Header scroll border | Scroll `> 0` / `= 0` | `opacity: 0 <-> 1` | `0ms` | `350ms` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | `1` | Handled by existing `SiteHeader` |
| Filter chips, all 8 `<article>` entries, Closing CTA, Footer | Full-page scroll | **`0` animations (`0` WAAPI / `0` appear IDs)** | — | — | — | — | **Keep static / immediately visible** (no invented scroll-reveal staggers, timeline line draws, or decorative loops) |

### Reduced-motion verification (`chg-reduced-motion.json`) `[MEASURED]`

On Forma's live Framer build, `<script data-framer-appear-animation="no-preference">`
passes `false` as its third argument (`s && matchMedia('(prefers-reduced-motion: reduce)').matches`),
so Forma itself still fired the same 15 WAAPI calls under `reduce` `[MEASURED]`.
In Roducq, both CSS `@media (prefers-reduced-motion: reduce)` and Motion.dev's
`<MotionConfig reducedMotion="user">` + `useReducedMotion()` **must** suppress
every entrance transform immediately so reduced-motion and no-JS visitors see
the settled static state from frame 0.
