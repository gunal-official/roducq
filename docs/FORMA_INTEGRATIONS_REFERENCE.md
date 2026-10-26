# Forma `/integrations` — measured reference capture

**Captured:** 2026-10-26 (three runs: 02:47, 02:55, 03:02 UTC)
**Reference:** <https://forma-visuvate.framer.website/integrations>
**Instrument:** `scripts/capture-integrations-reference.mjs` on a GitHub-hosted
runner via `.github/workflows/forma-integrations-reference.yml`
**Browser:** Chromium 153.0.8010.12 (Playwright `chromium` v1243, headless),
`--force-color-profile=srgb --font-render-hinting=none --hide-scrollbars`,
`deviceScaleFactor: 1`
**Evidence bundle:** branch `arena/forma-integrations-capture`,
`docs/screenshots/forma-integrations-reference/` (185 files)

Every value below is tagged:

- `[MEASURED]` — read from the rendered page in Chromium
  (`getBoundingClientRect`, `getComputedStyle`, Web Animations API,
  `MutationObserver`, `PerformanceObserver`, real pointer events).
- `[INFERRED]` — not directly readable; reasoned from adjacent evidence and
  named as an estimate.
- `[UNVERIFIED]` — could not be established at all.

---

## 0. Method, and why it is not a text scrape

The development sandbox's egress allowlist blocks
`forma-visuvate.framer.website`, exactly as the `/solutions` and `/features`
captures recorded. The established path in this repository is a
GitHub-hosted Chromium run that writes its evidence to a fetchable branch, so
this page got its own capture script and workflow rather than a text
extraction:

| artefact (per viewport × theme) | what it proves |
| --- | --- |
| `int-<vp>-<theme>-structure.json` | section order, band boxes/padding, every heading and link with computed style, a bounded full-document outline |
| `int-<vp>-<theme>-styles.json` | 55 computed properties for every visible semantic element, `@keyframes`, and the design tokens resolved out of the reference's own stylesheets |
| `int-<vp>-<theme>-svgs.json` | raw `outerHTML` for all 46 SVGs, `viewBox`, path counts, SMIL nodes with runtime timing accessors, CSS/WAAPI/JS animation state per SVG |
| `int-<vp>-<theme>-motion.json` | WAAPI first-seen log with full timing and keyframes, every `Element.prototype.animate()` call, `IntersectionObserver` construction options, `MutationObserver` log, `PerformanceObserver` entries, scroll samples |
| `int-<vp>-<theme>-catalog.json` | **new for this page:** hero composition, tabs, the 12 cards with their ancestor chains, icon tiles, copy, and the *behaviour* probes — tab clicks, search terms, card click, two pointer-over diffs |
| `int-<vp>-<theme>-dom.html.gz` | settled DOM |
| `int-<vp>-<theme>-full.png`, `…-sec-NN.png` | full page and one PNG per band |

Runs completed with **0 capture failures** and **0 console errors** at all 7
widths × 2 colour schemes. `overflowX: 0` at every one of the 14 runs.

The generic interaction pass (control inventory, geometry-inferred grids,
first-pointer hover) is joined by a **page-specific deep pass**, because the
first attempt at this page proved that a generic grid detector cannot see a
Framer catalog: it reported the catalog's 12 cards as a single column of
3 "cards" 1440px wide. The deep pass walks each card heading's ancestor chain
and measures the chain, the tabs, the count node and the behaviours directly.

---

## 1. Page identity

| Field | Value | Evidence |
| --- | --- | --- |
| `<title>` | `Forma Integrations — Email, chat, calendar, code, and more` | `[MEASURED]` |
| meta description | "Connect Forma with your email, chat, calendar, docs, code, design, and board tools. Every integration syncs both ways." | `[MEASURED]` |
| H1 (visual) | "Connect the apps" + gradient "your team already uses" | `[MEASURED]` |
| H1 count | exactly 1 | `[MEASURED]` |
| Document height | 4044 / 4134 / 4633 / 5424 / 6054 / 6122 / 6354 px at 1440 / 1200 / 1024 / 768 / 390 / 375 / 320 | `[MEASURED]` |
| Body background | `#ffffff` | `[MEASURED]` |
| Fonts in use | Manrope (display/body), Arimo + DM Sans present as Framer fallbacks | `[MEASURED]` |

