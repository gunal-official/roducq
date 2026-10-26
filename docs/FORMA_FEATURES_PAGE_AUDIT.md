# Forma `/features` — measured reference audit and Roducq recreation plan

Reference: <https://forma-visuvate.framer.website/features>
Captured: **2026-10-26** (run window 01:01:14–01:03:54 UTC, GitHub Actions run
**40251659593**, Chromium **153.0.8010.12**, zero failures —
`features-failures.json` = `[]`)
Target Roducq route: **`/features`**
Status: **Phase 0 (capture) + content gate complete. Implementation waits on
explicit content approval per the milestone brief.**

---

## 0. Labeling contract

| Label | Meaning |
| --- | --- |
| **[MEASURED]** | Read from the live page by the real Chromium run via `getBoundingClientRect()` / `getComputedStyle()` / the Web Animations API / `IntersectionObserver` construction options / `MutationObserver` / `PerformanceObserver` / raw DOM / screenshots. |
| **[INFERRED]** | Not directly measurable; the reason is stated inline. Never used as ground truth. |
| **[UNVERIFIED]** | Cannot be established from the available evidence. |

A text-only markdown fetch of the page was used **before** the capture solely
to design the instrumentation and to confirm the section inventory while the
GitHub runner was being prepared. No numeric value in this document comes from
that fetch; rendered truth is the Chromium run.

## 1. Capture method and evidence

The development sandbox's egress allowlist blocks the Framer host (verified:
direct `curl` fails with `SSL_ERROR_SYSCALL`), so the only honest measurement
path is a real Chromium on a GitHub-hosted runner — the same discipline the
`/solutions` milestone established.

| | |
| --- | --- |
| Workflow | `.github/workflows/forma-features-reference.yml` (dispatch-only design; a temporary development `push` trigger ran this capture and is removed before the final PR) |
| Harness | `scripts/capture-features-reference.mjs` (new; same instrumentation as `capture-solutions-reference.mjs`, plus the extra 1200px width) |
| Browser | Real Chromium 153.0.8010.12 (`playwright-core` + `--with-deps` on `ubuntu-latest`) |
| Viewports | **1440×900, 1200×900, 1024×768, 768×1024, 390×844, 375×812, 320×700** — the seven milestone widths |
| Colour schemes | `light` and `dark` emulation per viewport (14 runs, 0 failures) |
| Evidence | Orphan branch **`arena/forma-features-capture`** (full capture, incl. PNGs and gzipped DOM) + Actions artifact `forma-features-capture` (14-day retention) |
| In-repo summary | `docs/evidence/features-reference/{features-summary,features-run-notes,features-failures}.json` |

Per viewport × theme the harness produced `feat-<vp>-<theme>-{structure,styles,svgs,motion}.json`,
a gzipped settled DOM, a full-page PNG and one PNG per section band.
Instrumentation was installed with `addInitScript` **before the first page
script ran** (WAAPI first-seen recorder, `Element.prototype.animate` wrapper,
`IntersectionObserver` subclass, `MutationObserver`, `PerformanceObserver`,
scroll sampler).

### 1.1 Limitations (honest)

- The reference is a light-only Framer site: the dark-emulation runs return
  **identical light values** (document background stays `rgb(255,255,255)`).
  **[MEASURED]** Roducq's dark values therefore follow the shell's plum
  remap, as on `/solutions` — the reference publishes no dark token.
- Hairline dividers inside the articles are not represented in the tracked
  computed-style subset (the harness tracks `borderTop*` only, and every
  tracked element reports `borderTopWidth: 0`; no 1-2px divider nodes appear
  in the bounded outline). Their presence is visible in the band screenshots
  but their exact colour/mechanism is **[INFERRED]** from the shared Framer
  token family (`#eae6f1`) that the same site's `/solutions` capture measured.
- Full-page screenshot compositing can blank fixed/sticky layers in some
  bands (a known Framer capture artefact documented on the `/solutions`
  audit). Structure/styles/motion JSON — not pixels — are the source of truth
  for those layers.

## 2. Reference section inventory — Checkpoint 1 **[MEASURED]**

Five top-level bands, same order at every width (boxes at 1440×900, from
`feat-1440x900-light-structure.json`):

