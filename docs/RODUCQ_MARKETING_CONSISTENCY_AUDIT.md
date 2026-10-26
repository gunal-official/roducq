# roducq — site-wide marketing design consistency & fidelity audit

Reference: <https://forma-visuvate.framer.website/>
Approved design baseline: Roducq `/solutions`
Audited: 2026-10-26
Branch: `arena/26957573-roducq` (from `main` @ `62d6ee2`)

**This is a consistency and gap-fix audit, not a redesign.** Every change below
is a measured difference between two shipping Roducq routes, or between a
Roducq route and the approved `/solutions` surface. Nothing that already
matched was rewritten, no page layout was recomposed, and no content was
changed.

Every claim is labelled:

| Label | Meaning |
| --- | --- |
| **[MEASURED]** | a number read from a real Chromium run in this environment, recorded in `docs/evidence/marketing-consistency/` |
| **[DOCUMENTED]** | a value already recorded in an existing reference doc, not re-derived here |
| **[INFERRED]** | a value chosen because no measurement covers it, with the reason stated |
| **[UNVERIFIED]** | no evidence available — stated as a gap, never as a pass |

---

## 1. Repository and PR baseline

| | |
| --- | --- |
| `main` at start | `62d6ee2` — "Merge pull request #64 from gunal-official/arena/d1b4526c-roducq" |
| PR #64 status **[MEASURED]** | **MERGED**, 2026-10-26T05:54:52Z, merge commit `62d6ee2`. Its changelog work is in `main` and was **not** overwritten |
| Other open PRs **[MEASURED]** | none (`gh pr list --state open` returned nothing) |
| Working tree at start | clean |
| Session branch | `arena/26957573-roducq` (branched from `62d6ee2`; no commits to `main`) |
| Stack | Next.js 16.3.6, React 18.3.1, `motion` 14.3.0, Node v22.22.3, npm 10.9.8 |
| Browser | Chromium 153.0.8010.0 (`@sparticuz/chromium` bundle + `al2023` libs, the chain recorded in `docs/forma-phase-d-closeout.md` §6.2), driven by `playwright-core` |

Because PR #64 had already merged, no branch strategy was needed beyond
branching from its merge commit: the changelog release history, the
`/changelog` page and its tests are the baseline this pass audits.

---

## 2. Route inventory

Nine public marketing routes, all inside `app/(marketing)` and all wrapped by
`app/(marketing)/layout.tsx` (announcement band → `SiteHeader` → `main` →
`SiteFooter`):