The page is **light-only**: both `light` and `dark` context runs produced
byte-identical boxes and identical computed colours (`[MEASURED]` — all 14
runs share the same section geometry and `#1b1426` ink). Framer's own
`data-visuvate-theme` attribute exists in the DOM but the page publishes no
dark palette. Roducq's marketing shell *does* have a real theme toggle, so the
recreation must map the same token names onto the existing dark palette rather
than invent one — the precedent `/solutions` and `/features` already set.

---

## 2. Section order — six bands `[MEASURED]`

The page is `main > div > div:nth-of-type(1) > div:nth-of-type(2)`, whose
children are one `header`, **five `section`s**, and one `footer`.

| # | Band | Box at 1440×900 (x, y, w, h) | Padding (top / bottom) | Content |
| --- | --- | --- | --- | --- |
| 0 | **Hero** | 100, 69.7, 1240, 422.58 | 92 / 72 | eyebrow chip, two-line H1 with gradient second line, one lead |
| 1 | **Catalog** | 0, 492.28, 1440, 986.81 | 0 / 20 | full-width: search field, 6 filter chips on one row, "12 integrations" count, 3-col × 4-row card grid |
| 2 | **How connecting works** | 0, 1479.09, 1440, 516.06 | 120 / 0 | eyebrow, 54px heading, 500px lead, 3-across step cells in one rounded container |
| 3 | **Request an integration** | 0, 1995.16, 1440, 593.77 (`id="request"`) | 120 / 0 | two columns: eyebrow + 40.8px heading + lead / white form card (3 fields + submit + note) |
| 4 | **Closing CTA** | 0, 2588.92, 1440, 750.83 | 120 / 96 | purple gradient stage with headline, lead, two buttons, note + a white checklist card |
| 5 | **Footer** | 0, 3339.75, 1440, 703.86 | 120 / 0 | oversized wordmark, tagline, CTA, 4 link columns |

Band padding switches at the reference's own breakpoints, measured:

| width | band 0 | band 2 | band 3 | band 4 | band 5 |
| --- | --- | --- | --- | --- | --- |
| 1440 | 92 / 72 | 120 / 0 | 120 / 0 | 120 / 96 | 120 / 0 |
| 1200 | 92 / 72 | 120 / 0 | 120 / 0 | 120 / 96 | 120 / 0 |
| 1024 | 92 / 72 | 65 / 0 | 65 / 0 | 80 / 80 | 96 / 0 |
| 768 | 56 / 44 | 57 / 0 | 57 / 0 | 60 / 64 | 56 / 0 |
| 390 | 56 / 44 | 57 / 0 | 57 / 0 | 60 / 64 | 56 / 0 |
| 320 | 56 / 44 | 57 / 0 | 57 / 0 | 60 / 64 | 56 / 0 |

`[MEASURED]` from `structure.json → sections[].style.paddingTop/paddingBottom`.
Note the three-band padding step (92/120 → 65 → 57) rather than a single
mobile/desktop switch; the 1024 row is a real rendered value, not a guess.

There is **no sticky in-page jump strip** on this page (`[MEASURED]`: no
`position: sticky` node above the catalog, and no second nav element).

---

## 3. Hero composition — band 0

Measured subtree (`catalog.json → heroParts`):

| Element | Box at 1440 (x, y, w, h) | Type | Colour |
| --- | --- | --- | --- |
| eyebrow `p` | 100, 161.7, 1240, 16.8 | 14px / 16.8px, 600, centred | `#5332d6` |
| H1 line 1 words (`span` × 3) | starts 450.67, 188.5, 68.55 tall | 67.2px / 68.54px, 600, `-2.016px` | `#1b1426` |
| H1 line 2 (one gradient unit) | 363.84, 247.64, 712.31, 87.36 | 67.2px / 68.54px, 600, `-2.016px` | `linear-gradient(90deg, #6246ea 0%, #8b5cf6 50%, #c084fc 100%)` |
| lead `p` | 400, 357.59, 640, 62.69 | 19px / 31.35px, 400 | `#687083` |

Hero type across widths `[MEASURED]`:

| width | H1 size / leading / tracking | lead size / leading | hero band padding |
| --- | --- | --- | --- |
| 1440, 1200 | 67.2 / 68.54 / −2.016 | 19 / 31.35 | 92 / 72 |
| 1024 | **45.4** / 46.28 / −1.36 | 19 / 31.35 | 92 / 72 |
| 768, 390, 375, 320 | 44 / 44.88 / −1.32 | 16.5 / 27.23 | 56 / 44 |

The 1024 row is the important one: the reference has a **third, in-between
headline step (45.4px)** that neither `/solutions` nor `/features` needed,
because their tablet band overlapped the 44px step. The eyebrow stays 14/600
`#5332d6` and the lead stays 19px down to 1024, then drops to 16.5px.

Line wrapping `[MEASURED]`: line 1 is three word-spans; the gradient is a
single block unit. At 375 and 320 the line 1 block wraps ("Connect the" /
"apps") and the H1 box grows to 89.75px; at 320 the gradient also wraps and
the lead reaches 108.94px tall.

---

## 4. The catalog — band 1 (the page's centrepiece)

### 4.1 Header controls

| Control | Box at 1440 | Type / shape | Evidence |
| --- | --- | --- | --- |
| Search field (wrapper) | 100, 492.28, 340, 48 | white, 1px hairline, radius 10 `[INFERRED — hairline colour not exposed]`; magnifier glyph 13×13 at 117, 510.28 | `[MEASURED]` |
| Search `<input>` | 142, 492.28, 282, 48 | 15px, placeholder "Search integrations", `type=text` | `[MEASURED]` |
| Filter chip row `<nav>` | 100, 554.28, 1240, 39.7 | `display:flex`, `gap: 6px`, no wrap | `[MEASURED]` |
| Active chip ("All") | 100, 554.28, 47.55, 39.7 | `#1b1426` fill, radius 999, padding 9px 16px | `[MEASURED]` |
| Inactive chip | e.g. 153.55, 554.28, 135.33, 39.7 | `#ffffff` fill, radius 999, same padding | `[MEASURED]` |
| Count line | 100, 593.98, 1240, 40.92 | 13.5px, `#1b1426`, padding-top 18px | `[MEASURED]` |

Six chips: `All`, `Communication`, `Calendar & meetings`, `Docs & files`,
`Planning & development`, `Design` — chip labels are 14px (`[MEASURED]` from
the outline's `p` nodes inside each `button`; the button's own inherited
`font-size` is 12px, so a naive read of the button under-measures the label by
2px).

The chip row **wraps** on narrow widths rather than scrolling
(`[MEASURED]`: `nav` height 39.7 → 85.41 at 768 → 131.11 at 390/375/320;
`overflow: visible`).

### 4.2 Card grid geometry `[MEASURED]`

| width | columns | card box (w × h) | card padding | column gap | row gap | grid gap |
| --- | --- | --- | --- | --- | --- | --- |
| 1440 | 3 | 404 × 192.05 | 25px | 14px | 14px | 14px |
| 1200 | 3 | 358.66 × 192.05 | 25px | 14px | 14px | 14px |
| 1024 | **2** | 463 × 140.64 | **19px** | 14px | 14px | 14px |
| 768 | **1** | 736 × 143.34 | **18px** | — | 14px | 14px |
| 390 | 1 | 358 × 164.14 | 18px | — | 14px | 14px |
| 375 | 1 | 343 × 164.14 | 18px | — | 14px | 14px |
| 320 | 1 | 288 × 164.14 | 18px | — | 14px | 14px |

So the card count per row is **3 → 2 → 1** with a hard step at 1024 and 768,
and the card *padding* steps 25 → 19 → 18px. The gap is a constant 14px at
every width. Card radius is **14px** at every width.

Content grid container: `display: grid; gap: 14px` (`[MEASURED]`,
`framer-10rf210`).

### 4.3 Card anatomy `[MEASURED]` (`catalog.json → cardInner`, screenshot
`forma-integrations-1440x900-light-sec-01.png`)