| # | Band | Box (1440) | Contents |
| --- | --- | --- | --- |
| 0 | Hero `section` | 1240×537.95 @ y=69.7 | eyebrow, two-line h1 (ink line + gradient line), lead, two CTAs. **No decorative layers, blooms or grids — plain white.** |
| — | Sticky section nav | full width ×47.7, `position:sticky; top:78px; z-index:30`, `padding:0 16px` | six jump chips → `#automations #projects #calendar #connected #insights #collaboration` |
| 1 | Showcase `section` | 1440×4704 @ y=667.36, **padding 20/48/40** | **six numbered articles** (each exactly 774px tall on desktop) + one sticky purple stage (606.47×710, `top:150px`) with six crossfading mock cards and an `01 / 06` foot |
| 2 | Details `section` | 1440×444.91 @ y=5371.36, **padding 120/48/0** | eyebrow "Details", h2 "Smaller things that save time", one 1240×192.7 radius-18 card with four icon cells |
| 3 | Closing CTA `section` | 1440×750.83 @ y=5816.27 | purple stage 1240×534.83, **radius 28, padding 96/72**, shadow pair; copy left, white checklist card right |
| 4 | `footer` | 1440×703.86 | same footer family as `/solutions` (Roducq reuses its own approved footer) |

Article ids and pitch **[MEASURED]**: `automations` y=687.36, `projects`
1461.36, `calendar` 2235.36, `connected` 3009.36, `insights` 3783.36,
`collaboration` 4557.36 — exactly 774px apart, each article 561.53px wide in
the left column. This is the same two-column sticky geometry `/solutions`
uses, with six articles instead of four.

Page title: **"Forma Features — Automations, projects, and focus time"**;
16 headings; document scrollHeight 7271 at 1440; **overflowX 0 at every
width and theme** **[MEASURED]**.

## 3. Section anatomy (all values [MEASURED] unless noted)

### 3.1 Hero

| Element | Value |
| --- | --- |
| Band padding | `92px 0 72px 0` desktop, `56px 0 44px 0` compact — the same `--10ocmuz` / `--1reti8r` custom properties `/solutions` measured |
| Eyebrow "Features" | DM Sans 600, **14/16.8**, `#5332d6`, centred |
| h1 ink line "Plan, automate, and track" | Manrope 600, **67.2/68.54**, letter-spacing **−2.02px**, `#1b1426`, one inline-block span per word; 44/44.88 below the desktop band (390/320) |
| Highlight line "your work in one place" | same 67.2 Manrope, `data-text-fill`, gradient `linear-gradient(90deg,#6246ea,#8b5cf6 50%,#c084fc)` — the exact gradient Roducq's `.lm-text-gradient` already uses |
| Lead | DM Sans 400, **19/31.35**, `#687083`, measure 640 |
| Buttons | two `<a>`, **52.03px tall, radius 10, 26px side padding**; primary bg `#5b3fe0` white text; secondary white bg, `#1b1426` text with a hairline border |
| Decoration | none — no bloom, grid, image or SVG in the hero |

LCP **[MEASURED]**: the gradient highlight span "your work in one place",
renderTime **548ms**, 51,375 px². The reference starts its words at
`opacity:0.001` + `blur(10px)` — Roducq must **not** copy that (PR #53 LCP
rule; see §6.1).

### 3.2 Sticky section nav

Outer `div`: `position:sticky; top:78px; z-index:30; padding:0 16px`
(`top:66px` in a second rule — the mobile/desktop step; Roducq re-bases onto
its own 64/72px chrome exactly as `/solutions` does). Inner pill
**794.52×47.7, radius 999, `rgba(255,255,255,0.72)`, shadow
`rgba(33,20,56,0.06) 0 1px 2px`, padding 5px**; at 390/320 it is full-width
with **`overflow:auto`** (horizontally scrollable chips). Chip number: DM
Sans 700, **11/17.05**, `#5332d6`. Chip label: DM Sans 400, **14/21.7**,
`#687083`. Same construction and tokens as the approved `/solutions`
`SectionNav`, six chips instead of four.

### 3.3 The six articles

Identical skeleton (article 01 boxes shown; all six share the pitch above):

