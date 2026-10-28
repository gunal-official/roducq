# Forma About Page Recreation — Implementation and Verification

**Status:** implemented on `arena/38893169-roducq` from the approved
plan in `docs/FORMA_ABOUT_REFERENCE.md` (live reference audit). The PR
("Roducq — Exact Forma About page visual recreation") is opened against
`main` and left unmerged for owner review; nothing was deployed to
production (Vercel Preview only).

**Owner-approved content decisions implemented verbatim:**
H1 "Why we are building roducq." · split heading "Where the context
gets lost" · third-paragraph sentence "Our goal is to reduce the
repeated work of turning scattered client conversations into clear,
useful documents." · principles heading "How we make product
decisions" with the five proposed principles · cards
Changelog→`/changelog`, Compare→`/vs`, Contact→`mailto:hello@roducq.dev`
· CTA heading "Try roducq with your own client work" · buttons
Create account→`/signup`, See pricing→`/pricing` · note "Creating an
account does not activate a paid plan."

No Forma company material, statistics, team, testimonials, pricing
figures, or capabilities were introduced. The CTA checklist is a
Roducq-specific fictional illustration labelled "Illustrative
example · fictional client".

## 1. What changed

| File | Change |
|---|---|
| `app/(marketing)/about/page.tsx` | rewritten: preserves existing metadata/canonical; renders the five measured bands in reference order inside `.ab-page` |
| `app/(marketing)/about/content.ts` | new: all approved copy as typed constants, with provenance notes |
| `app/(marketing)/about/about.css` | new: page-local measured geometry (hero type ladder, band paddings, split grid, principle-row columns, CTA two-column, checklist, stretched-link focus) — no global selectors touched |
| `components/marketing/landing/about/Words.tsx` | new (client): per-word rise matching the measured reference word masks; strips the clip wrappers before server-rendering text into InlineSplit so About headings never server-render hidden |
| `components/marketing/landing/about/AboutHero.tsx` | new (server): eyebrow + two-tone H1 via `lm-line` masks (opacity-preserving, PR #53-safe) + lead |
| `components/marketing/landing/about/AboutStory.tsx` | new (server): 45/55 split band, ink first paragraph |
| `components/marketing/landing/about/AboutPrinciples.tsx` | new (server): eyebrow + H2 + five numbered rows |
| `components/marketing/landing/about/AboutCards.tsx` | new (server): three cards as `<article>` + visible-label stretched link (see §5) |
| `components/marketing/landing/about/AboutCta.tsx` | new (server): two-column panel — text column + checklist `<figure>` |
| `tests/components/about-page.test.ts` | new: metadata preservation, approved copy, honest-claims ban list, LCP-safe motion, accessibility structure, and measured-geometry regression fences |
| `tests/components/forma-phase-f.test.ts` | one obsolete assertion replaced (the old page's `BriefSourceArt` import) with stronger original-artwork assertions for the new hero/CTA. `BriefSourceArt` itself is untouched — it remains used on app brief surfaces |

Removed from `/about`: the previous bespoke seven-section composition
(hero card layout, "How Roducq works" quad, principles quad, routing
card grid, FAQ accordion, shared `CtaPanel`). FAQ content remains on
`/faq`. No other page's markup, and no auth/billing/database code, was
touched.

## 2. How the measured reference was bound

Every value below is a `[MEASURED]` computed style from the live
reference capture (`docs/screenshots/forma-about-reference/forma-metrics.json`
+ `forma-animations.json`, GitHub-runner Chromium, 7 widths × 2
schemes), unless labelled `[INHERITED]` (bound from the shared `lm-*`
system whose tokens were themselves measured during earlier page
recreations).

- **Hero:** band padding-top 120; eyebrow `--lm-ink-accent`; H1
  44 / 45.4 (≥1025) / 67.2 (≥1200) px, weight 600, lh 1.03,
  −0.035em; two-tone split (ink words + `lm-display-em` gradient
  words); lead 17.5px centered; paddings collapse to 65/57-scale
  exactly as measured.
- **Split story:** `45fr 55fr` grid ≥1200 (495/605 in the 1100
  content box), single column below 810; H2 43.2px; body 18.5px;
  P1 ink, P2–P3 slate; paragraph gaps 16.
- **Principles:** H2 54px ≥1200; desktop rows `70px 300px 1fr`
  with 23px block padding, hairline `--lm-border-soft`; below 810,
  the measured `74px 1fr` with description indent; number 15px/600
  accent, title 22px/600, description 16.5px slate.
- **Cards:** 18px radius, 31px padding, accent eyebrow, 22px title,
  underlined link pinned to the bottom; 3-col → 2-col (768–1024) →
  stacked **below 768** (measured breakpoint, narrower than other
  pages' 810).
- **CTA:** 28px-radius gradient panel `[INHERITED .lm-cta]`; text
  column 565px, checklist 467px, 64px gap ≥1200; heading 64.8px,
  white first line + `--lm-cta-grad` second phrase; lead 20.5px
  white; buttons 52px/14px radius (white primary, 12%-wash
  secondary `[INHERITED .lm-btn-on-purple]`); checklist card 18px
  radius, 24px padding, progress track/fill from [`MEASURED`]
  pixel samples resolved to existing tokens.
- **Page background:** plain `--lm-bg` (audit found no glows or
  decorative layers on this reference page).

## 3. Motion binding (Motion.dev only; PR #53 rules)

- Hero entrance: the site-standard `lm-line` clip masks +
  `lm-hero-in` inline rise — opacity-preserving, no blur, nothing
  server-renders at `opacity: 0` (fenced by
  `tests/components/about-page.test.ts`).
- Split H2, principles H2, CTA H2: per-word rise via the shared
  `InlineSplit` — measured reference: 600 ms words,
  `cubic-bezier(0.22, 1, 0.36, 1)`, ~40 ms stagger — matched.
- Blocks (paragraphs, rows, cards, checklist): shared `Reveal`
  (14 px rise + fade, 620 ms). **Recorded delta:** the reference's
  block entrances measure ~800 ms with a ~16 px rise; Roducq uses the
  cross-page standard `Reveal` everywhere for consistency (same
  recorded decision as the pricing recreation). Link colour
  transitions: 330 ms system standard vs 300 ms measured.
- Hover: card lift/shadow via the measured system shadow tokens
  `[INHERITED]`; buttons scale .98 on press `[INHERITED .lm-btn]`.
- No CSS keyframes, no continuous/looping motion, no parallax (none
  measured on the reference).
- `prefers-reduced-motion`: all entrances settle visible instantly
  (verified: 0 running animations, 0 hidden bands).

## 4. Responsive behaviour (measured breakpoints)

<810: split band + CTA stack; CTA actions go full-width at 390.
<768: cards stack (measured; differs from the 810 system default).
Hero/principles/CTA type ladders follow the measured
44→45.4→67.2 / 40→43.8→64.8 progressions. All-width verification in §7.

## 5. Accessibility decisions

- **Card links:** the first pass used whole-card links with concise
  `aria-label`s; axe correctly failed them
  (`label-content-name-mismatch`, WCAG 2.5.3). Final pattern: card is
  an `<article>`; the link's accessible name is its visible text; the
  click area stretches across the card via `::after`; no `aria-label`
  override anywhere. Keyboard focus outlines the **card** via
  `:focus-within` (measured in-browser: `2px solid rgb(98,70,234)`,
  2 px offset — at least the global focus standard). Card-body click
  navigation verified with a real mouse event.
- The Contact card's link carries a screen-reader-only suffix
  "(opens your email client)" (Roducq has no `/contact` page; the
  approved destination is `mailto:`).
- Checklist mock is `aria-hidden` decoration inside a `<figure>` with
  the visible `<figcaption>` "Illustrative example · fictional
  client" — the only place fictional work appears.
- Heading order: one H1; H2 per band; principle titles and card
  titles are H3; cards band uses `aria-label="More about Roducq"`
  (the reference band has no visible heading).
- **Contrast:** axe flags gradient text as `color-contrast`
  *incomplete* (it cannot resolve `background-clip: text`). Manually
  computed worst cases: body slate 4.96:1 light / ~6.70:1 dark;
  ink-accent 7.51 / 9.07; H1 gradient weakest stop 3.92:1 light /
  3.96:1 dark (large text, ≥3:1 required); CTA gradient phrase
  weakest stop 4.95:1 against the panel mid-tone. The reference's
  60%-white CTA note would compute to ~3.22:1 — below AA for 15 px
  text — so Roducq keeps the solid `--lm-cta-muted` token
  (6.59:1 panel-mid, 5.11:1 on the light text-zone sample). This is
  the one deliberate colour deviation; it is visually negligible.

## 6. Deviations from the reference (all deliberate, all recorded)

1. **Content length.** Approved Roducq copy is longer than the
   reference's, so bands grow: measured section heights @1440 —
   hero 385 = 385 (exact), story 574 vs 477, principles 855 vs 742
   (two-line titles in the 300 px column), cards 389 vs 367, CTA
   768 vs 751. @390 the page is 5927 vs 4703 px, also including
   Roducq's announcement band (+63 px above the hero; shared shell,
   not modified). No horizontal overflow anywhere.
2. **CTA heading wraps to three lines at ≥1200**
   ("your own / client work") vs the reference's two — the approved
   phrase is wider than the measured 565 px column. `text-wrap:
   balance` keeps the break deliberate; it matches the three-line
   composition the reference itself takes at 390.
3. **Split heading wraps to two lines at ≥1200** (approved heading
   longer than the reference's one-liner).
4. **CTA note colour:** solid muted token instead of 60% white
   (contrast; §5).
5. **Destinations:** card 02 is Compare→`/vs` (no `/security` page
   exists), Contact is `mailto:` (no `/contact` page), CTA secondary
   is "See pricing" (no demo exists) — all owner-approved.
6. **Block-entrance timing** standardised to the shared `Reveal`
   (620 ms vs ~800 ms measured) — §3.
7. **Header/footer:** Roducq's shared marketing shell, unchanged.

## 7. Verification (all on the final production build)

Harness evidence: `docs/evidence/forma-about-audit/about-consistency-final.json`
(`ROUTES=/about PHASES=shell,axe,lcp,motion`, locally provisioned
Chromium 153). Screenshots: `docs/screenshots/forma-about-reference/`
(28 full-page pairs + metrics/animations JSON); side-by-side montages
in `docs/screenshots/forma-about-audit/compare-{1440,1024,390}-light.png`.

| Gate | Result |
|---|---|
| `npm test` | **1346/1346 pass** (incl. new About suite; 1 obsolete assertion replaced with stronger ones) |
| `npx tsc --noEmit` · `npm run lint` | clean |
| `npm run build` | clean; `/about` static (○); no `tsconfig.json` drift |
| `npm run verify:db` · `npm run verify:pdf` · `npm audit` | pass · pass · 0 vulnerabilities |
| Responsive shell (7 widths × light/dark) | horizontal overflow **0**, page errors **0**, no tap targets < 44 px |
| axe-core (320/390/1440 × light/dark) | **0 violations**; only `color-contrast` *incomplete* on gradient text — resolved manually (§5) |
| LCP (PR #53 four scenarios, 3 runs each) | A mobile **92 ms**, B mobile CPU 4× **224 ms**, C desktop **224 ms**, D reduced-motion **100 ms** — all « 2500 ms; CLS **0**; hero observable at opacity 1, no blur, from first paint |
| Reduced motion / no-JS | 0 running animations, 0 hidden bands / H1 + 3 H2 + 5 sections fully visible, zero opacity-0 elements |
| Keyboard | skip-link → shell → card links → CTA links in DOM order; card focus measured (§5) |

Desktop LCP note: at 1440×900 the largest in-viewport text block is
the story band's first paragraph (the hero is compact), so it is the
LCP candidate — still 224 ms median with CLS 0. The hero text itself
satisfies every PR #53 rule.

## 8. Known limitations / unverified

- **Reference dark theme `[UNVERIFIED]`:** the reference's dark mode
  is toggle-based and unreachable headlessly; Roducq dark uses the
  shared `lm-*` dark tokens (visually verified, axe-clean).
- **CTA panel gradient stops** are the shared `[INHERITED]` `.lm-cta`
  composition (measured in earlier recreations); pixel samples of
  this page's panel agree with it (deep `#2c1a8f`-class left →
  `#704bc7` mid). Framer does not expose the gradient in computed
  styles on the band element itself.
- **Hover magnitudes** (card lift distance, shadow) are system
  `[INHERITED]`; the reference's hover is only qualitatively from raster.
- The capture workflow (`.github/workflows/forma-about-reference.yml`)
  lands dispatch-only; its temporary push trigger and evidence-publish
  step were removed pre-PR (bootstrap discipline,
  `docs/FORMA_FINAL_FIDELITY_AUDIT.md` §1.1).

## 9. Rollback

Revert this PR's commits. No schema, API, environment, or shared-shell
changes are involved; the previous About page is fully restored by the
revert (the new components/CSS/content files become unreferenced).
