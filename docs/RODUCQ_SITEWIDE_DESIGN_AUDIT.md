# roducq site-wide design audit

**Status:** audit complete. **No application code has been changed.**

Companion documents:

- `docs/RODUCQ_SOLUTIONS_DESIGN_SYSTEM.md` — the measured `/solutions` reference
- `docs/RODUCQ_HOMEPAGE_SEMANTIC_AUDIT.md` — the full `/` heading inventory

| | |
|---|---|
| Routes audited | `/`, `/solutions`, `/features`, `/integrations`, `/pricing`, `/changelog`, `/about`, `/vs` (+ `/vs/[slug]` structurally) |
| Commit | `6996c665f994cd6c6be08dfd6d45316d3f438b03` (production deployment `7386809442`) |
| Build | local `next start`, `BUILD_ID qIGus8daJv5ZtaWAURwd6` |
| Browser | Chromium 153.0.8010.0, 1440×900, light theme |
| Tools | rendered DOM + computed styles; CDP accessibility tree; axe-core |

## 1. Route matrix

All eight routes measured at 1440, light theme. "H2 sizes" and "H3 sizes" are the distinct computed
`font-size / weight` pairs, with the number of headings using each.

| Route | Headings | H1 | H2 sizes (count) | H3 sizes (count) | Sections | Paragraphs | Lists | axe violations | axe incomplete |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 30 | 72/400 | 54/400 ×5, 48/600 ×1, 64/600 ×1 | 22/400 ×4, 22/600 ×3, 18/700 ×1, 17/600 ×6, 23/600 ×8 | 8 | 121 | 21 | 0 | color-contrast ×15 |
| `/solutions` | 11 | 67.2/600 | 42/600 ×4, 36/600 ×1, 64.8/600 ×1 | 12/600 ×4 | 4 | 63 | 10 | 0 | color-contrast ×18 |
| `/features` | 13 | 67.2/600 | 42/600 ×6, 54/400 ×1, 64.8/600 ×1 | 18/600 ×4 | 4 | 122 | 22 | 0 | color-contrast ×14 |
| `/integrations` | 15 | 67.2/600 | 16/400 ×1, 54/400 ×1, 40.8/600 ×1, 64.8/600 ×1 | 17/600 ×7, 21/600 ×3 | 5 | 35 | 6 | 0 | color-contrast ×13 |
| `/pricing` | 9 | 68/600 | 23/600 ×3, 54/600 ×2, 32/600 ×1, 64/600 ×1 | 20/600 ×1 | 5 | 42 | 8 | 0 | color-contrast ×28 |
| `/changelog` | 10 | 67.2/600 | 28.8/600 ×8, 64.8/600 ×1 | — | 3 | 22 | 11 | 0 | color-contrast ×12 |
| `/about` | 12 | 67.2/600 | 43.2/600 ×1, 54/400 ×1, 64.8/600 ×1 | 24/600 ×5, 22/600 ×3 | 5 | 32 | 5 | 0 | color-contrast ×2 |
| `/vs` | 10 | 36/700 | 16/700 ×9 | — | 0 | 18 | 4 | 0 | color-contrast ×1 |

## 2. Semantic status: healthy, and better than expected

| Check | Result across all 8 routes |
|---|---|
| Exactly one `h1` per route | **pass** — 8 / 8 |
| Skipped heading levels | **0** anywhere |
| `h4` / `h5` / `h6` used | **0** anywhere |
| axe-core violations | **0** on every route |
| axe-core `color-contrast` incomplete | **reported as incomplete**, never as a pass — 15 / 18 / 14 / 13 / 28 / 12 / 2 / 1 nodes |

Heading-level errors are **not** the problem on this site, and no change should be made to a
heading level under the banner of "consistency". The per-route structure notes:

- `/` — 8 `<section>` elements, none named. `/pricing` names all 5 of its sections with
  `aria-labelledby`. The homepage should copy the pattern it already ships elsewhere. **P2.**
