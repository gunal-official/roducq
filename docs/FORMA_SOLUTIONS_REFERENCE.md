# Forma `/solutions` — measured reference capture (Phase 0)

Reference: <https://forma-visuvate.framer.website/solutions>
Captured: **2026-10-18** (run window 04:47:31–04:48:37 UTC)
Branch: `arena/1ebec4c7-roducq` (from `main` @ `3315a1f`)
Status: **Phase 0 complete.** This document is capture evidence only. It
contains no build plan (Phase A) and no Roducq content (content gate).

---

## 0. Labeling contract

Every value in this document carries one of:

| Label | Meaning |
| --- | --- |
| **MEASURED** | Read from the live page by a real Chromium run on 2026-10-18 via `getBoundingClientRect()` / `getComputedStyle()` / the Web Animations API / `SVGAnimationElement` timing accessors / `IntersectionObserver` construction options / `MutationObserver` / `PerformanceObserver` / raw DOM / raw screenshot pixels. |
| **INFERRED** | Not directly measurable in this run. The reason is stated inline. Never used as ground truth without the reason. |

A text-only HTML fetch of the page was used **before** the capture solely to
design the instrumentation (what to hook). No value in this document comes
from that fetch. Rendered truth is the Chromium run.

## 1. Capture method and evidence

| | |
| --- | --- |
| Workflow | `.github/workflows/forma-solutions-reference.yml` — dispatch-only design (see §1.2), run via its temporary development `push` trigger on this branch |
| Harness | `scripts/capture-solutions-reference.mjs` (new, same discipline as `capture-landing-reference.mjs`) |
| Browser | Real Chromium **153.0.8010.12** (`playwright-core` + `npx playwright-core install --with-deps chromium` on `ubuntu-latest`) |
| Run | GitHub Actions run **39098261286**, job 117589078656, 2m8s, 0 failures (`solutions-failures.json` = `[]`) |
| URL captured | `https://forma-visuvate.framer.website/solutions` (final URL, no redirect) |
| Viewports | 1440×900 (desktop), 768×1024 (tablet), 390×844 (mobile) |
| Colour schemes | `light` and `dark` emulation for each viewport (6 runs) |
| Evidence | Git branch **`arena/forma-solutions-capture`** (orphan evidence branch, same convention as `arena/forma-reference-capture`) + Actions artifact `forma-solutions-capture` (14-day retention) |
| Page title | `Forma for Teams — Product, design, marketing, and ops` |

Evidence files (`docs/screenshots/forma-solutions-reference/` on the capture
branch; also downloadable from the Actions artifact):

| File | Contents |
| --- | --- |
| `sol-<vp>-<theme>-structure.json` | section order + boxes, headings, link inventory, bounded full-document outline (tag/class/attrs/text/box/style subset for 847–872 nodes), fonts, document metrics |
| `sol-<vp>-<theme>-styles.json` | full 59-key computed style for 486–500 visible semantic elements + all `@keyframes` + `body` token rules |
| `sol-<vp>-<theme>-svgs.json` | **raw `outerHTML` of every `<svg>`** (full path data), all attributes, computed style, SMIL nodes with runtime timing accessors, CSS/WAAPI/JS animation state per SVG, per-SVG mutation log, canvas/img/video inventory |
| `sol-<vp>-<theme>-motion.json(.gz)` | WAAPI first-seen log (timing + keyframes + scroll state at creation), raw `Element.prototype.animate()` calls as written by page JS, IntersectionObserver constructions (threshold/rootMargin), MutationObserver log, PerformanceObserver entries, scroll samples, live animation snapshot |
| `sol-<vp>-<theme>-dom.html.gz` | the settled raw DOM |
| `forma-solutions-<vp>-<theme>-full.png` / `-sec-<nn>.png` | full-page and per-band screenshots |
| `solutions-summary.json`, `solutions-run-notes.json`, `solutions-failures.json` | per-run inventory + browser version + failure record |

Instrumentation was installed with `page.addInitScript` **before the page's
first script ran**: a 40 ms `document.getAnimations()` first-seen recorder,
an `Element.prototype.animate` wrapper (records the keyframes/options the
page's own JS passes), an `IntersectionObserver` subclass (records
threshold/rootMargin and observed targets), a subtree `MutationObserver`
(style/class/`d`/`transform`/geometry attributes, with old values), a
`PerformanceObserver` (largest-contentful-paint, layout-shift, longtask,
paint, navigation), and a 150 ms scroll sampler.

### 1.1 Limitations (honest)

* **Artifact download from Azure blob storage is blocked by the sandbox
  egress allowlist** (`productionresultssa14.blob.core.windows.net` →
  connection EOF). Evidence was therefore fetched from the
  `arena/forma-solutions-capture` branch on github.com. This is why the
  workflow publishes to that branch; nothing is missing from the capture.
