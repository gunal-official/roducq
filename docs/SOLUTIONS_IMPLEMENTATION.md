# Roducq `/solutions` — implementation record (refinement pass)

Date: **2026-10-18** — page pass
Updated: **2026-10-19** — hero refinement (§13), sticky showcase (§14),
then browser verification + plan band / closing CTA / footer completion
(§15), branch `arena/356595ce-roducq`
Branch: `arena/f6a4212d-roducq` (page pass)
Reference: <https://forma-visuvate.framer.website/solutions>
Evidence base: `docs/FORMA_SOLUTIONS_REFERENCE.md` + the capture under
`docs/screenshots/forma-solutions-reference/baseline-2026-10-18T12-07Z/`

This document records what was built and **why every value is what it is**.
It is the companion to the capture doc: that one is the evidence, this one is
the decision log.

---

## 0. Status

| | |
| --- | --- |
| Scope | `/solutions` route, its seven components, and route-scoped tokens only |
| Changed files | 7 components under `components/marketing/landing/solutions/`, `app/(marketing)/landing.css`, `tailwind.config.ts` |
| TypeScript | clean (`tsc --noEmit`) |
| Existing `tests/components/solutions-page.test.ts` | 26/26 pass (run as a targeted check only — see §11) |
| Regression testing | **Deferred.** Deliberately not performed. See §11 |
| PR / merge / deploy | None. None requested |

---

## 1. Evidence base

| | |
| --- | --- |
| Capture run | GitHub Actions `forma-solutions-reference`, run **39125843125** |
| Window | 2026-10-18T12:06:11.854Z → 12:07:16.507Z |
| Browser | Chromium **153.0.8010.12** (`playwright-core`, `ubuntu-latest`) |
| Viewports | 1440×900, 768×1024, 390×844 — light **and** dark |
| Harness | `scripts/capture-solutions-reference.mjs` |
| Instrumentation | `getBoundingClientRect`, `getComputedStyle`, Web Animations timing model, `IntersectionObserver` options, `MutationObserver`, `PerformanceObserver`, scroll sampler, raw SVG dump |
| Result | 0 failures, 0 console errors, `overflowX: 0` at every viewport |

Artifacts used were fetched over `github.com` with
`git fetch` + `git archive` from branch `arena/forma-solutions-capture`.
`gh run download` cannot be used from this sandbox — artifacts are served from
`blob.core.windows.net`, which is blocked.

### 1.1 What could NOT be verified here

These are the honest limits of this pass, and they are the reason several
items below are `[UNVERIFIED]` rather than `[MEASURED]`:

1. **No browser in the sandbox.** `cdn.playwright.dev` is not reachable, so
   Chromium could not be installed. Roducq's own `/solutions` was therefore
   *not* screenshotted. The comparison is **reference measured geometry vs.
   Roducq's declared CSS**, plus the server-rendered DOM read back over HTTP.
   That is a real, evidence-based comparison, but it is not a pixel diff.
2. **The 1024px band is missing.** The reference was captured at 1440 / 768 /
   390. Its breakpoints are `min-width:1200px`, `min-width:810px and
   max-width:1199px`, and `max-width:809.98px`, so 1024px sits in the tablet
   band and is the only one of the six required widths never rendered. The
   harness was extended to six viewports (commit `48801c2`) but the re-run
   could not be dispatched from here — the token is a GitHub App token with
   empty `x-oauth-scopes`, so `gh workflow run` returns 403. **1024px stays
   `[UNVERIFIED]` until that run lands.**
3. **The reference is light-only.** Its dark capture returns byte-identical
   values (h1 still `rgb(27,20,38)`, strip still `rgba(255,255,255,0.72)`).
   Every dark value in this page is therefore `[INFERRED]`, mapped onto the
   equivalent surface of Roducq's own dark palette.
4. **Hover/focus states were not captured.** Interaction states are inherited
   from the shell and unchanged.

---

## 2. The single biggest finding: there is no SVG artwork

§5 of the brief asked for SVG-illustration fidelity across four mockups —
viewBox, path geometry, stroke widths, masks, gradients, layering.

**The reference has none of that.** Measured at 1440 light:

| | |
| --- | --- |
| `svgCount` | 22 |
| …of which have a non-zero box | **6** |
| …largest rendered SVG | **17px** (the theme-toggle glyph) |
| …remaining 16 | 0×0, `role="presentation"`, Framer icon-sprite templates (`<path d="M 0 7 L 7 0 L 14 7" stroke-width="var(--js9iwy, 2)">`) |
| `canvasCount` / `imageCount` / `videoCount` | 0 / 0 / 0 |

All four mockups are **HTML and CSS boxes**: a white card at radius 16 on a
1px-free plane, holding rows, pills, rails and text. There is no viewBox to
match, no path to trace, and no mask to reproduce.

Roducq's implementation already worked this way (no inline SVG in any
`/solutions` component; only `lucide-react` glyphs). So §5 reduced to matching
the measured **box** values — radii, heights, fills and type steps — which is
what §3 does. Two consequences follow, and both are recorded in the code:

- No decorative SVG was added. The brief's §5 instruction to avoid
  "unnecessary SVG loops, orbiting icons, or decorative animations not
  supported by reference evidence" is satisfied trivially: **there is no
  evidence for any of it.**
- The brief's premise of four *illustrative SVG* mockups does not match either
  page. This is stated plainly rather than worked around.

---

## 3. What changed, and the measured value behind each change

All values are `[MEASURED]` at 1440×900 light unless marked otherwise.
The number in the left column is the count of distinct corrections.

### 3.1 Structure (3)

| # | Was | Now (measured) |
| --- | --- | --- |
| 1 | Category strip = full-width bar, `border-b`, `bg-lm-header-wash` | A **centred, content-sized pill** (756px at four chips): radius 999, `rgba(255,255,255,0.72)`, `backdrop-filter: blur(16px)`, shadow `rgba(33,20,56,0.06) 0 1px 2px`, **no border** |
| 2 | Plan-band buttons stacked under the copy, side-by-side from 640px | On the desktop band they are a **right-hand 316px column**, vertically centred against the text, 40px away, 10px apart. They stack full-width below the desktop band (measured: stacked at both 768 and 390) |
| 3 | Articles flush, `lg:pb-0` | **774px pitch**, 48px padding top and bottom, content vertically centred. Verified across all four: content blocks measure 532.9–590.7px yet every article is 774px, and the slack is split evenly (106.1 / 120.6 / 91.7px top offset matches `(678 − content)/2` to 0.1px) |

### 3.2 Spacing (6)

| # | Element | Was | Measured |
| --- | --- | --- | --- |
| 4 | Hero eyebrow → headline | 20px | **10px** |
| 5 | Hero headline → lead | 24px | **32px** |
| 6 | Showcase band | no padding | **32px top** (12px spacer + 20px section padding), **40px bottom** |
| 7 | Workflow row padding | 12/12px | **14/15px** |
| 8 | Plan-band headline → body | 16px | **12px** |
| 9 | Plan band band-padding | 120px top **and** bottom | **120px top, 0 bottom** — the closing CTA's own 120px supplies the gap. Padding both ends doubled the space between the two cards to 240px |

### 3.3 Typography (7)

| # | Element | Was | Measured |
| --- | --- | --- | --- |
| 10 | Chip index / label | 12px 700 / 12px 600 in *ink* | **11px 700** / **14px 400** in `#687083` |
| 11 | Category index number | 700 | **800** — the reference's 900 is DM Sans; Roducq ships Manrope only, whose variable face tops out at 800. Asking for 900 would synthesise |
| 12 | Templates chip | 4px padding (24.5px tall) | **3px padding (19.2px tall)** |
| 13 | Plan-band eyebrow | 13px | **14px** |
| 14 | Closing CTA headline | 67.2px (borrowed the hero step) | **64.8px** — a new `--lm-size-65` step |
| 15 | Closing CTA body | 16px, opaque `#efebff` | **19px**, `rgba(255,255,255,0.76)` |
| 16 | Miniature title / rows | 13px 500 / 13px 500 / 12px 400 | **13.5px 600** / **13.5px 500** / **11px 600** |