- `/features` — 6 showcase `h2` at 42/600 plus 1 `h2` at 54/400 (`DetailsBand.tsx:54`). Two
  treatments for one role **on the same page**.
- `/integrations` — one `h2` is a 1 × 1 `sr-only` "Integrations catalog" label. That is deliberate
  and correct: a visually hidden section label. Not a size defect.
- `/pricing` — the three plan titles are `h2` inside `<article>`. Correct: on this page the plan
  card is the top level of the document beneath `h1`. The homepage uses `h3` for the same three
  names, which is also correct there because they sit under the "Plans for client work" `h2`. Do
  not "fix" either one.
- `/changelog` — the 8 release entries are `h2` with no section heading above them. Level-legal,
  but the outline reads `h1` → 8 sibling `h2` + CTA `h2`, so individual releases and the closing
  CTA are peers. **P3**, optional: introduce one `h2` ("All updates") and demote entries to `h3`.
- `/about` — mixes a 54/400 section title with a 43.2/600 split title. The 43.2 px value is
  hard-coded in `about.css` and exists nowhere in the token scale.
- `/vs` — no `<section>` elements at all, and its `h1` is 36/700. Structurally legal; visually a
  different product. See §4.

## 3. Typography: one role, up to four sizes — the main finding

### 3.1 Four parallel type systems

The site does not have one type scale. It has four, and which one a page uses is decided by which
component family it was built from:

| # | System | Where | How sizes are expressed |
|---|---|---|---|
| 1 | `--lm-size-*` tokens + Tailwind `lm-*` | `/`, `/solutions`, `/features`, `/integrations`, `/changelog` | 41 steps, `app/(marketing)/landing.css:120–180` |
| 2 | `.ab-*` classes | `/about` | hard-coded px in `about.css` (`43.2px` at ≥1200 is **not** a token) |
| 3 | `.rp-*` classes | `/pricing` | `clamp()` fluid values, `pricing.css:39` (`clamp(40px,4.8vw,68px)`), `:262` (`clamp(34px,3.8vw,54px)`) |
| 4 | Tailwind default scale + shadcn tokens | `/vs`, `/vs/[slug]` | `text-3xl` / `sm:text-4xl`, `font-bold`, `text-muted-foreground` |

Every one of the four sits inside `.rdq-marketing` (the layout wrapper), so the boundary is in the
right place — the page bodies simply do not consume the shared scale.

### 3.2 The same role, measured on each route

| Role | `/solutions` **master** | `/` | `/features` | `/integrations` | `/pricing` | `/changelog` | `/about` | `/vs` |
|---|---|---|---|---|---|---|---|---|
| Page `h1` | 67.2 / 600 | **72 / 400** | 67.2 / 600 | 67.2 / 600 | 68 / 600 | 67.2 / 600 | 67.2 / 600 | **36 / 700** |
| Section `h2` | **42 / 600** | **54 / 400** | **42** and **54 / 400** | **54 / 400** | **54 / 600** | — | **54 / 400** | — |
| Secondary `h2` | 36 / 600 | 48 / 600 (FAQ) | — | 40.8 / 600 | 32 / 600 | 28.8 / 600 ×8 | 43.2 / 600 | 16 / 700 ×9 |
| Card `h3` | 12 / 600 (label) | **17, 18, 22, 23** | 18 / 600 | 17 and 21 / 600 | 20 / 600 | — | 22 and 24 / 600 | — |
| Closing CTA `h2` | 64.8 / 600 | **64 / 600** | 64.8 / 600 | 64.8 / 600 | **64 / 600** | 64.8 / 600 | 64.8 / 600 | — |

Three facts fall out of this table:

1. **The page `h1` is consistent on six of eight routes** (`text-lm-44 → min-[1200px]:text-lm-67`,
   semibold). `/` (72/400) and `/vs` (36/700) are the outliers.
2. **The section `h2` is split roughly 50/50** between 42/600 and 54/400, and `/features` contains
   both. This is the single most visible inconsistency on the site.
