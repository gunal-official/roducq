# Roducq `/solutions` — implementation record (refinement pass)

Date: **2026-10-18** — page pass
Updated: **2026-10-19** — hero-only refinement (§13), branch
`arena/356595ce-roducq`
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
| Existing `tests/components/solutions-page.test.ts` | 24/24 pass (run as a targeted check only — see §11) |
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
| 25 | Crossfade exit duration | **Blocked.** See §5.2 |

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

### 5.2 One correction that was NOT applied

The 2026-10-18 capture measures the mock-panel crossfade at **700ms with an
80ms delay in *both* directions** (14 records: slides `{opacity: 1 → 0}` and
`{opacity: 0 → 1}`, all `duration: 700`, `delay: 80`,
`cubic-bezier(0.2, 0.7, 0.2, 1)`). The capture doc's own §6.3 records this.

The implementation ships **700ms in / 500ms out**. That 500ms is locked by an
existing assertion in `tests/components/solutions-page.test.ts`
(`opacity 500ms var(--lm-ease-body)`, `visibility 0s 500ms`), and this
milestone was instructed not to modify existing tests.

The earlier 500ms appears to have been taken from a *different* 500ms group —
the mock's ambient content cycling on the comment card inside miniature 02
(`dur=500`, `delay=0`, scrollY 0), not the stage crossfade.

**Recommendation for the testing milestone:** change the exit to
`700ms … 80ms` (and `visibility 0s 780ms`) and update those two assertions
together. Until then the page is 220ms off on every crossfade exit, and the
discrepancy is documented at the rule itself in `landing.css`.

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
| Crossfade exit duration | Blocked by test | Update the two assertions alongside the CSS (§5.2) |
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
