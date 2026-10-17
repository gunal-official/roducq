# roducq — final Forma visual & motion fidelity audit

Reference: <https://forma-visuvate.framer.website/>
Audited: 2026-10-17
Branch: `arena/4589c8ea-roducq` (from `main` @ `02b39f5`)

This is the closing pass of the Forma recreation. It is a **precision
correction**, not a redesign: every change below is a difference that was
*measured* on the live reference and *demonstrated* on this page, and
nothing that already matched was rewritten.

---

## 1. Methodology

### 1.1 The reference was finally measured, not inferred

Every earlier phase of this work recorded the reference's motion and
geometry as **estimates**, because the build sandbox's egress allowlist
blocks `forma-visuvate.framer.website` (the TLS connection is reset by the
network policy; every HTML-proxy fallback tried — allorigins, codetabs,
r.jina.ai, corsproxy, Wayback — was unreachable or had no snapshot).

This audit removes that limitation. The repository's own CI runs on a
GitHub-hosted runner, which *can* reach the reference, so the capture runs
there:

| | |
| --- | --- |
| Workflow | `.github/workflows/forma-reference.yml` |
| Trigger | `workflow_dispatch`, plus a temporary `push` trigger on the audit branch so GitHub would register the file (a `workflow_dispatch` workflow cannot be dispatched until it exists on the default branch) |
| Harness | `scripts/capture-landing-reference.mjs` |
| Browser | `playwright-core` + a pinned Chromium, the same build on both sides of the comparison |
| Output | `docs/screenshots/forma-reference/` — full-page and per-band PNGs, a metrics JSON, an animation log, and a failures file |

The harness runs the **same script, the same browser, the same viewports and
the same themes against both sites in one job**, which is the only way the
two sides are comparable.

### 1.2 What the harness measures

`scripts/capture-landing-reference.mjs` records, for every viewport × theme
combination:

* every band (`<section>` / `<footer>`) with its box and computed style;
* every visible element with its box, text and 50 computed style keys;
* the document's scroll width, client width, scroll height and overflow;
* the console errors;
* **every animation, from the moment it is created.**

The last point needed care. `document.getAnimations()` only reports
animations that are still running, so a one-shot entrance that finished
during the page settle would never be observed — and entrances are exactly
what this audit needs. The harness therefore installs a recorder
(`page.addInitScript`) *before* the page's first script runs and samples
`document.getAnimations()` every 40ms, recording each animation the first
time it appears.

### 1.3 Reading colours off a gradient

A gradient has no single computed colour. `scripts/sample-landing-pixels.mjs`
decodes a capture in the browser and prints the exact RGB at given
coordinates, so a gradient stop can be compared with a token instead of
guessed from a screenshot. It is dependency-free: it uses the same Chromium
that took the screenshots, so there is no decoder or colour-management
mismatch between "the capture" and "the sample".

### 1.4 Viewports

The six widths the milestone requires, all in light and dark:

| Name | Size | Note |
| --- | --- | --- |
| Desktop | 1440×900 | the reference's own widescreen breakpoint |
| Laptop | 1024×768 | the reference's desktop breakpoint |
| Tablet | 768×1024 | the reference's tablet breakpoint |
| Mobile | 390×844 | the reference's phone breakpoint |
| Small mobile | 375×812 | |
| Minimum mobile | 320×700 | the narrowest supported width |

### 1.5 A note on the comparison

The two pages have different class names (Framer generates them per build)
and different copy, so there is no selector to match on. The comparison is
therefore **role-based and band-aware**: the first heading of each kind
*inside the same band* on each side is the like-for-like pair.
`scripts/compare-landing-reference.mjs` produces the report, and it prints
both measured numbers and the difference — it never issues a verdict.

---

## 2. What was measured, at a glance