3. **The closing CTA is already standardised** on `text-lm-40 min-[1200px]:text-lm-65` across
   `/solutions`, `/features`, `/integrations`, `/changelog`, `/about`. Only `/` and `/pricing` use
   64. That is a 0.8 px difference — worth aligning, not worth a redesign.

### 3.3 The token scale already holds both variants

```
--lm-size-42: 42px     --lm-size-54: 54px
--lm-size-67: 67.2px   --lm-size-72: 72px
--lm-size-65: 64.8px   --lm-size-64: 64px
```

So unification is a **consumer** change, not a scale change. No new token is needed and no
existing token has to be redefined — which keeps the blast radius small and reviewable.

### 3.4 Finding P1 — and the one decision this audit cannot make alone

Recommended target: one treatment per role, taken from `/solutions`.

| Fix | File | Change | Risk |
|---|---|---|---|
| Hero headline weight/size | `components/marketing/landing/HeroSection.tsx:95` | `font-lm-regular text-lm-43 lg:text-lm-48 xl:text-lm-72` → `font-lm-semibold text-lm-44 xl:text-lm-67` | Low mechanically, **high visually** — the homepage hero is the most-seen surface on the site |
| Section heading | `components/marketing/landing/SectionHeading.tsx:63` | `font-lm-regular … xl:text-lm-54` → `font-lm-semibold … xl:text-lm-42` | Medium — affects 5 homepage `h2` and every page that reuses the component |
| Features detail band | `components/marketing/landing/features/DetailsBand.tsx:54` | `font-lm-regular … text-lm-54` → match `FeaturesShowcase.tsx:51` (42/600) | Low — internal consistency win, same page |
| Integrations steps | `components/marketing/landing/integrations/ConnectingSteps.tsx:50` | `text-lm-54 font-lm-regular` → 42/600 | Low |
| Closing CTA | `components/marketing/landing/FinalCta.tsx:36`, `app/(marketing)/pricing/page.tsx` | 64 → `text-lm-65` (64.8) | Very low |
| `/about` split title | `app/(marketing)/about/about.css:96` | replace the hard-coded `43.2px` with a token step | Low |

**Why this needs an explicit decision:** `SectionHeading.tsx` documents 54 px / 400 as *measured
from the Forma reference* (`docs/FORMA_FINAL_FIDELITY_AUDIT.md` §4). The instruction set says both
"`/solutions` is the visual standard" and "preserve each page's Forma-reference layout". For
heading *size and weight* these two point in opposite directions. Layout and structure are
unaffected either way — this is purely the type scale.

### 3.5 Finding P2 — `/vs` is on a different design system

`app/(marketing)/vs/page.tsx:45` and `app/(marketing)/vs/[slug]/page.tsx:66` use
`font-display text-3xl font-bold` — the Tailwind default scale — instead of the `lm-*` tokens.
Consequences measured at 1440: `h1` 36/700 against 67.2/600 everywhere else, nine `h2` at 16/700,
and no `<section>` elements.

This is the largest visual gap on the site, and also the one the standing constraints protect:
**`/vs` and all its dynamic routes must be preserved.** Recommended approach is therefore
*additive restyling only* — swap the four or five utility classes on the `h1`/`h2`/body to `lm-*`
equivalents, keep the markup, the content, the `VS_PAGE_LIST` data and the routes exactly as they
are. `[INFERRED]` that no layout change is required; this needs verification per route once
approved, because `/vs/[slug]` was not rendered during this audit.

### 3.6 Finding P3 — card title drift within pages

Not a semantic issue and not a cross-page one: each page is internally legible. But `/` alone uses
four card-title sizes (17, 18, 22, 23) for what a reader perceives as one level of thing — card
titles. Consolidating `/` to two steps (a 22–23 px title and a 17 px compact title for the
integration tiles, which are visually smaller cards) would remove two sizes without flattening
anything. `/about` uses 22 and 24 for the same role and can lose one.

## 4. Homepage vs `/solutions` vs the Forma reference, band by band

The homepage keeps its Forma-derived **structure**; this table records only what differs
*visually*, so the composition survives.