| Part | Value |
| --- | --- |
| Eyebrow row | number "01" DM Sans **900** 12/18.6 `#5332d6` (Manrope tops out at 800 — Roducq substitutes 800, as `/solutions` documented) + label DM Sans 600 12/18.6, **0.96px tracking, uppercase**, `#687083`; screenshot shows a hairline under the row **[INFERRED]** colour `#eae6f1`-family |
| h2 | Manrope 600, **42/46.2, −1.26px**, `#1b1426`, one span per word (34/37.4 on phones) |
| Body | DM Sans 400, **17/28.9**, `#687083`, measure 520 |
| Three points | DM Sans 400 **15/24**, `#687083`; bold lead-in DM Sans **700** 15/24; faint hairline separators visible in band screenshots **[INFERRED]** |
| Link (article 04 only) | "Browse all integrations" DM Sans 500 15/23.25 `#5332d6`, with an arrow icon |

Reference copy (Forma domain — evidence only, never reused): 01 Automations
(rule builder), 02 Projects & boards (list/board/timeline), 03 Calendar &
focus, 04 Integrations (two-way sync), 05 Insights (weekly summaries),
06 Collaboration (one owner, comments, guest access).

### 3.4 The sticky mock stage

Three-box nesting, identical pattern to `/solutions`: stretched stage column
→ sticky child (`position:sticky; top:150px`, 606.47×710 at 1440; 535.84 wide
at 1200) → purple stage with the 150deg gradient and two radial glows
(Roducq's existing `.lm-solutions-stage`). Six absolutely-positioned white
mock cards crossfade inside; measured card chrome: white, **radius 16,
padding 27, shadow `rgba(8,2,30,0.55) 0 30px 60px -24px`, no border** — the
same `.lm-mock-card` treatment as `/solutions`. Card area inset 52px from
the stage sides. Foot: "01" DM Sans 600 **13/20.15 white** + "/ 06" 400 at
`rgba(255,255,255,0.6)` and a 2px rail (track `rgba(255,255,255,0.18)`,
white fill, 1/6 step per article — rail geometry carried over from the
shared `/solutions` measurement **[INFERRED]** for the fill width, family
**[MEASURED]**).

The six reference mock UIs (Forma task-domain — evidence only): rule builder
("Launch handoff / Active", When/And/Then chips, "Ran just now" foot);
kanban board ("Website refresh", To do 2 / In progress 1 / Done 3); day
calendar ("Tuesday", hourly slots, stand-up/focus/lunch/task chips);
integration toggles ("Connected apps 4 of 12"); weekly review (24 tasks,
6.4h focus, 4.2h saved, segmented bar, blocked-work callout); task comment
thread ("Prepare launch checklist", avatars JK/AL/MR).

**Below 1200px the sticky stage is absent** **[MEASURED]** — at 1024, 768,
390, 375 and 320 no wide sticky node exists; each article instead carries
its own inline purple stage (radius **26**, padding **13** at ≤809px /
**41** at 810–1199px; inner white card radius 14/15px padding on phones) —
the same `.lm-stage-inline` geometry `/solutions` ships.

### 3.5 Details band — "Smaller things that save time"

Section padding **120 top / 48 sides / 0 bottom**. Eyebrow "Details" (14/16.8
purple), 12px gap, h2 Manrope **400, 54/59.4, −1.62px** (32/35.2 on phones),
44px gap, then one card **1240×192.7, radius 18, base fill `#eae6f1`**
showing through 1px cell gaps as dividers; four white cells, each with a
**16×16 stroke icon**, h3 Manrope 600 **18/20.7 −0.81px**, body DM Sans 400
**15/24** `#687083`. On phones the card stacks to 358×677.8 at 390.
Reference cells: Command menu (⌘K), Search everything, Light and dark,
Export anytime (CSV/JSON).

### 3.6 Closing CTA

Purple stage **radius 28, padding 96/72**, shadow
`rgba(33,20,56,0.04) 0 2px 4px, rgba(58,28,110,0.32) 0 40px 80px -30px` —
indistinguishable from the `/solutions` closing stage Roducq already ships.
Headline Manrope 600 **64.8/66.1 −2.27px** with the soft lavender gradient
on the second line (`.lm-text-gradient-soft`); body DM Sans 16.5/28.05 at
76% white; buttons 52.03 tall radius 10 (white fill `#2a1570` text;
translucent `rgba(255,255,255,0.08)`); fine print 14/21.7 at 60% white.
Right card: white **radius 18, padding 24, 466.72×288.34**, shadow
`rgba(8,2,30,0.6) 0 30px 60px -24px`, title + "2 of 4", 6px progress rail
at 50%, four checkbox rows (Done/Done/Next/Later) — the same getting-started
card `/solutions` implements with `ChecklistRows variant="card"`. On phones
the card stacks under full-width buttons.

## 4. SVG and artwork inventory **[MEASURED]**

- 34 `<svg>` elements: **17 visible, 17 zero-size hidden sprites/templates**.
  Every visible SVG is a small **10.7–17px stroke icon** (`viewBox 0 0 24 24`,
  `fill:none; stroke-width:2; aria-hidden:true`) — the same lucide-style
  icon language Roducq already uses via `lucide-react`.
- **SMIL nodes: 0. WAAPI animations on SVG: 0. `Element.animate()` calls on
  SVG: 0.** No SVG path geometry, no draw/march/orbit animation exists on the
  page. The only stylesheet `@keyframes` is Framer's own editor-bar spinner,
  not part of the rendered site.
- **Canvas: 0. `<video>`: 0. `<img>`: 0.** Every product mockup is an
  HTML/CSS composition of text nodes, chips and fills — exactly the finding
  the `/solutions` audit made. Roducq's mocks must be HTML/CSS miniatures of
  its real surfaces, not invented SVG illustrations.

## 5. Motion behaviour **[MEASURED]**

All motion is JS-driven `Element.animate()` (Framer); 128 calls at 1440
light, 113 IntersectionObservers. Distribution:

| Calls | Duration | Easing | Properties | Use |
| --- | --- | --- | --- | --- |
| 44 + 43 | **900ms** | `cubic-bezier(0.16,1,0.3,1)` | opacity / filter (parallel pairs) | per-word headline dissolve, `blur(10px)→0`, 50ms stagger |
| 21 | **700ms** | `cubic-bezier(0.2,0.7,0.2,1)` | opacity | mock-layer crossfades, **80ms delay**, both directions |
| 4 | 350ms | body ease | opacity | header fade on scroll |
| 3+3 | 800ms | body ease | opacity / transform | eyebrow and lead rise (16px) |
| 3 | 550ms / 2×500ms | `cubic-bezier(0.42,0,0.58,1)` | opacity | internal mock swaps (toggles, pill) |
| 1 | 10000ms | linear | opacity hold | pre-reveal hold on the eyebrow wrapper |

IntersectionObservers: **six at `threshold:0.3`** — one per article, each
observing that article's headline wrapper (the exact `/solutions`
mock-swap trigger, six instead of four); 31 at the 100-step threshold array
for scroll progress; the remainder default reveals. LCP 548ms; CLS settles
near zero (largest shift 0.0106 at 600ms from the sticky nav settling).