```
button.card                     404 × 192.05, radius 14, padding 25, #ffffff
├── row (display:flex, gap 16)
│   ├── icon tile              42 × 42, radius 8, #ffffff
│   │   └── brand glyph        21 × 21 SVG (viewBox 0 0 24 24)
│   └── text column            gap 4.5px
│       ├── h3                17px / 25.5px, 600, −0.34px, #1b1426
│       └── p                 15px / 24px, 400, #687083   (3 lines max in practice)
├── ↗ arrow                   14 × 14 SVG at the top-right (473, 674.99)
└── meta row (padding-top 13, gap 8, 1px dashed rule above)
    ├── category label        12px, #687083
    └── status chip           63.58 × 21.05, radius 999, padding 2px
        ├── "Available"       11px / 17.05, 600, #15803d on #e7f7ed  (mint)
        └── "Beta"            11px × 600, on a lilac tint  [MEASURED colours in
                              screenshot; exact token not exposed]
```

Card heights are uniform inside a row (404×192 all four rows at 1440) because
the text column is capped by the copy length, not by a min-height.

### 4.4 Behaviour — measured, not assumed

This is where a "recreate the design" brief usually goes wrong, so each
affordance was driven with real input:

| Probe | Result | Verdict |
| --- | --- | --- |
| Click **All** | 12 integrations / 12 cards | — |
| Click **Communication** | **12 integrations / 12 cards** | chips **do not filter** |
| Click **Calendar & meetings** | 12 / 12 | same |
| Click **Docs & files** | 12 / 12 | same |
| Click **Planning & development** | 12 / 12 | same |
| Click **Design** | 12 / 12 | same |
| Search `chat` | "2 integrations" → `Chat`, `Team Chat` | **search works** |
| Search `email` | "1 integration" (singular!) → `Email` | **search works, count pluralises** |
| Search `docs` | "3 integrations" → `Docs`, `Cloud Drive`, `File Storage` | search matches category too |
| Search `slack` | "No integrations match your search" | no match state |
| Search `zzzz` | "No integrations match your search" | same state |
| Pointer over card 1 ("Email") | card `background` `#ffffff` → `#f9f7fc` | **hover = surface tint only** |
| Pointer over card 2 ("Calendar") | same tint | consistent |
| Pointer over card 1, all other properties | **0 changes** — no border, no shadow, no transform, no radius change | — |
| Click card 1 | URL unchanged, 0 dialogs opened, DOM unchanged | **cards are inert** |

Two conclusions the implementation must respect:

1. The **chip row is decorative** in the reference: it renders six
   active-looking tabs and filters nothing. A recreation that ships a *working*
   filter would be a fidelity gain but must not claim to copy the reference;
   a recreation that ships *dead* chips copies a broken control. This is a
   decision for the content gate, not for the implementer.
2. The **only** card interaction is a background tint to the canvas colour.
   There is no lift, no shadow, no border change, no arrow movement, no
   transition duration declared (`transition: all 0s`) — the change is
   instantaneous.

The search placeholder is the only input on the page with an affordance that
looks like a filter; it is genuinely functional.

---

## 5. Band 2 — "How connecting works" `[MEASURED]`

| Element | Box at 1440 | Style |
| --- | --- | --- |
| eyebrow `p` | 100, 1599.09, 1240, 16.8 | 14px / 16.8, 600, `#5332d6` |
| spacer | 100, 1615.89, 1240, **12px** | — |
| `h2` | 100, 1627.89, 1240, 59.41 | **54px / 59.4, weight 400**, `-1.62px`, `#1b1426`, left-aligned |
| spacer | 100, 1687.3, 1240, **16px** | — |
| lead `p` | 100, 1703.3, **500px wide**, 59.41 | 18px, 400, `#687083` |
| spacer | 100, 1762.7, 1240, **44px** | — |
| step container | 100, 1806.7, 1240, 188.45 | `#eae6f1` fill, **radius 18**, **1px padding**, `gap: 1px` — the 1px gaps *are* the dividers |
| step cell | 412 × 186.45 each, at x 101 / 514 / 927 | `#ffffff`, padding **30px 28px** |
| step number | 129, 1837.7 | 13px, **700**, `#5332d6` |
| step `h3` | 129, 1880.5 | **21px / 24.16**, 600, `-0.94px`, `#1b1426` |
| step body | 129, 1914.66, 356 wide | **15px**, 400, `#687083` |