* The **MutationObserver log hit its 6 000-entry cap** in every run (Framer
  writes inline styles at rAF rate). Late-page mutations may be absent from
  the log. Animation timing does **not** depend on the mutation log (it comes
  from WAAPI/`animate()` records), so this affects only low-level churn
  forensics.
* **Full-page screenshots omit the closing-CTA headline on desktop** while
  DOM + computed styles + the mobile screenshot prove it is present and
  visible (§4.5). Cause: Chromium `captureBeyondViewport` compositing of
  `will-change: transform` layers. **INFERRED** (the capture tooling cannot
  introspect its own compositor); the *content* is MEASURED (see §4.5).
* SMIL runtime accessors (`getStartTime()` etc.) were recorded for every
  SMIL node found. **No SMIL nodes exist on the page** (§5), so no SMIL
  timing was needed.
* Interactions (hover states, the theme-toggle button's second state, menu
  morphs) were **not** exercised. Hover/active styles are therefore
  **INFERRED** territory and are not listed as measured.
* Loop *durations for infinite animations*: no animation with
  `iterations: Infinity` exists in the WAAPI log or computed styles (§6);
  the mock's recurring behaviour is a chain of one-shot crossfades
  (§6.4) whose repeat cadence is timer/scroll driven; the cadence value
  itself is **INFERRED** from record timestamps (approx. 2–4 s per state
  change observed during the scroll passes), not from a declared loop
  duration.

## 2. Document metrics (MEASURED)

| Metric | 1440×900 | 768×1024 | 390×844 |
| --- | --- | --- | --- |
| scrollHeight | 5 451 px | 6 149.8 px | 7 145.9 px |
| overflowX (scrollWidth − clientWidth) | **0** | **0** | **0** |
| body background | `rgb(255,255,255)` | same | same |
| console errors | 0 | 0 | 0 |
| visible outline nodes | 872 | 847 | 847 |
| `<svg>` count | 22 | 22 | 22 |
| `<canvas>` / `<video>` / `<img>` | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| `@keyframes` rules in stylesheets | **0** | 0 | 0 |

All artwork is inline SVG + DOM. There is no raster imagery and no canvas.

**Dark scheme emulation changes nothing (MEASURED):** with
`colorScheme: dark`, body background stays `rgb(255,255,255)`, all 73 token
values are byte-identical to light, the page's theme marker stays "light".
The reference page is **light-only**.

## 3. Section order (MEASURED)

Five top-level bands (mobile/tablet/desktop share the order; boxes at 1440×900):

| # | Band | Box (1440) | Content |
| --- | --- | --- | --- |
| 0 | `section` "Page Hero" | 1240×354 @ y=69.7 (x=100) | eyebrow, h1, gradient highlight, lead |
| — | "Section nav" (sticky, sits between bands) | full width, sticky `top: 78px`, `z-index: 30` | 4 jump chips → `#product` `#design` `#marketing` `#operations` |
| 1 | `section` role showcase | 1440×3156 @ y=483.44 | **4 role categories** in one band (see §4.2) |
| 2 | `section` "Choosing a plan" | 1440×356 @ y=3639.44 | purple gradient card, 2 CTAs |
| 3 | `section` "Closing CTA" | 1440×751 @ y=3995.92 | purple gradient stage, headline + CTAs + "Getting started" checklist mock |
| 4 | `footer` | 1440×704 @ y=4746.75 | wordmark, blurb, 4 link columns, legal row |

A 12 px spacer (`framer-1dpi46e`) sits between hero and showcase. A sticky
site header (70 px) exists above band 0; it **fades in on scroll**
(§6.5).

Breakpoint deltas (MEASURED): at 390 the hero band is 358×375 (stacked),
the showcase band grows to 4 529 px (mocks move inline per category, §4.2),
"Choosing a plan" 412 px, Closing CTA 959 px, footer 745 px. At 768 values
interpolate (showcase 3 870 px). Section order is identical at all three.

## 4. Section anatomy

### 4.1 Page hero (MEASURED)

DOM (`data-framer-name="Page Hero"`): eyebrow `p`, `h1` `Title`, `p`
`Highlight`, `p` lead. Band padding: `92px 0 72px 0` desktop
(`56px 0 44px 0` compact, from the section's `--10ocmuz` / `--1reti8r`
custom properties).

| Element | Typography / colour |
| --- | --- |
| Eyebrow "Teams" | DM Sans 600, 14px / 16.8px, centred, `#5332d6` (`--token-a76a7cf6`) |
| `h1` "How different teams" | Manrope 600, **67.2px / 68.54px**, letter-spacing **−2.016px**, centred, `#1b1426` (`--token-0e73501c`) |
| `h1` word spans | 3 spans ("How", "different", "teams"), `display: inline-block`, each its own animation target (§6.1) |
| Highlight "use Forma" | separate `p` in the same 67.2px Manrope; one `span[data-text-fill]` with `background-image: linear-gradient(90deg, #6246ea 0%, #8b5cf6 50%, #c084fc 100%)` (`--token-a02920e8` / `--token-42523954` / `--token-780a95ac`) |
| Lead | DM Sans 400, **19px / 31.35px**, centred, `#687083` (`--token-26dbfae9`), measure ≈ 640 px |

