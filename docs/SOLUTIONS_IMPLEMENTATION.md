# Roducq `/solutions` — implementation record (refinement pass)

Date: **2026-10-18**
Branch: `arena/f6a4212d-roducq`
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