The heading is **weight 400 at 54px** here — lighter than the hero's 600 at
67.2px. That mismatch is measured, not a typo, and is the kind of detail a
generic "headings are 600" assumption loses.

## 6. Band 3 — "Request an integration" `[MEASURED]`

Two columns, `gap: 64px`, container 1240 → left column 588, right column 588.

| Element | Box | Style |
| --- | --- | --- |
| eyebrow | 100, 2115.16 | 14/16.8, 600, `#5332d6` |
| spacer | — | 14px |
| `h2` | 100, 2145.95, 588, 44.88 | **40.8px / 44.88, 600**, `-1.22px` |
| spacer | — | 14px |
| lead | 100, 2204.83, **420 wide**, 57.81 | 17px, 400, `#687083` |
| form card | 752, 2115.16, 588, 473.77 | `#ffffff`, **radius 24**, padding **29px**, gap 16 between rows |
| field label | 781, 2144.16, 530 | **13.5px, 500**, `#1b1426`, `gap: 7px` to the field |
| input shell | 781, 2172.08, 530, 49 | `#f9f7fc`, radius 10, padding 12px 14px (no border) |
| input text | 795, 2184.08 | 15px, `#1b1426`; placeholders "e.g. Linear", "you@company.com" |
| textarea | 2330, 123.92 tall | same shell |
| submit | full width, 52px tall, radius 10 `[INFERRED — from screenshot]`, `#6246ea` | `[MEASURED box]` |
| note | 781, 2541.17 | 12.5px, `#687083` |

The reference's own form posts to a Framer form endpoint and is not a
capability Roducq has; §8.3 of the audit records how the recreation handles
that without faking a submission.

## 7. Band 4 — closing CTA `[MEASURED]`

| Element | Box at 1440 | Style |
| --- | --- | --- |
| section | 0, 2588.92, 1440, 750.83 | padding 120 top / 96 bottom, horizontal 48 |
| stage | 100, 2708.92, 1240, 534.83 | radius **28**, padding **96px 72px**, `linear-gradient(150deg, #35278a 0%, #5139c9 52%, #7688ec… )` → exact string: `linear-gradient(150deg, rgb(53,39,138) 0%, rgb(81,57,201) 52%, rgb(118,88,236) 100%)` |
| glow 1 (child 1) | inset | `radial-gradient(70% 60% at 100% 0%, rgba(205,180,255,0.55) 0%, transparent 65%)` |
| glow 2 (child 2) | inset | `radial-gradient(60% 60% at 0% 100%, rgba(240,150,225,0.26) 0%, transparent 70%)` |
| content grid | 172, 2804.92, 1096 × 342.83 | 2 columns **565.28 / 466.72, gap 64** |
| headline | 565.28 wide, 6px above body | white line 1 + lilac line 2 (screenshot: ~65px, weight 500/600) `[MEASURED box; exact type in styles.json]` |
| body | 172, 2963.11, 565.28, 58.91 | 19px, 400, `rgba(255,255,255,0.76)` |
| button row | 172, 3058.02, height 52.03, `gap: 12px` | button A 146.53 wide, button B 150.23 wide |
| note | 172, 3126.05 | 14px, `rgba(255,255,255,0.6)` |
| checklist card | 801.28, 2832.16, 466.72, 288.34 | white, radius 18, padding 24, **2 of 4** progress with a 6px rail; rows: 2 done, 1 "Next" (tinted row), 1 "Later" |

The stage's radius/padding/gradient and the 565/467 split are the same
numbers `/solutions`' closing CTA already implements, so this band can reuse
the established `lm-solutions-stage` vocabulary.

## 8. Band 5 — footer `[MEASURED]`

Oversized wordmark link at 100, 3459.75 (113 × 30), tagline, "Start for free"
button at 100, 3606.14 (121.45 × 41.7), and four link columns whose `h2`
labels are **13px / 600 / `#1b1426`** at y 3469.75, `gap: 40px`, each column
`gap: 14px` with 20px-tall 14px links. Roducq's `SiteFooter` already ships the
oversized wordmark and column vocabulary; `/integrations` must use **that**
footer unchanged, not a copy of Forma's.

---

## 9. SVG findings — 46 icons, zero animation `[MEASURED]`