The `h1` + Highlight compose the visible headline "How different teams use
Forma". The LCP element is the `h1` word span "different"
(§6.6).

Section nav chips (MEASURED): `<a href="./solutions#product">` etc., pill
`border-radius: 999px`, transparent background, padding 8×15, number DM
Sans 700 11px `#5332d6`, label DM Sans (chip height 37.7 px).

### 4.2 Role showcase — the four categories (MEASURED)

**The page uses exactly 4 role/use-case categories.** They are not 3, not
the homepage's Teams rows, and each carries the same internal skeleton.
Verified independently from the DOM outline of this page (not copied from
any other page).

At 1440: `section` (padding `20px 48px 40px`) → 1240-wide row →
left column 561.53 px with four `<article>` blocks (each 561.53×774) and
right column 606.47 px (`flex: 1.08`) holding the **sticky mock panel**.

Category skeleton (identical for all four; boxes from category 01 at 1440):

| Part | Value |
| --- | --- |
| Eyebrow row | number `01` (DM Sans 700 12px/24px, `#5332d6`) + label (`Product & engineering`, uppercase rendering, ≈170×18.6) |
| spacer | 14 px |
| `h2` headline | Manrope 600 **42px / 46.2px**, letter-spacing **−1.26px**, `#1b1426`; each word its own `span` (animation target) |
| spacer | 16 px |
| Body `p` | DM Sans 400 **17px / 28.9px**, `#687083`, measure 520 px |
| spacer | 30 px |
| `h3` "Workflows teams set up first" | DM Sans 600 **12px / 13.8px**, letter-spacing **0.96px**, uppercase, `#687083` |
| spacer | 4 px |
| Workflows list | 3 rows (540×77 each, max-width 540): number (`01`–`03`, DM Sans 700 12px/24px `#5332d6`, absolutely positioned 32 px indent) + `p` with `<strong>` lead-in (DM Sans, preset `wsaepz`) |
| spacer | 20 px |
| Templates row | pill (`background: #f9f7fc` (`--token-69795ccf`), `border-radius: 999px`) with label "Templates" (DM Sans 600 11px, letter-spacing 0.66px, uppercase, `#1b1426`) + list `p` (DM Sans 17px/28.9, `#687083`) |

The four categories (MEASURED copy, Forma's own words — recorded here as
evidence only; the content gate forbids reusing them):

1. **01 Product & engineering** — h2 "Roadmaps connected to shipped code".
   Body: "Keep roadmaps, specs, and feedback in one place. Engineers keep
   working in their code host, and everyone else can see progress without
   asking for an update." Workflows: "Roadmap to release." / "Pull
   requests, in context." / "Feedback that lands somewhere." Templates:
   "Product roadmap · Launch checklist · Bug triage".
2. **02 Design & creative** — h2 "Design reviews that end with a decision".
   Body: "Keep the brief, the files, and the feedback on one task.
   Designers get uninterrupted time, and stakeholders can check status
   without a meeting." Workflows: "Briefs with everything attached." /
   "Reviews that reach a decision." / "Deadlines that respect focus."
   Templates: "Creative brief · Design review · Brand request".
3. **03 Marketing & growth** — h2 "One calendar for every campaign". Body:
   "Put emails, posts, and launches on one calendar, with an owner for each
   step, so everyone knows what is going out and when." Workflows: "One
   campaign calendar." / "Content from draft to published." / "Launch-day
   checklists." Templates: "Campaign plan · Content calendar · Launch day".
4. **04 Operations & founders** — h2 "Processes that run on schedule".
   Body: "Turn recurring work into checklists with automatic handoffs, so
   the process does not depend on one person remembering every step."
   Workflows: "Processes that run themselves." / "Handoffs without gaps." /
   "A clear view of the business." Templates: "Employee onboarding ·
   Month-end close · Vendor review".

### 4.3 The sticky mock panel (MEASURED)

Right column, `position: sticky; top: 150px`, 606.47×710 px, clipped
(`overflow: clip`), background: purple gradient (pixel-sampled below) plus
two radial glow layers:

* glow A: `radial-gradient(70% 60% at 100% 0%, #cdb4ff8c 0%, transparent 65%)`
* glow B: `radial-gradient(60% 60% at 0% 100%, #f096e142 0%, transparent 70%)`