| Band | Forma / homepage structure | `/solutions` | Verdict |
|---|---|---|---|
| Hero | word-split headline, two CTAs, workspace mock | word-split, gradient accent word, lead, CTAs | Structure matches. Differs: **72/400 vs 67.2/600**, and the homepage accent phrase is not on the gradient. |
| Features | 4-column job cards | 4 audience slabs with a sticky stage | Different structure by design. Differs: card title **22/400** vs `/features` 18/600. |
| Getting started | 3 steps + engagement timeline | — | Homepage-only band; keep. Differs internally: step titles 22/600 vs feature titles 22/400 — same size, different weight, adjacent bands. |
| Integrations | 3-column tile grid, 6 tiles | — | Keep. Tiles at 17/600 are the one size that already matches a compact card role. |
| Teams | 4 columns | — | Keep. 23/600 matches the plan cards. |
| Pricing | 4 tracks: 3 plans + contact card | 1 plan band | Structure preserved. Prices **$29 / $79 / $199** are single-sourced in `app/(marketing)/pricing/pricing-content.ts` (lines 48, 71, 115) — one edit point, no fourth tier anywhere. |
| FAQ | 2-column, 6 native `<details>`, ~260 ms | — | Keep exactly. Timing lives in `landing.css:873–886` (`block-size 260ms cubic-bezier(.22,1,.36,1)`), icon 160 ms. |
| Closing CTA | dark panel, 64/600 | 64.8/600 | Align to 64.8. |
| Footer | shared `SiteFooter` | same component | Already shared — no divergence possible. |

Homepage strengths worth recording so they are not "cleaned up" by mistake: the hero illustration
is a single `role="img"` with a descriptive name instead of exposed mock widgets; every icon is
`aria-hidden`; the FAQ is native `<details>` with no JS; `aria-hidden` subtrees keep 127 mocked
widgets out of the accessibility tree.

## 5. Motion

`/` and `/solutions` share one motion vocabulary and one timing set — measured on both:

| Animation | Duration | Easing | On `/` | On `/solutions` |
|---|---|---|---|---|
| `lm-chrome-in` | 360 ms / 420 ms | `cubic-bezier(.22,1,.36,1)` | yes | yes |
| `lm-hero-in` | 800 ms (300 ms at load, 1300 ms one node) | `cubic-bezier(.2,.7,.2,1)` | yes | yes |
| `lm-hero-mask` | 900 ms, 50 ms word stagger | `cubic-bezier(.16,1,.3,1)` | yes | yes |
| `lm-word-dissolve` | 900 ms | `cubic-bezier(.16,1,.3,1)` | yes | yes |
| `lm-line-rise` | 900 ms | `cubic-bezier(.16,1,.3,1)` | yes (3) | — |
| `lm-draw` / `lm-chart-area` | 620 ms | `cubic-bezier(.33,1,.68,1)` | yes | — |
| `lm-chart-pop` | 260 ms | `cubic-bezier(.22,1,.36,1)` | yes (4) | — |
| `lm-drift` | **14 s**, infinite | `var(--lm-ease)` | yes (2) | — |

Findings:

- The four *chrome* animations and their easings are **identical** between the two pages. There is
  no motion inconsistency to fix in the shared system.
- The homepage-only animations are all attached to the **illustrations** (chart draw, point pop,
  connector rise) plus `lm-drift` at 14 s on the hero blooms. They are content-specific, not
  drift from the standard. `[INFERRED]` opinion: `lm-drift` is the only one worth questioning, as
  a continuous 14 s infinite animation is the most expensive thing running on the page.
- **Reduced motion is comprehensively handled.** `landing.css:795` disables every entrance,
  clip-path, opacity and transform, and explicitly nulls `.lm-drift` at `:836` and `:911`. No new
  animation may be added without a matching entry in that block.
- Motion.dev is the only library in use (`components/marketing/motion/`); no CSS/JS mix, no new
  patterns needed. **No motion change is proposed.**

## 6. Accessibility summary