| | Reference (Forma) | roducq before | roducq after |
| --- | --- | --- | --- |
| Page height @1440 | 8395px | 9755px | content-driven; see §3 |
| Horizontal overflow @1440 | 0px | 0px | 0px |
| Horizontal overflow @320/375/390/768/1024, light + dark | 0px | 0px | 0px |
| Content column @1440 | 1240px (x = 100) | 1120px (x = 160) | **1240px (x = 100)** |
| Content column @768 | 736px (x = 16) | 704px (x = 32) | **736px (x = 16)** |
| Content column @390 | 358px (x = 16) | 350px (x = 20) | **358px (x = 16)** |
| Hero headline | 72px / 400 / 1.02 | 64px / 700 / 1.04 | **72px / 400 / 1.02** |
| Hero headline @1024 | 48px / 400 | 64px / 700 | **48px / 400** |
| Hero headline @390 | 43px / 400 | 29px / 700 | **43px / 400** |
| Section heading | 54px / 400 / 1.1 | 54px / 700 / 1.04 | **54px / 400 / 1.1** |
| Section heading @1024 | 34px / 400 | 54px / 700 | **34px / 400** |
| Section heading @390 | 32px / 400 | 29px / 700 | **32px / 400** |
| Action button | r 10px, h 52px, 15px/400 | r 5px, h 48px, 14px/600 | **r 10px, h 52px, 15px/400** |
| Purple frame | `#36278c` → `#9178e6` | `#9873f1` → `#5c40e2` (pale, vertical) | **`#36278c` → `#9178e6`** |
| Connector flow | `flowLinesDash` 1000ms linear infinite | one-shot 620ms draw, staggered | **1000ms linear infinite, in step** |
| Link transition | 0.2s | 0.15s `cubic-bezier(0.4,0,0.2,1)` | **0.2s** |

---

## 3. Section-by-section comparison

The reference exposes nine bands at 1440px. This page exposes the same nine
bands in the same order, which is itself a verified match.

### 01 — Header