### 5.1 The LCP rule overrides the reference (PR #53, preserved)

As on `/solutions`, the reference's `opacity:0.001` + `blur(10px)` hero
entrance is **not** reproduced. The hero reuses the approved clip-path mask
(`.lm-hero-in` / `.lm-hero-word` / `.lm-hero-accent`): opacity 1 in every
keyframe, no filter on the LCP candidate, server-rendered and fully visible
with no JavaScript. Below-the-fold article h2s keep the blur dissolve behind
`.lm-js` (`.lm-word-blur`), exactly as `/solutions` does.

## 6. Responsive behaviour **[MEASURED]**

| Width | Two-column sticky? | Nav pill | Article h2 | Hero h1 |
| --- | --- | --- | --- | --- |
| 1440 | yes (stage 606.47) | 794.52px centred | 42 | 67.2 |
| 1200 | yes (stage 535.84) | centred | 42 | 67.2 |
| 1024 | **no — inline stages** | full-width, scrollable | 34 **[INFERRED from 768/390 step]** | 44 |
| 768 | no | full-width, scrollable | 34 | 44 |
| 390 | no | 358px, `overflow:auto` | 34 | 44 |
| 375 | no | scrollable | 34 | 44 |
| 320 | no | scrollable, overflowX 0 | 34 | 44 |

The 1200px desktop boundary matches `/solutions`' measured breakpoint
(`@media (max-width:1199.98px)` flips the row to a column and removes the
sticky column). All 14 runs report **overflowX 0**.

## 7. Roducq content mapping — Checkpoint 2 (AWAITING APPROVAL)

