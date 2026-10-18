# Roducq — Forma spec cross-reference audit

- **Milestone:** gap-fill only; the supplementary spec does not replace verified work.
- **Audit date:** 2026-10-18 (Asia/Kolkata)
- **Reference:** <https://forma-visuvate.framer.website/>
- **Supplementary source:** user-pasted *Forma — Design & Motion Spec*; the separate page fetch returned static text only, not rendered pixels, computed CSS, fonts, or running animation capture.

## Scope and evidence hierarchy

This audit treats `docs/ANIMATION_NOTES.md`, `docs/FORMA_FINAL_FIDELITY_AUDIT.md`, `docs/FINAL_GO_LIVE_READINESS.md`, and the merged PR #53 measurements as the authoritative Roducq record. The supplementary document is used as a checklist only. Its `[INFERRED]` values are not adopted; its `[OBSERVED]` labels are classified below, then checked against the real-browser capture artifacts where possible.

The most recent committed real-browser reference evidence available for this audit is the **2026-10-17** Chromium capture from the `forma-reference` workflow, run **39033490929**. The read-only capture is on [`arena/forma-reference-capture`](https://github.com/gunal-official/roducq/tree/arena/forma-reference-capture/docs/screenshots/forma-reference) (capture commit `5c02762d9c51271537a245faff90ead9f7446a52`); it contains `forma-metrics.json`, `forma-animations.json`, and per-viewport screenshots. Representative reference screenshots are also committed under `docs/screenshots/forma-final/reference/`, and the recorded animation summary is `docs/screenshots/forma-final/reference-animations.json`.

The browser capture covered 1440×900, 1024×768, 768×1024, 390×844, 375×812, and 320×700. The capture script records computed geometry/styles, visible semantic elements, `document.getAnimations()` events created during two scroll passes, and screenshots. A missing `document.getAnimations()` entry is **not** treated as proof that a JavaScript timer or `requestAnimationFrame` counter does not exist. No color, font, shadow, timing, or easing estimate from the supplementary document is promoted to ground truth by this audit. **No new interactive live-reference browser capture was run on 2026-10-18**; Phase B remains grounded in that 2026-10-17 Chromium artifact, supplemented by the committed screenshots and static source comparison.

## Phase A — classification pass (completed before source edits)

The “Phase A classification” column applies the requested labels to each claim/sub-claim. **CONFIRMED-OBSERVED** means a structural fact visible in the available browser capture; it does not imply the pattern should be copied. **GUESSED** means behavior/timing inferred from the text or markup. **ALREADY-IMPLEMENTED** marks an existing Roducq equivalent, **CONFLICTS-WITH-RODUCQ-CONTENT** marks product-truth differences, and **POTENTIAL-GAP** marks a difference that still needs Phase B confirmation. **CONTRADICTED-BY-REFERENCE** is used when the available capture refutes the pasted spec’s structural claim. Where a subsection combines a structural pattern and Forma-specific copy, the row splits those concerns rather than treating them as one item.

### Section 4 — Page Structure

| Ref. | Checklist item(s) classified | Phase A classification | Roducq baseline before this audit |
|---|---|---|---|
| 4.1a | `f` + `forma.` brand, nav labels, and “Get started” copy | **CONFLICTS-WITH-RODUCQ-CONTENT** | Roducq’s mark, wordmark, route labels, and CTA are intentional product content. |
| 4.1b | Left identity, navigation, primary action, and a collapsed mobile navigation | **ALREADY-IMPLEMENTED** | `SiteHeader` uses RoduMark/Wordmark, real Roducq routes, CTA links, and a Radix dialog menu. It does not duplicate nav data across breakpoints. |
| 4.1c | Sticky header that changes after ~24px scroll | **GUESSED** | The attached document itself labels this behavior inferred; Roducq already has a sticky, translucent header. No new scroll-state behavior is implied. |
| 4.2a | Exact announcement wording and `/changelog` destination | **CONFLICTS-WITH-RODUCQ-CONTENT** | Roducq’s announcement is truthful to its own free-plan features and routes to `/pricing`. |
| 4.2b | Bordered announcement pill, accent “New” tag, and arrow icon | **ALREADY-IMPLEMENTED** | The hero announcement already has a bordered pill, tag, and arrow; the shared announcement band also exists. |
| 4.2c | Arrow nudge on hover | **GUESSED** | This is a motion claim, not a structural fact that can be verified from the text-only fetch. |
| 4.3a | Hero headline words separated into individual DOM elements | **CONFIRMED-OBSERVED** (Forma DOM structure) | The prior 1440px capture records eight one-word `<h1>` nodes. Roducq uses one accessible `<h1>` with two masked lines; whether the DOM difference causes a behavior gap still requires Phase B evaluation. |
| 4.3b | Forma’s hero subtitle, CTA labels, reassurance copy, integration names/count, and product positioning | **CONFLICTS-WITH-RODUCQ-CONTENT** | Roducq describes client intake, briefs, proposals, plans, and updates; those strings and claims must not be copied. |
| 4.3c | Hero composition: headline, supporting copy, two actions, reassurance, and “works with” strip | **ALREADY-IMPLEMENTED** | Roducq has each structural rung using its own content and five currently supported connectors/outputs. |
| 4.4a | Built-in dashboard mock with sidebar, top bar, greeting, four stat cards, chart, and due-work area | **ALREADY-IMPLEMENTED** | `WorkspacePreview` contains the same broad dashboard hierarchy, responsive sidebar, four stats, seven-day visualization, and work list using Roducq’s own fields. |
| 4.4b | Forma workspace names, people, dates, task labels, stat labels/values, meeting, and UI copy | **CONFLICTS-WITH-RODUCQ-CONTENT** | Roducq’s Acme Studio mock, briefs/proposals/plans/updates, and stat labels are intentionally different. |
| 4.4c | “Mon–Sun bar chart” claim | **POTENTIAL-GAP** | The implementation uses a line chart; the attachment’s claimed bar chart needs a live-render check before treating it as a gap. |
| 4.4d | Smaller-screen dashboard variants that remove sidebar/list density | **ALREADY-IMPLEMENTED** | The sidebar is hidden below the desktop breakpoint and the mock reflows without replacing its content. |
| 4.5a | Four feature cards, mini-UI, heading, body, and section CTA | **ALREADY-IMPLEMENTED** | Roducq has four client-work cards with its own visuals and copy. |
| 4.5b | “2×2 bento grid” layout claim | **CONTRADICTED-BY-REFERENCE** (despite the pasted spec’s `[OBSERVED]` label) | The available 1440px reference screenshot shows four cards in one row; Roducq’s four-column desktop grid matches that structure. |
| 4.5c | Forma’s Automations/Projects/Integrations/Focus-time card copy and mock UI | **CONFLICTS-WITH-RODUCQ-CONTENT** | These mockups describe Forma’s task manager, not Roducq’s intake/brief/proposal/plan workflow. |
| 4.5d | A `+` icon button on each feature card | **POTENTIAL-GAP** | There is no `+` control in Roducq’s `FeaturesSection`; the document’s claim needs direct DOM/interaction confirmation. |
| 4.6a | Three numbered setup steps plus a product mock | **ALREADY-IMPLEMENTED** | Roducq already has three numbered steps and a responsive connected-sources → Roducq hub → engagement panel mock. |
| 4.6b | Right mock is sticky/pinned and updates with active steps | **POTENTIAL-GAP** | Roducq’s mock is static and below the step cards; this structural assertion must be checked against the live render, not inferred from text. |
| 4.6c | Calendar, “Your day”, Forma, and demo copy | **CONFLICTS-WITH-RODUCQ-CONTENT** | Roducq does not claim to be a calendar/task manager; its engagement timeline is deliberately different. |
| 4.7a | Integration cards in a multi-column grid with generic iconography and CTA | **ALREADY-IMPLEMENTED** | Roducq has a three-column grid of six verified connectors/outputs and its own CTA. |
| 4.7b | Twelve integrations, the nine named categories, and their task/calendar copy | **CONFLICTS-WITH-RODUCQ-CONTENT** | Those counts and descriptions are Forma’s product claims. Roducq must not imply unsupported connectors to match a count. |
| 4.8a | Four numbered team cards with mini-UI, templates line, and CTA | **ALREADY-IMPLEMENTED** | Roducq has four numbered practice/team cards, product-grounded mini-previews, template lines, and a CTA. |
| 4.8b | Forma’s Product/Engineering, Design, Marketing, Operations content and ticket/comment data | **CONFLICTS-WITH-RODUCQ-CONTENT** | Keep Roducq’s Solo practices, Design studios, Agencies, Consultancies, and real workflow examples. |
| 4.9a | Forma plan names, prices, billing cadence, feature lists, annual discount math, and sales copy | **CONFLICTS-WITH-RODUCQ-CONTENT** | PR #52’s Roducq pricing is protected: Starter/Team/Studio at $29/$79/$199, with existing billing safeguards. |
| 4.9b | Four-card pricing presentation and featured-plan treatment | **ALREADY-IMPLEMENTED** | The landing presents the three Roducq tiers plus the existing Enterprise contact card in its finalized four-column layout. |
| 4.9c | Segmented Monthly/Yearly sliding-pill control | **ALREADY-IMPLEMENTED** (dedicated `/pricing` route) | `app/(marketing)/pricing/pricing-plans.tsx` already uses `layoutId="pricing-billing-pill"` per PR #52. The landing intentionally does not offer unconfigured annual billing. |
| 4.10a | Two-column FAQ presentation and first answer open | **ALREADY-IMPLEMENTED** | Roducq has the two-column FAQ and first item open by default. |
| 4.10b | Forma’s FAQ questions, demo prompt, and exact copy | **CONFLICTS-WITH-RODUCQ-CONTENT** | Keep Roducq’s FAQ and support links. The disclosure remains native `<details>` under the no-JS/accessibility contract. |
| 4.11a | Final CTA with heading and onboarding checklist panel | **ALREADY-IMPLEMENTED** | Roducq has the CTA card, two actions, reassurance, and its own checklist/progress display. |
| 4.11b | Per-word heading DOM technique | **POTENTIAL-GAP** | Roducq’s closing heading is line-masked; the claim needs live DOM/motion confirmation before markup changes. |
| 4.11c | Forma’s CTA wording and checklist item labels/states | **CONFLICTS-WITH-RODUCQ-CONTENT** | Keep Roducq’s free-plan, client-message, and brief-generation copy. |
| 4.12a | Footer brand, blurb, column labels, legal copy, copyright, and `forma.` wordmark | **CONFLICTS-WITH-RODUCQ-CONTENT** | These are Forma’s brand/content strings; Roducq keeps its own wordmark, footer copy, routes, and legal text. |
| 4.12b | Footer navigation columns and oversized low-contrast wordmark | **ALREADY-IMPLEMENTED** | Roducq already has its own footer columns and large pale Roducq wordmark. |
| 4.12c | “Back to top” footer affordance | **POTENTIAL-GAP** | No corresponding link is present in `SiteFooter`; verify the live footer and add only the structural control if confirmed. |

### Section 6 — Motion & Animation

The entire section is marked `[INFERRED from structure — tune by eye against live site]`. These rows are therefore initially **GUESSED**, unless an existing measured Roducq value already covers the same intent. Exact values in this section are not applied on their own.

| Ref. | Checklist item(s) classified | Phase A classification | Roducq baseline before this audit |
|---|---|---|---|
| 6.1 | Global easings, duration bands, reveal distance/trigger, and reduced-motion recipe | **GUESSED** | Existing measured values and reduced-motion behavior are recorded in `docs/ANIMATION_NOTES.md`; those values win. |
| 6.2a | Nav/announcement entrance schedule and total 1.6s sequence | **GUESSED** | Roducq already uses measured chrome timings and the measured hero ladder in `landing.css`; do not replace them with the proposed schedule. |
| 6.2b | Per-word hero `opacity: 0 → 1`, `translateY(110% → 0)`, blur, and 50ms stagger | **GUESSED** | This is the opacity-zero pattern associated with PR #51’s mobile `NO_LCP` defect; PR #53 fixes first-paint visibility and must remain intact. |
| 6.2c | Subcopy, CTA, reassurance, and integration-row timing/stagger | **GUESSED** | The current hero already uses the measured 550/650/720/800ms rungs. |
| 6.2d | Dashboard entrance at 1000ms with scale and rise | **GUESSED** | The live capture measured the dashboard wrapper at 1300ms with an 850ms delay; the measured version is authoritative. |
| 6.3a | Stat numbers count up from zero | **GUESSED** | Roducq’s four stat values are intentionally static today; a counter is not added without direct evidence. |
| 6.3b | Bars grow from baseline with 60ms stagger | **GUESSED** | Roducq already has a measured SVG line/area chart. The reference screenshot must establish the chart type before any change. |
| 6.3c | Due-today rows stagger | **GUESSED** | No such change is made to Roducq’s illustrative list without live evidence and a product-appropriate mapping. |
| 6.3d | Dashboard scroll parallax/tilt | **GUESSED** | Existing dashboard motion is the recorded entrance; no scroll-linked tilt is implemented. |
| 6.3e | Focus-block pulsing dot | **GUESSED** | No equivalent verified idle loop exists in the Roducq mock. |
| 6.4 | Eyebrow, per-word section-heading mask, 40ms stagger, and subcopy sequencing | **ALREADY-IMPLEMENTED** for the measured word-mask intent; supplied exact sequence is **GUESSED** | Roducq section headings already use per-word masked spans; the live-measured 900ms/50ms cadence is in the audit notes. |
| 6.5a | Feature-card rise distance, card stagger, and entry values | **GUESSED** | Roducq uses the existing `Reveal` system and recorded timings. |
| 6.5b | Automation nodes/connector drawing/success loop | **GUESSED** | No identical four-node automation demo exists in Roducq’s feature cards; only measured live behavior may justify an analogous effect. |
| 6.5c | Project rows, status-chip spring, and check draw | **GUESSED** | Roducq’s feature visuals use its own data; the supplied spring/timing is not adopted. |
| 6.5d | Integration orbit/float and pulsing connectors | **GUESSED** | No live-confirmed orbit loop is recorded; the only measured connector loop is documented separately in `ANIMATION_NOTES.md`. |
| 6.5e | Focus timer countdown, ring depletion, and toggle | **GUESSED** | Roducq does not contain Forma’s focus timer; do not introduce it or its copy. |
| 6.5f | Card lift and `+` rotation/fill on hover | **GUESSED** | Hover interaction must be observed live; the `+` button itself is not assumed to exist. |
| 6.6 | Sticky step panel, active/inactive opacity, cross-fades, typed rule, and scroll-linked progress | **GUESSED** | Roducq has three step cards above one engagement mock; no scroll-linked state is added without live verification. |
| 6.7 | Integration-card stagger/icon rotation, hover wiggle, border, tooltip, and logo marquee | **GUESSED** | Roducq already has card reveals and its own connectors; no hover/marquee behavior is inferred. |
| 6.8 | Team status transitions, comment drop, calendar-bar growth, rule typing, and count/slide | **GUESSED** | Roducq has static team mini-previews; any mapped animation requires measured evidence and must not replace their content. |
| 6.9a | Sliding pricing toggle and yearly price odometer | **GUESSED** | The separate Roducq pricing route already has the sliding-pill layout animation; no odometer or landing annual toggle is added. |
| 6.9b | Price-card stagger/glow, feature check draws, and hover lift | **GUESSED** | Roducq’s protected plan structure and current measured pricing-card reveals remain unchanged. |
| 6.10 | FAQ `grid-rows 0fr → 1fr`, 350ms height, and delayed answer fade | **GUESSED** | Explicitly rejected: native `<details>` is required for no-JS behavior; `::details-content` already uses the measured 260ms value. |
| 6.11 | Per-word final CTA reveal, floating checklist, check draws/pulse/progress, drifting background | **GUESSED** | Roducq already has its own CTA/checklist composition; no unverified loops or hidden states are added. |
| 6.12a | Footer wordmark rise and letter stagger | **GUESSED** | Roducq has the oversized wordmark but no such measured animation. |
| 6.12b | Smooth-scroll back-to-top and arrow nudge | **GUESSED** | Only the footer affordance’s existence is checked as a structure; smooth scrolling and hover motion are not assumed. |
| 6.13a | Nav underline/hover pill and mobile hamburger-to-X morph | **GUESSED** | Roducq’s current nav/menu already work; no animated pill or morph is added without interaction capture. |
| 6.13b | Native cursor and 2px focus ring | **ALREADY-IMPLEMENTED** for the accessible focus treatment | Roducq uses a native cursor and a 2px accent `:focus-visible` ring with offset in the marketing shell. |

## Phase B — live verification of candidates

### Capture provenance

The evidence below is from the real Chromium run for the live reference, not from the pasted text document. Run **39033490929** was created on **2026-10-17** by `.github/workflows/forma-reference.yml`; the capture artifact includes the full metrics and animation JSON at the link above. The tracked screenshot set in this repository is under `docs/screenshots/forma-final/reference/`. A separate text fetch was used only to corroborate copy/DOM text; it is not treated as rendered-browser evidence.

### Candidate findings

| Candidate from Phase A | Live evidence | Roducq comparison | Phase B conclusion |
|---|---|---|---|
| 4.3 per-word hero heading | `forma-metrics.json` at 1440×900 records eight one-word `<h1>` nodes (`The`, `workspace`, `that`, `does`, `the`, `follow-up`, `for`, `you`). The animation log records the hero headline as a single 900ms group entrance, delayed 80ms on `cubic-bezier(0.16, 1, 0.3, 1)`; it does **not** establish the attachment’s 50ms per-word hero stagger. | Roducq uses one accessible `<h1 aria-label>` with two line masks and the measured hero entrance. This is the existing D1 decision in the fidelity audit, and it preserves the LCP-safe reveal. | **No code change.** The DOM difference is real, but the claimed word-by-word hero animation is not confirmed; the current line mask achieves the same entrance intent. Changing it is not needed to close a behavior gap. |
| 4.4 chart type | `docs/screenshots/forma-final/reference/1440-00-hero-dashboard.png` shows a continuous line/area chart with a point marker, not a Mon–Sun bar chart. The live capture’s animation record does not show baseline-growing bars. | Roducq’s `.lm-chart-line` / `.lm-chart-area` implementation already matches the measured line-chart shape and its timings are recorded in `docs/ANIMATION_NOTES.md`. | **No code change.** The supplementary bar-chart claim is contradicted by the live capture. |
| 4.5 feature layout | `docs/screenshots/forma-final/reference/1440-01-features.png` shows four cards in a single row at 1440px, not a 2×2 desktop grid. | Roducq’s desktop `lg:grid-cols-4` is already the correct measured structure. | **No code change.** Preserve the finalized desktop column count. |
| 4.5 `+` feature buttons | In the captured 1440px metrics, the semantic `button` entries are the appearance control and the nine integration-card controls; no feature-card `+` button is present. The screenshot’s plus-shaped marks sit on card/grid corners, not as a per-card control in the recorded element list. The capture did not exercise hover. | Roducq’s `FeaturesSection` has no `+` controls. | **Not confirmed; no code change.** Do not add a nonfunctional/untested affordance or its guessed rotation. |
| 4.6 sticky/pinned setup mock | `docs/screenshots/forma-final/reference/1440-02-getting-started.png` shows three numbered cards above one wide demo panel. The captured section’s computed position is `relative`; the two scroll passes recorded no step-specific active-state/mock-content animation. This evidence does not justify a sticky implementation. | Roducq uses the same broad three-steps-plus-mock composition, with its own connected-source and engagement content. | **Not confirmed; no code change.** A sticky/pinned state is not established by the live capture; the text-only claim is not enough. |
| 4.7 integration count | `docs/screenshots/forma-final/reference/1440-03-integrations.png` and live metrics show nine cards in a 3×3 grid. | Roducq has six real connectors/outputs, in a three-column × two-row grid. `docs/FORMA_FINAL_FIDELITY_AUDIT.md` §6 R6 already records why three more marketing cards were not fabricated. | **No code change.** The grid structure is implemented; adding unsupported integration claims would reduce accuracy rather than fill a valid Roducq gap. |
| 4.11 final CTA word-level structure | The reference screenshot shows the final CTA visually, but the captured animation log records only the CTA container entrance; it does not confirm a per-word H2 animation. The metrics capture does not provide evidence for the attached exact word-reveal technique. | Roducq has its own two-line masked closing heading and checklist. | **Not confirmed; no code change.** Keep the existing heading and copy. |
| 4.12 footer “Back to top” | The live metrics record a visible “Back to top” label and adjacent SVG arrow in the reference footer. The recorded label itself is a paragraph, so the text-only claim of smooth-scroll/hover behavior is not promoted to fact. | Roducq’s footer has no corresponding top affordance. The marketing shell has a stable `#top` anchor target after this audit change. | **Implemented structurally only.** Add an accessible anchor and static arrow. Do not add smooth-scroll or arrow-motion values from the inferred section. |
| 6.3 stat count-up | The live dashboard screenshot confirms the four end values. The recorded Web Animations log contains no stat-number target, but it cannot rule out a JavaScript timer that does not use WAAPI. | Roducq’s values remain static and preserve its current LCP-safe dashboard rendering. | **Unverified guess; no code change.** No count-up is added on incomplete evidence. |
| 6.5/6.8 feature and team micro-animations | The live log does record selected internal transitions (for example `Done` at 450ms / `cubic-bezier(0.45, 0, 0.55, 1)`, `Merged` at 500ms / `cubic-bezier(0.42, 0, 0.58, 1)`, and the “JK · Homepage v3” comment group at 600ms / `cubic-bezier(0.2, 0.7, 0.2, 1)`). These are not the attachment’s blanket 200ms values and do not confirm every described flow, orbit, timer, or hover effect. | Roducq’s feature/team mockups are different data and already enter through the measured reveal system. No one-to-one state transition was established for a safe analogous animation. | **No code change.** Do not transplant Forma-specific interactions or guessed sequences onto Roducq mock data. |
| 6.9 pricing toggle | The live metrics show Monthly / Yearly / −20% on Forma. Roducq’s dedicated `/pricing` page already implements its Motion.dev sliding pill (`layoutId="pricing-billing-pill"`) with the annual-unavailable guard. | The landing’s finalized plan values/structure remain protected; the home pricing section intentionally does not invent annual checkout. | **No code change.** No odometer roll, annual math, or landing toggle is added. |
| 6.10 FAQ | The attachment’s grid-row technique is not supported by the required no-JS contract. Roducq’s measured native disclosure remains 260ms open/close with a 160ms icon rotation. | `FaqAccordion` uses native `<details>` and already works without JavaScript. | **Explicitly rejected.** Keep native disclosure and measured timings. |
| 6.12/6.13 footer/nav motion | The live animation capture contains no confirmed footer-wordmark rise, mobile menu morph, or hovered nav pill sequence. Existing measured link transition is 200ms; the attachment’s specific hover behaviors remain unverified. | Roducq already has its footer wordmark, responsive dialog menu, and nav/focus styling. | **No code change.** Add only the confirmed footer structure; do not add unverified motion. |

### Measured values retained

The live capture and prior measured audit remain authoritative over the supplementary numbers. Examples retained without modification include:

- Hero ladder: announcement 0ms; H1 80ms; lead 550ms; CTA 650ms; note 720ms; connector row 800ms; dashboard 850ms. The hero text stays at `opacity: 1` through the PR #53 clip-path/transform mask.
- Hero H1 group: 900ms at `cubic-bezier(0.16, 1, 0.3, 1)`; dashboard wrapper: 1300ms at 850ms delay on the measured body curve.
- Section heading word masks: 900ms, 50ms stagger, `cubic-bezier(0.16, 1, 0.3, 1)`.
- Live reference connector flow: 1000ms, linear, infinite, zero per-path delay; Roducq already matches this.
- Landing links: 200ms; native FAQ disclosure: 260ms open/close; FAQ icon: 160ms. These measured values supersede 150ms/350ms guesses.

## Phase C — implementation

**One structural gap was filled:** `SiteFooter` now provides an accessible “Back to top” anchor to the marketing shell’s `#top` target, with a static upward arrow and the existing landing-link treatment. This uses the live-confirmed footer affordance without copying Forma’s brand/product copy. No smooth-scroll behavior, arrow nudge, or new animation was added because those values are only inferred. The focused component regression test checks the `href="#top"`, visible link name, and corresponding layout target.

No heading/hero animation, `SectionHeading`, `HeroSection`, `StepsSection`, `WorkspacePreview`, feature visual, pricing, FAQ mechanism, integration count, team data, brand copy, or protected backend/payment/auth files were changed. Roducq’s `opacity: 1` first-paint / clip-path hero masking from PR #53 remains intact.

## Explicitly rejected

- **Forma brand, copy, product claims, mock UI, and pricing:** not Roducq content. Preserve Roducq’s client-work pipeline, its existing dashboard/stat labels, and the PR #52 plan structure and amounts.
- **Opacity-zero word reveal:** rejected. `initial={{ y: "110%", opacity: 0 }}` is the pattern that led to the mobile `NO_LCP` failure. No opacity-zero initial state was introduced on hero/LCP content.
- **FAQ `grid-rows` animation:** rejected. Native `<details>` stays for no-JavaScript/accessibility correctness; the measured 260ms disclosure transition and 160ms icon rotation remain.
- **Unverified counts, bar growth, parallax/tilt, pinned steps, orbit loops, timer countdowns, `+`-button rotation, pricing odometer, footer-wordmark rise, mobile menu morph, and nav hover pill:** not implemented because they were inferred or not confirmed by the real capture.
- **Nine integration cards:** not added. Roducq advertises six real connectors/outputs; padding the grid with unsupported integrations would invent product capability.

## Phase D — regression verification

All listed checks ran on **2026-10-18** against this branch after a clean `npm ci`. Browser checks used the production build served at `http://127.0.0.1:3000`, real Chromium **153.0.8010.0** from `@sparticuz/chromium@153.0.0`, Playwright Core **1.63.0**, Lighthouse **13.5.0**, and axe-core **4.14.0**. Browser binaries, npm test output, and screenshots were kept outside the tracked tree.

| Check | Result | Evidence |
|---|---|---|
| `npm run lint` | **PASS** | ESLint exit 0. |
| `npx tsc --noEmit` | **PASS** | TypeScript exit 0. |
| `npm test` (required ≥1,117) | **PASS — 1,118 / 1,118** | 278 suites, 0 failed; includes the focused footer anchor regression and existing PR #53 hero LCP safeguards. |
| `npm run build` | **PASS** | Next.js production build completed and generated all 41 routes. |
| `npm run verify:production` | **PASS** | Metadata/security/assets/404 checks passed; 11 internal landing links crawled, with expected auth redirects. |
| `CHROMIUM_EXECUTABLE_PATH=/tmp/chromium node scripts/verify-motion.mjs --no-shots` | **PASS** | 12 viewport/theme renders plus tablet boundary, motion, and reduced-motion assertions; 0 failures. `LD_LIBRARY_PATH=/tmp/al2023/lib` supplied for the extracted Chromium runtime. |
| Horizontal overflow at 320 / 375 / 390 / 768 / 1024 / 1440px | **PASS — 0px at every width** | `verify-motion` checked all six widths in light and dark; all 12 runs reported `overflowX = 0`. The focused landing sweep independently confirmed the same six widths in both themes. |
| axe-core on `/` | **PASS — 0 violations** | 12 scans (six widths × light/dark), WCAG 2.0/2.1/2.2 A/AA plus best-practice tags. Each scan also reported one axe `incomplete` item; it was not treated as either a violation or a passing check. |
| Back-to-top browser behavior | **PASS** | At 320px, the semantic link has name “Back to top”, `href="#top"`, a matching `id="top"`, and a 44px minimum height; activation set `location.hash` to `#top` and returned `scrollY` to 0. |
| PR #53 first-frame opacity/clip-path safeguards | **PASS** | Existing CSS/unit assertions remained unchanged and passed in the full test run; all four LCP profiles below produced a hero LCP candidate. |

### PR #53 scenarios A–D — fresh local real-browser rerun

Each profile below has **three fresh runs** of both `PerformanceObserver` and Lighthouse. All used the production build and the 412×823, DPR 1.75 mobile profile (or the recorded desktop profile); animations were enabled except scenario D. The 4× CPU profile uses DevTools CPU throttling with network throttling disabled. Reduced motion was set through the browser’s `prefers-reduced-motion: reduce` media emulation before navigation. These are local lab measurements, not field Core Web Vitals, and are not claimed to reproduce PR #53’s exact machine/network timings.

| Scenario | PerformanceObserver LCP candidates (ms) | Lighthouse LCP (ms) / Performance score | CLS (PO / Lighthouse) | Result |
|---|---|---|---|---|
| **A — mobile, animations on, unthrottled** | `200 / 244 / 216` (median **216**); `1 / 1 / 1` candidates | `315.3 / 216.8 / 234.5` (median **234.5**); scores `100 / 100 / 100` | `0 / 0 / 0` | **PASS** |
| **B — mobile, animations on, 4× CPU** | `452 / 416 / 416` (median **416**); `1 / 1 / 1` candidates | `611.5 / 450.0 / 450.0` (median **450.0**); scores `99 / 96 / 94` | `0 / 0 / 0` | **PASS** |
| **C — desktop, animations on** | `372 / 380 / 252` (median **372**); `1 / 1 / 1` candidates | `285.1 / 328.1 / 323.1` (median **323.1**); scores `100 / 100 / 100` | PO `0 / 0 / 0`; Lighthouse `0 / 0.0036 / 0` | **PASS** |
| **D — mobile, reduced motion** | `252 / 212 / 188` (median **212**); `1 / 1 / 1` candidates | `218.4 / 288.9 / 239.2` (median **239.2**); scores `100 / 100 / 100` | `0 / 0 / 0` | **PASS** |

In every PO run the LCP element was the Roducq hero lead paragraph (`p.lm-hero-in…`), sized **37,536 px²** on mobile and **52,456 px²** on desktop; no profile produced `NO_LCP`. Every LCP value was below the 2.5s “good” threshold. PO CLS was zero in all 12 runs; Lighthouse’s maximum CLS was **0.0036**, below the 0.1 threshold. The reduced-motion media query was verified active in all scenario D runs.

## Scope check

Only the cross-reference audit documentation, the marketing footer/top anchor, and a regression test for that new anchor are intended in this milestone. No Razorpay, billing, subscription, Supabase, auth, database, API, or protected plan file is in scope.