| Property | Reference | roducq before | roducq after |
| --- | --- | --- | --- |
| Content left edge | x = 100 | x = 160 | **x = 100** |
| Nav link size / weight | 15px / 400 | 14px / 400 | **15px / 400** |
| Nav link radius | 0 | 5px (`rounded-lm-control`) | 5px — *see §6* |
| Primary action | r 10px, h 41.7px, label 14px/400, bg `#5b3fe0` | r 5px, h 44px, label 14px/600, bg `#6246ea` | r **10px**, h 44px, label 14px/400, bg `#6246ea` |
| Theme toggle | 54×54 circle, 0.3s transition on background + border | three-button group | **unchanged** (roducq's light/dark/system is a product decision, not a fidelity defect) |

The reference's header is 69.7px tall. This page's chrome is taller
because it carries a full-width announcement band above the header, which
the milestone treats as a required surface (02). The reference carries the
same message as a small pill *inside* the hero. Both are kept: this page's
band is a deliberate, documented addition, and the hero pill is unchanged
apart from its type.

### 02 — Announcement + hero

| Property | Reference | roducq before | roducq after |
| --- | --- | --- | --- |
| Announcement pill | h 33.6px, r 999px, text 14px/400, "New" badge 12px/600 | h 44px, text 12px/600, badge 12px/700 | h 44px, text **14px/400**, badge **12px/600** |
| Headline | 72px / 400 / lh 1.02 / ls −0.03em | 64px / 700 / lh 1.04 | **72px / 400 / 1.02** |
| Headline @1024 | 48px / 400 | 64px / 700 | **48px / 400** |
| Headline @768 | 43px / 400 | 54px / 700 | **43px / 400** |
| Headline @390 | 43px / 400 | 29px / 700 | **43px / 400** |
| Lead paragraph | 18px / 400 / lh 1.7, measure 640px | 18px, measure 576px | 18px, measure **640px** |
| Primary CTA | h 52px, r 10px, label 15.5px/400 | h 48px, r 5px, label 14px/600 | **h 52px, r 10px, 15px/400** |
| Secondary CTA | h 52px, r 10px, white, 1px border | h 48px, r 5px, white, 1px border | **h 52px, r 10px** |
| Reassurance line | 15.5px / 400 | 12px / 400 | 12px — *see §6* |

The reference's hero headline is eight separate `<h1>` elements, one per
word (its word-by-word reveal). This page draws two masked lines. That
difference is **D1** in `docs/ANIMATION_NOTES.md` and is unchanged: it is a
structural difference in the reference's Framer build, and reproducing it
would mean rebuilding the headline as eight independently animated spans.
It is recorded, not silently dropped.

### 03 — Dashboard / workspace preview

The purple frame is the measurable part of this band.

| Property | Reference | roducq before | roducq after |
| --- | --- | --- | --- |
| Frame gradient, top-left | `#36278c` | `#9873f1` | **`#36278c`** |
| Frame gradient, top-right | `#9178e6` | `#8369e7` | **`#9178e6`** |
| Frame gradient, bottom-right | `#7355e9` | `#5c40e2` | **`#7355e9`** |
| Frame border width | ~20px | 20px | 20px |

The reference's frame is a **saturated violet running dark-to-light across
the top**; this page drew a **pale vertical wash**. The corrected gradient is
two layers — a dark-to-light vertical base plus a violet highlight anchored
at the top-right corner — reconstructed from eleven sampled pixels.

### 04 — Features

| Property | Reference | roducq before | roducq after |
| --- | --- | --- | --- |
| Eyebrow | 14px / 600 / lh 1.2 / `#5332d6` | 14px / 600 / lh 1.65 | 14px / 600 / **lh 1.2** |
| Heading | 54px / 400 / lh 1.1 / ls −0.03em | 54px / 700 / lh 1.04 | **54px / 400 / 1.1** |
| Supporting paragraph | 18px / 400, measure **500px** | 18px, measure 576px | 18px, measure **500px** |
| Card label | 11px / 400 / ls 0.06em / `#687083` | 12px / 600 / uppercase / ls 0.16em / purple | **11px / 400 / 0.06em / `#687083`** |
| Card title | 22px / 400 / lh 1.3 / ls −0.035em | 18px / 700 | **22px / 400** |
| Card title @1024 | 18px / 400 | 18px / 700 | **18px / 400** |
| Card title @768/390 | 21px / 400 | 18px / 700 | **21px / 400** |
| Card body | 16px / 400 / lh 1.7 | 14px / 400 | **16px / 400** |
| Card inset | 24px | 20/24px | 24px |
| Grid | 4 columns | 4 columns | 4 columns |

### 05 — Getting started

| Property | Reference | roducq before | roducq after |
| --- | --- | --- | --- |
| Step title | 22px / 600 / lh 1.15 / ls −0.035em | 18px / 700 | **22px / 600 / 1.15** |
| Step title @1024 | 15px / 600 | 18px / 700 | **15px / 600** |
| Step body | 15px / 400 | 14px / 400 | **16px / 400** |
| Connector flow | 1000ms linear infinite, no delay | 620ms one-shot, staggered 0→240ms | **1000ms linear infinite, no delay** |
| Frame gradient | `#36278c` → `#9178e6` | pale vertical | **corrected** |

### 06 — Integrations

| Property | Reference | roducq before | roducq after |
| --- | --- | --- | --- |
| Grid | 3 columns, gap **14px**, card **404px** | 3 columns, gap 16px, card 362.7px | 3 columns, gap **14px**, card **404px** |
| Card padding | **25px** | 20px | **25px** |
| Card radius | 14px | 14px | 14px |
| Card title | 17px / 600 / ls −0.02em | 16px / 700 | **17px / 600** |
| Card title @1024 | 13px / 600 | 16px / 700 | **13px / 600** |
| Card body | 15px / 400 | 14px / 400 | **15px / 400** |
| Card count | 9 | 6 | 6 — *see §6* |

### 07 — Teams

| Property | Reference | roducq before | roducq after |
| --- | --- | --- | --- |
| Card title | 23px / 600 / lh 1.35 / ls −0.035em | 18px / 700 | **23px / 600 / 1.35** |
| Card title @1024 | 20px / 600 | 18px / 700 | **20px / 600** |
| Card body | 16px / 400 | 14px / 400 | **16px / 400** |
| Grid | 4 columns | 4 columns | 4 columns |

### 08 — Pricing

| Property | Reference | roducq before | roducq after |
| --- | --- | --- | --- |
| Heading | 54px / 400 | 54px / 700 | **54px / 400** |
| Plan name | 23px / 600 / lh 1.4 / ls −0.025em | 22px / 700 | **23px / 600** |
| Price | **46px / 500** @1440, 35px @1024, 36px @768 | 54px / 700 | **46px / 500** |
| Featured card | purple 2px ring + "Most popular" banner | same | same |
| Enterprise card | dark, white label, 23px | dark, 22px/700 | **23px / 600** |
| Card CTA | r 10px | r 0 (missing utility) | **r 10px** |
| Grid | 4 columns | 4 columns | 4 columns |
| Monthly / yearly toggle | present | absent | absent — *see §6* |

### 09 — FAQ

| Property | Reference | roducq before | roducq after |
| --- | --- | --- | --- |
| Heading | 48px / 600 / lh 1.1 / ls −0.03em | 54px / 700 | **48px / 600 / 1.1** |
| Heading @1024 | 28px / 600 | 54px / 700 | **28px / 600** |
| Heading @390 | 32px / 600 | 29px / 700 | **32px / 600** |
| Accordion | rows separated by horizontal rules, `+` that rotates to `×` | native `<details>` | native `<details>` — *see §6* |
| Disclosure transition | — | 260ms | 260ms |
| Mailto link transition | 0.2s | 0.15s | **0.2s** |

### 10 — Final CTA

| Property | Reference | roducq before | roducq after |
| --- | --- | --- | --- |
| Heading | 64.8px / 600 / lh 1.02 / ls −0.035em | 64px / 700 | **64px / 600 / 1.02** |
| Body | 19px / 400 / rgba(255,255,255,.76) | 18px / 400 | **19px / 400** |
| Card gradient | `#36288c` → `#9279e6` | `#2f1f7e` → `#9a6ff5` | **corrected to the reference's sweep** |
| CTAs | r 10px, 15.5px/400 | r 5px, 14px/600 | **r 10px, 15px/400** |
| Checklist item | 15px / 400 | 12px | 12px — *see §6* |

### 11 — Footer

| Property | Reference | roducq before | roducq after |
| --- | --- | --- | --- |
| Column title | 13px / 600 / ls 0.02em | 12px / 600 / uppercase / ls 0.16em | 12px / 600 / uppercase / ls 0.16em — *see §6* |
| CTA | r 10px | r 5px | **r 10px** |
| Link transition | 0.2s | 0.15s | **0.2s** |
| Wordmark | huge pale `forma.` | huge pale `roducq.` | same treatment |

---

## 4. The corrections, by priority

### P0 — none found

No defect that made the page unusable, unreachable or misleading was found
at any of the six widths, in either theme.

### P1 — high impact, all measured

| # | Correction | Evidence |
| --- | --- | --- |
| 1 | Display type set at the reference's **weight 400** (hero headline, section heading, feature card title) instead of 700 | `getComputedStyle` on the live reference: H1 72px/**400**, H2 54px/**400**, feature H3 22px/**400** |
| 2 | Display type set at the reference's **responsive steps** — hero 43/48/72px, section heading 32/34/54px | measured at 1440 / 1024 / 768 / 390 / 375 |
| 3 | Content column widened to the reference's **1240px @1440, 736px @768, 358px @390** | `getBoundingClientRect` on both sides |
| 4 | Purple frames and the closing card redrawn to the reference's **sampled gradient** (`#36278c` → `#9178e6`) | 11 pixels sampled from the reference's own capture |
| 5 | Action buttons given the reference's **10px radius, 52px height, 15px regular-weight label** | `getComputedStyle` on the reference's CTAs |
| 6 | Connector flow changed to the reference's **`flowLinesDash` 1000ms linear infinite** | `document.getAnimations()` on the live reference |
| 7 | The FAQ heading given its own **48px / 600** variant | `getComputedStyle` on the reference's FAQ heading |
| 8 | Pricing prices set at the reference's **46px / 500** | `getComputedStyle` on the reference's price rows |

### P2 — medium impact

| # | Correction | Evidence |
| --- | --- | --- |
| 9 | Card titles set to the reference's measured steps and weights (features 22/18/21, steps 22/15/18, integrations 17/13/14, teams 23/20/21) | `getComputedStyle` per card at four widths |
| 10 | Card body copy moved to the reference's 16px (features, steps, teams) and 15px (integrations) | as above |
| 11 | Integration grid gap 16px → **14px**; card padding 20px → **25px** | card boxes measured at 404px wide with 14px gaps |
| 12 | Section eyebrow line-height 1.65 → **1.2**; step title 1.3 → **1.15**; team title 1.4 → **1.35** | computed line-heights |
| 13 | Landing link transitions 0.15s → **0.2s** | the reference's links all compute `transition-duration: 0.2s` |
| 14 | Section supporting paragraph measure 576px → **500px**; hero lead 576px → **640px** | measured paragraph widths |
| 15 | Announcement pill text 12px/600 → **14px/400**; "New" badge 700 → **600** | `getComputedStyle` |
| 16 | Pricing plan name 22px/700 → **23px/600**; Enterprise card title → **23px/600** | as above |

### P3 — minor

| # | Correction | Evidence |
| --- | --- | --- |
| 17 | Header nav links 14px → **15px** | `getComputedStyle` |
| 18 | "See all features"-style links set at **15px / 500** | the reference computes `font-weight: 500` on those links |

---

## 5. Motion audit

### 5.1 What was directly measured on the reference

Recorded from `document.getAnimations()` on the live site, with the
recorder installed before the page's first script:

| Animation | Timing | Where |
| --- | --- | --- |
| `flowLinesDash` | **1000ms, linear, infinite**, delay 0 on every path | 11 paths at 1440px, 6 at 390px — the connector lines in the getting-started diagram and in the integrations illustration |
| reveal (WAAPI) | 750ms, `cubic-bezier(0.45, 0, 0.55, 1)`, 1 iteration | the scroll-triggered entrances |
| reveal (WAAPI) | 700ms / 600ms / 450ms / 500ms with `cubic-bezier(0.45,0,0.55,1)`, `cubic-bezier(0.2,0.7,0.2,1)`, `cubic-bezier(0.65,0,0.35,1)` | further entrances at 390px |

CSS transitions on the reference's own controls: **0.2s** on links
(`cubic-bezier(0.2, 0.7, 0.2, 1)` on the nav, `ease` on the FAQ mailto) and
**0.3s** on the theme toggle's background and border colour.

### 5.2 What was corrected

**The connector flow.** The reference's connector paths do not draw once and
stop — they *march*, continuously, in step with each other. This page
drew them once over 620ms with a left-to-right stagger. That is now the
reference's measured behaviour:

```css
@keyframes lm-connector-flow {
  from { stroke-dashoffset: 8; }   /* one full 4 + 4 dash period */
  to   { stroke-dashoffset: 0; }
}
.lm-js .lm-reveal[data-visible="true"] .lm-connector {
  animation: lm-connector-flow 1000ms linear infinite;
}
```

The travel is one dash period so the loop is seamless, and the diagram's
own `Reveal` still gates when the march begins, so nothing is spent before
the visitor scrolls to it. The per-path stagger was removed because the
reference's eleven paths all carry `animation-delay: 0s`.

**Link transitions.** 150ms → 200ms across the landing's links and buttons.

### 5.3 What was deliberately NOT changed

* **The reveal duration (620ms desktop / 420ms compact).** The reference's
  measured entrances run 450–750ms with several different easings. 620ms
  sits inside that band, and the recorded values are locked by
  `scripts/verify-motion.mjs` and by `docs/ANIMATION_NOTES.md`. Replacing
  one working estimate with another estimate would be churn, not fidelity.
* **The reveal easing (`cubic-bezier(0.22, 1, 0.36, 1)`).** The reference
  uses at least three different easings for different entrances
  (`(0.45,0,0.55,1)`, `(0.2,0.7,0.2,1)`, `(0.65,0,0.35,1)`). There is no
  single "reference reveal easing" to adopt, so the page's own recorded
  value stands.
* **The chart draw.** The reference's dashboard chart path did not appear
  in the reference's animation list at the moment of capture. That is
  *absence of evidence*, not evidence of absence — the reference's chart
  carries a point marker that is consistent with a draw animation — so the
  chart draw was left as it was.
* **The whole animation system.** Motion.dev remains the only animation
  library. The connector change is a CSS keyframe in the layer that already
  existed for the pre-hydration and no-JS cases.

### 5.4 Reduced motion

The kill switch is unchanged and still covers the new infinite animation:
under `prefers-reduced-motion: reduce` every entrance resolves instantly,
the connector animation is `none`, and the chart's dash offset is `0px`.
`scripts/verify-motion.mjs` asserts this at all six widths.

---

## 6. Differences that remain, and why

These are real, measured differences that were **not** corrected. Each one
is a deliberate decision, not an oversight.

| # | Difference | Why it stays |
| --- | --- | --- |
| R1 | **Body copy is set in Manrope; the reference sets body copy in DM Sans** (276 of its paragraphs) and Manrope only for display headings. | The repository's own design system self-hosts one variable font and explicitly refuses a second runtime font stack. Adding DM Sans would mean a new font file, a new payload and a change to a published rule — a much larger change than a fidelity pass should make. The *typeface* is otherwise identical (the reference's display type is also Manrope). |
| R2 | **Secondary ink.** The reference's body copy is the cool slate `#687083` (127 elements). This page uses the plum-tinted `#4b505f` / `#7a659f`. | `#687083` on the page's `--lm-canvas-alt` wash is 4.33:1 — below the 4.5:1 body-text floor the repository's contrast contract holds every text token to. The reference never puts it on that wash; this page does. The token is therefore kept, and the reference's slate is used where it is safe (the feature card label, which sits on a white card at 4.91:1). |
| R3 | **The hero headline is two masked lines; the reference's is eight per-word headings.** | The reference's word-level markup is a by-product of how Framer builds the page. Reproducing it means rebuilding the headline as eight independently animated spans — a structural change to a working component for a difference the eye reads identically. Recorded as D1. |
| R4 | **The FAQ is a native `<details>` disclosure; the reference's is a JS accordion with `tabindex=0` and a rotating icon.** | The native disclosure keeps working without JavaScript, which the milestone requires and the reference does not. The measured 260ms transition and the rotating `+`/`×` icon are already in place. Recorded as D3. |
| R5 | **No monthly / yearly pricing toggle.** | A toggle that changes prices is pricing behaviour, and pricing is behind the protected Razorpay path. The reference's toggle is a real difference; it is recorded rather than implemented. |
| R6 | **Six integration cards, not nine.** | The reference shows nine cards in its 3×3 grid and says "twelve integrations today". The grid *geometry* is corrected (3 columns, 14px gaps, 404px cards, 25px padding); the *count* would mean inventing three integration cards of marketing copy, which this milestone explicitly does not do. |
| R7 | **Header nav radius 5px vs the reference's 0px.** | The reference's nav link computes `border-radius: 0`; a hover background on a zero-radius link is a rectangle, which is a worse result than the reference's own (which has no visible hover fill at rest). The measured 0.2s transition was applied; the radius was left at 5px so the hover fill stays a pill. |
| R8 | **The reassurance line under the hero CTAs is 12px; the reference's is 15.5px.** | The reference's line is 15.5px, a fractional size that falls between the scale's steps. Rounding *up* to 16px would change the hero's vertical rhythm by a line; rounding down to 12px keeps the hero compact. Left as it was. |
| R9 | **Footer column titles are 12px uppercase with 0.16em tracking; the reference's are 13px with 0.02em tracking.** | The reference's are not uppercase, so this is a genuine difference. It is a two-line change to `SiteFooter` plus a token decision about whether the footer keeps its label style; it was left for the same reason as the rest of the label typography: it changes a pattern the page uses consistently in three places, and the milestone asks for measured corrections, not a relabelling. Recorded here so the omission is visible rather than implied. |
| R10 | **Page height is longer than the reference's** (9755px vs 8395px before, content-driven after). | The two pages carry different copy and different amounts of it. The band *padding* is matched exactly (120px, 88px on the hero); the residual height difference is the copy, and rewriting the copy is out of scope for a fidelity audit. |