Every Forma task-management term is replaced by a Roducq capability that
exists in the code today (surfaces under `app/(app)/`, `lib/`,
`supabase/migrations/`). No Forma name, copy, ticket id or mock datum is
reused. All mock data is fabricated and carries the visible
"Illustrative example · fictional client" disclosure used on `/solutions`.

### 7.1 Hero

- **Eyebrow:** "Features"
- **H1 ink line:** "Capture, structure, and send"
- **H1 gradient line:** "client work in one workspace."
  (tri-verb mirrors the reference's Plan/automate/track rhythm; all three
  verbs describe real Roducq stages — intake capture, briefs/proposals,
  updates/PDF/share)
- **Lead:** "roducq brings client intake, briefs, proposals, plans and
  updates together in one workspace, then carries each stage's structure
  into the next — so routine updates and handoffs happen without re-typing
  anything." (adapted from the approved homepage hero intro)
- **CTAs:** "Start free" → `/signup` (primary); "Talk to us" →
  `mailto:hello@roducq.dev` (secondary). Roducq has no demo product, so the
  reference's "Try the demo" is not faked.

### 7.2 The six articles and their stage mocks

| # | Anchor / chip | Reference role | Roducq article (grounded in) | h2 | Three bold-lead points | Stage mock (fictional) |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | `#automations` Automations | rule builder | Event log + signed webhooks (`lib/events.ts` ten `EVENT_TYPES`, `lib/webhook-dispatch.ts`, Settings → Webhooks) | "Hand-offs that carry themselves forward" | **Structure carries forward, not re-typed.** each stage inherits the last · **Signed webhooks on real transitions.** owner-configured HMAC endpoints · **A log of every run.** every event is recorded, deliveries are auditable | Rule card "When a proposal is accepted → Run webhook: Notify the client channel · Create the delivery plan · Queue the first update" (reuses homepage `AUTOMATION_PANEL`), "Meridian Retail — Q4 retainer · Active", "Every event is logged to the activity feed." |
| 02 | `#projects` Projects & plans | board views | Plans from accepted proposals (`plans` table: tasks jsonb, status not_started/in_progress/done; no board/timeline/priority claims) | "Every accepted proposal becomes a working plan" | **Deliverables become the checklist.** copied from the proposal, ticked in place · **One status the whole workspace sees.** not started, in progress, done · **Templates for repeated work.** owner-managed workspace templates | Plan card "Northwind Bakery — brand refresh · In progress", five task rows with checks, progress "3 of 5" |
| 03 | `#cadence` Updates & time | calendar & focus (Roducq has **no calendar** — honest substitute, labelled in this doc) | Updates composer + time log (`updates`, `time_entries`, share links) | "The weekly update writes itself from real progress" | **Composed from the plan, not memory.** editable markdown drafted from ticked tasks · **Hours logged by the day.** the time log, grouped by day · **Shared behind a link you can revoke.** token links, no client account | Weekly update card "Week of Sep 22" with three progress lines, a share-link row and a time row |
| 04 | `#connected` Integrations | two-way sync (Roducq's connectors are **read-only inbound** — no two-way claim) | Slack/Notion/mailbox inbound, webhooks/PDF/share links outbound (`lib/integrations/*`) | "Bring the work in from the tools you already use" | **Quick to connect.** OAuth from Settings, re-auth surfaced when a token expires · **Sources, not copies.** the original message stays attached, providers stay read-only · **Outbound on your terms.** signed webhooks, revocable links, PDF export | Connections card "3 of 5 connected": Slack, Notion, Email inbox connected; Webhooks 1 endpoint; PDF & share links built in. Link "Browse all integrations" → `/#integrations` (real homepage anchor; no `/integrations` route exists) |
| 05 | `#insights` Insights | weekly summaries | Reports + time rollup (`lib/reports.ts` computeReport, `/reports`, `/time`, PDF) | "One rollup instead of another status meeting" | **Computed live from your data.** money, hours and contracts on one screen · **Hours by brief.** top briefs plus a General row · **The figures travel into the update.** logged hours land in updates and invoice notes | Rollup card "Workspace rollup · September" with three illustrative stat tiles, brief bars and a "Download PDF" row (fictional figures, disclosed) |
| 06 | `#collaboration` Collaboration | owner/comments/guests (Roducq has **no task comments** — not claimed) | Roles + viewers + proposal versions (`docs/roles-spec.md`, `proposal_versions`, share links) | "One workspace, clear roles, clients on a link" | **Three roles, enforced by row-level security.** owner, member, viewer; viewers blocked from money surfaces · **Clients follow progress without an account.** viewer access plus revocable share links · **Every proposal save is a restorable version.** snapshot, diff and rollback | Roster card "Owner 1 · Members 3 · View only 2" plus a version row "Proposal v3" and a brief open-question row |

### 7.3 Details band — Roducq's four honest "smaller things"

The reference cells include a ⌘K command menu and CSV/JSON export that
**Roducq does not ship** (verified: no cmdk dependency, no command palette;
export is PDF only). They are replaced by real capabilities, same four-cell
structure:

1. **Global search** (lucide `Search`) — one box across briefs, proposals,
   plans, updates, invoices and contracts (`lib/search.ts`, six
   `SEARCH_GROUPS`; money groups hidden for viewers).
2. **Open questions, tracked** (`MessageCircleQuestion`) — vague brief parts
   are flagged for the client instead of guessed (`brief_questions`).
3. **Light and dark** (`Moon`) — the real header theme toggle, follows the
   system setting.
4. **PDF export anytime** (`FileDown`) — proposals, contracts, invoices and
   time reports as PDF (`lib/pdf/*`). Never says CSV or JSON.

Side card: the getting-started checklist reuses the approved
`ONBOARDING_CHECKLIST` / `SOLUTIONS_CHECKLIST` items (Create workspace ·
Paste a client message · Generate your first brief · Invite your team;
2 of 4).

### 7.4 Closing CTA

Reuses the already-approved Roducq closing verbatim, as `/solutions` does:
"Try roducq with your own client project" (white + soft-gradient words),
the free-plan lead, Start free / Talk to us, fine print "The whole pipeline
is free, with no trial clock to watch.", and the first-project checklist
card. No Forma word appears.

## 8. Planned implementation (only after approval)

- New route `app/(marketing)/features/{page.tsx,content.ts}`; components
  under `components/marketing/landing/features/` (`FeaturesHero`,
  `SectionNav` adapted to six chips, `FeaturesShowcase` with the measured
  0.3-threshold observer and sticky stage, `FeatureMocks`, `DetailsBand`,
  closing CTA reusing the approved stage components).
- Tokens and gradients come exclusively from the existing `--lm-*` layer;
  the only new CSS is scoped to the new band where a measured value has no
  token yet. No new dependencies; Motion.dev only; lucide icons only.
- `SiteHeader` gains the smallest possible pathname extension so
  `/features` reuses the `/solutions` chrome variant; the change is scoped
  so `/`, `/about`, `/pricing` and `/vs` are untouched (documented in the
  final PR).
- LCP-safe hero (clip-path mask, opacity 1 throughout), `.lm-js`-gated
  pre-hide, reduced-motion and no-JS fallbacks, six-chip scrollable nav on
  phones, inline stages below 1200px.
- Tests: a `tests/components/features-page.test.ts` mirroring the
  `/solutions` contract (shape, domain guard against Forma/task vocabulary,
  token discipline, motion contract, route/href integrity, 320px overflow).

## 9. Verification plan

`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`; then the
Playwright harness at all seven widths in both themes (overflow, h1,
sticky geometry, crossfade timing, reduced motion, no-JS, axe-core), and the
PR #53 four-scenario LCP suite (`scripts/verify-solutions-lcp.mjs` adapted
to `/features`, plus the same run on `/` as the regression control).
No number is recorded before it is measured.

