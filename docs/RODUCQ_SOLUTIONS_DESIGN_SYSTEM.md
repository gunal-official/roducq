# roducq `/solutions` design system — measured reference

**Status:** measurement complete. **`/solutions` was not modified.**

This document records what `/solutions` actually renders, so the rest of the marketing site can be
brought to the same quality without anyone guessing. It is the master reference for the design
consistency work. Values marked **[MEASURED]** were read from a rendered page; values marked
`[INFERRED]` were reasoned from CSS source and were not verified in a browser.

| | |
|---|---|
| Reference route | `/solutions` |
| Commit | `6996c665f994cd6c6be08dfd6d45316d3f438b03` (production deployment `7386809442`) |
| Build | local `next start` of that commit (`BUILD_ID qIGus8daJv5ZtaWAURwd6`) |
| Browser | Chromium 153.0.8010.0 |
| Cells measured | 4 — light/dark × 1440×900 / 390×844 |
| Harness | `/tmp/measure-solutions.mjs` → `/tmp/solutions-measured.json` (177 KB) |
| Token source of truth | `app/(marketing)/landing.css`, declared on `.rdq-marketing`, 41 size tokens, 185 `--lm-*` in total |

Production itself could not be fetched from the audit sandbox (TLS failure on
`roducq.nanexi.com`), so every number below comes from a local build of the deployed commit.
Firefox and WebKit are `[UNVERIFIED]` — Chromium only.

## 1. Typography

**Family:** Manrope everywhere, resolved from `--lm-font` **[MEASURED]**. One family on the whole
page; no serif, no mono, no second display face.

### 1.1 Heading roles

| Role | Size / weight | Line height | Letter spacing | Token |
|---|---|---|---|---|
| Page `h1` ("Different client work. One writing workspace.") | **67.2 / 600** | 68.54 | −2.02 | `--lm-size-67` |
| Interior `h2` ("One trail per client, end to end" ×4) | **42 / 600** | 46.2 | −1.26 | `--lm-size-42` |
| Plan-band `h2` ("One workspace, one price…") | **36 / 600** | 43.2 | −1.08 | `--lm-size-36` |
| Closing-CTA `h2` ("Try roducq with your own client project") | **64.8 / 600** | 66.1 | −2.27 | `--lm-size-65` |
| `h3` group label ("What each practice sets up first" ×4) | **12 / 600**, uppercase | 18 | **+0.96** | `--lm-size-12` |

Three observations that matter for consistency work:

1. **The `h1` and the interior `h2` are both weight 600.** The step between them is a size step,
   not a weight step. The homepage does the opposite (400 for both) and is the main reason it
   reads as a different site.
2. **The `h2` is much smaller than the `h1`** — 42 vs 67.2, a 37 % drop. Solutions uses a big
   page title and a restrained section title; the content does the work.
3. **The `h3` is 12 px uppercase**, i.e. smaller than body text. It is styled as an eyebrow/label.
   It is legitimately an `h3` (it introduces the workflow list inside its section), and no level is
   skipped. It is recorded here as a *measurement*, not as a pattern to copy onto card titles:
   the homepage's 17–23 px card titles are card titles, and flattening them to 12 px uppercase
   would be the wrong correction.

### 1.2 Text roles

| Role | Size / weight | Line height | Colour |
|---|---|---|---|
| Hero lead | 19 / 400 | 31.35 | `#4b505f` soft ink, max-width 640 |
| Body | 17 / 400 | 28.9 | `#687083` muted |
| Small | 15 / 400 | 24 | muted |
| Footer | 12 | — | `#75609a` on footer |
| Nav link | 15 / 400 | — | `#687083`; current page `aria-current="page"` |

Body line-height is a consistent 1.7 for lead/body and 1.6 for small — generous, and part of why
the page reads as calm.

### 1.3 The parallel-scale problem

The 41 size tokens **contain both** of the treatments that the site currently splits over:

```
--lm-size-42: 42px      --lm-size-54: 54px
--lm-size-67: 67.2px    --lm-size-72: 72px
--lm-size-65: 64.8px    --lm-size-64: 64px
```

Nothing has to be invented to unify typography: the scale already has one step per role and a
second, competing step beside it. The work is choosing one consumer per role, not building a new
scale. See `docs/RODUCQ_SITEWIDE_DESIGN_AUDIT.md` §3.

## 2. Colour

**[MEASURED]**, light theme at 1440 unless stated.

| Token | Light | Dark |
|---|---|---|
| `--lm-accent` | `#6246ea` | `#a78bfa` |
| `--lm-ink` | `#1b1426` | — |
| body muted | `#687083` | — |
| soft ink | `#4b505f` | — |
| accent ink | `#5332d6` | — |
| canvas | `#f9f7fc` | — |
| card | `#ffffff` | — |
| border | `#e4ddea` | — |
| border soft | `#ac7dfc29` | — |
| footer link | `#75609a` | — |

**76 of 185 tokens differ between light and dark.** The theme is a full token swap, not an overlay.

### 2.1 Gradients (three, no more)

| Use | Value |
|---|---|
| Hero accent text (`.lm-text-gradient`) | `linear-gradient(90deg, #6246ea 0%, #8b5cf6 50%, #a855f7 100%)` |
| Soft accent text (`.lm-text-gradient-soft`) | `linear-gradient(90deg, #d8c7ff 0%, #ead2ff 50%, #f6c8ff 100%)` |
| Showcase stage (`.lm-solutions-stage`) | radial `rgba(205,180,255,.55)` at top-right + radial `rgba(240,150,225,.26)` at bottom-left over `linear-gradient(150deg,#35278a 0%,#5139c9 52%,#7658ec 100%)` |

