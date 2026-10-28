# Homepage CLS — reservation prototype outcome

**Status:** investigation and prototypes complete. **No application code changed. No PR opened.**
Outcome: **no reservation strategy preserves the approved design across the width range** — mandatory
stop, alternatives listed in §6.

| | |
|---|---|
| Route | `/` |
| Baseline | `main` @ `27bf5b1` (merge of PR #80) |
| Browser | Chromium 153.0.8010.0, identical launch args and context settings for every arm |
| Scenario | PR #53 **B**: 412×823 @1.75 DPR, CDP `setCPUThrottlingRate` 4×, network unthrottled |
| Method | browser-only CSS injection before first paint; no repository file modified for any experiment |

## 1. The entrance animation is not the cause — proved, not assumed

Re-running `lm-hero-in` (`clip-path` + `translateY`) on the settled page, with layout held constant,
produced **0 layout-shift entries and CLS 0.0000**, with `y`, `height` and `documentHeight`
byte-equal before and after. Chromium does not count clip/transform animation as layout shift.

Consequence: motion is exonerated. No motion change is needed, and none is proposed. It also means
the only lever is real layout-height reservation.

## 2. The shift is genuine layout growth from paint-before-parse

16 consecutive scenario-B runs: **10 shifted**. Attribution presence across those 10 — blooms 10,
connects strip 1, mock 0, headings 0.

Blooms-only runs are consistent with the section changing height between paint and settle
(`bloom-b` `dy` +24…+71 px at `top:6%` ⇒ section ΔH ≈ 400–1183 px; `bloom-a`'s clipped visible
height changes as the section's top clip moves). The blooms remain **passengers with the largest
area**, which is why they dominate the attribution.

Which fragment arrives late varies by run: once the whole mock frame (wrapper 864 → 1183 px), once
the "connects with" strip (`div.lm-hero-in`, width 198 → 380 px, height 42 → 108 px as its chips
parse and it wraps to two rows). That variability is the reason a wrapper-only fix cannot be
complete.

## 3. Prototype A — reserve the mock's right-hand column: fails

The "Due today" column (`WorkspacePreview.tsx:415`) is **358 px at every width** (panel 293 + gap +
55), and its panel (`:416`) is 293 px with a 228 px list — genuinely width-invariant. It is the
single largest growing element inside the mock (65 → 358 px).

Interleaved 20 + 20, alternating arm order:

| Arm | Runs with CLS > 0 | Max |
|---|---|---|
| baseline | 4 / 20 | 0.2661 |
| column reserved | **7 / 20** | 0.3442 |

**Fisher exact p = 1.0 — no improvement.** The column is one fragment among several; reserving it
leaves the mock frame and the connects strip free to grow.

## 4. Why an exact reservation is not expressible

The mock wrapper's natural height is a **width-dependent step function**, measured at 20 px
granularity from 320 to 1440: **11 distinct values** — 1303, 1267, 1252, 1207, 1183, 1105, 1145,
1113, 1165, 1133, 728. The steps are where text inside the illustrative mock re-wraps; only the
≥1040 region is a single constant (728 px).

The hero **section** height is likewise stepped: 2198 / 2031 / 1998 / 1918 / 1818 / 1431 / 1472 at the
eight test widths.

A correct reservation requires `min-height(w) == natural(w)` at every width:
below it the wrapper still grows (CLS remains), above it the difference is visible whitespace.
Taking the one value that is exact at 412 px (`min-height: 1918px`) and applying it across the
range:

| Width | Natural hero | Effect |
|---|---|---|
| 320 | 2198 | **no effect** — 280 px unprotected, CLS remains |
| 375 | 2031 | **no effect** — 113 px unprotected |
| 390 | 1998 | **no effect** — 80 px unprotected |
| **412** | **1918** | **exact — CLS eliminated (0/20, p = 0.0012 vs 9/20 baseline)** |
| 768 | 1818 | +100 px whitespace |
| 1024 | 1431 | +487 px whitespace |
| 1200 | 1431 | +487 px whitespace |
| 1440 | 1472 | +446 px whitespace |

So the only strategy that demonstrably eliminates CLS protects exactly one width, silently does
nothing at three, and visibly breaks four. That is a compromised layout, which the brief forbids.

Reproducing the step function exactly would need a bisected boundary (≈10 of them) for the wrapper —
and another, different set for the section, because the connects strip wraps independently. Those
boundaries are determined by **text wrapping inside illustrative, editable copy**: any wording change
in the mock moves a boundary and silently introduces whitespace at the affected widths, with no test
able to catch it. That is not a shippable reservation.

## 5. What was verified along the way

- Instrument control: a deliberate 220 px insertion produced CLS 0.2124 with correct sources, so
  zeros are meaningful.
- Variant CSS must be injected before first paint; injecting at `DOMContentLoaded` lands after the
  shift under 4× CPU and silently measures baseline (an earlier matrix was invalidated by this and
  repeated).
- Playwright's `isMobile: true` suppresses the phenomenon entirely (0/10 vs 3/10) because it changes
  the paint/parse race; the repo's documented scenario does not set it.
- Reduced-motion and no-JS behaviour are untouched — no CSS or component was changed.

## 6. Alternatives, with honest trade-offs

| | Approach | CLS | Design risk | Verdict |
|---|---|---|---|---|
| A | Bisected breakpoint table (~10 boundaries) on wrapper + connects strip | Eliminated at matched widths | Exact today; **silently whitespace** after any copy edit; 10+ magic numbers | Not recommended |
| B | Reserve only ≥1040 px (`min-height: 728px`, a true constant) | No benefit for the mobile scenario | None (exact everywhere in range) | Safe but does not fix the finding |
| C | Make the mock's internal layout height-stable (fixed row heights / per-region `aspect-ratio` inside `WorkspacePreview`) | Likely eliminated at all widths | Touches the illustration's internal layout; needs design sign-off and per-width proof | **Recommended if a real fix is wanted** |
| D | Attack paint-before-parse (lighter hero markup / smaller initial HTML) | Probably eliminated | No visual change by construction, but larger change; magnitude uncertain | Worth exploring if C is rejected |
| E | Accept and document | Unchanged | None | Defensible: desktop 0/20; synthetic 4× CPU only; entrance animation exonerated |

## 7. Recommendation

Do not ship A. If the intermittent CLS must be removed, **C** is the only approach that can be both
exact and durable, because it makes the height independent of parse progress rather than pinning it
to measured numbers. **B** is available immediately if a zero-risk, partial measure is wanted.

Nothing was committed except this document; no deployment, no merge.