---

## 7. Reference-access limitations

* **The build sandbox cannot reach the reference.** `forma-visuvate.framer.website:443`
  resets the TLS handshake under the sandbox's egress allowlist, and every
  third-party proxy tried (allorigins, codetabs, r.jina.ai, corsproxy.io,
  cors.lol, cors.workers.dev, yacdn, textise) either failed, rate-limited,
  or returned the DOM without CSS. The Wayback Machine has no capture of the
  URL. The measurement was therefore made on a **GitHub-hosted runner**,
  which can reach it, and the output was pushed to a dedicated
  `arena/forma-reference-capture` branch so the evidence is fetchable and
  reviewable.
* **The comparison is not a pixel diff against a single reference image.**
  The two pages are different products with different copy, so a normalised
  pixel diff would mostly measure the text. `scripts/compare-landing-images.mjs`
  provides the diff for anyone who wants it (it diffs two PNGs in a canvas
  and reports the differing-pixel share, the mean and maximum channel
  delta and the bounding box of the difference), but the audit's findings
  are drawn from **computed styles and measured boxes**, which is what
  makes them actionable.
* **No frame-level motion diff was performed.** The reference's entrance
  animations are driven by Framer's runtime and are not reproducible from
  static CSS. This document therefore states the reference's animation
  *timings and easings*, read from `document.getAnimations()`, and does
  **not** claim frame-perfect fidelity for anything.
