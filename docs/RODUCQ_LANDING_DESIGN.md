# roducq landing page — design system

**Reference:** <https://forma-visuvate.framer.website/>
**Status:** shipped on `/` (and the marketing shell that wraps `/about`, `/pricing`, `/vs`)
**Source of truth:** `app/(marketing)/landing.css` (tokens), `tailwind.config.ts` (mirrors), `app/(marketing)/home/content.ts` (copy)

---

## 0. What was borrowed, and what was not

The milestone was a *design replacement*: roducq's landing page now follows the
reference's **composition, rhythm and visual system**. It does not reproduce the
reference's **assets, words or brand**.

| Taken from the reference | Not taken |
| --- | --- |
| Section order and band structure | Forma's logo, wordmark, or product name |
| Two-action hero, masked headline reveal | Forma's marketing copy (not one sentence) |
| Card/panel proportions, hairline borders | Forma's screenshots and illustrations |
| The published type scale, radii, shadows, palette | Any third-party logo used as a "connector" badge |
| Motion language (rise, reveal, drift) | Testimonials or customer logos |

Every visual is original DOM/SVG built from roducq's own data model, and every
claim is checkable against this repository (see §9).

---

## 1. Structure

The landing page is **composition only** — `app/(marketing)/page.tsx` mounts ten
bands in order and holds no copy, no colours and no layout decisions of its own.

| # | Band | Component | Background |
| --- | --- | --- | --- |
| A | Announcement | `landing/AnnouncementBar.tsx` | `--lm-canvas-alt` |
| B | Header | `SiteHeader.tsx` (shared) | `--lm-canvas` @ 85% + blur |
| C | Hero | `landing/HeroSection.tsx` | `--lm-canvas` + blooms + grid |
| D | Features | `landing/FeaturesSection.tsx` | `--lm-canvas-alt` |
| E | Getting started | `landing/StepsSection.tsx` | `--lm-canvas` |
| F | Integrations | `landing/IntegrationsSection.tsx` | `--lm-canvas-alt` |
| G | Teams | `landing/TeamsSection.tsx` | `--lm-canvas` |
| H | Pricing | `landing/PricingSection.tsx` | `--lm-canvas-alt` |
| I | FAQ | `landing/FaqAccordion.tsx` | `--lm-canvas` |
| J | Final CTA + limits | `landing/FinalCta.tsx` | `--lm-canvas-alt` |
| — | Footer | `SiteFooter.tsx` (shared) | `--lm-canvas` |

The bands alternate canvas → wash → canvas, which is how the reference builds
depth without borders or shadows between sections.

### Components

```
components/marketing/
├── SiteHeader.tsx         sticky chrome, one nav model, Radix modal menu
├── SiteFooter.tsx         4-column quiet band, every link verified
└── landing/
    ├── Buttons.tsx        PrimaryLink/Button, SecondaryLink/Button, GhostLink
    ├── SectionHeading.tsx SectionHeading (eyebrow + split headline), CardLabel
    ├── AnnouncementBar.tsx
    ├── HeroSection.tsx
    ├── WorkspacePreview.tsx   the hero product frame (illustrative)
    ├── FeaturesSection.tsx    + inline automation panel
    ├── FeatureVisual.tsx      four DOM mocks, one per job
    ├── StepsSection.tsx       + engagement timeline + onboarding checklist
    ├── IntegrationsSection.tsx
    ├── TeamsSection.tsx
    ├── PricingSection.tsx     priced from live Razorpay config
    ├── FaqAccordion.tsx       native <details>
    ├── FinalCta.tsx           closing CTA + the limits callout
    └── Reveal.tsx             the only client component (scroll reveal)
```

---

## 2. Tokens

Everything below is declared **once**, scoped to `.rdq-marketing` in
`app/(marketing)/landing.css`, and mirrored as `lm-*` namespaces in
`tailwind.config.ts`. No component in `components/marketing/**` writes a hex
value, a pixel font-size, a shadow or an arbitrary radius — the test suite fails
the build if one does.

### Palette