`svgs.json` at 1440×900 light:

| Group | Count | Size | `viewBox` | Paths in the node | Structure |
| --- | --- | --- | --- | --- | --- |
| Header glyphs (theme toggle sun/moon) | 2 | 17.03 / 13.96 | `0 0 24 24` | 1 (inline) | `fill:none; stroke: currentColor; stroke-width:2; stroke-linecap/linejoin: round` |
| Search magnifier | 2 (both schemes, all widths) | 13 | `0 0 24 24` | 0 (sprite `<use>`) | `role="presentation"` |
| Card ↗ arrows | 12 | 14 | `0 0 24 24` | 0 (`<use href="#1475982494">`) | stroke colour via CSS var `--token-ca7049d5` = `#a7afc0` |
| Card brand glyphs | 12 | 21 | `0 0 24 24` | 0 (`<use>`, one unique symbol each) | per-brand colour through a CSS custom property, e.g. Email `rgb(222,84,84)`, Chat `rgb(141,66,136)`, Docs `rgb(66,133,244)` |
| Step / misc / footer icons | 18 | 11–21 or 0 (sprite defs) | `0 0 24 24` | 1–10 | — |

Motion applied to any SVG, across every run and width:

- `smil` nodes: **0 of 46**
- CSS animations/transitions on an SVG or descendant: **0 of 46**
- WAAPI animations whose target is inside an `<svg>`: **0**
- `Element.prototype.animate()` calls targeting SVG: **0**
- attribute mutations on SVG geometry: 177 `MutationObserver` records, all of
  them Framer's hydration/`<use>` reflow — no `d`, `stroke-dasharray`,
  `stroke-dashoffset` or `transform` writes.

**Verdict:** the reference has **no SVG path drawing, no stroke animation, no
icon motion, and no SMIL loops**. Any stroke-dashoffset "line draw", orbiting
logo or spinning icon on the recreation would be invented motion. The icons
are static glyphs; the only motion on this page belongs to
`transform`/`opacity`/`filter` on `span`/`div` elements (§10).

None of the reference's 12 brand glyphs may be copied regardless — Roducq
brands integrations with its own icon set.

---

## 10. Motion — the recorded contract `[MEASURED]`

`motion.json` (1440×900 light) holds 26 WAAPI first-seen entries and 27 raw
`animate()` calls. The set is identical at 390×844.

### 10.1 Hero entrance (on load, `scrollY = 0`)

| Target | Keyframes | Duration | Delay | Easing |
| --- | --- | --- | --- | --- |
| eyebrow `div` | `opacity 0.001 → 1`, `translateY(16px) → none` | 800ms | 0 | `cubic-bezier(0.2, 0.7, 0.2, 1)` |
| H1 word 1 `span` | `filter blur(10px) → blur(0)`, `opacity 0.001 → 1` | 900ms | **50ms** | `cubic-bezier(0.16, 1, 0.3, 1)` |
| H1 word 2 | same | 900ms | **100ms** | same |
| H1 word 3 | same | 900ms | **150ms** | same |
| gradient line | `opacity 0.001 → 1`, `translateY(28px) → none` | 900ms | **350ms** | same |
| lead | `opacity 0.001 → 1`, `translateY(16px) → none` | 800ms | **450ms** | `cubic-bezier(0.2, 0.7, 0.2, 1)` |

Plus a 10000ms `opacity: 0.001 → 0.001` no-op animation on a wrapper — Framer's
"keep hidden during layout" hack. It is not a visual effect and must not be
reproduced.

**This is the same entrance `/solutions` and `/features` already reproduce**,
including the PR #53 substitution: the reference animates `opacity 0.001` and
`blur(10px)`, which suppresses/delays the LCP paint; Roducq's approved
solution keeps opacity at 1 and uses the clip-path mask instead. The
recreation must keep that substitution.

### 10.2 Section headings (scroll-triggered)

| Target | Keyframes | Duration | Delay | Trigger |
| --- | --- | --- | --- | --- |
| band 2 eyebrow + H2 words (`Three`, `steps,`, `no`, `admin`, `setup`) | `blur(10px) → 0` + `opacity` | 900ms | 0 / 50 / 100 / 150 / **200** ms | `IntersectionObserver`, `threshold: 0.2`, fired at `scrollY = 1080` |
| band 2 lead | fade | 350ms | 0 | same observer |
| band 4 copy | `opacity 0 → 1` | 350ms | 0 | scrolled into view at 540 |