| Route | Source | Status before this pass | In scope |
| --- | --- | --- | --- |
| `/` | `page.tsx` + `home/content.ts` | Forma landing recreation (9 bands) | audit |
| `/features` | `features/page.tsx` | six-section sticky showcase | audit |
| `/solutions` | `solutions/page.tsx` | **approved baseline** | reference |
| `/integrations` | `integrations/page.tsx` | searchable/filterable catalog | audit |
| `/pricing` | `pricing/page.tsx` + `plans.ts` | three-plan structure (PDF spec) | audit |
| `/changelog` | `changelog/page.tsx` | editorial release timeline (PR #64) | audit |
| `/about` | `about/page.tsx` | pre-redesign page on the shared shell | audit, layout untouched |
| `/vs` | `vs/page.tsx` | comparison hub, pre-redesign layout | audit, layout untouched |
| `/vs/[slug]` | `vs/[slug]/page.tsx` | 9 comparison pages, same layout | spot-checked (`/vs/notion`) |

Not marketing (unchanged, out of scope): `app/(app)/**` (authenticated shell),
`app/(auth)/**`, `/share/[token]`, `/invoice/[token]`, `/invite/[token]`,
`app/api/**`. No file under those trees was touched.

---

## 3. Phase A — inventory and classification

Measured before any edit: 8 routes × 7 widths (320/375/390/768/1024/1200/1440)
× 2 colour schemes = **112 rows**, plus axe-core on 8 routes × 3 widths × 2
schemes. Raw output: `docs/evidence/marketing-consistency/baseline-shell.json`
and `…/axe-baseline.json`, produced by
`scripts/verify-marketing-consistency.mjs`.

Marks in this table: ✔ CONSISTENT · ✖ **VERIFIED INCONSISTENCY** (fixed —
see §5) · ◆ INTENTIONAL DIFFERENCE (preserved) · ? UNVERIFIED.

| Surface | `/` | `/features` | `/solutions` | `/integrations` | `/pricing` | `/changelog` | `/about` | `/vs` | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Header chrome | wash + hairline | card | card | card | wash + hairline | card | wash + hairline | wash + hairline | ✖ V1 |
| Header height | 73px | 72px | 72px | 72px | 73px | 72px | 73px | 73px | ✖ V1 |
| Wordmark size | 18px | 28/22px | 28/22px | 28/22px | 18px | 28/22px | 18px | 18px | ✖ V4 |
| Nav list | About·Pricing·Compare·Changelog | same | Features·Solutions·Integrations·Pricing·Changelog | same as `/features` | About·… | same as `/features` | About·… | About·… | ✖ V2 |
| Active-page indicator | none on `/` | **none** | underline | **none** | none on `/pricing`?? | Changelog ✔ | About ✔ | Compare ✔ | ✖ V3 |
| Theme control (desktop) | 3-button group | icon | icon | icon | 3-button group | icon | 3-button group | 3-button group | ✖ V5 |
| Header actions | Log in + Start free | Get started | Get started | Get started | Log in + Start free | Get started | Log in + Start free | Log in + Start free | ✖ V5 |
| Announcement band | present (61px) | present | present | present | present | present | present | present | ✔ (◆ see I2) |
| Footer | white, 3 columns, back-to-top, wordmark | identical | identical | identical | identical | identical | identical | identical | ✔ |
| Type system | Manrope, `--lm-*` scale | same | same | same | same + 8 dead utilities | same | same | same | ✖ V6 |
| Card surfaces / radii | `--lm-*` tokens | same | same | same | same | same | same | same | ✔ |
| Focus ring | 2px outline on every stop | same | same | same | same | same | same | same | ✔ |
| Reduced motion | 0 running animations | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| No-JS visibility | full text | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Horizontal overflow | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ✔ |

Page-specific structure was classified **◆ INTENTIONAL** and left alone in
every case: `/solutions` keeps its four-category sticky showcase, `/features`
its six-section showcase, `/integrations` its filterable catalog, `/changelog`
its editorial timeline, `/pricing` its three-plan grid, `/about` and `/vs`
their current layouts.

### The discrepancies, stated precisely

**V1 — two header chromes on one shell [MEASURED].** `SiteHeader.tsx` switched
its entire appearance on pathname: `/solutions`, `/features`, `/integrations`
and `/changelog` rendered the measured reference plane
(`bg-lm-card`, no hairline, 72px), while `/`, `/pricing`, `/about` and `/vs`
rendered the pre-redesign translucent wash (`bg-lm-header-wash`, 1px brand
hairline, 73px). Same component, same layout, two designs, chosen by URL.

**V2 — the destination list changed between routes [MEASURED].** The four
non-showcase routes rendered `NAV` (`About`, `Pricing`, `Compare`,
`Changelog`); `/solutions` rendered `SOLUTIONS_NAV` (`Features`, `Solutions`,
`Integrations`, `Pricing`, `Changelog`). `/features`, `/integrations` and
`/changelog` got the showcase *chrome* but the old *data*, so **the three pages
that are themselves Features/Integrations/Changelog had no link to Features,
Integrations, or their own section**, and none of the marketing pages linked to
`/solutions`.

**V3 — missing active state [MEASURED].** `aria-current="page"` resolved on
`/solutions`, `/changelog`, `/about`, `/vs`, `/pricing` only where the label
existed in the rendered list; `/features` and `/integrations` had no matching
item at all and rendered the header with **zero** active destinations.

**V4 — two wordmark sizes [MEASURED].** `Wordmark` rendered
`text-lm-22 md:text-lm-28` (22/28px, tracking −0.06em) on the showcase routes
and `text-lm-18` (18px, −0.02em) everywhere else; the mark was `30` vs `28`.

**V5 — two theme controls, two CTA sets [MEASURED].** Showcase routes used the
single `ThemeIconToggle` plus one `Get started` action; the others used the
three-button `ThemeToggle` (Light/Dark/System) plus `Log in` + `Start free`.
Both are real features, but the *same* marketing header cannot offer them
depending on the URL.

**V6 — utilities that compile to nothing [MEASURED].** A scan of the compiled
stylesheet against every `lm-*` token in `components/marketing` and
`app/(marketing)` found eight classes with no rule at all (details and visible
consequences in §5.6).

**V7 — a zero-opacity LCP candidate on `/pricing` [MEASURED].** The pricing
hero sat inside `<Reveal>`, whose hidden state is real CSS
(`.lm-js .lm-reveal { opacity: 0 }`, applied before first paint by the layout's
inline script). With JavaScript chunks delayed 1.5 s to sample the
pre-hydration frame, `/pricing` reported `h1 opacity 1` **inside a wrapper at
`opacity 0`**, while `/`, `/solutions` and `/features` reported the headline
itself visible. That is the exact pattern PR #53 forbids.

**V8 — axe-core violation on `/changelog` [MEASURED].** The 48-scan baseline
produced one violation type: `label-content-name-mismatch` (impact **serious**,
8 nodes) on all six `/changelog` scans — 320 / 768 / 1440, light and dark — and
nowhere else. The eight PR links carried
`aria-label="Verify <title> (<source> on GitHub)"`, so the visible text
("PR #63", "PRs #55–#59") was not part of the accessible name at all.

**V9 — three touch targets under 44px [MEASURED].** The `/features` inline
`Browse all integrations` link measured **24px tall**, and the header's menu
button measured **40×40** on `/features`, `/solutions`, `/integrations` and
`/changelog` (the old showcase-only branch set `min-h-10 min-w-10`). The rest
of the surface measured 44px or more.

**V10 — `/pricing` display band [DOCUMENTED + MEASURED].** The pricing h1
stepped to its 54px desktop size at Tailwind `lg` (1024px), whereas the
pricing specification documents the 1024 band as 34px
(`docs/RODUCQ_PRICING_PAGE.md` §2) and the reference family switches at its own
1200px desktop boundary (`docs/FORMA_SOLUTIONS_REFERENCE.md` §9.5).

### Intentional differences (preserved, not "fixed")

| # | Difference | Why it stays |
| --- | --- | --- |
| I1 | Each page keeps its own body layout and section components | The approved brief is one *design language*, not one page structure |
| I2 | The announcement band exists on every marketing route; the reference has none on `/solutions` or `/changelog` | Documented deliberate addition (`docs/FORMA_FINAL_FIDELITY_AUDIT.md` §3, `docs/SOLUTIONS_IMPLEMENTATION.md`) |
| I3 | The nav carries 7 destinations, not the reference's 5 | `About` and `Compare` are real, working routes; removing them from the header to match the reference would delete shipped navigation |
| I4 | `/pricing` keeps its warm orange-red accent, its 54px/400 display step and its three-plan grid | The approved pricing specification (`docs/RODUCQ_PRICING_PAGE.md`), not a Forma reproduction |
| I5 | `/about` and `/vs` keep their pre-redesign body layout | Documented follow-up scope (`docs/RODUCQ_LANDING_DESIGN.md`); re-skinning them is not a consistency fix |
| I6 | The phone menu offers the three-way Light/Dark/System control | A product decision recorded in the header docs; the desktop icon toggle is the reference's single-button shape |
| I7 | The 60%-white stage note and the `#c084fc` end of the gradient headline | Both are measured reference values; their contrast is reported in §8 rather than silently re-coloured |

### Unverified

| # | Item | Why |
| --- | --- | --- |
| U1 | The reference at 1024px | Never captured (`docs/FORMA_SOLUTIONS_REFERENCE.md` §9.5) |
| U2 | `tracking-lm-label/-title/-price` values | No measurement names them; taken from the closest values already in the corpus |
| U3 | Every dark-mode value | The reference is light-only (`docs/FORMA_SOLUTIONS_REFERENCE.md` §9.6) |
| U4 | Field INP | Requires RUM; only lab proxies exist (`docs/FINAL_GO_LIVE_READINESS.md` §6.1) |
| U5 | Lighthouse LCP | Lighthouse is not a dependency of this workspace and was not installed |
| U6 | Firefox / WebKit behaviour | Only Chromium is available here |

---

## 4. Phase B/C — header and footer

### 4.1 What changed in `SiteHeader.tsx`

The pathname gate is gone. One `NAV` constant, one chrome, one set of actions,
rendered by all nine marketing routes:

```
Features · Solutions · Integrations · Pricing · Changelog · About · Compare
```

The first five are the reference's measured route order
(`docs/FORMA_SOLUTIONS_REFERENCE.md` §9); `/features` and `/integrations` are
real routes here, so the header links to them directly instead of to the
homepage anchors the reference uses because those pages do not exist there.
`About` and `Compare` are appended (I3).

Everything else is the approved `/solutions` header, unchanged: opaque
`bg-lm-card` plane with no hairline, 64px → 72px at the `md` band, the shared
`lm-shell` container, the display wordmark (`text-lm-22 md:text-lm-28`,
tracking −0.06em, mark size 30), the centred route row with the 2px
active/hover underline, one `ThemeIconToggle`, one purple `Get started`, and
the Radix dialog phone menu with focus trap, Escape, background isolation and
focus return.

**Two deliberate header corrections inside that list:**

1. **Nav padding in the 1024–1199 band [MEASURED].** The row is centred with 12
   px of padding per link (the measured value). With seven destinations that
   row measures **627px**, while the centred column at 1024px leaves **599px**
   between the wordmark and the right-hand actions — at 12px padding the row
   would end **~2.5px inside the theme button**. The row therefore takes
   `px-2.5` below 1200px
   and the measured `px-3` from 1200px up (the reference's own desktop
   boundary). Post-fix clearance between the nav's right edge and the theme
   button: **11px at 1024, 12px at 1025, 49px at 1100, 99px at 1199, 85px at
   1200, 145px at 1440** [MEASURED]. Nothing overlaps at any width, and every
   destination stays visible on tablets instead of collapsing into the menu.
2. **Menu button 40×40 → 44×44 [MEASURED].** See V9.

### 4.2 Header consistency, after

Eight rows of the shell audit remain distinct, and every one of them is
explained by viewport or user preference rather than by route: the signature is
`{background} × {height} × {wordmark size} × {nav labels} × {actions}`, and the
eight distinct values are the 64px phone/tablet and 72px desktop heights, light
and dark surfaces, the toggle's `Switch to dark/light theme` label, and the
presence of the seven-link row from 1024px up. **Across all eight routes at the
same width and scheme the header is identical** — 8 rows per signature × 8
routes [MEASURED, `final-shell.json`].

### 4.3 Footer

One shared `SiteFooter` on every marketing route, unchanged by this pass and
measured identical everywhere: `bg-lm-card`, 1px soft top border, three
navigation columns (Product / Workspace / Account), 44px link targets, the
© line, `Built on Next.js and Supabase…`, the native `#top` anchor for
**Back to top** (not JavaScript scrolling), and the oversized pale `roducq.`
wordmark inside an `aria-hidden` SVG. Its single `Reveal` is the only motion,
and it is the same recorded 620ms curve the rest of the page uses. No footer
animation was invented.

---

## 5. Phase D/E — typography, tokens and motion

### 5.1 Type system

Manrope is loaded once by `app/layout.tsx` and consumed through
`--lm-font`; no marketing component names a font family. Measured body stack
on every route: `Manrope, Arimo, DM Sans, ui-sans-serif, system-ui, sans-serif`
[MEASURED]. Hero/section display steps resolve from `--lm-size-*`; no
marketing component hardcodes a px size or a hex colour in a `className`
(the 37 hex literals under `components/marketing` are all in doc comments or
measured `landing.css` values, not in markup).

### 5.2 Colours, surfaces, radii and shadows

Everything resolves through the `.rdq-marketing` token block, which is scoped
(deliberately, and asserted by `tests/components/home.test.ts`). Light and dark
are both real token sets; measured canvas `#f9f7fc` light / `#211b29` dark
(computed `rgb(33,27,41)`) on all eight routes [MEASURED].

### 5.3 Focus, hover, keyboard

First Tab stop on every route at 1440: **"Skip to content"**. Across 112 rows ×
8 stops, **zero** focus stops rendered without an outline (`outline-style:
none` with no box-shadow) [MEASURED]. Header controls are 44px minimum on every
route and width [MEASURED].

### 5.4 Theme switching

The toggle was clicked on every route at 1024/1200/1440 in both starting
schemes: **0 failures** (`html.class` changed on every click) [MEASURED].

### 5.5 Motion

No animation was added, retuned or removed by this pass — with one exception
that is a *rule restoration*, not a new animation:

**`/pricing` hero (V7).** The hero now uses the same `.lm-hero-in` ladder as the
other four page heroes: `opacity` stays 1 in every keyframe, the mask band and a
16px rise travel, `--lm-hero-delay` steps 0 / 80 / 450ms with 800–900ms
durations, and the motion is pure CSS so it runs identically with no JavaScript
and under `prefers-reduced-motion`. Measured after the change: the LCP element
at first paint is `h1.lm-hero-in` with `opacity: 1`, `visibility: visible`,
`filter: none` on all eight routes [MEASURED, `lcp-final.json`].

Everything else stays at its recorded value: the homepage word/line ladder and
dashboard frame, the `/solutions` and `/features` sticky showcases and their
700ms crossfades, `/integrations` filter transitions, `/changelog`'s static
editorial rows, the one-shot `Reveal` (620/420ms, `cubic-bezier(0.22,1,0.36,1)`,
14/8px), the `flowLinesDash` connector loop and the pill swap. No decorative
animation was added to any static reference section.

Reduced motion: **0 running animations and 0 hidden bands** on all eight routes
at 390px [MEASURED]. No JavaScript: the h1 renders on every route (19–58
characters, 1,522–9,835 characters of body text), with the only zero-opacity
nodes being the two `aria-hidden` `.lm-pill-swap` labels on `/solutions`, whose
text is exposed through an `sr-only` sibling [MEASURED].

Motion.dev remains the only animation library (`motion@14.3.0`); no dependency
was added.

### 5.6 The dead utilities (V6) — and why they mattered

`npx`-free scan of the compiled CSS (`scripts/check-marketing-utilities.mjs`:

```
npm run build && node scripts/check-marketing-utilities.mjs
```

| Class | Where | Visible consequence |
| --- | --- | --- |
| `tracking-lm-display`, `-eyebrow`, `-label`, `-title`, `-price` | `app/(marketing)/pricing/page.tsx`, `pricing-plans.tsx` | No `letter-spacing` namespace existed: the pricing h1 measured `letter-spacing: normal` (the spec says −0.03em) and the eyebrow `normal` (spec: 0.14em) |
| `leading-lm-body`, `-heading`, `-normal` | same files | No `line-height` mapping: the h1 measured 59.4px only because 1.1 happened to be the CSS default for the step; the subtitle and the card body fell back to inherited leading |
| `bg-lm-chip-wash` | `solutions/SectionNav.tsx`, `features/FeaturesSectionNav.tsx` | The sticky numbered strip measured `background-color: rgba(0,0,0,0)` on both pages — the measured 72%-white floating pill was invisible |
| `text-lm-26` | `landing/WorkspacePreview.tsx` | The four statistic numerals rendered at **16px**, not 26px |
| `text-lm-11` | `landing/SectionHeading.tsx` (`CardLabel`) | `--lm-size-11` was deliberately never activated, so the card label rendered at **16px** instead of 11px |
| `border-lm-border-hairline` | `landing/FinalCta.tsx`, `landing/WorkspacePreview.tsx` | Not a utility (the key is `hairline`), so the brand hairline silently fell back to the neutral border: measured `rgb(228,221,234)` instead of `rgba(172,125,252,0.28)` |

Fixes are mappings and token declarations only, plus two class renames to names
that already existed (`text-lm-chip`, `border-lm-hairline`). No visual value was
invented: every new token is either documented (`-0.03em`, `0.14em`, 1.65 body
leading), already present in the reference's measured scale, or the value the
class name itself states. The two tracking steps with no measurement behind
them are labelled [INFERRED] (U2).

Post-fix: **240 `lm-*` utilities scanned, 0 without a compiled rule**
[MEASURED]. Measured result of the repairs: pricing eyebrow `letter-spacing:
1.96px` (0.14em of 14px), h1 `−1.62px`, sticky strip `background-color:
rgba(255,255,255,0.72)`, statistics 26px, card labels 11px, card hairlines the
brand purple tint.

---

## 6. Phase F — responsive and navigation results

Seven widths × eight routes × two schemes = 112 combinations, plus a
`/vs/notion` spot check [MEASURED, `final-shell.json`]:

| Check | Result |
| --- | --- |
| Horizontal overflow (`scrollWidth − clientWidth`) | **0 at every one of the 112 combinations** |
| Header height | 64px below 768, 72px from 768 |
| Nav row visible | from 1024 (hidden below; hamburger takes over) |
| Nav/action overlap | none — minimum clearance 11px at 1024, 145px at 1440 |
| Smallest tap target | **44×44** (was 40×40 menu button and a 24px inline link) |
| Footer stacking | 1 column < 768, 2 columns from 768, 4-track grid from 1024 |
| Theme toggle | works on all routes/widths (0 failures) |
| Keyboard | first stop `Skip to content`; 0 stops without an outline |
| Page errors | 0 across 112 rows |

Widths where the header chrome changes: 320–767 (logo + icon toggle from 360px +
`Get started` + menu), 768–1023 (same, roomier), 1024–1199 (full seven-link row
at 10px padding), ≥1200 (full row at the measured 12px padding).

---

## 7. Phase G — accessibility

### 7.1 axe-core

`axe-core` 4.14.0 (the repository's own devDependency), ruleset
`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`, after a full
scroll pass, on 8 routes × 3 widths (320/768/1440) × 2 schemes = **48 scans**.

| | Before | After |
| --- | --- | --- |
| Scans | 48 (8 routes × 3 widths × 2 schemes) | 54 (48 + 6 `vs/notion` spot checks) |
| Violations | **1 rule, 8 nodes, on all 6 `/changelog` scans** (`label-content-name-mismatch`, serious) | **0** |
| Passing rule checks | — | 2,262 |
| Incomplete, all `color-contrast` | 628 nodes | 634 nodes (unchanged per route — see §7.2) |

The violation is fixed at source:
`aria-label={`${entry.sourceLabel} — verify ${entry.title} on GitHub`}` — the
visible label now leads the accessible name (WCAG 2.5.3), and the screen-reader
sentence stays readable.

### 7.2 Manual contrast inspection of the incomplete set

axe cannot resolve text over a gradient, an image or a decorative overlay.
`scripts/sample-marketing-contrast.mjs` samples the **rendered pixel** beside
each text box, composites the computed colour (including alpha) over it and
computes the WCAG 2.x ratio. Full output:
`docs/evidence/marketing-consistency/manual-contrast.txt` (37 checks).

| Surface | Ratio | Needs | Result |
| --- | --- | --- | --- |
| Home hero note (12px, `--lm-muted` on card) | 5.01 | 4.5 | PASS |
| Home closing CTA headline (64px white on gradient) | 10.66 | 3 | PASS |
| Home closing CTA body (19px, `#efebff`) | 7.32 | 4.5 | PASS |
| Dark pricing card title / body | 15.68 / 9.88 | 4.5 | PASS |
| Works-with chip inside the purple frame (10px) | 4.71 | 4.5 | PASS |
| `/solutions` stage headline (36px white) | 10.51 | 3 | PASS |
| `/solutions` stage body (16.5px, 74% white) | 6.21 | 4.5 | PASS |
| `/features`, `/integrations`, `/changelog` stage headline | 10.54–10.58 | 3 | PASS |
| `/features`, `/changelog` stage body (19px, 76% white) | 6.04–6.15 | 4.5 | PASS |
| Gradient headline, first stop `#6246ea` | 5.86 | 3 | PASS |
| Gradient headline, middle stop `#8b5cf6` | 4.23 | 3 | PASS |
| **Gradient headline, last stop `#c084fc`** | **2.64** | 3 | **FAIL** |
| Soft gradient on the stage (216/234/246 lavender) | 6.50–7.12 | 3 | PASS |
| **Stage note, 60% white on the gradient** | **3.56** | 4.5 | **FAIL** |

Two measured failures, both inherited from the reference recreation and both
inside the approved design:

1. The last third of every gradient headline (`/`, `/features`, `/solutions`,
   `/integrations`, `/changelog` heroes) paints `#c084fc`, which reaches only
   **2.64:1** on white — below the 3:1 large-text bar, though the headline is
   67.2px/600 so the bar that applies is 3:1, not 4.5:1.
2. The closing-stage note (`--lm-cta-faint`, 60% white, 14px) measures
   **3.56:1** where it sits on the lighter part of the stage gradient.

Both are recorded as **[RECOMMENDATION]**, not applied: changing a measured
reference colour or the approved closing-stage copy weight is a design decision,
not a consistency fix. The smallest candidate changes, if approved, are:

* darken the gradient's final stop from `#c084fc` to `#b06cf0` (3.36:1 — the
  smallest shift that clears 3:1; `#a855f7` gives 3.96:1 and `#9d4edd` 4.60:1
  if a stricter bar is wanted);
* lift `--lm-cta-faint` from 60% to 74% white — the step the stage body below
  it already uses, which measures **4.58:1** at the same sampled point (76%
  gives 4.75:1, 80% gives 5.05:1).

Computed on the same sampled background (`rgb(97,66,191)`), so these are
like-for-like replacements for the two failing values.

### 7.3 Everything else in the AA checklist

Heading hierarchy: exactly one `h1` per route, no skipped levels (axe
`heading-order` passes). Keyboard: skip link first, Radix dialog traps and
returns focus, Escape closes. ARIA: the announcement band is a labelled region,
the sticky strips are labelled, the mockups are `role="img"` with a
"fictional client" label. Reduced motion and no-JS: §5.5. Theme switch: §5.4.

---

## 8. Phase H — performance and LCP

The four PR #53 scenarios, three fresh runs each, all numbers from the page's
own `PerformanceObserver` entries [MEASURED, `lcp-final.json`]. Chromium
153.0.8010.0, produced build, loopback server (`next start`), light scheme.

| Scenario | Viewport / conditions |
| --- | --- |
| A | 412×823 @1.75 DPR, unthrottled |
| B | 412×823 @1.75 DPR, 4× CPU throttle (CDP `Emulation.setCPUThrottlingRate`), network unthrottled |
| C | 1440×900 desktop |
| D | 412×823 @1.75 DPR, `prefers-reduced-motion: reduce` |

Median LCP (ms), before → after where the pass changed the route:

| Route | A | B | C | D | CLS | LCP candidate (A) |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 180 | 396 | 256 | 220 | 0.000 | hero lead `p.lm-hero-in` |
| `/features` | 128 | 224 | 124 | 100 | 0.000 | hero lead |
| `/solutions` | 104 | 208 | 132 | 128 | 0.000 | hero lead |
| `/integrations` | 104 | 248 | 116 | 100 | 0.000 | hero lead |
| `/pricing` | **204 → 104** | **556 → 220** | **224 → 116** | **100 → 112** | 0.000 | **`h1.lm-hero-in`** (was: a `Reveal`-wrapped h1) |
| `/changelog` | 96 | 204 | 112 | 84 | 0.000 | hero lead |
| `/about` | 96 | 184 | 100 | 104 | 0.000 | intro paragraph |
| `/vs` | 100 | 160 | 112 | 104 | 0.000 | limits note |

Every route is far under the 2,500ms budget in every scenario (worst: 396ms at
4× CPU on `/`), and CLS is **0.000** everywhere. At first paint the LCP element
on all eight routes reports `opacity: 1`, `visibility: visible`, `filter: none`
— no route starts its LCP candidate at zero opacity.

**What is not claimed.** Lighthouse was not installed, so no Lighthouse LCP or
performance score is reported; the PerformanceObserver median is the primary
instrument. Throttling is CPU-only (4000 kbps / 4× latency network shaping was
deliberately not applied, matching the method recorded for `/features` and
`/solutions`), so these are not field-equivalent numbers. INP is [UNVERIFIED]
(U4).

---

## 9. Phase I — content and pricing safety

| Check | Result |
| --- | --- |
| Forma branding in visitor-facing copy | none found in the rendered text of any audited route |
| Copied task-manager mock data | none — every mockup is labelled "fictional client" and carries roducq's own concepts |
| Fabricated integrations or release claims | `/integrations` lists 3 connectors + 4 native outputs, each cited in its content module; `/changelog` entries all carry a real PR link |
| Misleading Connect buttons | none — connector cards are informational, no fake OAuth triggers |
| Unsupported product features | unchanged from the audited baseline |
| Real customer data | none — mockups use fictional names |
| Pricing | **Starter $29 / Team $79 / Studio $199**, three plans, no Enterprise card (asserted by `tests/components/pricing.test.ts`) |
| Annual billing / checkout | untouched — `ANNUAL_PRICES` stays empty, the annual tab keeps showing the pending notice, no billing code was modified |

No file under `lib/razorpay.ts`, `app/api/**`, `supabase/**` or the auth stack
was touched by this pass (`git diff --stat` lists 14 files, all
marketing-surface or test files).

---

## 10. Changes implemented

| # | File | Change | Evidence |
| --- | --- | --- | --- |
| 1 | `components/marketing/SiteHeader.tsx` | Removed the pathname variant gate; one `NAV` (7 destinations), one approved chrome, one theme toggle, one `Get started`; nav padding 10px below 1200 / measured 12px above; menu button 40→44px | V1–V5, V9 |
| 2 | `app/(marketing)/pricing/page.tsx` | Hero moved out of `<Reveal>` onto the shared `.lm-hero-in` ladder (opacity-preserving, clip-path mask); display step switched to the reference's 1200px boundary | V7, V10 |
| 3 | `tailwind.config.ts` | Added `lm-26`; `letterSpacing` `lm-display/-eyebrow/-label/-title/-price`; `lineHeight` `lm-body/-heading/-normal`; colour `chip-wash`; indentation fix for `cta-button-ink` | V6 |
| 4 | `app/(marketing)/landing.css` | Declared `--lm-size-26`, `--lm-leading-body`, `--lm-tracking-*` (documented values labelled, inferred ones marked) | V6, U2 |
| 5 | `components/marketing/landing/SectionHeading.tsx` | `text-lm-11` → `text-lm-chip` (the 11px step that exists) | V6 |
| 6 | `components/marketing/landing/FinalCta.tsx`, `WorkspacePreview.tsx` | `border-lm-border-hairline` → `border-lm-hairline` | V6 |
| 7 | `components/marketing/landing/changelog/ChangelogFeed.tsx` | Verify-link accessible name now leads with the visible label | V8 |
| 8 | `components/marketing/landing/features/FeaturesShowcase.tsx` | Inline link given the 44px floor | V9 |
| 9 | `tests/components/marketing-header.test.ts` (new) | 14 regression tests for the single header, the token mappings, the pricing hero and the two a11y fixes | all |
| 10 | `tests/components/{changelog,features,integrations}-page.test.ts`, `forma-phase-f.test.ts`, `vs-comparisons.test.ts` | Repointed the assertions that encoded the removed per-route gate; no assertion was deleted without a replacement for the same guarantee | V1–V5 |
| 11 | `scripts/verify-marketing-consistency.mjs` (new) | The four-phase evidence harness used for every number in this doc | — |
| 12 | `scripts/check-marketing-utilities.mjs` (new) | Fails if any `lm-*` utility in the marketing markup has no compiled rule | V6 |
| 13 | `scripts/sample-marketing-contrast.mjs` (new) | Rendered-pixel contrast sampling for the incomplete axe set | §7.2 |
| 14 | `docs/evidence/marketing-consistency/**` (new) | Raw baseline and final evidence | — |

Not changed, deliberately: every page body/section component, all content
modules, the footer, `landing.css`'s existing values, every `Reveal`/motion
constant, all tokens' existing values, the authenticated app, auth, billing.

### Verification of the changes

| Gate | Result |
| --- | --- |
| `npm test` | **1,235 pass / 0 fail** (302 → 306 suites; +14 new tests) |
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass |
| `npm run build` | pass (45 static pages; route table unchanged) |
| `tsconfig.json` after build | **unmodified** (`diff` against the pre-build copy is empty) |
| `node scripts/check-marketing-utilities.mjs` | 240 utilities, 0 dead |
| axe-core | 0 violations / 48 scans |
| Overflow | 0 / 112 combinations |

---

## 11. Dependency advisory status

`npm audit` on this branch (not fixed here — the same posture the repository has
recorded since PR #50):

```
11 findings: 1 critical, 3 high, 7 moderate
  next         16.0.0–16.4.0   critical  draft-mode/cache issues, fix available
  sharp        <0.35.5         high      librsvg CVE-2026-96889, fix available
  source-map-js 1.0.0–1.2.1    high      DoS via indexed source maps, fix available
  zod          <4.6.6          high      memory exhaustion, fix available
```

**This is a change since the last recorded audit** (13 findings, **0
critical** in `docs/FINAL_GO_LIVE_READINESS.md` §C4): a critical advisory
against the installed `next@16.3.6` has been published since. No advisory is
reachable from anything this pass touched, `npm audit fix --force` was **not**
run, and no dependency version was changed. Recommended as its own
compatibility change.

---

## 12. Remaining `[UNVERIFIED]` items and known limitations

- **[UNVERIFIED] U1** — the reference at 1024px was never captured, so the
  10px nav padding in that band is a Roducq decision, not a measured value.
- **[UNVERIFIED] U2** — `tracking-lm-label`, `-title` and `-price` are taken
  from the closest values in the marketing corpus (0.14em / −0.02em / −0.03em),
  not from a measurement of this page.
- **[UNVERIFIED] U3** — all dark-mode values remain inferred: the reference is
  light-only. Dark was verified for consistency *between routes* here, not for
  fidelity to a reference that has none.
- **[UNVERIFIED] U4** — field INP; only lab proxies exist.
- **[UNVERIFIED] U5** — Lighthouse LCP and performance score: Lighthouse is not
  installed in this workspace.
- **[UNVERIFIED] U6** — Firefox and WebKit were not exercised; every browser
  number in this document is Chromium 153.
- **[RECOMMENDATION]** — the two measured contrast failures in §7.2.
- **[RECOMMENDATION]** — the `next` critical advisory in §11.
- The reference site remains unreachable from this sandbox (egress allowlist),
  so no new Forma capture was made; all reference values are the existing
  measured ones from `docs/FORMA_*_REFERENCE.md`.
- This document does **not** claim pixel-perfect fidelity. Where evidence is
  incomplete it is marked, and the two known contrast shortfalls are stated
  rather than papered over.