| Route | Violations | Incomplete |
|---|---|---|
| `/` | 0 | `color-contrast` ×15 |
| `/solutions` | 0 | `color-contrast` ×18 |
| `/features` | 0 | `color-contrast` ×14 |
| `/integrations` | 0 | `color-contrast` ×13 |
| `/pricing` | 0 | `color-contrast` ×28 |
| `/changelog` | 0 | `color-contrast` ×12 |
| `/about` | 0 | `color-contrast` ×2 |
| `/vs` | 0 | `color-contrast` ×1 |

`color-contrast` is returned as **incomplete**, not passed, on every route: text over gradients
and translucent surfaces cannot be evaluated by axe. Per the standing rule these stay
**incompletes** until measured on rendered pixels. `/pricing` has the largest exposure (28 nodes),
so it is the first place a colour-token change could regress something invisible to the test suite.

## 7. Smallest safe changes, in priority order

Each item is independently shippable and independently revertible.

### P1 — needs your decision (§3.4)

1. Unify the page `h1` on the Solutions treatment (`semibold`, `text-lm-67`) — or keep 72/400.
2. Unify the section `h2` on 42/600 — or keep the Forma 54/400.
3. Align the closing CTA to 64.8 on `/` and `/pricing` (safe either way — 0.8 px).

### P2 — safe, no visual change

4. Add `aria-labelledby` to the homepage's 8 `<section>` elements, pointing at each section's own
   `h2` id, matching `/pricing`. Additive only; creates 8 navigable regions.
5. Replace the hard-coded `43.2px` in `about.css:96` with a token step, so `/about` stops bypassing
   the scale.

### P3 — optional, larger

6. Restyle `/vs` and `/vs/[slug]` onto `lm-*` type tokens **without touching markup, content, data
   or routing** (§3.5).
7. Consolidate the homepage card-title sizes from four to two (§3.6).
8. Give `/changelog` a single `h2` and demote the 8 entries to `h3` (§2).
9. Turn the presentational `<nav>` at `WorkspacePreview.tsx:129` into a `div` (cosmetic; already
   outside the accessibility tree).

### Explicitly not proposed

- No change to `/solutions`.
- No heading-level changes anywhere — every route is already level-correct.
- No new animation patterns; the existing set is shared and already reduced-motion safe.
- No change to `/vs` routing, `VS_PAGE_LIST`, or the comparison content.
- No pricing changes: $29 / $79 / $199 stay, three commercial tiers plus the contact card.
- No FAQ restructuring: 2 columns, native `<details>`, 260 ms.
- No global CSS rewrite; every item above is scoped to a component or one page stylesheet.

## 8. Proposed verification after approval

1. `npm ci`, `npm test`, `tsc --noEmit`, `next lint`, `next build` — `tsconfig.json` must be
   byte-identical afterwards.
2. `node scripts/verify-motion.mjs` — restores `docs/screenshots/forma-motion/report.json`
   afterwards, since it rewrites a tracked file.
3. `node scripts/verify-marketing-consistency.mjs`, `node scripts/sample-marketing-contrast.mjs`.
4. Widths 320 / 375 / 390 / 768 / 1024 / 1200 / 1440 × light and dark, plus axe on every route.
5. The four PR #53 LCP scenarios on `/`, `/solutions`, `/pricing`, `/about`; hero opacity masking
   must remain, and no LCP regression is acceptable for a type-only change.
6. No-JS render check on `/` (FAQ open state, all headings visible).
7. `verify:db`, `verify:pdf`, `npm audit`.

## 9. Limits of this audit

- **Chromium only** — Firefox and WebKit could not be installed here. Cross-engine rendering is
  `[UNVERIFIED]`.
- Light theme at 1440 only for the matrices in §1–§3; the 320–1024 × both-theme sweep is Phase 7
  and is `[UNVERIFIED]` in this document.
- `/vs/[slug]` was read structurally from source, not rendered.
- Production could not be fetched from this sandbox (TLS failure), so every value is from a local
  build of the deployed commit rather than from `roducq.nanexi.com`.
- Contrast over gradients is **incomplete**, never reported as passing.