## 10. What this page will not claim (truthfulness sweep)

No calendar, focus blocks or meeting scheduling; no board/timeline views,
task priorities or drag-to-calendar; no two-way integration writes (Slack
and Notion are read-only inbound); no ⌘K command menu; no CSV/JSON export;
no task comments; no automations beyond the recorded event types and signed
webhooks; no Forma pricing, names or data; no invented customer, testimonial
or metric.

## 11. Implementation record (2026-10-26)

Built on branch `arena/e0c5626f-roducq` from the approved §7 mapping. No
section of the reference copy, naming or mock data was reproduced; every
string lives in `app/(marketing)/features/content.ts`.

### 11.1 Files

- Route: `app/(marketing)/features/{page.tsx,content.ts}` (static export,
  canonical `/features`).
- Components under `components/marketing/landing/features/`:
  `FeaturesHero`, `FeaturesSectionNav`, `FeaturesShowcase`,
  `FeatureMockPanel`, `FeatureMocks`, `DetailsBand`, `FeaturesClosingCta`.
  The closing checklist reuses the approved `ChecklistRows variant="card"`
  from the `/solutions` mocks; the stage, crossfade, word-dissolve and
  reduced-motion machinery is the shared `landing.css` layer.
- `SiteHeader` gains one `features` pathname boolean feeding a `showcase`
  visual gate. The locked line
  `const items = solutions ? SOLUTIONS_NAV : NAV;` is byte-identical, and
  `/`, `/about`, `/pricing`, `/vs` keep their original header (covered by
  the existing `vs-comparisons` and nav tests).
