# Homepage CLS — root-cause verification

**Status:** verification complete. **No application code was changed.** No PR was opened.

| | |
|---|---|
| Route | `/` |
| Baseline | `main` @ `27bf5b1007070a325efa4ad43c0e7f461fc78258` (merge of PR #80), 0 open PRs |
| Browser | **Chromium 153.0.8010.0** (`@sparticuz/chromium@153.0.0`); Playwright's pinned Chrome for Testing 153.0.8010.12 could not be downloaded in this sandbox |
| Scenario | PR #53 scenario **B** — mobile 412×823 @1.75 DPR, `Emulation.setCPUThrottlingRate` 4×, **network throttling off**, animations on |
| Build | `npm ci` + `next build` + `next start` of that commit, `BUILD_ID XFTbDj1xU1viFylyk5zyX` |
| Harnesses | repo's `scripts/verify-marketing-consistency.mjs`; external probes with source attribution (`/tmp/cls-attr.mjs`, `/tmp/cls-interleave.mjs`, `/tmp/cls-trace.mjs`) |

## 1. Answer

The intermittent CLS is **real**, and it is **not** caused by the decorative blooms. It is caused by
**first paint landing before the hero has finished parsing**, which makes the hero section grow in
steps. The blooms are `%`-anchored to the section's height and carry a 110 px blur, so they are the
largest objects that move — the layout-shift API therefore attributes the shift to them and weights
the score by their enormous area. They are the **amplifier**, not the driver.

Measured on unchanged `main`, repo harness, 20 runs per scenario:

| Scenario | Runs with CLS > 0 | Max CLS |
|---|---|---|
| A mobile unthrottled | 2 / 20 | 0.1411 |
| **B mobile 4× CPU** | **5 / 20** | **0.2659** |
| C desktop 1440 | **0 / 20** | 0 |
| D mobile reduced-motion | 2 / 20 | 0.1411 |

Intermittency is the signature: the same build, same browser, same viewport produces 0 on one run
and 0.26 on the next. Desktop is clean (0/20) because the unthrottled CPU finishes parsing before
first paint.

## 2. Evidence chain

### 2.1 The instrument was validated first

A deliberate 220 px block prepended to the hero produced **CLS 0.2124** with correct source
attribution (`div.lm-shell` y 169→389, `.lm-hero-word` y 0→501). The observer does detect shifts,
so a zero is meaningful. That control also demonstrated the mechanism in miniature: the blooms
appeared in the source list as **passengers**, because they are children of the box that moved.

### 2.2 Frame trace — the hero grows in steps

One shifting run, geometry sampled per animation frame:

```
 163ms  hero=619px    bloomA y=  33   bloomB y=206
 379ms  hero=1318px   bloomA y=-121   bloomB y=248   ← shift 0.1456
 535ms  hero=1810px   bloomA y=-229   bloomB y=278   ← shift 0.0992
 738ms  hero=1918px   bloomA y=-253   bloomB y=284   ← shift 0.0220 (final)
```

The header (y=97→105, h=64) and the announcement bar never change height, and a `ResizeObserver`
on body / main / header / hero reports **no height change on any ancestor** — the growth is internal
to the hero.

### 2.3 DOM node count — it is parse progress, not fonts or animation

```
 224ms  hero=1285px  DOM nodes=317
 479ms  hero=1918px  DOM nodes=1198   ← shift 0.1289 at 476ms
 628ms  hero=1918px  DOM nodes=1376
 853ms  hero=1918px  DOM nodes=1377 (settled)
```

~880 nodes are added *after* first paint. `document.fonts` events do not align with the shift times,
and the font stack resolves early; disabling the bloom animation changes nothing (it is already
`animation: none` below 768 px). The growing element is the hero's mock wrapper:

```
 div.lm-hero-in.mt-12 (workspace mock wrapper)
 327ms = 490px  →  427ms = 583px  →  624ms = 1183px
```

### 2.4 Why the blooms dominate

`app/(marketing)/landing.css:653–675`: `.lm-bloom-a` is `position:absolute; top:-22%; height:38rem;
filter:blur(110px)`; `.lm-bloom-b` is `top:6%; height:32rem`. Percentage `top` resolves against the
**section's** height, so every step of the section's growth repositions them, and `blur(110px)`
inflates the reported visual rect, which inflates the CLS impact fraction. Nothing about their own
styling moves them — the transform animation `lm-drift` is disabled on mobile and is irrelevant.

## 3. Isolated experiments

Browser-only CSS injected before first paint; no repository file modified. Sequential batches first
(20 runs each, scenario B):

| Variant | Runs with CLS > 0 | Max CLS |
|---|---|---|
| baseline | 11 / 20 | 0.3442 |
| bloom animation off | 8 / 20 | 0.3442 |
| bloom blur off | 2 / 20 | 0.0843 |
| blooms hidden | 1 / 20 | 0.0233 |
| **contain: paint** | 5 / 20 | 0.3221 |
| bloom px anchor (412 only) | 1 / 20 | 0.0088 |

Sequential batches are confounded by ambient load — the same baseline measured 4/20, 6/20, 11/20
across sessions — so the decisive comparisons were re-run **interleaved** (A,B,A,B… on one browser,
alternating which arm goes first):

| Comparison | Baseline | Variant | Fisher exact |
|---|---|---|---|
| px anchor (412-specific px) | 7/20, max 0.2623 | **0/20, max 0** | **p = 0.0083** |
| reserve hero height (1918 px) | 9/20, max 0.3309 | **0/20, max 0** | **p = 0.0012** |
| `contain: paint` on the blooms | 7/20, max 0.3370 | 10/20, max 0.3221 | p = 1.0 |

**Containment does not help.** It was tested as asked and it is not a candidate: no improvement in
an interleaved 40-run comparison, and it is not even the mechanism (containment clips paint; it does
not stop a box moving).

## 4. The two candidate corrections, and why neither is shippable as-is

Both eliminate the CLS in 20/20 runs, and both fail the "preserve the design" requirement at
another width. Screenshots taken after settle with animations frozen:

**A. Fixed-px bloom anchors** (`top:-422px` / `top:115px`)

- 412×823: hero and both bloom rects identical, PNG **byte-identical** (341,216 bytes).
- 320 / 768 / 1024 / 1440: PNG **differs**. Measured `-22%` of the section at each width is
  −483.6 / −399.9 / −314.8 / −323.9 px, so one pair of numbers cannot serve the range. Hero height
  varies continuously with viewport width (2198 / 2031 / 1998 / **1918** / 1818 / 1431 / 1431 /
  1472 / 1472 at 320–1440), so per-breakpoint constants would still be wrong between breakpoints.

**B. Reserved hero height** (`min-height: 1918px`)

- 412×823: PNG **byte-identical** (341,216 bytes), CLS 0/20.
- 1440×900: hero 1472 → 1918 px, document 10,263 → 10,708 px — **446 px of added whitespace**, PNG
  differs. A global constant is a visual regression.

**C. `aspect-ratio` on the mock wrapper** — rejected on measurement. The wrapper's height/width
ratio is not constant: 4.524 (320) → 3.563 → 3.372 → 3.113 (412) → 1.583 (768) → 0.771 (1024) →
0.587 (1440). Only ≥1024 is it a fixed 728 px.

## 5. Measurement artefacts found (worth recording)

1. **`isMobile: true` hides this bug.** With Playwright's mobile emulation, 10/10 runs reported CLS
   0. Removing that one option reproduces 3/10. `--hide-scrollbars` and `--disable-gpu` make no
   difference (2–3/10 each). The repo's scenario does **not** set `isMobile`, so it is the
   authoritative setting; a harness that adds it will wrongly pass.
2. **My first harness reported 0/120 runs** and was simply wrong for the same reason. Discarded.
3. **CSS variants must be injected before first paint.** Injecting at `DOMContentLoaded` lands after
   the shift under 4× CPU and silently measures the baseline — the first variant matrix run was
   invalid for this reason and was repeated.
4. Shifts that occur after `load` are still counted; shifts are also attributed to large
   *passengers*, so an attribution list is not a cause list.

## 6. Recommendation

Do not ship A or B. The defect is that the hero's height is **not stable during parse**, and the
correct fix is to make the mock wrapper's height independent of parse progress — the same class of
fix as reserving a skeleton's dimensions. Concretely, in order of preference:

1. **Give the mock wrapper a stable box from the first parsed byte.** At ≥1024 it is already a fixed
   728 px; below that it is content-sized (1183 px at 412). A responsive reserved height — or fixed
   internal row heights inside the mock — removes the growth without touching the blooms, the blur,
   or the colours, and therefore preserves the design exactly. This needs one measurement pass per
   breakpoint and is a component change, not a CSS patch.
2. Failing that, decouple the decorations: position the bloom layer against a stable box (e.g. a
   wrapper with a breakpoint-defined height) rather than `%` of a section that is still growing.
   This is appearance-safe only if the per-breakpoint values are verified byte-identical per width,
   which A failed.
3. Do **not** use `contain: paint` (no effect), do **not** hide or de-blur the blooms (visible
   change), do **not** disable `lm-drift` (already off on mobile; the animation is not implicated).

**Approval required before any application-code change.** Nothing was changed by this verification,
and no PR was opened.

## 7. Limits

- Chromium only; Firefox and WebKit are `[UNVERIFIED]`.
- The 4× CPU scenario is a devtools-throttled model, not a real device.
- Lighthouse's historical 0.28–0.36 CLS values in `docs/evidence/` came from `simulate`-throttled
  runs and recorded **no source attribution**, so they cannot be attributed retroactively; they are
  consistent with the mechanism above but are not proof of it.
- Injected variants are browser-only experiments, not proposals; the pixel comparisons above were
  taken with animations paused to remove animation phase as a variable.