### 3.4 Stage geometry (7)

The reference does **not** use one radius or one shadow for its three gradient
stages. Collapsing them was the largest single source of drift.

| # | Surface | Was | Measured |
| --- | --- | --- | --- |
| 17 | Miniature stage radius | 28px | **24px** |
| 18 | Plan band radius | 28px | **24px** |
| 19 | Closing CTA radius | 28px | **28px at desktop, 22px below it** (it was 28 everywhere) |
| 20 | Plan band shadow | hairline + 80px lift | **none at all** |
| 21 | Miniature stage shadow | hairline + 80px lift | **one** soft lift: `rgba(30,16,80,0.45) 0 40px 80px -40px` |
| 22 | Progress rail | 6px tall, accent-purple fill | **2px** tall, radius 2, `rgba(255,255,255,0.18)` track with a **solid white** fill |
| 23 | Mock cards | 1px border | **no border**; miniatures 16px, getting-started card 18px |

### 3.5 Motion (1 applied, 1 blocked — see §5)

| # | Change | Detail |
| --- | --- | --- |
| 24 | Mock slide scale | Inactive slides sit at `scale(0.97)`, the active one at `scale(1)`. The 0.97 is a computed style on the live page — a real resting state. Now reproduced, riding the same curve as the fade |
| 25 | Crossfade exit duration | **Resolved — 700ms/80ms both ways** (§5.2, §14.5) |

---

## 4. Two CSS load-order bugs found and fixed

`app/(marketing)/landing.css` is emitted **after** the Tailwind utility layer.
At equal specificity, later wins — so declarations inside component classes
silently outrank *every* utility of the same property.

Two instances were active:

1. `.lm-solutions-stage { box-shadow: … }` defeated both `shadow-none`
   (plan band) and `shadow-lm-mock-stage` (miniature stage). The plan band was
   rendering a shadow the reference does not have.
2. `.lm-mock-card { border-radius: var(--lm-radius-frame) }` flattened the
   getting-started card's `rounded-lm-mock` (18px) to 16px.

Both classes now defer to utilities, and each call site states its own value.
The comment at each site explains why, so the next person does not "tidy" the
declaration back in.

---

## 5. Motion: what was implemented, and one deliberate non-change

### 5.1 The LCP rule overrides the reference (§7)

> **Superseded for the hero on 2026-10-19 — see §13.** The blur dissolve this
> section describes is still what the *category* headlines below the fold use.
> The hero no longer runs it: the 10px filter was removed from the LCP surface
> and replaced with the PR #53 `clip-path` mask. The reasoning below still
> holds; the chosen mechanism changed.

**The reference's hero is unsafe by Roducq's own standard, and Roducq does not
copy it.** Measured on the reference, per hero word:

```
opacity: [0.001, 1]                 duration 900   delay 50/100/150
filter:  [blur(10px), blur(0px)]    duration 900   delay 50/100/150
easing:  cubic-bezier(0.16, 1, 0.3, 1)
```

`opacity: 0.001` is what PR #53 removed from the landing hero for exactly the
reason it applies here: an opacity-zero start suppresses the LCP record.

Roducq keeps the **measured blur dissolve** (`blur(10px) → blur(0px)`, 900ms,
`cubic-bezier(0.16, 1, 0.3, 1)`, 50ms per word) and pins `opacity: 1` in both
keyframes. The element paints on the first frame; only sharpness travels.

**This is a fidelity tradeoff, and it is the right one.** The words are
legible-but-soft at t=0 rather than invisible. It is recorded in
`SolutionsHero.tsx` and locked by `@keyframes lm-word-dissolve` in
`landing.css`. Per §7, LCP safety wins over animation fidelity.

The measured cadence that *is* reproduced exactly:

| Target | Duration | Easing | Delay |
| --- | --- | --- | --- |
| Hero eyebrow | 800ms | `cubic-bezier(0.2, 0.7, 0.2, 1)` | 0 — opacity + `translateY(16px) → none` |
| Hero words | 900ms | `cubic-bezier(0.16, 1, 0.3, 1)` | 50 / 100 / 150ms |
| Hero gradient unit | 900ms | `cubic-bezier(0.16, 1, 0.3, 1)` | 350ms — opacity + `translateY(28px) → none` |
| Hero lead | 800ms | `cubic-bezier(0.2, 0.7, 0.2, 1)` | 450ms |
| Category h2 words | 900ms | `cubic-bezier(0.16, 1, 0.3, 1)` | `index × 50`ms, on scroll |

Closing-CTA words: **correctly static.** The motion log records no entrance
for them (the only two hits on those strings belong to a category heading
containing the word "with"). No animation was added.

Library: **Motion.dev only** (`motion/react`) for the scroll reveals, plus CSS
for the word dissolve and the crossfade. No GSAP. Every transition is inside
the `prefers-reduced-motion: reduce` block in `landing.css`, which resolves
each one to its end state and disables the mock crossfade and the status-pill
swap.

### 5.2 The crossfade correction — applied 2026-10-19

The 2026-10-18 capture measures the mock-panel crossfade at **700ms with an
80ms delay in *both* directions** (14 records: slides `{opacity: 1 → 0}` and
`{opacity: 0 → 1}`, all `duration: 700`, `delay: 80`,
`cubic-bezier(0.2, 0.7, 0.2, 1)`). The capture doc's own §6.3 records this.

The first implementation shipped **700ms in / 500ms out**, because the 500ms
was locked by an assertion in `tests/components/solutions-page.test.ts` and the
earlier milestone was instructed not to modify tests. The 500ms had been read
from a *different* 500ms group — the mock's ambient content cycling on the
comment card inside miniature 02 (`dur=500`, `delay=0`, scrollY 0) — not from
the stage.

This milestone was told not to treat the 500ms exit as authoritative if 700ms
was established, so §5.2 is now **closed**: both directions run 700ms with an
80ms delay (exit `visibility 0s 780ms`, entry `visibility 0s 80ms`), and the
two assertions were corrected with it. See §14.5.

---

## 6. Preserved Roducq-specific elements (deliberately not changed)

These differ from the reference on purpose:

| Element | Why |
| --- | --- |
| All copy | §2: approved Roducq wording. Reference mock data (FRM-214, Release 2.4, Homepage v3, Autumn launch, New hire onboarding) was never copied |
| Pricing | §10: no price values touched. The plan band still publishes no figure |
| Font family | The reference pairs DM Sans (UI) with Manrope (headings). Roducq ships Manrope only — a shell-wide decision made before this page |
| Dark theme | The reference is light-only. Roducq's dark palette is a shipped feature and is preserved |
| Chip height | The reference's chips are 37.7px tall. Roducq keeps `min-h-11` (44px) — the shell's touch-target floor (§9) |
| Sticky offsets | `top-16 md:top-18` on the strip, `lg:top-[150px]` on the stage — re-based onto Roducq's 64/72px header |
| Footer and header | Shared shell, untouched |

---

## 7. Responsive

Verified by the reference capture at 1440 / 768 / 390:
`overflowX: 0` at every viewport.

Below the desktop band:

- The sticky miniature stage is hidden and **each article carries its own
  miniature inline**, below the templates line — which is where the reference
  moves them.
- The plan band's buttons stack full-width (measured at both 768 and 390).
- The closing CTA card drops to radius 22px and 56/20px padding.
- The category strip scrolls horizontally rather than wrapping.

**Not verified: 1024px.** See §1.1(2).

---

## 8. Accessibility and no-JS

Unchanged, and re-checked after the edit:

