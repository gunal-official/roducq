# roducq landing — motion & animation notes (Forma recreation)

Reference: <https://forma-visuvate.framer.website/>
Runtime: [`motion@14.3.0`](https://motion.dev/) (`motion/react`) plus a small
CSS layer for the pieces that must work before hydration or without
JavaScript.

This document records **every animated surface on the marketing landing page**,
the values it runs at, where the implementation lives, how it behaves below
768px and under `prefers-reduced-motion: reduce`, and the browser evidence
gathered for the 1440px and 390px side-by-side comparison.

---

## 1. Provenance of the recorded values

Two different kinds of evidence back the numbers below, and they are labelled
separately because they are not equally strong:

| Evidence | What it covers |
| --- | --- |
| **Forma SSR DOM** (fetched through the W3C validator because the build sandbox cannot reach the Framer host) | Section order, headline rendered as separate word headings, FAQ implemented as a JS `div` row with `tabindex=0` and a Plus icon (not `<details>`), integration cards as `<button data-highlight>`, featured pricing ring `0 0 0 1px rgba(98,70,234,.35), 0 30px 60px -30px rgba(98,70,234,.7)`, buttons at `border-radius: 10px`. |
| **Recorded reference motion vocabulary** used across this recreation | 620ms entrance on `cubic-bezier(0.22, 1, 0.36, 1)`, 90ms line stagger, 420/340ms chrome, 260ms standard state change, 160ms fast state change, 14s ambient drift. |

**What could not be measured, and why.** Framer keeps animation specs inside
external runtime bundles; the SSR HTML contains none of them. This build
environment's egress allowlist blocks the Framer host, its CDN, and every
HTML-to-markdown proxy tried, so no DevTools trace of the live site was
possible. The values are therefore the recreation's recorded reference values,
not timings scraped from the live page. Every value below **was** measured
against the built page in Chromium (`scripts/verify-motion.mjs`), so the
document states what the code actually does; it does not claim a frame-accurate
diff against Framer's JS.

Where the reference could be inspected structurally, the implementation was
kept faithful (word-level headline markup is not reproduced — see D1).

---

## 2. Architecture

```
components/marketing/motion/MotionProvider.tsx   MotionConfig reducedMotion="user"
                                                 + default transition 620ms / [0.22,1,0.36,1]
components/marketing/landing/Reveal.tsx          scroll reveal (useInView, once)
app/(marketing)/landing.css                      pre-hydration state + CSS-owned motion
scripts/verify-motion.mjs                        Chromium evidence harness
```

Design rules the implementation follows:

1. **The server HTML is complete.** The hidden state lives in CSS behind the
   `.lm-js` marker that the marketing layout adds before first paint. With
   JavaScript disabled, every band, the chart and the FAQ render finished.
2. **Motion owns the entrances it can interrupt**, CSS owns the ones that must
   be correct without hydration (headline mask, chrome, SVG draw, `<details>`).
   A CSS pre-hidden transform is what Motion animates from, so there is no
   first-frame snap.
3. **Only transform, opacity and SVG stroke properties animate.** No keyframe
   touches `width`, `height`, `top`, `left`, `margin` or `padding` (asserted in
   `tests/components/home.test.ts`). The one layout-level animation —
   the FAQ disclosure — is the browser's native `::details-content`
   interpolation, which is the only way to animate `<details>` without
   replacing it with scripted layout.
4. **One observer per reveal, fired once.** Trigger is
   `amount: 0.08`, `margin: "0px 0px -8% 0px"`, `once: true`.

---

## 3. Recorded values, section by section

All easings are `cubic-bezier(0.22, 1, 0.36, 1)` unless stated otherwise.
Delays are per-element; a "stagger" means item *i* gets `i × step`.

| # | Surface | Technique | Desktop (≥768px) | Phone (≤767px) | Trigger |
| --- | --- | --- | --- | --- | --- |
| 01 | Announcement bar | `lm-chrome-in` transform + opacity | 360ms, no delay | 300ms, no delay | page load |
| 01 | Header | `lm-chrome-in` transform + opacity | 420ms, 60ms delay | 340ms, 40ms delay | page load |
| 02 | Hero headline | `lm-line-rise` masked line rise (`translateY(102%)` → 0) | 620ms per line, 90ms stagger | 420ms per line, 90ms stagger | page load |
| 02 | Hero CTAs / note / connector strip | static (no entrance) | — | — | — |
| 03 | Hero dashboard frame | Motion.dev `Reveal` | 620ms, 180ms delay, 14px rise | 420ms, 108ms delay, 8px rise | in view, once |
| 03 | Chart line | SVG draw: `pathLength="1"`, dash offset 1 → 0 | 620ms, 120ms delay, `cubic-bezier(0.33,1,0.68,1)` | same (620ms) | on hydration |
| 03 | Chart area fill | opacity 0 → 1 | 620ms, 180ms delay, `cubic-bezier(0.33,1,0.68,1)` | same | on hydration |
| 03 | Chart points ×4 | scale 0.6 → 1 + opacity | 260ms at 300 / 360 / 420 / 480ms | same | on hydration |
| 04 | Feature cards ×4 | `Reveal` | 620ms, 0/80/160/240ms | 420ms, stagger ×0.6 | in view, once |
| 05 | Step cards ×3 | `Reveal` | 620ms, 0/90/180ms | 420ms, stagger ×0.6 | in view, once |
| 05 | Step connectors ×5 | dash offset 20 → 0 + fade, starts when the diagram's `Reveal` is visible | 620ms, 0/60/120/180/240ms, `cubic-bezier(0.33,1,0.68,1)` | same (620ms) | parent reveal visible |
| 05 | Engagement timeline | `Reveal` | 620ms, 120ms delay | 420ms, 72ms delay | in view, once |
| 06 | Integration cards | `Reveal` (row-based) | 620ms, 0/70/140ms per row | 420ms, stagger ×0.6 | in view, once |
| 07 | Team rows ×4 | `Reveal` | 620ms, 0/80/160/240ms | 420ms, stagger ×0.6 | in view, once |
| 08 | Pricing cards | `Reveal` | 620ms, 0/80/160ms; featured 240ms | 420ms, stagger ×0.6 | in view, once |
| 09 | FAQ disclosure | native `<details>` + `::details-content` block-size interpolation (`interpolate-size: allow-keywords`, `transition-behavior: allow-discrete`) | 260ms open **and** close | 260ms | user toggle |
| 09 | FAQ icon | `transform: rotate(45deg)` on the Plus | 160ms (`--lm-motion-fast`) | 160ms | `[open]` |
| 10 | Final CTA card | `Reveal` | 620ms, no delay | 420ms | in view, once |
| 10 | Limitation callout | `Reveal` | 620ms, 120ms delay | 420ms, 72ms delay | in view, once |
| 11 | Footer grid | `Reveal` | 620ms, no delay | 420ms | in view, once |
| — | Bloom blobs | `lm-drift`, translateY/scale loop | 14s, infinite | **disabled** | ambient |

### Hover / state transitions

| Surface | Property | Duration | Notes |
| --- | --- | --- | --- |
| Buttons (`Buttons.tsx`) | background, border, shadow, transform, colour | 150ms | Tailwind `duration-150`; measured computed `transition-duration: 0.15s` |
| Header/footer links, FAQ summary, promo pill | colour / background / border | 150ms | `transition-colors` |
| Feature cards | background | 150ms | `hover:bg-lm-canvas` |
| Integration cards | border + shadow | 150ms | `transition-[border-color,box-shadow]`, no scale |
| Pricing CTA | background | 150ms | `transition-colors` |

### Scroll trigger

- One `IntersectionObserver` per `Reveal`, `amount: 0.08`, bottom margin
  `-8%`, `once: true` — reveals do **not** replay on scroll back.
- Connectors start from the parent `[data-visible="true"]`, so the sequence is
  spent when the diagram is actually on screen, not on hydration.
- The chart draw is a hero element: it runs once on hydration, matching the
  reference's "dashboard is alive when you land" behaviour.

---

## 4. Implementation map

| Surface | File | Anchor |
| --- | --- | --- |
| Motion defaults / reduced motion policy | `components/marketing/motion/MotionProvider.tsx` | `MotionConfig reducedMotion="user"`, 620ms default |
| Reveal contract (duration, distance, stagger, trigger, `data-*` hooks) | `components/marketing/landing/Reveal.tsx` | `useInView`, `show`, `duration`, `distance`, `stagger` |
| Chrome entrance | `app/(marketing)/landing.css` | `@keyframes lm-chrome-in` (L509), `.lm-announce` (L520), `.lm-header` (L524) |
| Chart draw / area / points | `app/(marketing)/landing.css` | `lm-draw` (L534), `lm-chart-area` (L543), `lm-chart-pop` (L552), rules L566–579 |
| Connectors | `app/(marketing)/landing.css` | `lm-connector-flow` (L587), rule L599 |
| Reduced-motion kill switch | `app/(marketing)/landing.css` | `@media (prefers-reduced-motion: reduce)` (L605) |
| FAQ disclosure + icon | `app/(marketing)/landing.css` | `.lm-faq` rules L667–680, `.lm-faq-icon` L656–660 |
| Compact reductions | `app/(marketing)/landing.css` | `@media (max-width: 767px)` (L687) |
| Chart markup (`pathLength`, point delays) | `components/marketing/landing/WorkspacePreview.tsx` | `lm-chart-line`, `lm-chart-point` |
| Connector markup (5 paths, delays) | `components/marketing/landing/StepsSection.tsx` | `lm-connector` + `--lm-connector-delay` |
| Hero dashboard reveal | `components/marketing/landing/HeroSection.tsx` | `<Reveal delay={180}>` |
| FAQ markup (native disclosure) | `components/marketing/landing/FaqAccordion.tsx` | each item wrapped in `<Reveal delay={index * 60}>` |
| Header / announcement classes | `SiteHeader.tsx`, `AnnouncementBar.tsx` | `lm-header`, `lm-announce` |
| Footer reveal | `components/marketing/SiteFooter.tsx` | `<Reveal className="grid …">` |

---

## 5. `prefers-reduced-motion: reduce`

Two independent layers enforce the fallback:

1. **CSS** — `@media (prefers-reduced-motion: reduce)` sets
   `animation: none; opacity: 1; transform: none; transition: none` on the
   headline masks, every `.lm-reveal` (visible or not), chrome, chart line /
   area / points and connectors; `stroke-dasharray: none; stroke-dashoffset: 0`
   on the chart line; `animation: none` on the drift blobs; `transition: none`
   on the FAQ disclosure; and the pre-existing global
   `transition-duration: 1ms !important` guard.
2. **JavaScript** — `Reveal` resolves `show = inView || reduce`, `duration = 0`,
   `distance = 0`, `stagger = 0`, and writes `data-visible="true"`. `MotionConfig
   reducedMotion="user"` is the second net for any future Motion component.

Measured in Chromium with `reducedMotion: "reduce"` at 1440 and 390:

| Assertion | Result |
| --- | --- |
| `matchMedia("(prefers-reduced-motion: reduce)")` | `true` |
| `.lm-reveal` `data-visible` | `"true"` (42/42 elements; 0 hidden) |
| `.lm-reveal` computed opacity / transform | `1` / `none` |
| `data-reveal-duration` | `0` |
| Hero line, chart, connectors, header, announcement `animation-name` | `none` |
| Chart `stroke-dashoffset` | `0px` |
| FAQ `::details-content` `transition-duration` | `0s` (opens instantly) |
| Drift blobs | `animation: none` |
| Buttons | `transition-duration: 0.001s` |

Screenshots and the full measured JSON are in
`docs/screenshots/forma-motion/report.json` (`reduced["1440"]`, `reduced["390"]`).

---

## 6. Responsive behaviour (390px and 768px)

| Behaviour | Desktop | ≤767px | Verification |
| --- | --- | --- | --- |
| Reveal duration | 620ms | 420ms | `data-reveal-duration="420"`, `data-motion="compact"` |
| Reveal distance | 14px | 8px | `--lm-reveal-shift: 8px` |
| Stagger | section value | ×0.6 | `Reveal` computes `delay * 0.6` |
| Header entrance | 420ms / 60ms | 340ms / 40ms | computed `0.34s` |
| Announcement entrance | 360ms | 300ms | computed `0.3s` |
| Headline line rise | 620ms | 420ms | `--lm-motion-slow: 420ms` |
| Ambient drift | 14s loop | disabled | `animation-name: none` |
| Chart draw / points | 620ms / 260ms | unchanged | computed `0.62s` / `0.26s` |
| Connector draw | 620ms | unchanged (hidden below `lg`) | computed `0.62s` |
| FAQ disclosure | 260ms | 260ms | computed `0.26s, 0.26s` |

**768px** uses the desktop timing set (the reference's breakpoint is 767px) and
the 1024px grid step. The harness measures the boundary explicitly: at 768px
the reveal is `620ms` / `desktop`, the header `0.42s`, the announcement
`0.36s` and the drift loop is running again. Horizontal overflow measured
**0** at 320 / 375 / 390 / 768 / 1024 / 1440 in both themes.

---

## 7. Side-by-side comparison (1440px and 390px)

Screenshots: `docs/screenshots/forma-motion/{1440,390}-{light,dark}/`
— `00-full.png` plus one PNG per section (`01-header` … `11-footer`).
The harness captures each section after scrolling it into view and waiting for
the entrance to settle, so the images show the post-animation state.

| Section | 1440 | 390 | Discrepancy |
| --- | --- | --- | --- |
| 01 Header | PASS | PASS | — |
| 02 Hero copy + CTAs | PASS | PASS | **D1**: reference renders the headline as one heading per word; this page keeps its pre-existing two-line heading and rises each line through a mask. Layout is unchanged by instruction; the 620ms/90ms rhythm is preserved. |
| 03 Dashboard | PASS | PASS | Chart draw is a CSS/SVG recreation of the reference's static mock; exact Framer timing is unrecoverable (see §1). Mobile keeps the full 620ms draw. |
| 04 Features | PASS | PASS | — |
| 05 Steps | PASS | PASS | Connectors are drawn left-to-right on reveal; hidden below `lg` where the reference also stacks the steps. |
| 06 Integrations | PASS | PASS | Hover is a border/shadow lift rather than the reference's `data-highlight` fill — pre-existing, same 150ms weight. |
| 07 Teams | PASS | PASS | — |
| 08 Pricing | PASS | PASS | **D2 (pre-existing)**: no monthly/yearly toggle (documented in `docs/RODUCQ_LANDING_DESIGN.md`). Featured ring matches the reference's recorded shadow. |
| 09 FAQ | PASS | PASS | **D3 (deliberate)**: reference is a JS accordion; this page keeps a native `<details>` for no-JS and assistive-tech correctness, now animated at 260ms via `::details-content`. |
| 10 Final CTA | PASS | PASS | — |
| 11 Footer | PASS | PASS | — |

No section produced a failing check in either viewport or theme. The three
discrepancies above are structural or historical decisions, not timing
regressions; none of them introduces a new animation.

---

## 8. Verification

Harness: `scripts/verify-motion.mjs` (Playwright + Chromium).

```bash
npm run build && npm run start              # terminal 1
CHROMIUM_EXECUTABLE_PATH=/tmp/chromium \
  node scripts/verify-motion.mjs            # terminal 2 (--no-shots to skip PNGs)
```

Results at the time of writing:

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Unit/component tests | `npm test` | **1098 pass, 0 fail** |
| Production build | `npm run build` | exit 0 |
| Motion harness | `node scripts/verify-motion.mjs` | **PASS: 12 viewport/theme renders + motion + reduced motion** |

The harness asserts, from computed styles:

- 620ms desktop / 420ms compact reveals, `data-visible="true"`, opacity 1;
- the 767px boundary: 768px resolves back to `620ms` / `desktop`, 420ms / 340ms
  chrome and a running drift loop;
- hero line 620ms desktop / 420ms compact; chart draw 620ms with
  `stroke-dashoffset: 0px`; connectors 620ms with sequenced delays;
  header 420/340ms; announcement 360/300ms; drift 14s desktop, off on phone;
- FAQ disclosure `0.26s, 0.26s`;
- reduced motion: no animation, no transition on the disclosure, `0px` chart
  dash offset, `data-visible="true"`, duration `0`;
- zero horizontal overflow and zero console errors at 320/375/390/768/1024/1440
  in light and dark.

---

## 9. Known limitations

1. **No live Forma trace.** See §1. The recreated timings are the project's
   recorded reference values, structurally checked against the reference DOM
   where that was reachable.
2. **FAQ interpolation** requires `::details-content` + `interpolate-size`
   support (Chromium 131+, Safari 18.4+). Older engines open and close
   instantly with no layout break; the disclosure is never hidden.
3. **D1 headline granularity** — two line masks instead of per-word headings,
   because the page must keep its current typography and layout.
4. Screenshots are of this build; they are not reference-site captures. They
   exist to prove the end states at 1440/390 and both themes.