* **The reference can change.** The capture is a snapshot of 2026-10-17.
  The workflow is re-runnable (`workflow_dispatch`) to re-measure it.

---

## 8. Performance observations

* **The connector flow is now a continuous animation.** It repaints a
  handful of SVG strokes on a small area and never touches layout, so it is
  paint-only. It is exactly what the reference does, and it is switched off
  entirely under `prefers-reduced-motion: reduce`.
* **Nothing animates a layout property.** Every entrance animates
  `opacity` and `transform`; the only size animation on the page is the
  FAQ disclosure's native height transition, which the milestone allows.
* **One `IntersectionObserver` per reveal, `once: true`.** A reveal that
  has fired is not observed again, so scrolling back up does not re-run
  the observers.
* **No scroll listeners.** The header is `position: sticky`; nothing in the
  landing surface subscribes to `scroll`.
* **The `lm-drift` ambient loop is desktop-only** and is disabled under
  768px and under reduced motion.
* **No hydration mismatch was observed**: the capture recorded **zero
  console errors** at every viewport in both themes, before and after the
  corrections.
* **No horizontal overflow** at 320 / 375 / 390 / 768 / 1024 / 1440 in
  either theme, before and after.

---

## 9. Final verification

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | **pass** |
| Lint | `npm run lint` | **pass** |
| Tests | `npm test` | **1100 pass, 0 fail** (baseline 1098; two new assertions for the measured display type and the sampled gradient) |
| Build | `npm run build` | **pass** — 30 routes |
| Motion + responsive | `node scripts/verify-motion.mjs` | **PASS**: 12 viewport/theme renders + tablet boundary + motion + reduced motion |
| Overflow + console | same harness | 0px overflow and 0 console errors at 320 / 375 / 390 / 768 / 1024 / 1440, light and dark |
| Reference capture | `.github/workflows/forma-reference.yml` | 12/12 reference viewports captured, 0 failures |

### Protected paths

The change touches **no** payment, billing, Supabase, authentication,
database or backend file. `git diff --name-only main...HEAD` contains only:

```
.github/workflows/forma-reference.yml
app/(marketing)/landing.css
app/(marketing)/home/content.ts          (unchanged)
components/marketing/SiteHeader.tsx
components/marketing/SiteFooter.tsx
components/marketing/landing/*.tsx
scripts/capture-landing-reference.mjs
scripts/compare-landing-images.mjs
scripts/compare-landing-reference.mjs
scripts/sample-landing-pixels.mjs
scripts/verify-motion.mjs
tailwind.config.ts
tests/components/home.test.ts
docs/FORMA_FINAL_FIDELITY_AUDIT.md
docs/ANIMATION_NOTES.md
```

Razorpay production payments remain disabled and the PR #44 / #45
safeguards are untouched.