Panel gradient (MEASURED — pixel probe of `forma-solutions-1440x900-light-sec-01.png`):
top-left `rgb(54,40,140)`, top-right `rgb(141,119,219)`, bottom-left
`rgb(130,88,216)`, bottom-right `rgb(117,87,235)`, consistent with a
~150° gradient `#35278a → #5139c9 → #7658ec` (those exact stop values are
the measured token set used by the Choosing-plan/Closing-CTA stages, §4.4)
plus the two glows. The stops on this panel itself are taken from class
CSS without inline fallback: **INFERRED** as the same token trio (the
pixel probes confirm the family).

Four mock UIs live as absolutely-positioned layers inside the panel and
crossfade with scroll (§6.3). Each is a white card: `background: #fff`,
`border-radius: 16px`, `border: 1px solid #eae6f1`
(`--token-110579cb`), `box-shadow: rgba(8, 2, 30, 0.55) 0 30px 60px -24px`.

Mock UI inventory (MEASURED DOM text + boxes; all of this is Forma
task-manager domain content — evidence only):

1. **Release board** (card ≈502×265): header "● Release 2.4" + "Ships Sep
   24" pill (`#f9f7fc`, radius 999); 3 task rows (448×44): mono-ish id
   (`FRM-214`, `FRM-209`, `FRM-221`) + title ("Ship onboarding checklist",
   "Faster board rendering", "Focus mode for chat status"; DM Sans 500
   13.5px/20.93px, `#1b1426`) + status pill ("In review"/"Merged"/"In
   progress"; `Merged` pill `#f1e9ff` bg); footer "Release progress"
   (DM Sans 12px `#687083`) + track 302.9×6 (`overflow: clip`) with fill
   206.5×6 (≈68 % = 7/9) + "7 of 9".
2. **Design review** (card ≈487×322): header "Homepage v3" + "Review round
   2" pill; skeleton lines; a comment row with avatar "JK" and "Tighten
   the hero spacing"; badges "1" and "2" on the mock (avatar stack marker);
   "Approved by MR" text.
3. **Campaign calendar** (card ≈…): header "Autumn launch" + "September";
   weekday strip "Mon 21 … Fri 25"; event chips "Teaser email", "Social
   countdown", "Launch", "Press follow-ups"; column-divider bars 2×145 px.
4. **Onboarding checklist** (card ≈…): header "New hire onboarding" +
   "Automated" pill; 4 numbered steps ("Create accounts — IT · done
   automatically", "Send welcome pack — People team", "Schedule first-week
   check-in — Hiring manager", "30-day review — Hiring manager").

Panel footer (MEASURED): counter "01" (DM Sans 600 13px/20.15px, white) +
"/ 04" (DM Sans 400 13px, `rgba(255,255,255,0.6)`) + progress track
(`background: rgba(255,255,255,0.18); border-radius: 2px`) with a Fill bar.

**The sticky box is a child of a stretched column, not the column itself.**
At 1440 the outline is `.framer-l1vvvg` (606.5 × 3096, the stage column, full
band height) → `.framer-1pi3c7f` (606.5 × 710, `position: sticky; top: 150px`)
→ `.framer-f13bqf-container` (the stage). **MEASURED** (structure dump at
1440).

**Below 1200px the panel column is absent, not hidden-with-height.** Its class
list carries `hidden-srm3hm hidden-1xxithx`, the row flips to a column at
`@media (max-width: 1199.98px)`, and neither the 768x1024 nor the 390x844
structure dump contains `.framer-l1vvvg`, `.framer-1pi3c7f` or
`.framer-f13bqf-container` at all. **MEASURED.**

Each category then carries its **own inline purple stage** below the copy —
not a bare white card. Measured at 768 and 390: `framer-tzgt8t`, the same
150deg gradient, `overflow: clip`, radius **26px**, **no** shadow, and an
inset of **13px** at ≤809.98 (widening to **41px** in the 810–1199.98 band),
content-sized height. Widths: 358 at 390 and 736 at 768 — i.e. the full
column inside the 16px band gutter. Mock swap crossfades remain a
desktop-sticky behaviour; the compact page shows each category's own
miniature statically. **MEASURED** (structure dump at 390/768 + stylesheet).

### 4.4 "Choosing a plan" band (MEASURED)

Purple gradient card, `border-radius: 28px`, box-shadow
`rgba(33,20,56,0.04) 0 2px 4px, rgba(58,28,110,0.32) 0 40px 80px -30px`,
background `linear-gradient(150deg, #35278a 0%, #5139c9 52%, #7658ec 100%)`
(inline style, tokens `--token-0652ff0f` / `--token-8e8f5df4` /
`--token-6dc452e7`; pixel-probed at `rgb(64,46,163)` top-left →
`rgb(80,56,198)` mid → `rgb(104,77,223)` lower-right — consistent).

| Part | Value |
| --- | --- |
| Eyebrow "Choosing a plan" | DM Sans 600 13px/20.15px, white |
| `h2` "For a team, start with the Team plan" | Manrope 600 **36px / 39.6px**, letter-spacing −1.08px, white |
| Body | DM Sans 400 16.5px/28.05px, `rgba(255,255,255,0.74)`, measure 560 px |
| Primary button "Compare plans" | white bg, radius 10px, padding 14×26 (164×52) |
| Secondary button "Talk to sales" | `rgba(255,255,255,0.08)` bg, 1px `rgba(255,255,255,0.3)` border, radius 10px (141.6×52) |

### 4.5 Closing CTA band (MEASURED)

Stage card: same gradient/shadow/radius family as §4.4 (inline
`linear-gradient(150deg, #35278a 0%, #5139c9 52%, #7658ec 100%)`,
radius 28px, same shadow pair) with glow A/B layers.

Left column (565 px):

| Part | Value |
| --- | --- |
| Headline "Try Forma with your own projects" | Manrope 600 **64.8px / 66.1px**, letter-spacing −2.268px; words "Try", "Forma", "with" white `#ffffff`; words "your", "own", "projects" `span[data-text-fill]` with `linear-gradient(90deg, rgb(216,199,255) 0%, rgb(234,210,255) 50%, rgb(246,200,255) 100%)`; per-word container divs (each word an animation target) |
| Body "Start on the free plan, import a board, and see how much of your week it takes care of." | DM Sans 16.5px/28.05px, white-ish (`rgba(255,255,255,…)`) |
| Primary "Start for free" / Secondary "Try the demo" | same button geometry as §4.4 (white / translucent) |
| Fine print "Free plan available. No credit card needed." | DM Sans 400 14px/21.7px, `rgba(255,255,255,0.6)` |

Right column: the **"Getting started" checklist mock** (white card, radius
**18px**, shadow `rgba(8,2,30,0.6) 0 30px 60px -24px`, ≈467×288):
header "Getting started" + "2 of 4"; progress bar (6 px tall, fill 50 %);
4 rows (checkbox 20 px + label + status): "Connect your calendar — Done"
(checked, filled purple), "Import an existing board — Done" (checked),
"Add your first automation — Next" (highlighted row,
`rgba(...)` wash, empty checkbox with purple border), "Invite your team —
Later". Status text DM Sans 12px/18.6 `rgb(101,95,120)`.

**Headline screenshot caveat (MEASURED absence / INFERRED cause):** the
desktop full-page and band screenshots show the headline area blank, while
(α) the raw DOM contains all six words with `opacity: 1`, `transform:
none`, white/gradient fills; (β) the outline measures their boxes at
y≈4218–4359; (γ) the **mobile** band screenshot renders the headline
correctly. The desktop screenshot omission is therefore a full-page
capture compositing artifact (§1.1), not page behaviour. Re-verify with a
scroll-positioned viewport screenshot in any future capture pass.

### 4.6 Footer (MEASURED)

Wordmark "fforma." + tagline "Tasks, calendar, and automations in one
workspace, connected to the apps your team already uses." + 4 columns
(`h2` labels "Product", "Teams", "Company", "Legal", DM Sans 600 13px/16.9)
with links: Product → `./features`, `./solutions`, `./integrations`,
`./pricing`, `./changelog`; Teams → `./solutions#product` … (`Product and
engineering`, etc.); Company → `./about`, `./contact`; Legal →
`./security`, `./privacy`, `./terms`; "© 2026 Forma. All rights reserved."
plus a Framer badge link.

## 5. SVG artwork inventory (MEASURED)

22 `<svg>` elements, all `viewBox="0 0 24 24"`; full raw markup with path
data is in `sol-<vp>-<theme>-svgs.json` (this is the authoritative path-data
record). Summary:

| Group | Count | Anatomy |
| --- | --- | --- |
| Header theme toggle | 2 | sun (`<circle cx=12 cy=12 r=4>` + 8-ray path `M12 2v2M12 20v2M4.93 4.93l1.41 1.41…`) and moon (`M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z`). `stroke-width="2"`, `stroke-linecap/linejoin="round"`, `stroke="var(--token-0e73501c…)"`, `fill="none"`, `aria-hidden="true"`. |
| Sprite definitions (hidden, 0×0 at capture) | 16 | Framer icon pattern: one `<svg id="…">` per icon holding 1–10 `<path>`s with `transform="translate(x y)"`, `stroke="var(--1m973uw, rgb(0,0,0))"`, `stroke-width="var(--js9iwy, 2)"`, `stroke-dasharray=""`, `stroke-linecap/linejoin="round"`. Identified shapes include check, calendar (rounded rect + ticks, 10 paths), chevron/arrow (`M 0 7 L 7 0 L 14 7` + `M 0 14 L 0 0`), upload/download arrows, and 4–5 path app/glyph icons. |
| Visible `<use>` instances | 4 | e.g. `data-framer-name="Check"` → `<use href="#3338047389">`, themed via `--1m973uw` / `--js9iwy` custom properties (`opacity: 1` inline). |

**No SMIL** (`<animate>` / `<animateTransform>` / `<animateMotion>` /
`<set>`) anywhere. **No WAAPI/`animate()`/CSS animation targets any SVG
element** (all 87 WAAPI records and 88 `animate()` calls hit HTML nodes;
per-SVG `waapi`/`animateCalls` arrays are empty). The only SVG-adjacent
churn in the mutation log is sprite child-list swaps (2–10 records per
sprite). Conclusion: on this page the icons are **static artwork**; motion
lives in HTML layers (§6). No stroke-dashoffset draw, orbit, or float loop
exists on `/solutions` to recreate — any such behaviour in the build would
be invention.

## 6. Animation behaviour (MEASURED)

All motion is JS-driven `Element.animate()` (Framer's engine); stylesheets
contain zero `@keyframes`. Every recorded animation has
`iterations: 1` (nothing infinite). Fill mode `both`, direction `normal`
on all sampled calls.

### 6.1 Headline word dissolve — 900 ms, 50 ms stagger

Per word `span`, **two parallel `animate()` calls**:

```
filter:   ["blur(10px)", "blur(0px)"]
opacity:  [0.001, 1]
duration: 900
easing:   cubic-bezier(0.16, 1, 0.3, 1)
delay:    50 ms × word index   (hero words 50/100/150; category h2 words
                               0/50/100/150/200/(250/300); the gradient
                               Highlight "use Forma" is one div target
                               with opacity [0.001, 1] at delay 350)
```

Targets confirmed: hero `h1` spans, the Highlight div, and every category
`h2` word span (4 h2s × 5–7 words). 50 span/2 div records at 1440 light.

### 6.2 Eyebrow + lead rise — 800 ms

```
opacity:   [0.001, 1]
transform: ["translateY(16px)", "none"]
duration:  800
easing:    cubic-bezier(0.2, 0.7, 0.2, 1)
delay:     eyebrow 0 ms, lead 450 ms
```

(Framer's 10 000 ms linear `opacity: [0.001, 0.001]` "hold" call appears
once, on the eyebrow wrapper, holding the pre-reveal state.)

### 6.3 Mock panel crossfades — 500/700 ms

Mock layers and mock-internal elements fade with:

```
opacity: [1, 0]   (exit)  and  [0, 1]  (enter)
duration: 500     easing: cubic-bezier(0.2, 0.7, 0.2, 1)
duration: 700     easing: cubic-bezier(0.2, 0.7, 0.2, 1)   (delay 80 on
                the big mock-card exit/enter; 14 records)
```

Status-pill state swap ("In review" ↔ "Merged") uses
`opacity [0,1]` 500 ms `cubic-bezier(0.42, 0, 0.58, 1)` (ease-in-out) and
its inverse; a divider-bar pair uses 500 ms `cubic-bezier(0.65, 0, 0.35, 1)`
(0→1) and 300 ms `cubic-bezier(0.25, 0.1, 0.25, 1)` (1→0).

### 6.4 Scroll triggers (MEASURED)

`IntersectionObserver` constructions recorded:

| Config | Count | Use |
| --- | --- | --- |
| default (`threshold: 0`, no rootMargin) | 50 | per-element view reveals (Framer `whileInView`) |
| `threshold: [0, 0.01 … 0.99]` (100 steps), `rootMargin: 0px` | 23 | scroll-progress tracking (mock counter/progress bar, sticky orchestration) |
| `threshold: 0.3`, `rootMargin: 0px` | 4 | **mock-swap triggers — one per category heading** (`#product`, `#design`, `#marketing`, `#operations`; each 562 × 92 at left 100, all constructed at t≈567 ms) |

Empirical trigger geometry (from first-seen records with target rects +
scrollY): category h2 word animations begin as each article crosses into
the viewport during the scroll pass (records at scrollY 0 / 1080 / 1620 /
2160 for the four articles); the reveal is one-shot per element per pass
(no re-hide observed on the word spans; the closing-CTA mock internals
crossfade both directions as states swap).

### 6.5 Header fade-in — 350 ms

`opacity [0, 1]`, 350 ms, `cubic-bezier(0.2, 0.7, 0.2, 1)` on
`header > div`, first recorded at scrollY 540 — the sticky header appears
after scrolling past the hero. (Initial hidden state before first scroll is
**INFERRED** as opacity 0 from the keyframes direction; it was not captured
mid-state.)

### 6.6 PerformanceObserver (MEASURED)

| Entry | Value |
| --- | --- |
| first-paint / first-contentful-paint | 648 ms |
| **LCP** | 648 ms, size 49 248 px², element = `h1 > span` "different" (263×69 at capture) |
| layout-shift | 0.115 at 683 ms (input-unrelated) + 0.008 at 1 236 ms (CLS settles below 0.1 after load) |
| navigation duration | 958 ms |

**LCP-safety note for the rebuild:** on the reference the LCP candidate is
a headline word whose entrance is filter-blur + opacity-0.001 (it paints
immediately). Roducq's rebuild must use the PR #53 clip-path mask
technique (opacity 1 throughout) instead of any opacity-zero start — that
is a Roducq constraint, and it is compatible with this measured timing
(durations/delays can be preserved without the opacity-zero start).

## 7. Design tokens (MEASURED — 73 custom properties on `body`)

Full list in `sol-<vp>-<theme>-styles.json` → `tokenRules`. Highlights:

| Token (suffix) | Value | Use |
| --- | --- | --- |
| `0652ff0f` | `#35278a` | gradient stop 0 % |
| `8e8f5df4` | `#5139c9` | gradient stop 52 % |
| `6dc452e7` | `#7658ec` | gradient stop 100 % |
| `a02920e8` | `#6246ea` | brand purple / hero gradient 0 % |
| `42523954` | `#8b5cf6` | hero gradient 50 % |
| `780a95ac` / `d8a8ca3f` | `#c084fc` | hero gradient 100 % / accents |
| `a76a7cf6` | `#5332d6` | eyebrow/number purple |
| `0e73501c` / `72b5c6e1` | `#1b1426` | ink |
| `26dbfae9` | `#687083` | body grey |
| `1e1b0a73` / `1f4d5b4b` / `dfd4eace` / `ca7049d5` | `#8b94a7` / `#8c95a9` / `#9ba4b6` / `#a7afc0` | muted greys |
| `69795ccf` | `#f9f7fc` | pill background |
| `55891fda` / `b1763ae2` / `8099445c` | `#f2eef8` / `#f4edff` / `#efebff` | soft purple washes |
| `110579cb` | `#eae6f1` | hairline border |
| `5eae855b` | `#f1e9ff` | status pill bg |
| `63de34c4` | `#15803d` | success (check icon) |
| `a43e5120` / `aa316c6d` | `#cdb4ff8c` / `#f096e142` | panel glows |
| `a4432517` / `9d523a21` / `ddd6ea` | `#eee9f5` / `#ddd6ea` / `#ddd6ea` | borders |

Fonts (MEASURED): **Manrope** (display, weight 600/semibold, also
"Manrope Placeholder" fallback) and **DM Sans** / **DM Sans Variable**
(body/UI, 400/500/550/600/700). `Arimo` appears in the Framer badge only.

## 8. What this capture does *not* claim

* Hover/active/focus states, the theme button's crossfade between sun/moon,
  and menu-open states were not exercised → **INFERRED** territory.
* Exact sticky orchestration maths beyond `top: 150px` / `top: 78px` and
  the 0.3 swap threshold (e.g. how the counter increments per pixel of
  scroll) are derived from the 100-step progress observers; the precise
  mapping function is **INFERRED**.
* Mock micro-animation cadence (how often the status pill loops) is
  **INFERRED** from timestamps (§1.1).
* The desktop closing-CTA headline's painted output is proven by DOM,
  computed style, and the mobile capture; the desktop raster omission is
  **INFERRED** as a capture artifact (§1.1, §4.5).

---

## 9. Refinement pass, 2026-10-18 (corrections and additions)

This section was added by the implementation pass on
`arena/f6a4212d-roducq`, after the capture was re-read against the built
page. Every value below is re-read from the artifacts in
`docs/screenshots/forma-solutions-reference/baseline-2026-10-18T12-07Z/`.
Implementation decisions live in `docs/SOLUTIONS_IMPLEMENTATION.md`.

### 9.1 Values re-read from the raw-DOM dump (not `getComputedStyle`)

The harness's `STYLE_KEYS` (line 127 of
`scripts/capture-solutions-reference.mjs`) does not include `top`, `left`,
`z-index`, `width`, `height` or `transition*`. Two sticky offsets are quoted
in §3 and §4.2 and were **not** invented: they come from the reference's own
stylesheet, which the capture stores verbatim in
`sol-<vp>-<theme>-dom.html.gz`.

| Selector (reference) | Declaration | Source |
| --- | --- | --- |
| `.framer-1gjmmyz` (category strip) | `position:sticky; top:78px; z-index:30; padding:0 16px` | CSS text |
| `.framer-1pi3c7f` (mockup stage) | `position:sticky; top:150px` | CSS text |

Both are **MEASURED** in the sense of "read from the page the browser
rendered", but the reading is of the stylesheet, not of a computed value.

### 9.2 Correction to §6.3 — the crossfade is 700 ms both ways

§6.3 records the crossfade as "500 ms / 700 ms". Re-reading all 14 records in
the `waapiFirstSeen` array shows both directions are the same:

```
duration: 700   delay: 80   easing: cubic-bezier(0.2, 0.7, 0.2, 1)
  opacity [1 → 0]   (slide leaving the stage)
  opacity [0 → 1]   (slide entering the stage)
```

The distinct 500 ms group (`dur=500`, `delay=0`, recorded at `scrollY: 0`
against the comment card inside miniature 02 — "JK / Tighten the hero
spacing", "Approved by MR") is the mock's **ambient content cycling**, not the
stage crossfade. The earlier reading appears to have conflated the two.

Also measured here and not in §4.3: an inactive slide sits at
`transform: matrix(0.97, 0, 0, 0.97, 0, 0)` while the active one is
`transform: none`. Whether that scale is *transitioned* is **INFERRED** — no
`transform` animation appears in the 88 recorded `animate()` calls, and the
harness does not collect `transition*` as a computed property.

### 9.3 Corrections to §4 — values the build had wrong

| § | Element | Value in §4 | Correction |
| --- | --- | --- | --- |
| 4.1 | Hero eyebrow → headline | — | 10 px spacer (y 178.5 → 188.5); the build used 20 px |
| 4.1 | Hero headline → lead | — | 32 px spacer (y 257.1 → 289.1); the build used 24 px |
| 4.2 | Article box | 774 px tall | Confirmed, and the **content is vertically centred in 48 px padding** — which is why four articles of 532.9–590.7 px all pitch at 774. The build had no padding and no centring |
| 4.2 | Category index row | — | **No rule.** `border-width: 0` on every side. The build drew a `border-b` |
| 4.2 | Workflow row | — | `padding: 14px 0 15px`, not 12/12 |
| 4.2 | Index number weight | — | **900** (DM Sans). Roducq ships Manrope only (200–800), so 800 is the heaviest real weight |
| 4.2 | Templates chip | — | 19.2 px tall (3 px padding around a 13.2 px line box) |
| 4.3 | Progress rail | — | **2 px** tall, radius 2, `rgba(255,255,255,0.18)`; fill **solid white**, radius 0 — not 6 px, not accent purple |
| 4.3 | Stage geometry | 24 px radius (§4.3) | Radius **24** and shadow `rgba(30,16,80,0.45) 0 40px 80px -40px` — distinct from the closing CTA's 28 px and hairline+lift pair |
| 4.4 | Plan band | — | Radius 24, **no shadow at all**, content padding 49 px (desktop) / 21 px (≤768), 120 px band padding on **top only** (0 bottom). Buttons are a **right-hand 316 px column**, centred, 40 px from the copy, 10 px apart — not stacked underneath |
| 4.5 | Closing CTA | 64.8 px headline | Radius **22 px below the desktop band** (28 at desktop); padding 96/72 at desktop, 56/20 below; body **19 px** on `rgba(255,255,255,0.76)`; columns **565 / 467 with a 64 px gap** |
| 4.5 | Getting-started card | — | White, radius 18, 24 px padding; title 17 px/600; counter 13 px/500; rail 6 px, radius 6, `#eeeaf7` track, `#6246ea` fill; tiles **20 px at radius 6** (rounded squares), labels 15 px; the `Next` row inset 12 px on `#f3efff` at radius 10 |

### 9.4 Confirmation of §5 — the mockups contain no SVG artwork

§5 concluded the icons are static artwork with nothing to recreate. The
refinement pass confirms the stronger claim: **none of the four mockups
contains any SVG at all.** Of the 22 `<svg>` elements, 6 have a non-zero box
and the largest is the 17 px theme-toggle glyph; the other 16 are 0×0
`role="presentation"` sprite templates. `canvas`, `image` and `video` counts
are all 0. Every mockup is HTML and CSS: a white card at radius 16 with a
`rgba(8,2,30,0.55) 0 30px 60px -24px` lift, holding rows, pills, rails and
text. There is no viewBox, path geometry, mask, clip or gradient to match —
only box values.

### 9.5 Breakpoints and the missing 1024 px band

Read from the stylesheet (`@media` blocks in the raw-DOM dump):

```
min-width: 1200px                        desktop
min-width: 810px and max-width: 1199px   tablet
max-width: 809.98px                      phone
```

Consequence for the six required widths: 320 / 375 / 390 / 768 all fall in the
phone or tablet band and share one fluid layout, so the captures at 390 and
768 cover them. **1024 px is the tablet band's only uncaptured width** and is
the sole reason a re-run is needed. The harness was extended from three
viewports to six (1440×900, 1024×768, 768×1024, 390×844, 375×812, 320×700) in
commit `48801c2`; the re-run had not landed when this section was written, so
**1024 px remains `[UNVERIFIED]`**.

### 9.6 The reference is light-only

The dark capture returns byte-identical values to the light one — the h1 is
still `rgb(27, 20, 38)`, the category strip still `rgba(255, 255, 255, 0.72)`,
the body background still `rgb(255, 255, 255)`. There is no dark design on
`/solutions` to match. Any dark value in the Roducq build is therefore
**INFERRED**, not measured.