Presentation note: the stage gradient is the only large saturated surface on the page. It is used
once, on the showcase, which is why it reads as an accent rather than a background.

## 3. Surfaces, radii, elevation

| Element | Radius |
|---|---|
| Card | 14 px |
| Frame | 16 px |
| Stage / slab | 24–26 px |
| Mock panel | 18 px |
| Button | **10 px** |
| Pill / chip | 999 px |

Elevation is a single hairline shadow plus a border — `rgba(33,20,56,.06) 0 1px 2px`. No stacked
multi-layer shadow system **[MEASURED on the primary control]**.

## 4. Layout

| Property | Value |
|---|---|
| Shell max width | **1320 px**, gutters 40 px |
| Section padding | `92 px` top / `72 px` bottom at ≥ 810 px |
| Hero height | 423 px |
| Column gaps | 72 / 64 px |
| Sticky section strip | `top: 72px` / `150px` |
| Showcase panel | pins at `top: 150px` from scroll 542 → 1742; 607 × 710 px |

The sticky showcase is the page's only structural signature: a 1200 px scroll interval where the
panel stays pinned while the copy advances. It is `position: sticky`, not a scroll-driven
animation **[MEASURED]**, so it degrades to ordinary flow with no JS.

## 5. Motion

Real easings read from `getComputedStyle(el).animationTimingFunction`. *(Note:
`Animation.effect.getTiming().easing` always reports `linear` and must not be used for this.)*

| Name | Duration | Delay(s) | Easing | Applied to |
|---|---|---|---|---|
| `lm-chrome-in` | 360 ms | 0 | `cubic-bezier(.22,1,.36,1)` | announcement bar |
| `lm-chrome-in` | 420 ms | 60 ms | `cubic-bezier(.22,1,.36,1)` | header |
| `lm-hero-in` | 800 ms | 0, 450 ms | `cubic-bezier(.2,.7,.2,1)` | eyebrow, lead |
| `lm-hero-mask` | 900 ms | 50, 100, 150, 350 ms | `cubic-bezier(.16,1,.3,1)` | hero words, accent |
| `lm-word-dissolve` | 900 ms | 50 ms stagger | `cubic-bezier(.16,1,.3,1)` | section headings |
| nav / CTA transition | 200 ms | — | default | hover |

Hover on the primary control is a **background change** (`#fff → #efebff`), not a transform
**[MEASURED]**. There is no scale, no lift, no shadow growth.

The four easings and the 50 ms word cadence are the whole system. `/solutions` introduces no
scroll-linked, no parallax, and no spring motion.

## 6. What is page-specific and must stay page-specific

Recorded so that "make it like Solutions" does not become "make it Solutions":

- The sticky showcase panel, the 4 audience sections, the `01–04` anchor nav, and the
  "Choosing a plan" band are Solutions *content structure*. They are not part of the design system
  and must not be transplanted to `/`, `/features`, `/pricing`, `/about` or `/vs`.
- The three gradients are system-level and may appear elsewhere. The stage gradient is
  Solutions' showcase surface and should not be reused as a generic background.

## 7. Findings

### P1 — Two competing treatments for the same roles

The tokens exist in parallel pairs (§1.3), and pages disagree about which to consume. Measured
consumers:

| Role | `/solutions` (master) | Who disagrees |
|---|---|---|
| Page `h1` | `semibold` + `text-lm-67` | `/` uses `regular` + `text-lm-72`; `/pricing` 68/600; `/vs` 36/700 |
| Interior `h2` | `semibold` + `text-lm-42` | `/` 54/400; `/features` **both** 42/600 and 54/400; `/integrations` 54/400; `/pricing` 54/600 |
| Closing CTA `h2` | `text-lm-65` (64.8) | `/` and `/pricing` use 64 |

Note that `/features` contradicts itself: `FeaturesShowcase` uses 42/600 and `DetailsBand` uses
54/400 on the same page. That is the clearest evidence this is drift rather than intent.

**This requires a decision before implementation**, because the 54/400 variant is documented in
`SectionHeading.tsx` as measured from the Forma reference
(`docs/FORMA_FINAL_FIDELITY_AUDIT.md` §4). Unifying on 42/600 would change an approved
Forma-reference decision; leaving it would keep two treatments for one role. The audit recommends
unifying on the Solutions values and keeping the Forma *layout* untouched, but this is the one
place where "preserve the Forma reference" and "match Solutions" genuinely conflict.

### P2 — Contrast over gradients is unmeasured

axe-core reports `color-contrast` as **incomplete** for 18 nodes on `/solutions` (15 on `/`). The
accent-on-stage text and the gradient headline cannot be evaluated by the rule. These are
incompletes, not passes, and must be closed by sampling rendered pixels before any colour token
changes.

### P3 — The `h3` role is overloaded

On `/solutions` the `h3` is a 12 px uppercase group label. On `/` the `h3` is a 17–23 px card
title. Both are correct in their own page; neither is a defect. Normalising their *appearance*
would be wrong. Normalising the number of distinct card-title sizes on each page is the
actionable part — see the site-wide audit.

## 8. Limits

- 320, 375, 768, 1024, 1200 widths were not swept for `/solutions` in this phase; only 1440 and
  390. Intermediate breakpoint behaviour is `[INFERRED]` from the `min-[810px]` / `min-[1200px]`
  utility values in the CSS.
- Dark theme token values were captured for the differing set; component-level dark rendering was
  not audited.
- No `prefers-reduced-motion` pass was run in this phase; the CSS guard exists in
  `landing.css` (`@media (prefers-reduced-motion: reduce)`) and is scheduled for Phase 6.