Word-level stagger is **50ms**, same curve as the hero. Nothing in the catalog
band animates on scroll — the cards are painted visible and stay visible
(`[MEASURED]`: no WAAPI entry targets a card or any node inside band 1).

### 10.3 What does NOT animate

- Card entrance (no stagger, no fade, no rise).
- Card hover transition (`transition: all 0s`; the tint is instantaneous).
- Tab/chip changes.
- Search results.
- Any icon or SVG.
- No parallax, no counters, no orbiting art, no marquee.

### 10.4 Reduced motion `[UNVERIFIED]`

The capture ran with `reducedMotion: "no-preference"` only. The reference's
Framer runtime is known to honour the media query via its `MotionConfig`
equivalent, but this capture did not render a reduced-motion pass, so the
recreation's reduced-motion behaviour is governed by **Roducq's own
requirement** (all content visible immediately), not by a copied rule.

---

## 11. Responsive summary `[MEASURED]`

All seven widths, `overflowX = 0`, zero console errors.

| width | H1 | hero lead | catalog columns | card w × h | card pad | chip row | form columns |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 | 67.2 | 19 | 3 | 404 × 192 | 25 | 1 row | 588 + 64 + 588 |
| 1200 | 67.2 | 19 | 3 | 358.66 × 192 | 25 | 1 row | 2 col |
| 1024 | 45.4 | 19 | 2 | 463 × 140.6 | 19 | 1 row | 2 col (940 shell) |
| 768 | 44 | 16.5 | 1 | 736 × 143.3 | 18 | **2 rows** (85.41 tall) | **stacked** |
| 390 | 44 | 16.5 | 1 | 358 × 164.1 | 18 | 3 rows (131.11) | stacked |
| 375 | 44 | 16.5 | 1 | 343 × 164.1 | 18 | 3 rows | stacked |
| 320 | 44 | 16.5 | 1 | 288 × 164.1 | 18 | 3 rows | stacked |

Container widths (`.lm-shell` equivalents in Roducq): the reference's content
column is **1240** at 1440, **1104** at 1200, **940** at 1024, **736** at 768,
**358** at 390, **343** at 375, **288** at 320 — exactly the numbers
`app/(marketing)/landing.css` already produces from a 1320px shell and
16/40px gutters, so no new layout token is needed.

---

## 12. What the recreation must not do (evidence-backed)

1. **Do not animate SVG paths.** There are none (`§9`).
2. **Do not add a card hover lift.** The reference's only hover is a
   background tint to `#f9f7fc` with no transition (`§4.4`).
3. **Do not ship fake tabs.** The reference's chips are dead; a live filter
   must be declared a deliberate improvement, or the chips must be dropped.
4. **Do not ship a fake request form.** The reference posts to Framer; Roducq
   has no such endpoint, so the form must either become a real `mailto:`-based
   path or be replaced with an honest non-form action.
5. **Do not copy brand glyphs, category names or card copy** — they describe a
   task manager (Boards, Task Tracker, pull requests), which Roducq is not.
6. **Do not copy the "syncs both ways" claim.** Roducq's Slack and Notion
   connections are read-only imports (`lib/integrations/sync.ts`).
7. **Do not reuse the reference's 12-count.** Roducq's verified catalog is
   smaller; the count line must be derived from the data, not written.

---

## 13. Open questions carried into the audit

| Question | Status |
| --- | --- |
| Exact card hairline colour (`[INFERRED]` `#edeaf3`) | not exposed by `getComputedStyle` on the measured node; visible in the PNG as a faint 1px rule |
| Exact "Beta" chip tint | visible in the PNG (lilac), token not resolved |
| Reference behaviour under `prefers-reduced-motion: reduce` | `[UNVERIFIED]` — not rendered |
| Whether the chips were intended to filter (a Framer authoring gap) | `[UNVERIFIED]` — only the shipped behaviour is measurable |
| Dark-scheme palette | none exists; both schemes render identically |