| Token | Value | Role |
| --- | --- | --- |
| `--lm-canvas` | `#f9f7fc` | page wash |
| `--lm-canvas-alt` | `#f2eef8` | alternate band |
| `--lm-mint` | `#e7f7ed` | "included / on track" panel |
| `--lm-card` | `#ffffff` | card plane |
| `--lm-surface-muted` | `#eae6f1` | inset panels, mock chrome |
| `--lm-surface-accent` | `#efebff` | accent-tinted chips, active rows |
| `--lm-surface-neutral` | `#d1d5df` | chart baselines, disabled fill |
| `--lm-ink` | `#1b1426` | headlines |
| `--lm-ink-soft` | `#4b505f` | body copy |
| `--lm-ink-accent` | `#5332d6` | headline emphasis, links |
| `--lm-muted` | `#7a659f` | secondary on the pale canvas |
| `--lm-muted-alt` | `#7e66a7` | secondary on accent fills |
| `--lm-muted-slate` | `#687083` | reference secondary |
| `--lm-muted-sage` | `#969e99` | metadata on mint |
| `--lm-muted-gray` | `#9ba4b6` | **decorative only** |
| `--lm-accent` | `#6246ea` | primary action |
| `--lm-accent-strong` | `#5b3fe0` | hover / press |
| `--lm-accent-line` | `#7f67e6` | decorative strokes |
| `--lm-success` | `#15803d` | included / done |
| `--lm-border` | `#ac7dfc` | the signature brand hairline |

**Two derived steps exist for contrast, not aesthetics:**
`--lm-muted-readable` (`#75609a`) and `--lm-muted-label` (`#656d7d`). The
reference's `#7a659f` measures 4.38:1 and `#687083` 4.34:1 on the deeper wash,
both under the 4.5:1 body-text floor. The derived steps hold ≥4.55:1 against
canvas, canvas-alt *and* card, so a band can change background without its text
becoming unreadable. `#9ba4b6` (2.36:1) is never used for text that carries
meaning.

**Translucent values are named tokens, not opacity modifiers.** A Tailwind
`bg-lm-accent/45` cannot resolve against a `var()` colour — it compiles to no
rule at all and the fill silently disappears. `--lm-border-strong`,
`--lm-border-emphasis`, `--lm-scrim`, `--lm-header-wash`, `--lm-glow`,
`--lm-bar` and `--lm-dot-success` exist so nothing needs a modifier.

### Type

Manrope Variable, self-hosted (`app/fonts/manrope-latin-wght-normal.woff2`),
with `Arimo` → `DM Sans` → system fallbacks.

| Step | Token | Utility | Used for |
| --- | --- | --- | --- |
| 10px | `--lm-size-10` | `text-lm-10` | uppercase eyebrows, meta |
| 12px | `--lm-size-12` | `text-lm-12` | chips, captions, small buttons |
| 14px | `--lm-size-14` | `text-lm-14` | body, nav, card copy |
| 16px | `--lm-size-16` | `text-lm-16` | lead body, card headings |
| 18px | `--lm-size-18` | `text-lm-18` | hero intro, wordmark |
| 22px | `--lm-size-22` | `text-lm-22` | h3 |
| 29px | `--lm-size-29` | `text-lm-29` | h1/h2 on phones |
| 54px | `--lm-size-54` | `text-lm-54` | h2 desktop |
| 64px | `--lm-size-64` | `text-lm-64` | h1 desktop |

Weights: 400 / 600 / 700 only (`font-lm-regular`, `-semibold`, `-bold`).

### Radii

`--lm-radius-hair` 2px · `-tile` 3px · `-chip` 4px · `-control` 5px ·
`-row` 8px · `-panel` 10px · `-card` 14px · `-frame` 16px · `-pill` 999px ·
`-dot` 50%.

### Shadows