- `tailwind.config.ts`: maps the already-declared `--lm-cta-faint`,
  `--lm-cta-track`, `--lm-cta-fill` custom properties to utilities. The
  properties shipped with `/solutions` but had no config mapping, so the
  stage rail and counter were silently unstyled there; the mapping repairs
  both pages.
- Tests: `tests/components/features-page.test.ts` (30 tests); route
  inventory 34 → 35 in `forma-phase-f.test.ts`; the responsive harness
  gains the `marketing-features` fixture.
- Verification: `scripts/verify-features-lcp.mjs` (four LCP scenarios ×
  three runs on both `/features` and `/`, seven-width × two-theme overflow,
  axe-core, reduced-motion and no-JS) with the dispatch-only workflow
  `.github/workflows/forma-features-verify.yml` publishing its report to
  `arena/forma-features-capture`.

### 11.2 Deliberate, documented departures

- **No ⌘K / CSV / JSON cells.** The details band keeps the measured
  four-cell structure but substitutes global search, tracked brief
  questions, the theme switch and PDF-only export — all real surfaces.
- **"Blocked" state ink.** The token set maps two state inks (success
  green, accent purple); the update mock's blocked row uses strong neutral
  ink rather than an unmapped vermillion.
- **Automation chip ink.** Non-accent rule chips sit on the deeper
  `canvas-alt` wash, where `muted-slate` measures 4.34:1; they use the
  documented `muted-readable` step (4.71:1 on every wash). This fixed the
  only eight axe color-contrast nodes the first browser run found.
- **Touch floor.** The measured 37.7px chips and 52px buttons keep their
  visual geometry while meeting the shell's 44px `min-h-11` floor, exactly
  as `/solutions` does.
- Fictional names stay inside the content module (the mock `ariaLabel`
  fields); components render only through the data, satisfying the
  fabricated-data guard.

### 11.3 Measured verification (Chromium 153.0.8010.12, GitHub runner)

Report: `features-verification.json` on the `arena/forma-features-capture`
branch. Every verdict passed on both routes after the contrast fix:

| Check | `/features` | `/` (regression control) |
| --- | --- | --- |
| LCP median, mobile unthrottled (budget 2500ms) | 76ms | 128ms |
| LCP median, mobile 4× CPU | 208ms | 208ms |
| LCP median, desktop 1440 | 76ms | 140ms |
| LCP median, reduced motion | 84ms | 116ms |
| CLS, all 12 runs | 0 | 0 |
| Hero elements computed opacity | 1 throughout | 1 throughout |
| Horizontal overflow, 320/375/390/768/1024/1200/1440 × light/dark | 0px | 0px |
| axe-core (wcag2a/aa/2.1/2.2 + best-practice) | 0 violations, 40 passes | 0 violations, 41 passes |
| Reduced-motion emulation | active, entrance animation resolves to none | same |
| No-JS render | 6 articles, six miniatures, 59 disclosure texts, no `lm-js` flag, hero opacity 1 | n/a |
| Sticky stage scroll follow | 0.3-threshold swap trail across all six articles | n/a |
| Console/page errors | none | none |

Offline gates also green: `npm test` (1174 tests), `npx tsc --noEmit`,
`npm run lint`, `npm run build` (`/features` prerenders static), plus the
standard `verify` CI workflow. The temporary `push` triggers on both
features workflows were removed before the pull request; both are
`workflow_dispatch`-only.