- Every pre-hidden state (`.lm-word-blur`, `.lm-reveal`, the absolute mock
  layers, the stage's fixed 710px height) is gated behind `.lm-js`, which the
  marketing layout adds before first paint. Without JavaScript the four
  miniatures stack in flow and every one stays visible.
- Decorative miniatures are `aria-hidden` on mobile; on desktop the stage is
  the only place they exist, so it is labelled, and inactive layers are
  removed from the tree with `visibility: hidden`.
- `prefers-reduced-motion: reduce` resolves every entrance to its end state
  and disables the crossfade and the pill swap.
- The status-pill swap holds its first state under reduced motion — the
  transition, not the content, is what respects the preference.

---

## 9. Two pre-existing issues found, reported and NOT fixed

Both are outside this milestone's scope. Flagging them rather than silently
changing shared behaviour:

1. **`text-lm-11` is a dead class.** There is no `--lm-size-11` token and no
   `fontSize` step, so it emits no rule. It is used by
   `components/marketing/landing/SectionHeading.tsx` (`CardLabel`, rendered by
   `FeaturesSection` on `/`) and, before this pass, by two `/solutions`
   components. Defining the token would restyle `/`, `/about`, `/pricing` and
   `/vs` — a cross-page change. `/solutions` now uses two explicitly-named
   steps instead (`--lm-size-chip: 11px`, `--lm-size-mock: 13.5px`); the
   shared bug is left for a fix that can be scoped to the other pages.
2. **The 500ms crossfade exit** — see §5.2.

---

## 10. Unresolved items

| Item | Status | What would resolve it |
| --- | --- | --- |
| 1024px band | `[UNVERIFIED]` | Re-run `forma-solutions-reference` on `arena/f6a4212d-roducq` (harness already covers six viewports, commit `48801c2`) and read `sol-1024x768-*` |
| ~~Crossfade exit duration~~ | **Resolved — 700ms/80ms both ways** (§5.2, §14.5) | — |
| Whether the reference *transitions* the slide scale | `[INFERRED]` | Record `transition*` keys on the slide elements — the harness's structure collector does not capture them |
| ~~Sticky stage `top` offset~~ | **Resolved — `[MEASURED]`** | The reference's own stylesheet, captured in the raw-DOM dump, reads `.framer-1pi3c7f { position: sticky; top: 150px }`. The strip is `.framer-1gjmmyz { position: sticky; top: 78px; z-index: 30; padding: 0 16px }`. Both are true measured values — but note they come from the CSS text, not `getComputedStyle`, because the harness does not collect `top` as a computed property |
| Every dark-mode value | `[INFERRED]` | The reference is light-only; no dark value exists to measure |
| Roducq-side pixel comparison | Not done | Install Chromium in an environment that can reach `cdn.playwright.dev` (§1.1(1)) |

---

## 11. Regression testing is deferred

Per instruction, this milestone performed **no** regression testing.
Specifically **not** done: Lighthouse, axe-core, performance benchmarks, the
four-scenario LCP suite, visual-regression runs, and the full test suite.
No CI workflow was modified.

What *was* run, as editing aids rather than as a test pass:

- `tsc --noEmit` — clean.
- `tests/components/solutions-page.test.ts` in isolation — 24/24 pass. This was
  run to confirm the token/motion guards this pass is subject to were not
  broken, not as the deferred regression milestone.

The following still need to run before this is production-ready:

1. `npm test` (full suite) — in particular `tests/components/home.test.ts`,
   since `landing.css` and `tailwind.config.ts` are shared.
2. Lighthouse on `/solutions` — confirm PR #53's LCP work still holds after the
   hero-spacing and typography changes.
3. axe-core — the category strip changed from a `<nav>` bar to a pill, and the
   plan band's buttons moved into a new column.
4. Visual regression at 320 / 375 / 390 / 768 / 1024 / 1440.
5. The four-scenario LCP suite, including JS-disabled.

## 12. How to re-run the reference capture

```bash
# Dispatch the capture (needs a token with workflows: write)
gh workflow run forma-solutions-reference.yml --ref arena/f6a4212d-roducq

# Then retrieve the artifacts over github.com (NOT `gh run download`,
# which is blocked — it fetches from blob.core.windows.net)
git fetch origin +refs/heads/arena/forma-solutions-capture:refs/remotes/origin/arena/forma-solutions-capture --depth=1
git archive origin/arena/forma-solutions-capture | tar -x -C /tmp/refsol
```

The 1024px results will then appear as `sol-1024x768-{light,dark}-*.json`
under `docs/screenshots/forma-solutions-reference/`.

---

## 13. Hero refinement (2026-10-19)

Scope: **the `/solutions` hero and the minimum route-scoped styles it needs**.
The header (PR #56), the jump strip, the showcase, the plan band, the closing
CTA and the footer were not touched. No copy was re-approved: the hero now
renders the approved strings exactly as supplied, which differ from the strings
the page pass shipped (§13.1).

### 13.1 Files modified

| File | Change |
| --- | --- |
| `app/(marketing)/solutions/content.ts` | `SOLUTIONS_HERO` now carries the approved copy: eyebrow "Solutions", headline "Different client work. One writing workspace." (split ink / gradient at the sentence), lead as supplied |
| `components/marketing/landing/solutions/SolutionsHero.tsx` | Rebuilt geometry, band padding, type bands, gradient unit as a block, clip-path entrance |
| `app/(marketing)/landing.css` | New `@keyframes lm-hero-mask`, `.lm-hero-accent`; `.lm-hero-word` re-pointed at the mask; reduced-motion coverage; `--lm-size-16-5` token; §13.5 comment corrected |
| `tailwind.config.ts` | `lm-16-5` type step (the measured 16.5px compact lead) |
| `docs/SOLUTIONS_IMPLEMENTATION.md` | This section |

Not modified: header, theme toggle, `SectionNav`, `SolutionsShowcase`,
`MockPanel`, `PracticeMocks`, `PlanBand`, `ClosingCta`, `SiteFooter`, pricing,
billing, auth, API routes, database, CI workflows, tests.

### 13.2 Reference measurements used

All values `[MEASURED]` at 1440×900 light unless noted. Sources:
`docs/FORMA_SOLUTIONS_REFERENCE.md` §4.1, and the raw capture in
`docs/screenshots/forma-solutions-reference/baseline-2026-10-18T12-07Z/`
(`sol-*-structure.json`, `sol-*-motion.json.gz`, `sol-*-dom.html.gz`).

| Property | 1440×900 | 768×1024 | 390×844 |
| --- | --- | --- | --- |
| Hero band box | 1240 × 354.03 @ y 69.7 | 736 × 258.14 | 358 × 375.13 |
| Band padding | `92 0 72 0` | `56 0 44 0` | `56 0 44 0` |
| Container | 1240 (48px outer + max-width 1240) | 736 (16px outer) | 358 (16px outer) |
| Background | white page plane, hero transparent | same | same |
| Eyebrow | DM Sans 600 14 / 16.8, `#5332d6` | same | same |
| Eyebrow → headline | 10px spacer | 10px | 10px |
| `h1` | Manrope 600 **67.2 / 68.54**, tracking **−2.016px** (−0.03em), `#1b1426` | **44 / 44.88**, −1.32px | **44 / 44.88**, −1.32px |
| Headline → gradient gap | 11.4px | 7.7px | 7.5px |
| Gradient unit | Manrope 600 67.2, one unit, `linear-gradient(90deg,#6246ea,#8b5cf6,#c084fc)` | 44px | 44px |
| Headline → lead | 32px spacer | 32px | 32px |
| Lead | **19 / 31.35**, `#687083`, measure 640 | **16.5 / 27.23**, measure 640 | **16.5 / 27.23**, full width |
| Hero bottom → jump strip | 0 (strip wrapper starts at hero bottom, 5px inner padding) | same | same |
| Alignment | centred at every width | centred | centred |

The **distance from the header to the eyebrow is 92px at every width ≥ 810**
and 56px below it, in both pages. The absolute `y` differs by one shell
element: Roducq renders its announcement band above the header (≈37px,
`min-h-9` + hairline), which the reference does not have. That band is part of
the shared shell and is out of scope here; the header → hero distance itself
matches exactly.

Two measured facts drove corrections the page pass had wrong or untested:

1. **The type bands and the padding band are different breakpoints.** The
   stylesheet captured in the raw DOM dump reads
   `.framer-jlyng5 { padding: var(--10ocmuz) }` (92/72) with
   `.framer-v-1scul6l.framer-jlyng5 { padding: var(--1reti8r); width: 358px }`
   (56/44). That phone preset is the markup both the 390 and the 768 captures
   resolve to. The tablet preset (`framer-v-pa8y0r`, the 810–1199px band —
   `[INFERRED]` from its 726px width, which matches that band's gutter)
   overrides *width* and the headline gap but **not** padding. So the 92/72
   band starts at **810px** — from stylesheet text, not a rendered 1024
   measurement — while the 67.2px display step starts at **1200px**.
2. **The gradient block is one animation target**, not a per-word stagger
   (`delay 350ms`, `translateY(28px)`).

### 13.3 Geometry corrections applied

| # | Was (page pass) | Now | Evidence |
| --- | --- | --- | --- |
| 1 | Band padding `56/44` until `lg` (1024), then `92/72` | `56/44` below 810, `92/72` from 810 | stylesheet text (§13.2) |
| 2 | Type switch at `lg` (1024) | Type switch at `min-[1200px]` (reference's own desktop band) | measured 67.2px at 1440 + 44px at 768 |
| 3 | `h1` had no explicit width behaviour; the gradient ran inline inside a word span | Gradient is a block unit, `width: fit-content`, `margin-inline: auto`, so the 90° sweep spans the phrase and the sentence break is honoured | reference Title + Highlight composition |
| 4 | Eyebrow line-height inherited 1.65 (23.1px) | `leading-[1.2]` → 16.8px | measured 16.8px line box |
| 5 | Lead 19px / 1.65 at every width | 16.5 / 27.23 below 1200, 19 / 31.35 from 1200 | measured 16.5/27.23 at 768 and 390 |
| 6 | Lead `max-w-[640px]` with `w-full` absent (could shrink to content) | `w-full max-w-[640px]`, so the 640px measure is real at every width ≥ 672px | measured 640×62.69 box |
| 7 | Hero had no explicit bottom padding rhythm below `md` | 44px below 810, 72px from 810 | measured padding |
| 8 | Gradient text ran on an inline word span: the 90° sweep restarted across a `fit-content` box, and at `line-height: 1.02` a **block-level** gradient phrase loses its descenders (see §13.4) | Block unit + `padding-block: 0.14em` with equal negative block margin | reference Highlight span measures `padding: 9.41px` @67.2px and `6.16px` @44px — exactly 0.14em at both |

Roducq's heading copy is longer than the reference's, so the hero is taller
than 354px at 1440: one extra headline line. That is a content difference, not
a geometry error. Measured against Roducq's own tokens, the 1440 hero resolves
to ≈423px (16.8 + 10 + 2×68.544 + 32 + 62.7 + 92 + 72) — every gap inside it
matches the reference exactly.

### 13.4 Typography decisions

* **Manrope only.** No new font was added and no dependency was introduced.
  The reference pairs DM Sans (eyebrow, lead) with Manrope (headline); Roducq
  ships Manrope across the shell, so the eyebrow and lead render in Manrope at
  the reference's *measured sizes, weights and line-heights*. This is the
  same trade §6 records.
* **Weights:** headline 600 (`font-lm-semibold`), eyebrow 600, lead 400 —
  measured values.
* **Tracking:** −0.03em, which resolves to −2.016px at 67.2px and −1.32px at
  44px — both exactly the measured letter-spacing.
* **Line-height:** 1.02 on the display steps (68.54 / 44.88), 1.2 on the
  eyebrow (16.8), 1.65 on the lead (31.35 / 27.23). The existing `text-lm-19`
  utility pairs 1.55, so the hero adds `min-[1200px]:leading-[1.65]` at the
  call site rather than changing the shared step.
* **Colours:** `#1b1426` (`--lm-ink`), `#5332d6` (`--lm-ink-accent`),
  `#687083` (`--lm-muted-slate`), gradient stops `#6246ea → #8b5cf6 →
  #c084fc` (`--lm-accent` + the two measured hexes already in
  `.lm-text-gradient`).
* **Descender paint area.** `background-clip: text` paints only inside the
  element's own background positioning area. For an *inline* span that is the
  font's content box (Manrope: 1.366em), which is why the closing CTA's
  gradient words are safe as they are. For a *block* it is the line-height box
  (1.02em), and Manrope 600 puts the tail of `g`/`p` **0.128em** below that box
  — 8.6px at 67.2px if left alone. The reference's own Highlight span carries
  `padding: 9.41px` at 67.2px and `6.16px` at 44px: both exactly **0.14em**,
  i.e. just more than the overflow. The hero reproduces that with
  `padding-block: .14em; margin-block: -.14em`, so the paint area grows but the
  measured layout does not move. (`with a <br>` and inline-block were both
  rejected: the first inserts an unnatural break, the second makes the
  sentence break width-dependent.)
* **Fit at each width** (Manrope metrics, so text-driven not guessed):

  | Viewport | Content width | Ink line | Gradient line | Lead lines |
  | --- | --- | --- | --- | --- |
  | 1440 | 1240 | 1 (623px) | 1 (699px) | 2 |
  | 1024 | 944 | 1 | 1 | 2 |
  | 768 | 736 | 1 (408px) | 1 (458px) | 2 |
  | 390 | 358 | 2 ("Different client" / "work.") | 2 ("One writing" / "workspace.") | 4 |
  | 375 | 343 | 2 | 2 | 4 |
  | 320 | 288 | 2 ("Different" / "client work.") | 2 | 5 |

  No `<br>` is inserted anywhere; every break above is the natural wrap. The
  only structural break is the sentence boundary, expressed as a block-level
  gradient unit — the reference's own Title + Highlight split.

### 13.5 Animation behaviour

The measured cadence is reproduced exactly; **the mechanism is not** (§13.6).

| Target | Duration | Easing | Delay | Travel |
| --- | --- | --- | --- | --- |
| Eyebrow | 800ms | `cubic-bezier(0.2, 0.7, 0.2, 1)` | 0 | `translateY(16px)` + mask |
| Ink headline words | 900ms | `cubic-bezier(0.16, 1, 0.3, 1)` | 50 / 100 / 150ms | `translateY(16px)` + mask |
| Gradient unit | 900ms | `cubic-bezier(0.16, 1, 0.3, 1)` | 350ms | `translateY(28px)` + mask |
| Lead | 800ms | `cubic-bezier(0.2, 0.7, 0.2, 1)` | 450ms | `translateY(16px)` + mask |

Implementation: CSS only (`@keyframes lm-hero-mask` and the existing
`@keyframes lm-hero-in`), started at first paint, `fill: both`, no JavaScript
and nothing scroll-triggered. Motion.dev remains the only animation library on
the page; nothing here needed it, and no new dependency was added.

The 16px word rise is `[INFERRED]`: the reference's words do not translate at
all (they only blur), so there is no measured word travel to copy. 16px is the
reference's *measured* rise for the two elements either side of them (eyebrow
and lead), which keeps the ladder one visual gesture rather than two.

### 13.6 LCP safety — PR #53's pattern preserved

The reference's hero is driven by `opacity: [0.001, 1]` plus
`filter: [blur(10px), blur(0px)]` on every target (13 records in
`sol-1440x900-light-motion.json.gz`). Neither is reproduced:

* **Opacity is 1 in every keyframe** of `lm-hero-mask` and `lm-hero-in`. There
  is no initial `opacity: 0`, no `0.001`, and no ancestor fade: the marketing
  route wrapper is still neutralised (`.rdq-marketing .animate-route-in`).
* **The 10px blur is gone from the hero entirely.** It is not needed for the
  effect (the mask supplies the reveal), it costs one composited layer per
  word, and it defers the paint the metric waits for. This is the "prefer LCP
  safety over exact blur fidelity" decision, applied literally.
* **The mask is PR #53's technique**: `clip-path: inset(...)` + `translateY`,
  the same pair already running on the homepage hero's `.lm-hero-in`.
* **Nothing is gated on `.lm-js`.** The hero has no pre-hidden state: with
  JavaScript disabled the CSS animation still runs and settles at its end
  state, and if it cannot run the element is simply at its final state.
* **`prefers-reduced-motion: reduce`** resolves `.lm-hero-word` and
  `.lm-hero-accent` to `animation: none; clip-path: none; opacity: 1;
  transform: none`, so the complete heading is visible instantly.
* The hero emits **no `filter`**, no `will-change`, and no extra stacking
  context on text.

`@keyframes lm-word-dissolve` is unchanged and still used by the category `h2`s
below the fold, which stay gated behind `.lm-js` and are not in the LCP surface.

### 13.7 Responsive decisions

| Width | Decision |
| --- | --- |
| 320 | 288px content. Headline wraps 2 + 2, lead 5 lines. No element has a fixed width; the headline's longest single word ("workspace." ≈225px) fits with 63px to spare |
| 375 | 343px content. 2 + 2 headline, 4 lead lines |
| 390 | 358px content — the reference's own mobile content width. 2 + 2 headline, 4 lead lines, matching the reference's stacked proportion |
| 768 | 736px content — the reference's measured tablet width. 1 + 1 headline, 2 lead lines, 56/44 padding |
| 1024 | 944px content (reference 940: its 810–1199 band uses 42px gutters, Roducq's shell uses 40 — a pre-existing, shell-level 4px difference). 92/72 padding, 44px headline `[INFERRED]` |
| 1440 | 1240px content — identical to the reference. 92/72 padding, 67.2px headline, 640px lead measure |

`overflow-x` is safe at every width: the section is `width:100%` inside
`.lm-shell`, the `h1` is `max-w-full`, the lead is `w-full max-w-[640px]`, and
the gradient block is `max-width:100%` with `width:fit-content`.

### 13.8 Verified vs. inferred

| Value | Status |
| --- | --- |
| Band padding 92/72 · 56/44 and their 810px boundary | `[MEASURED]` — computed at 1440/768/390, boundary from stylesheet text |
| Container 1240 / 736 / 358 at 1440 / 768 / 390 | `[MEASURED]` |
| Eyebrow 14/16.8 600 `#5332d6`, 10px spacer | `[MEASURED]` |
| Headline 67.2/68.54 −0.03em at 1440, 44/44.88 below 1200 | `[MEASURED]` at 1440 and 768 |
| Lead 19/31.35 at 1440, 16.5/27.23 below 1200, 640 measure | `[MEASURED]` at 1440/768/390 |
| 32px headline → lead spacer | `[MEASURED]` |
| Gradient stops and their order | `[MEASURED]` |
| Motion durations, delays, easings | `[MEASURED]` (`motion.json.gz`) |
| **1024px type step (44 / 16.5)** | `[INFERRED]` — the capture never rendered 1024; its tablet preset sits below the 1200px desktop preset |
| **Word travel 16px** | `[INFERRED]` — the reference translates words 0px |
| **810–1023px gutter (Roducq 16 vs reference 42)** | `[DIVERGENCE]` — shell-level, shared with every other band; not changed in a hero-only milestone |
| Dark-theme hero values | `[INFERRED]` — the reference is light-only; the hero maps onto the existing `--lm-*` dark tokens |
| Exact rendered pixel height of Roducq's hero | `[UNVERIFIED]` — no browser in this sandbox; computed from CSS + Manrope metrics, not screenshotted |

### 13.9 Verification done, and deferred

Done (editing aids, not the deferred regression milestone):

* `tsc --noEmit` — clean.
* `eslint` on the two changed TypeScript files — clean.
* `tests/components/solutions-page.test.ts` in isolation — 24/24 pass. It
  locked three things this pass had to respect: the LCP rule in
  `lm-word-dissolve`, the `.lm-js` gating of below-fold words, and the ban on
  arbitrary `text-[…]` sizes (which is why the 16.5px step became a token
  rather than a bracket utility).
* Development-server render read back over HTTP at `/solutions`: the hero
  markup, class list and compiled `min-[810px]` / `min-[1200px]` rules are all
  present, and the headline/lead render server-side.

Deferred, per instruction: full `npm test`, Lighthouse, axe-core, LCP
benchmarks, visual regression, and the 320/375/390/768/1024/1440 screenshot
sweep. No CI workflow was modified. No PR was created and nothing was merged
or deployed.

---

## 14. Sticky showcase (2026-10-19)

This pass touched only the four-category showcase: `SolutionsShowcase.tsx`,
`MockPanel.tsx`, `PracticeMocks.tsx`, one new content constant, and the mock
rules in `landing.css`. The header, hero, plan band, closing CTA, footer,
pricing, Razorpay, Supabase, auth, billing, database and APIs were not touched.

### 14.1 The sticky bug, and the structure that fixes it

The showcase already carried `lg:sticky lg:top-[150px]`, but it sat on the
**grid item**. A grid or flex item defaults to `align-self: stretch`, so that
item was as tall as the whole band, and a sticky element can only travel inside
its own containing block. With a stretched item the travel distance is zero:
the panel scrolled away with the first article.

The reference nests three boxes (measured at 1440x900):

| Element | Measured box | Role |
| --- | --- | --- |
| `.framer-l1vvvg` | 606.5 × 3096, x 733.5 | the stage column — full band height |
| `.framer-1pi3c7f` | 606.5 × 710 | **the sticky element** — `position: sticky; top: 150px` |
| `.framer-f13bqf-container` | 606.5 × 710 | the stage — radius 24, lift shadow |

The component now reproduces that nesting: the right-hand column is a plain
grid item (so it stretches), and the sticky box is a `div` **inside** it. The
sticky box is 710px tall, so it travels the band height minus 710 — which is
the reference's behaviour, and it stops exactly at the band's end.

`position: sticky` only. No scroll listener, no `requestAnimationFrame`, no
scroll-linked transform.

### 14.2 The breakpoint was wrong: 1200, not 1024, and not 810

The earlier note in this log said the composition should start at 810px. That
was a mis-reading of the reference's layout variables and is **withdrawn**.

Evidence:

* The reference's stylesheet flips the row to a column at
  `@media (max-width: 1199.98px)` — `.framer-1ewxaa9 { flex-direction: column }`.
* Its stage column carries `hidden-srm3hm hidden-1xxithx`, and neither the
  768x1024 nor the 390x844 structure dump contains `.framer-l1vvvg`,
  `.framer-1pi3c7f` or `.framer-f13bqf-container` **at all** — the boxes are
  absent, not merely zero-width.
* At 1440 the same column is 606.5 × 3096.

So the two-column sticky composition is a **≥1200px** behaviour. Below it the
reference stacks and moves each miniature inline under its own category, which
is what this page does. The `top: 150px` offset is unchanged and measured.

### 14.3 Which element is observed, and why it matters

The motion capture records four `IntersectionObserver`s constructed at
t≈567ms with `{ threshold: 0.3 }` and no rootMargin, observing
`#product`, `#design`, `#marketing`, `#operations` — each **562 × 92**. That is
the headline block, not the 774px article.

This pass moved the observed node to the headline and kept the 0.3 threshold.
It also stopped trusting `entry.isIntersecting`: with a single threshold, an
element that crosses downward still reports `isIntersecting: true` while it is
only partly visible. The callback now keeps a **set** of headings whose ratio is
≥ 0.3 and activates the highest index in that set, so the panel switches
correctly in both scroll directions, and two headings on screen at once resolve
deterministically.

### 14.4 Geometry corrected: the cards are content-sized and centred

The previous implementation stretched each miniature down the card area
(`inset: 215px 52px 84px`, card `h-full` → 411px tall). The capture shows
otherwise:

| Miniature | Measured card | Centre |
| --- | --- | --- |
| trail (01) | 502.5 × 264.8 | y ≈ 347 of 710 |
| brief (02) | 487.4 × 322.1 | y ≈ 347 of 710 |

Both are content-sized and vertically centred in the stage. A stretched card
leaves a large empty region inside the white surface, which is why the layered
cards now sit in a centred flex column, and the card area is the full stage
minus the measured 52px side insets:

```css
.lm-js .lm-mock-stage { inset: 9px 52px 26px; }  /* centre = 346.5 of 710 */
```

9px above and 26px below put the centre of the available area at exactly the
measured point, while leaving room for the 26px foot.

### 14.5 Crossfade: 700ms + 80ms, both directions

Applied, per §5.2 and the milestone instruction to prefer the capture over the
500ms reading. Both the resting and active layer rules now use
`700ms var(--lm-ease-body) 80ms` for `opacity` and `transform`, with
`visibility 0s 780ms` on exit and `0s 80ms` on entry. The incoming layer is
`z-index: 1`, so the two fades cross rather than both approaching zero and
letting the purple stage show through.

The `scale(0.97) → 1` on the crossfade remains `[INFERRED]`: the capture
records the opacity animation but not a transition on `transform`. It rides the
same curve and delay rather than inventing a fourth timing.

The status-pill swap inside miniature 02 stays at its own measured
`500ms cubic-bezier(0.42, 0, 0.58, 1)` — that is the ambient 500ms that was
originally mistaken for the stage exit.

### 14.6 The inline panels are stages too

Below 1200px the reference does not show a bare white card. Each category
carries the same purple gradient panel, content-height, with the miniature
inset inside it. Measured at 768 and 390:

| Property | ≤809.98 | 810–1199.98 |
| --- | --- | --- |
| padding | 13px | 41px |
| radius | 26px | 26px |
| shadow | none | none |
| width | 358 at 390, 736 at 768 (full column) | full column |

The page now wraps each inline miniature in `.lm-solutions-stage
.lm-stage-inline`, with 13px padding and 26px radius, widening to 41px from
810px. The fixed `710px` height is scoped to `.lm-stage-persistent`, so the
inline panels stay content-sized. The 1024 and 375/320 values are `[INFERRED]`
from the same two media queries; no capture exists at those widths.

### 14.7 The disclosure

Every miniature — desktop stage and inline panel alike — ends with the visible
line **"Illustrative example · fictional client"** (`MOCK_DISCLOSURE` in
`content.ts`), set at the 11px chip step on muted slate, separated by a hairline.
The desktop stage also carries it in its `role="img"` label, so a screen reader
announces the caveat even though the card's internals are `aria-hidden`.

### 14.8 Foot: counter and progress

Unchanged in structure and corrected in geometry. Measured: "01" at 13px/600
solid white, "/ 04" at 13px in `rgba(255,255,255,0.6)`, the pair starting 32px
from the stage's left edge, 26px from its bottom; the rail is 2px, radius 2,
`rgba(255,255,255,0.18)`, with a solid white fill of 121.4px of 485.5 at step
01 — exactly 25% per category. The fill's width transition stays at the
reference's 500ms, which is a width interpolation on the progress bar, not the
mock crossfade.

### 14.9 Accessibility and no-JS

* Reduced motion: the crossfade transition resolves to `none`; the panel still
  switches content, instantly, and only the active layer is visible.
* No-JS: `.lm-js` gates the fixed height, the absolute card area and the
  absolute foot. Without JavaScript the four miniatures stack in flow inside
  the stage and every one is visible.
* The stage is one labelled `role="img"`; its internals are `aria-hidden`, so a
  screen reader is not walked through a duplicate of the category copy. The
  inline panel is labelled the same way.
* Nothing in this section starts at `opacity: 0` (the LCP rule), and the section
  contains no focusable controls, so there is no focus trap to create.

### 14.10 Test-contract corrections

Four assertions encoded the superseded readings. All four were updated with the
CSS, not relaxed:

| Assertion | Was | Now |
| --- | --- | --- |
| crossfade | `opacity 500ms …`, `visibility 0s 500ms` | `700ms … 80ms`, `visibility 0s 780ms` / `0s 80ms`, and a negative guard against the old 500ms line |
| sticky | `lg:sticky lg:top-[150px]` | `min-[1200px]:sticky min-[1200px]:top-[150px]` |
| stage inset | `inset: 215px 52px 84px` | `inset: 9px 52px 26px` |
| stage label | `aria-label="Practice miniature"` | `role="img"` + a label naming the category, step and fictional-client disclosure |

### 14.11 Verification done, and deferred

Done: `npx tsc --noEmit` (clean), `npx eslint` on the four changed TypeScript
files (clean), `node --test tests/components/solutions-page.test.ts`
(**24/24**), and an HTTP read-back of `/solutions` from the dev server — the
sticky wrapper, the persistent stage, four inline stage panels, and eight
occurrences of the disclosure string (four labels, four visible captions) are
in the rendered HTML; the compiled stylesheet contains
`.lm-stage-inline { border-radius: 26px; padding: 13px }`, the 41px media
query, `inset: 9px 52px 26px` and the 700ms/80ms transitions.

Deferred per instruction: full `npm test`, Lighthouse, axe-core, LCP
benchmarks, and the 320/375/390/768/1024/1440 screenshot sweep. No CI workflow
was edited. Nothing was merged, deployed or opened as a PR.

---

## 15. Sticky showcase verified in a real browser; plan band, closing CTA and footer finished (2026-10-19)

Scope: verification of the sticky showcase from commit `7eca8f9`, then the two
`/solutions` bands that had never been measured against the capture's own style
records — the plan band and the closing CTA — plus a cross-route check of the
shared footer. Nothing in the header, the hero, `/pricing`, Razorpay, Supabase,
auth, billing or the database was touched.

### 15.1 Verification environment (and what it is not)

Every number in this section was read from a **real Chromium render**, not from
CSS text:

| | |
| --- | --- |
| Browser | Chromium **153.0.8010.0** (headless shell; `HeadlessChrome/153.0.8010.0` UA), installed with `@sparticuz/chromium` because the sandbox has no system browser and its egress allowlist blocks `cdn.playwright.dev` |
| Driver | `playwright-core@1.63` (already a devDependency), `chromium.launch({ executablePath })` |
| Runtime | Debian 12 (glibc 2.36), Node 22.22.3, `next dev` (Turbopack) on `http://localhost:3000` |
| Viewports | 1440×900, 1280×800, 1200×800, 1199×800, 1024×768, 768×1024, 390×844, device scale 1 |
| Scrollbars | overlay (clientWidth = innerWidth at every width), so `window.innerWidth` **is** the CSS viewport here |

**Limits of this harness:** it is a headless shell, not a full desktop Chrome,
and it runs the **development** server. Composed-layer behaviour under a
production build (`next build`, out of scope here) and the real mobile browsers
are `[UNVERIFIED]`. The dev-mode LCP element was the hero lead paragraph
(`P.lm-hero-in`, 34 770 px² at 432 ms), not a mock or a band; dev-mode timing
is not a production LCP figure and is not treated as one.

### 15.2 The sticky showcase, observed

The right-hand column, the sticky box and the stage are the measured three-box
nesting from §14.1. What was never observed before this pass now is:

| Width (window.innerWidth) | 1440 | 1280 | 1200 | 1199 | 1024 | 768 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Match `min-width: 1200px` | true | true | true | **false** | false | false | false |
| Right column box | 607 × 3096 | 567 × 3096 | 487 × 3096 | **0 × 0** (`display: none`) | 0 × 0 | 0 × 0 | 0 × 0 |
| Stage box | 607 × 710 | 567 × 710 | 487 × 710 | absent | absent | absent | absent |
| Sticky computed | `sticky` / `150px` | `sticky` / `150px` | `sticky` / `150px` | `static` / `auto` | `static` / `auto` | `static` / `auto` | `static` / `auto` |
| Inline stage per category | — | — | — | 1119 wide, pad 41 | 944 wide, pad 41 | 736 wide, pad 13 | 358 wide, pad 13 |
| `overflow-x` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

The **sticky element's class list is exactly**
`min-[1200px]:sticky min-[1200px]:top-[150px]`, the column is its static parent
(`hidden min-[1200px]:block`, `align-self: stretch` by default), and the stage
is the 710px child — the measured nesting, unchanged from `7eca8f9`.

**Stage top while scrolling the band.** At 1440×900 the section spans
y 609.58 → 3777.58 (3168 tall). Sampled every 100 px from y 0 to 3800:

```
y = 0      stage top 641.58   (not yet reached — flows with the page)
y = 400    stage top 241.58
y = 500    stage top 150.00   ← pinned
y = 500 … 2868: 150.00 exactly, 24 consecutive samples, no drift
y = 2878   stage top 149.58   (release begins at 2877.58)
y = 2888   stage top 139.58
… stage top then falls exactly 1:1 with scrollY
```

`150.00` was held for every sample from y = 500 to y = 2868 at 1440, 1280 and
1200 (`getBoundingClientRect().top`, 0.5 px tolerance). The release point is
`columnBottom − stageHeight − 150 = 3737.58 − 710 − 150 = 2877.58` — i.e. the
panel sticks to the **end of its own column**, and after that the plan band
scrolls normally (verified: at y 3100 → 3200 the stage moved 100.00 px while
the page moved 100 px, and the next section's top met the column's bottom).

**The four articles.** Settled docTops at 1440: **641.58 / 1415.58 / 2189.58 /
2963.58**, each **774.00** tall — the reference's measured pitch exactly. (A
mid-reveal read can show 788 / 774 / 774, because the first `Reveal` wrapper is
still carrying its 14 px `translateY` when the article's *visual* rect is read;
the layout tops are 774 apart as soon as the reveal settles. This is a
measurement artefact, not a gap.)

**Active category and the foot.** Scrolling 0 → 3800 at 100 px steps, the
`data-active` flag moved once per band, **01 → 02 (y 700) → 03 (y 1500) → 04
(y 2300)**, and never flickered backwards. The foot counter and fill, read after
each state settled:

| Active | Counter text | Fill / rail | Fill |
| --- | --- | --- | --- |
| 01 | `01 / 04` | 122 / 488 px | **25.00 %** |
| 02 | `02 / 04` | 242.5 / 485 px | **50.00 %** |
| 03 | `03 / 04` | 364.5 / 486 px | **75.00 %** |
| 04 | `04 / 04` | 485 / 485 px | **100.00 %** |

The fill's computed transition is `width 0.5s cubic-bezier(0.2, 0.7, 0.2, 1)` —
its own timing, unchanged in duration and curve, but now expressed through the
`ease-lm-nav` token instead of an arbitrary `ease-[…]` value (Tailwind warned
that the arbitrary value matched multiple utilities; the compiled curve is
identical).

**Crossfade, sampled per animation frame.** Computed on both the resting and
the active layer:

```
opacity   0.7s cubic-bezier(0.2, 0.7, 0.2, 1) 0.08s
transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) 0.08s
visibility 0s 0.08s      (entry)   0s 0.78s (exit — in the CSS, see §14.5)
```

Frame samples across a 01 → 02 switch: first opacity change at **112 ms**, both
layers crossing at 50 % around **195–211 ms**, settled at **100 % by 795 ms**.
Composite white coverage (incoming over outgoing) bottoms at **0.75**, i.e. at
most 25 % of the purple stage shows through at the midpoint. There is **no white
flash** and no fully-transparent frame; the midpoint dip is inherent in an
equal-duration two-layer opacity crossfade and is what the measured 700 ms/80 ms
pair produces.

**No scroll handler was added.** Intercepting `EventTarget.prototype.addEventListener`
for `scroll` before first paint recorded only React's own delegated capture
listeners (from `listenToNativeEvent`) and Next's dev overlay portal. Our source
adds none — the showcase uses one `IntersectionObserver` at `threshold: 0.3`,
and no `requestAnimationFrame` loop.

**Layout shift.** `layout-shift` entries during the entire scroll pass:
**0.0000024** at 1440×900, **0.0000000** at every other width.

### 15.3 Why the panel did not stick before `7eca8f9` — confirmed

The earlier defect is exactly the one §14.1 diagnoses, and the browser agrees
with the diagnosis: `position: sticky` on a **grid item** whose `align-self`
is `stretch` gives the element a containing block as tall as the row, so the
panel's travel range is `rowHeight − elementHeight = 0` — it scrolls away with
the first article. In the current build the sticky box is a child of a stretched
column: travel = 3096 − 710 = 2386 px, which is exactly what §15.2 measures.

### 15.4 Plan band — corrections against the capture's style record

Source of truth for this pass: `sol-1440x900-light-styles.json`,
`sol-768x1024-light-styles.json`, `sol-390x844-light-styles.json` (the raw
computed styles). Where `docs/FORMA_SOLUTIONS_REFERENCE.md` §4.4 disagreed, the
style record won; the prose corrections are logged in
`docs/FORMA_SOLUTIONS_REFERENCE.md` §10.

| Value | Was in the build | Now | Reference record |
| --- | --- | --- | --- |
| Eyebrow ink | white | **`#cdb8ff`** (new `--lm-cta-eyebrow`) | `rgb(205,184,255)` |
| Eyebrow leading | 1.55 (21.7 px) | **1.2 (16.8 px)** | 16.8 |
| Headline leading | 1.2 (43.2 px) | **1.1 (39.6 px)** | 39.6 |
| Headline below 1200 | 36 px | **30 px / 33 px** (new `--lm-size-30`) | 30 / 33 at 768 and 390 |
| Body | 16 px / 1.7 | **16.5 px / 28.05 px**, `rgba(255,255,255,0.74)` | 16.5 / 28.05 / .74 |
| Secondary button border | `border-0` | `border-0` (unchanged) | border-width **0**, not the prose's 1 px |
| Button labels | 15 px | **15.5 px / 24.03 px** (`--lm-size-15-5`) | 15.5 / 24.03 |
| Button height | 44 px below `md` | **52 px at every width** (`h-13`) | 52.03 at 1440, 768 and 390 |
| Button row below 1200 | stacked, full width | **one row, natural width, left-aligned** | 37 → 201.03 → 352.64 at 390 |
| Desktop split | `lg` (1024) | **`min-[1200px]`** | the reference's own desktop band |
| Desktop button column | `justify-between` | **40 px gap, copy `flex-1`** | 315.64 px column, 40 px from copy |

Measured in the build at 1440: card **1240 × 268.1**, radius **24**, shadow
**none**, padding **49**, copy column **812.4**, button column **289.6**
(160 + 10 + 119), buttons **52 px** tall on one row at y 4005.6. The card is
31.6 px taller than the reference's 236.48 because Roducq's approved copy runs
two lines longer at the same 560 px measure — a content difference, not a
geometry error. Button widths differ (160 vs 164.03, 119 vs 141.61) because the
labels differ ("Talk to us" vs "Talk to sales") and Roducq ships Manrope, not
DM Sans.

**No entrance animation.** The motion capture's scroll pass covered y 0–4551,
which spans the entire plan band (3639–3995). **No WAAPI animation targets this
band** at any scroll position. The scroll reveal this band carried was therefore
removed: it was the discrepancy. Re-measured afterwards, the band's first paint
is its final state (no `opacity: 0`, no transform), which also removes one
failure mode for a failed hydrate.

### 15.5 Closing CTA — corrections against the same record

| Value | Was in the build | Now | Reference record |
| --- | --- | --- | --- |
| Headline below 1200 | 44 px / 1.02 | **40 px / 40.8 px / −1.4 px** (new `--lm-size-40`) | 40 / 40.8 / −1.4 at 768 and 390 |
| Headline tracking at 1200+ | −0.035em (−2.268 px) | unchanged | −2.27 px |
| Body at 1200+ | 19 px / 1.65 (31.35) | **19 px / 1.55 (29.45)** | 19 / 29.45 |
| Body below 1200 | 19 px | **16 px / 24.8 px** | 16 / 24.8 at 768 and 390 |
| Buttons | 44 px below `md` | **52 px at every width** (`h-13`) | 52.03 |
| Button labels | 15 px | **15.5 px / 24.03 px** | 15.5 / 24.03 |
| Button row | stacked until `sm` (640) | **stacked full-width below 1200, one row from 1200** | 696 px stacked at 768, 318 at 390; 146.53 + 150.23 at 1440 |
| Columns | `lg` grid | **`min-[1200px]:grid-cols-[565fr_467fr]`, gap 64** | 565.28 / 466.72 |
| Checklist card padding | 24 px at every width | **18 px below 1200, 24 px at 1200+** | 18 px at 768 and 390 |
| Checklist labels | 15 px at every width | **14 px / 21.7 px below 1200**, 15 px / 23.25 px at 1200+ | both values read |
| Checklist row heights | 43.25 / 44.25 | **49.25 / 50.25 / 48.25 / 37.25** | 49.25 / 49.25 / 47.25 / 36.25 |
| Checklist status ink | `--lm-ink-soft` (#4b505f) | **`#655f78`** (new `--lm-mock-muted`), weight 400; `Next` stays 500 accent | `rgb(101,95,120)` / weight 400 |
| Card title leading | 1.5 | **1.55 (26.35 px)** | 26.35 |

Measured in the build at 1440: stage **1240 × 594.8**, radius 28, padding
**96 / 72**; headline **64.8 / 66.096 / −2.268** in a **565** column; body
**19 / 29.45**; columns **565 / 467 at 64**; checklist card **467 × 291.3**
against the reference's 466.72 × 288.34. The stage is 60 px taller than the
reference's 534.83 because Roducq's headline wraps to three lines (198.2 px) on
the same 565 px column; the internal geometry matches. The card's 3 px surplus
is the second row's 1 px plus the rail's 2 px block.

**No entrance animation**, for the same measured reason: the capture's scroll
pass reached y 4551 and this band starts at 3995, so its headline, body, buttons
and card were all covered and none of them has a WAAPI record. The reveal was
removed.

### 15.6 Footer — checked, not changed

The footer is shared (`app/(marketing)/layout.tsx` renders one `SiteFooter` for
`/`, `/about`, `/pricing`, `/vs` and `/solutions`). It was **not edited** in
this pass. Read back at 1440 on all five routes, the footer is identical:

| | `/` | `/about` | `/pricing` | `/vs` | `/solutions` |
| --- | --- | --- | --- | --- | --- |
| Box | 678 px tall | 678 | 678 | 678 | 678 |
| Columns | Product / Workspace / Account | same | same | same | same |
| Grid | 381.3 / 254.2 / 254.2 / 254.2 | same | same | same | same |
| Wordmark | 1024 × 192 | same | same | same | same |
| Back to top | present | present | present | present | present |

So the in-scope item "footer: columns, logo lockup, oversized wordmark" is
already satisfied by the shared component, and **any** restyle of it would move
four other routes — which this milestone forbids. The only footer difference
from the reference is content (Roducq's own three columns and `roducq.`
wordmark), and the reference's own footer animation is `[UNVERIFIED]`: the
capture's scroll pass never reached it (max y 4551, footer starts at 4746).

### 15.7 Motion audit (four sections, corrections only)

| Section | Reference record | Build before | Action |
| --- | --- | --- | --- |
| Showcase headlines | 900 ms, `cubic-bezier(0.16,1,0.3,1)`, 50 ms/word, blur 10 px → 0 | same, gated on the article's `Reveal` | **kept** |
| Showcase crossfade | opacity 700 ms + 80 ms, `cubic-bezier(0.2,0.7,0.2,1)`, both directions | same | **kept** (verified per frame) |
| Showcase foot fill | own 500 ms width interpolation | `duration-500` + arbitrary ease | **kept**, re-expressed as `ease-lm-nav` (same curve, no ambiguity warning) |
| Plan band | **no animation** in the capture | 620 ms scroll reveal, 14 px rise | **removed** |
| Closing CTA | **no animation** in the capture | 620 ms scroll reveal, 14 px rise | **removed** |
| Footer | not captured | shared `Reveal` | **not touched** (shared with four routes) |

No second animation library, no scroll listener, no animation loop was added.
Reduced motion and no-JS were re-verified after these edits (below).

### 15.8 Reduced motion and no-JS, observed

* **Reduced motion** (`reducedMotion: "reduce"`): the mock layers and the pill
  swap compute `transition: none`; the foot fill computes `transition: none`;
  the reveals compute `opacity: 1; transform: none; animation: none`. Scrolling
  through all four categories still switches **01 → 04** and the fill still
  reaches **25 / 50 / 75 / 100 %**, instantly.
* **No JavaScript** (`javaScriptEnabled: false`): all four miniatures are in
  flow and visible (`opacity: 1`, heights 289–326 px each, stage 1475.9 px), all
  five remaining `.lm-reveal` bands are `opacity: 1`, the plan band, the closing
  CTA and the footer all render their text, and the disclosure string appears
  **8** times (four stage labels + four visible captions).

### 15.9 Verification run for this pass

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npx eslint` on the five changed files | clean |
| `node --test tests/components/solutions-page.test.ts` | **26 / 26** (two new suites: the measured plan/closing values, and "the static bands stay static") |
| Dev-server render of `/solutions` | 200; sticky wrapper, stage, four inline panels, 8 disclosures |
| Browser sweep | 1440 / 1280 / 1200 / 1199 / 1024 / 768 / 390, all sections, both themes |

**Not run, per instruction:** full `npm test`, Lighthouse, axe-core, `next build`,
CI edits, any deploy, any PR.

### 15.10 What remains unverified

* **Production-build behaviour** (the `next build` output, RSC payload timing,
  production LCP/CLS). Only the dev server was rendered.
* **Real mobile browsers** (iOS Safari, Android Chrome): the harness is a
  headless Chromium shell. 390 and 768 are emulated viewports, not devices.
* **1024 and 1199 against the reference**: no capture exists at those widths
  (§9.5). The build's values are measured; the reference's are `[INFERRED]`.
* **The reference's footer animation**: never in the capture's scroll range.
* **Dark theme fidelity**: the reference is light-only; every dark value is
  `[INFERRED]` (verified only for internal consistency: `--lm-mock-muted`
  remaps to `#b9aec9` on the dark card, `--lm-cta-eyebrow` stays `#cdb8ff`).
* **The midpoint dim during the crossfade** is measured (coverage 0.75). Whether
  the reference dims by the same amount cannot be derived from its capture (it
  records opacity keyframes, not composited pixels mid-fade).