`--lm-shadow-none` · `-sm` `0 1px 2px rgba(33,20,56,.06)` · `-md`
`0 3px 9px rgba(47,24,88,.06)` · `-lg` `0 8px 20px rgba(91,66,136,.08)` ·
`-frame` (the hero's only heavy lift).

### Spacing

Tailwind's 4px grid already covers 1/2/4/6/8/10/12/14/16/20/32/36/48/52/88/120.
The config adds the reference's fractional steps `3 · 5 · 13 · 15 · 18 · 22 ·
26 · 30px` as `0.75 · 1.25 · 3.25 · 3.75 · 4.5 · 5.5 · 6.5 · 7.5`, and the whole
steps the default scale skips as `13 = 52px · 18 = 72px · 22 = 88px ·
30 = 120px`.

> **Why those four whole steps matter.** `py-13`, `md:py-22` and `lg:py-30` are
> the section rhythm. Before the steps were declared they compiled to *nothing*
> — no error, no warning, just sections with no vertical padding. The test suite
> now walks every spacing utility in the landing sources and fails on any step
> the scale does not define.

### Layout

`--lm-container: 1200px`, gutters 20 / 32 / 40px at the mobile / tablet /
desktop bands. One `.lm-shell` class applies the container, so every band
measures identically and the header lines up with the hero.

---

## 3. Responsive behaviour

| Band | Width | Behaviour |
| --- | --- | --- |
| Mobile | 320–767 | single column; nav collapses to a modal drawer; h1 at 29px; hero CTAs full-width; product frame drops its rail; stat row 2-up |
| Tablet | 768–1023 | 2-column grids; header 72px; h1 at 54px; features stack visual-over-copy |
| Desktop | 1024–1439 | full nav row; alternating feature rows; 4-up integration grid; 3-up pricing |
| Large | 1440+ | container caps at 1200px and centres |

The reference's bands (768 / 1024) are used, **not** the app shell's 600px
`tab:` band — the test suite rejects `tab:`/`desk:` variants in landing
components, because reusing the shell's breakpoints is how a marketing page ends
up with a 600px layout jump the reference does not have.

No fixed width on the landing surface exceeds 320px; `max-w-*` is unrestricted
(it cannot overflow).

---

## 4. Motion

| Name | Trigger | Implementation |
| --- | --- | --- |
| Line rise | page load | `@keyframes lm-line-rise`, one masked slot per headline line, 90ms stagger |
| Section reveal | scroll into view | `Reveal.tsx`, one `IntersectionObserver`, disconnects after firing |
| Bloom drift | ambient | `@keyframes lm-drift`, transform/opacity only, 14s |
| Hover | pointer | border/background/shadow transitions, 150–260ms |

Constraints enforced by tests:

- **No animation library.** `framer-motion`, `motion`, `gsap`, `react-spring`
  and `animejs` are asserted absent from `package.json`.
- **Transform and opacity only.** Landing keyframes may not animate `width`,
  `height`, `top`, `left`, `margin` or `padding`.
- **`prefers-reduced-motion`** resolves every reveal to its end state, stops the
  drift loop, and collapses transition durations to 1ms.
- **Server-rendered.** `.lm-reveal` ships visible in the HTML; the observer only
  replays the entrance, so no-JS and crawler views are complete.

---

## 5. Accessibility

- One `<h1>` per page; band headings are `<h2>`, card headings `<h3>`.
- Skip link → `#main` (44px target).
- All interactive elements: `:focus-visible` → 2px accent outline, 2px offset.
- 44px minimum on every link, button, summary and menu row.
- Icons are 16/20/24px and `aria-hidden` unless they carry meaning; 102 hidden
  decorative icons on the rendered page.
- The hero product frame is one `role="img"` with an accessible name that says
  it is illustrative; its ~60 mock nodes are hidden from assistive tech.
- The FAQ is native `<details>/<summary>` — keyboard operable, announced as
  expandable, works with JavaScript off.
- The mobile menu is a Radix dialog: focus trap, Escape, background isolation,
  focus return.
- Contrast is **measured, not asserted** — see §2 and
  `tests/components/home.test.ts → / landing colour contrast`.

---

## 6. Dark mode

The reference is light-only, but the theme switch is a real feature of this
shell. `.dark .rdq-marketing` remaps *the same token names* onto roducq's plum
palette — identical structure, no hybrid light/dark card. Canvas and card
reference `--forma-background` / `--forma-surface` directly, so the landing
surface and the product cannot drift apart.

---

## 7. Content rules

1. **Copy lives in `content.ts`.** Components are markup; `page.tsx` and the
   landing components contain no visitor-facing strings.
2. **No invented numbers.** The only figure on the page is the free plan's `$0`.
   The paid price is read from `RAZORPAY_PLANS` through `getPricesConfig()`
   /`formatPrice()` — the same read `/pricing` does. No config, no price row:
   the card shows `PRICES_UNCONFIGURED_NOTE` instead.
3. **No invented customers.** There is no testimonial band, because roducq holds
   no customer consent to quote. The Teams band describes *shapes of practice*,
   not named clients.
4. **No unsupported features.** "Calendar" does not appear anywhere: the
   reference puts a day-schedule panel in its steps band, and roducq has no
   calendar, so that slot shows one engagement moving through the pipeline
   instead.
5. **The limits stay.** `LIMITATION` ("no e-signature, no payment collection")
   and its explanation are rendered on the page — in the closing band *and* as
   a footer line — and repeated in the metadata description.
6. **Every link resolves.** A static route check walks all published hrefs and
   fails if the router does not serve one.

---

## 8. Verification

```bash
npm test                  # 1083 tests, incl. 80 landing-specific
npx tsc --noEmit          # clean
npx eslint .              # clean
npm run build             # 36 routes, / static
python3 scripts/build-home-screenshots.py   # evidence PNGs (needs Pillow)
```

The landing suite (`tests/components/home.test.ts`) covers: band order, hero
structure and accessible headline, the four feature blocks and their visuals,
the steps/engagement panel, integration honesty, team cards, pricing sourcing,
FAQ mechanics, the limits callout, truthfulness sweeps, palette parity with the
reference, token discipline, motion constraints, route integrity, responsive
guards, and computed colour contrast.

---

## 9. Section-by-section comparison

The reference was inspected by fetching and reading the live page (its DOM
text, in order). This table compares **structure and composition**, which is
verifiable without a browser. It is not a pixel comparison — see §10, Known limitations.

| # | Reference band | roducq band | Match | Deliberate deviation |
| --- | --- | --- | --- | --- |
| 1 | Announcement: one line + one link | Same shape | ✔ | Points at `/pricing`, not a changelog roducq does not have |
| 2 | Header: mark, 3–4 links, Log in, primary | Same shape | ✔ | Links resolve to `/about`, `/pricing`, `/vs` |
| 3 | Hero: announcement pill, 2-line headline, intro, 2 CTAs, reassurance line, "works with" strip, purple-framed dashboard preview | Same shape, same order | ✔ | Frame is roducq's own workspace (`WorkspacePreview`), labelled illustrative |
| 4 | Features: eyebrow, split headline, webhook rule panel, 4-column card grid (`lg:grid-cols-4`), text CTA | Same shape | ✔ | Rule panel shows real `proposal.accepted` → webhook |
| 5 | Getting started: 3 numbered cards, purple lower frame (`.lm-purple-frame`) with connected sources → central hub → engagement timeline | Same shape | ✔ | No calendar in roducq → timeline shows one *engagement* moving through the pipeline |
| 6 | Integrations: eyebrow, headline, intro, 3-column × 2-row card grid (`md:grid-cols-3`), text CTA | Same shape | ✔ | 6 cards in 2 rows of 3: only real connectors and outputs |
| 7 | Teams: 4-column divided container (`lg:grid-cols-4`, `lg:divide-x`) with miniature UI previews + text CTA | Same shape | ✔ | Shapes of practice, not named customers |
| 8 | Pricing: headline, intro, 4 columns (`lg:grid-cols-4`: Starter, featured Team, Studio, dark Enterprise `.lm-pricing-dark`), compare link | Same shape | ◐ | No monthly/yearly toggle — `ANNUAL_PRICES` is empty, so a yearly tab would advertise an unbillable saving. Prices come from live Razorpay config |
| 9 | FAQ: 2-column layout (`lg:grid-cols-[0.88fr_1.12fr]`) with left heading/CTA and right native `<details>` accordion | Same shape | ✔ | Native `<details>`; six roducq-specific answers |
| 10 | Final CTA: purple gradient card (`.lm-cta-card`) with left 3-line headline/CTAs and right 2-of-4 onboarding checklist card | Same shape | ✔ | Plus the limits callout below, which the reference has no equivalent for and roducq must keep |
| 11 | Footer: mark, tagline, primary CTA, 3 link columns, legal line, oversized pale `roducq.` wordmark | Same shape | ✔ | Limits line repeated here |

Legend: ✔ reproduced · ◐ reproduced with a documented content-driven deviation.

## 10. Known limitations & browser verification

- **Historical note (when no browser screenshot comparison was possible):**
  Originally, no browser screenshot comparison was possible in an environment
  without unpacking the `@sparticuz/chromium` runtime and `al2023.tar.br`
  NSS/NSPR libraries; `scripts/build-home-screenshots.py` used Pillow so any
  outstanding browser comparison could be run once a browser was available.
- **Live Chromium 153 verification (completed):** With `@sparticuz/chromium`
  (`Chromium 153.0.8010.0`) and `playwright-core`, the landing page `/` has been
  rendered and audited across `320px`, `375px`, `768px`, `1024px`, and `1440px`
  in both `light` and `dark` themes (`docs/screenshots/home-light.png`,
  `docs/screenshots/home-dark.png`, and
  `docs/screenshots/forma-phase-f/marketing-home-*`), confirming `overflowX = 0`,
  `0` axe-core WCAG 2.2 AA violations, `0` tap targets below 44×44px, and `0`
  clipped or overlapping elements.
- `/about`, `/pricing` and `/vs` keep their existing layouts and now inherit the
  new header, announcement bar, footer and token scope. Re-skinning those pages
  to the same band system is a follow-up, not part of this milestone.
- Annual billing has no price to charge (`ANNUAL_PRICES` is empty), so the
  landing pricing band deliberately has no monthly/yearly toggle.
