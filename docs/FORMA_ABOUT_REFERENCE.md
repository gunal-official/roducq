# roducq /about — Forma reference audit and proposed Roducq mapping

Reference: <https://forma-visuvate.framer.website/about>
Target: <https://roducq.nanexi.com/about> (`app/(marketing)/about/page.tsx`)
Branch: `arena/38893169-roducq` (branched from `main` @ `4618b16`)
Status: **Phase 1 reference audit + Phase 2 proposal. No application code
has been changed: awaiting owner approval before Phase 3 implementation.**

Every claim is labelled:

| Label | Meaning |
| --- | --- |
| **[MEASURED]** | read from the live reference in this session (fetched page text/structure) |
| **[OBSERVED]** | read from the owner-supplied raster (`about.pdf`, rendered below) — proportions, not CSS values |
| **[DOCUMENTED]** | a value already recorded in an existing repo reference doc/token, not re-derived here |
| **[INFERRED]** | chosen because no measurement covers it, with the reason stated |
| **[UNVERIFIED]** | no evidence available — stated as a gap, never as a pass |

---

## 1. Repository and PR baseline (Phase 0)

| | |
| --- | --- |
| `main` at start | `4618b16` — "Merge pull request #75 from gunal-official/arena/7b2498d8-roducq" |
| PR #75 **[MEASURED]** | **MERGED** 2026-10-28T11:10:17Z ("Fix mobile account menu obstruction and verify shell actions"); its merge commit is this branch's base, so no merge-forward is needed |
| Open PRs **[MEASURED]** | none (`gh pr list --state open` returned `[]`) — no open PR touches the marketing design system |
| Working tree at start | clean |
| Session branch | `arena/38893169-roducq` (fixed by Arena; all work lands here, never `main`) |
| Stack | Next.js `^16.4.3`, React `^18.3.1`, `motion` 14.3.0, `playwright-core` `^1.63.0` (package.json) |

### Current Roducq `/about` implementation

`app/(marketing)/about/page.tsx` (139 lines) — a pre-redesign page on the
shared marketing shell (`SiteHeader`/`SiteFooter`, unchanged in scope):

1. Two-column hero: eyebrow "About roducq", H1 "A writing studio for
   client work", two paragraphs, CTAs ("Try it" → `/signup`, "See
   pricing" → `/pricing`) left; `BriefSourceArt` illustration right.
2. "What's inside today" — four cards (Intake with gap-flagged briefs /
   A real source trail / A pipeline, not a pile of docs / Client-facing
   output).
3. Closing card: audience + early-access note + Next.js/Supabase/RLS.

This composition does **not** match the reference; the copy is the
authoritative, already-published Roducq fact base for the proposal in §6.

### Tests touching `/about`

| File | Assertion | Impact |
| --- | --- | --- |
| `tests/components/forma-phase-f.test.ts:157` | `about/page.tsx` matches `/BriefSourceArt/` and not `/spin_\d+s\|animate-pulse/` | **will fail**: the reference hero is type-only, so `BriefSourceArt` leaves the page |
| `tests/components/production-readiness.test.ts:27` | canonical `/about` | preserved (metadata unchanged) |
| `tests/components/marketing-header.test.ts:64` | nav contains `["/about", "About"]` | preserved (shared header untouched) |
| `tests/components/home.test.ts` | LIMITATION copy contract ("no e-signature, no payment collection") | preserved; constrains proposed copy |

### Evidence harness added this session

The reference host is unreachable from this sandbox (egress allowlist;
see `docs/FORMA_FINAL_FIDELITY_AUDIT.md` §1.1). Following the established
per-page pattern, this session added:

- `scripts/capture-about-reference.mjs` — the proven landing harness
  (`page.goto(BASE)`, `colorScheme` emulation, 40 ms WAAPI first-seen
  sampler, section/element metrics) adapted for `/about`, with the
  1200×900 viewport added so all seven milestone widths
  (320/375/390/768/1024/1200/1440) are covered, light+dark.
- `.github/workflows/forma-about-reference.yml` — captures **both**
  Roducq `/about` (local build) and Forma `/about` in one runner job;
  uploads a build artefact and, because the sandbox egress blocks the
  artefact download host (`*.blob.core.windows.net`), also commits a
  curated subset of the evidence to this session branch (fetchable
  over `github.com`). It carries the temporary `push` trigger bootstrap
  and a push-only publish step recorded in
  `FORMA_FINAL_FIDELITY_AUDIT.md` §1.1 — both must be removed before the
  PR so the landed workflow is dispatch-only.

First run: `forma-about-reference` #40681222999 (in progress at time of
writing; results land in `docs/screenshots/forma-about-reference/`).
The desktop dark-mode screenshot from that run, reviewed during this
audit, already confirms the current Roducq page renders with the shared
announcement band + header and the pre-redesign hero above.
`verify` run #40681223203 runs the full suite on the same push.

**Phase 8 (tests/build/perf) is intentionally deferred to after the
approval checkpoint**, per the task's mandatory stop; no test or build
results are claimed in this document.

---

## 2. Reference evidence and provenance

| Source | Strength | Covers |
| --- | --- | --- |
| Live page fetch (`forma-visuvate.framer.website/about`, this session) | **[MEASURED]** | Title ("About Forma — The team and principles behind the product"), section order, exact headings/copy, link destinations |
| Owner-supplied `about.pdf` — image-only, 2 Letter pages (612×792 pt, no text layer), SHA-256 `bd84771d0d3bd22fa18b0daaf53250176095f20e419f1a0664ad11a4c56f99a0`; rendered to `docs/screenshots/forma-about-audit/reference-user-provided-page{1,2}.png` (1600×2071) | **[OBSERVED]** | Desktop light-mode composition, hierarchy, gradient headline, row/card/CTA geometry as proportions. Source viewport/DPR unknown — not measured CSS (pricing precedent, `docs/FORMA_PRICING_REDESIGN.md`) |
| Existing repo measurements (`FORMA_FINAL_FIDELITY_AUDIT.md`, `ANIMATION_NOTES.md`, `landing.css` tokens) | **[DOCUMENTED]** | Shared type scale, container widths, purple gradient stops, button metrics, motion vocabulary |
| CI capture #40682058330 (`scripts/capture-about-reference.mjs`, real Chromium, saved in `docs/screenshots/forma-about-reference/`) | **[MEASURED]** | Exact `/about` computed styles + boxes, WAAPI timings, all seven widths, light theme. **Limitation:** the reference's manual theme toggle did not respond to `colorScheme` emulation (both "dark" passes record a white body), so the reference dark theme is **[UNVERIFIED]**; Roducq dark will follow its own documented `--lm-*` dark tokens |

---

## 3. Reference structure and copy — [MEASURED]

Top to bottom (shared reference header/footer excluded — Roducq keeps
its own shell):

1. **Hero (centred, type-only)**
   - Eyebrow: "About"
   - H1: "Why we are building Forma" — "Why we are" ink, "building
     Forma" in a purple gradient [OBSERVED]
   - Lead: "Keeping a team's work organized had turned into a job of
     its own: updating boards, chasing status, and copying things
     between apps. Forma is our attempt to take that job away."
   - No CTAs, no illustration.
2. **"Where the time goes"** — split band: H2 left, three paragraphs
   right (problem → answer → success metric). First paragraph set in
   ink, following two muted [OBSERVED].
3. **Principles** — eyebrow "Principles", H2 "How we make product
   decisions", five numbered rows (01–05):
   Fewer notifications · Your tools, not ours · Automation you can see ·
   Frequent, documented releases · Your data stays yours (CSV/JSON
   export claim — **Forma-specific, not transferable**).
4. **Three link cards** — Changelog ("See what shipped recently") →
   `/changelog`; Security ("How we protect your data") → `/security`;
   Contact ("Send us feedback") → `/contact`. Each: purple eyebrow,
   bold title, muted description, purple link with ↗.
5. **CTA band** — purple gradient panel: H2 "Try Forma with your own
   projects" (second half lavender), lead, white "Start for free" +
   outlined "Try the demo", note "Free plan available. No credit card
   needed.", and a white "Getting started — 2 of 4" checklist card
   (progress bar; Done/Done/Next/Later rows — **task-manager content,
   not transferable**).

Copy above is transcribed verbatim from the live fetch and confirmed
against the raster. Headline tokens arrive word-wrapped
("Whyweare…"), the known Framer per-word span structure
(`ANIMATION_NOTES.md` §1).

---

## 4. Reference visual design — [OBSERVED] raster + [DOCUMENTED] tokens

### 4.1 Composition (page 1–2 of the raster)

- Header: white, logo left, centred nav, theme icon + purple
  "Get started" — matches Roducq's already-recreated shell; the
  reference has **no announcement band** (Roducq keeps its own;
  documented intentional difference, cf. `FORMA_PRICING_REDESIGN.md`).
- Hero: eyebrow centred; H1 on one line, large (≈72 px token);
  two-tone with the second half in a bright-violet→light-lavender
  gradient; lead centred across ~3 lines in muted gray (~630 px wide);
  generous whitespace below (~2× heading height) before band 2.
- Band 2: H2 column ≈ 40% of content width; prose column ≈ 52%;
  three paragraphs, first ink/regular, rest muted, relaxed leading.
- Principles: hairline-topped rows; number (purple, small, ≈7%),
  title (≈20 px, semibold ink, ≈25%), description (muted ≈14–15 px,
  remainder); generous row padding (~28–32 px at desktop scale).
- Cards: 3-up equal columns, white, hairline border, radius ≈16–20 px,
  padding ≈24 px; eyebrow purple ~13 px; title ≈21 px semibold;
  description ≈14 px muted; link row purple with ↗, underlined on the
  rendered raster.
- CTA: full-content-width panel, radius ≈24–32 px, deep-violet→bright
  violet diagonal gradient; left text column ≈50% (two-tone H2, lead at
  white ~80%, white filled + white-outlined buttons, small note);
  right white card (≈40%, radius ≈16 px, soft shadow) with progress
  bar at 50% and four checkbox rows, the "Next" row lavender-filled.
- Reference footer (logo + 4 columns + huge pale wordmark) mirrors
  Roducq's existing `SiteFooter` pattern — no change proposed.

### 4.2 Tokens to bind — [DOCUMENTED] from prior measured audits

| | |
| --- | --- |
| Content column | 1240 px @1440 (x=100), 736 @768, 358 @390 |
| H1 | 72/400/1.02 @1440 · 48 @1024 · 43 @390 |
| H2 | 54/400/1.1 @1440 · 34 @1024 · 32 @390 |
| Purple frame gradient | `#36278c` → `#9178e6` |
| Brand palette | purple `#7c3aed`, lavender `#ede5f8`, plum `#2c1b36`, canvas `#faf8fc`, ink `#261d2d`; dark purple `#bba4ff` (`docs/forma-design-system.md`) |
| Buttons | radius 10 px, height 52 px, 15 px/400 |
| Accent tokens (`landing.css`) | `--lm-accent #6246ea`, `--lm-accent-strong #5b3fe0`, `--lm-muted-readable #75609a` (≥4.71:1), `--lm-leading-display 1.02`, `--lm-leading-heading 1.1` |

### 4.3 Still [UNVERIFIED] until CI capture lands

- Exact `/about` H1/H2 compute (assumed equal to the shared scale above).
- Section paddings, row metrics, card radius/padding, CTA panel size
  and exact gradient stops (pixel sampling: `sample-landing-pixels.mjs`).
- Hero gradient exact stops/direction on the H1 text.
- Entrance durations/easings **specific to `/about`** (WAAPI dump);
  hover behaviour of cards/rows (the rows read as static text).
- Responsive stacking at 320–1024 and the full dark-theme treatment
  (screenshots per width × theme).

---

## 5. Motion plan — measured on `/about` (§4.4) + inherited components

Motion.dev only (`motion@14.3.0` already the marketing runtime). If
approved, bind the existing components to this page's measured profile
rather than inventing motion:

- **Hero**: `lm-line-rise` masked line rise for the H1 (900 ms,
  `cubic-bezier(0.16,1,0.3,1)`, lines at 80/280 ms) and `lm-hero-in`
  fade-ups for eyebrow/lead on the measured landing ladder — [INFERRED]
  where `/about`'s ladder isn't individually resolved in the dump.
- **Section headings**: `SectionHeading` per-word masked rise
  (900 ms, 50 ms/word) — matches the 252-record 900 ms profile and the
  reference's per-word span structure seen in the dump.
- **Block reveals** (rows, cards, CTA): `Reveal` (once,
  `amount: 0.08`, 60–90 ms staggers) with its duration bound to this
  page's measured 800 ms `cubic-bezier(0.2,0.7,0.2,1)` entrance profile
  instead of the landing's inherited 620 ms estimate — final binding
  decided at implementation against the dump, and recorded either way.
- **Hover/state**: 200 ms `cubic-bezier(0.2,0.7,0.2,1)` colour/border/
  shadow (measured here and on the landing); no card scale.
- **PR #53 LCP protections (mandatory)**: hero/LCP text never starts at
  `opacity: 0` — clip-path masking only; no heavy initial blur; content
  fully visible without JavaScript; `prefers-reduced-motion` disables
  all of the above via the existing kill switch. LCP target < 2.5 s in
  the four PR #53 scenarios (verified in Phase 8; not measured here).

Element-by-element timing assignment stays labelled until Phase 3,
per the honesty rules in `ANIMATION_NOTES.md` §1.

---

## 6. Proposed Roducq mapping — PENDING APPROVAL

Layout and rhetorical slots preserved; every word of copy is drawn
from, or consistent with, Roducq's already-published About/home/pricing
text. Nothing below is implemented.

### Band 1 — Hero
- Eyebrow: `About`
- H1: `Why we are building roducq` — "Why we are" ink, "building
  roducq" gradient (lowercase brand per every existing page).
  Alternative if a distinct headline is preferred: keep the current,
  already-published `A writing studio for client work.` in this slot.
- Lead: "Client work starts as scattered communication — an email
  here, call notes there, a "quick question" in chat. roducq is the
  writing studio that turns that raw material into briefs, proposals,
  plans, and updates." (Both sentences already published on `/about`.)

### Band 2 — Split prose
- H2: `Where the context gets lost`
- P1 (ink): "On most engagements, the brief lives in an email thread,
  the changes in chat, the deadline in a calendar, and the context in
  someone's head. Freelance designers, developers, writers, and small
  studios spend a large share of every week turning that into
  documents that agree with each other."
- P2 (muted): "roducq takes that raw material as-is and structures it.
  Paste a client email, call notes, or a chat log and get a structured
  draft that flags what's vague or missing as tracked open questions.
  Every source stays verbatim and attached to its brief, and each
  stage carries the last one's structure forward: briefs become
  proposals, proposals become plans, plans drive client updates."
- P3 (muted): "We measure success by how much of that re-writing
  disappears — and by whether you can always point back to what the
  client actually said." *(Structurally mirrors the reference's third
  beat; Roducq-specific content. Flagged for approval — alternative:
  "The goal is less re-typing, fewer gaps discovered late, and a
  source trail you can point to when it matters.")*

### Band 3 — Principles
- Eyebrow: `Principles` · H2: `How we make product decisions`
  (generic section label; accurately introduces the list. Alternative:
  `The decisions behind the product`.)
- 01 `Start from what the client said` — "Paste the email, the call
  notes, or the chat log. roducq drafts from the real words, not from
  a blank template."
- 02 `Gaps are flagged, not guessed` — "What's vague or missing is
  surfaced as a tracked open question, so you ask early instead of
  discovering it late."
- 03 `Every source stays attached` — "Each pasted message stays
  verbatim and immutable, threaded onto its brief — you can always
  point back to what the client actually said."
- 04 `One pipeline, not a pile of docs` — "Briefs become proposals,
  proposals become plans, plans drive client updates. Each stage
  carries the last one's structure forward instead of starting over."
- 05 `We say what it doesn't do` — "roducq writes the work; it doesn't
  collect signatures or payments. The limits are written on the page,
  not in the small print." (Replaces Forma's CSV/JSON export claim,
  which is **[UNVERIFIED]** for Roducq; grounded in the published
  LIMITATION doctrine.)

### Band 4 — Three link cards
- Changelog → `/changelog`: "See what shipped recently" /
  "Verified product updates, interface improvements, and fixes —
  ordered most recent first." (the `/changelog` page's own published
  description) / "Read the changelog ↗"
- **Security has no Roducq destination** (no `/security` or `/privacy`
  route exists). Proposed Roducq-specific replacement preserving the
  card layout — Compare → `/vs`: "Where roducq fits — and doesn't" /
  "Side-by-side comparisons with the tools freelancers and studios
  already use, including the work roducq leaves to them." /
  "Read the comparisons ↗" (matches the LIMITATION block's own link).
  If a `/security` page is created later, this slot maps 1:1 back.
- Contact → `mailto:hello@roducq.dev`: "Send us feedback" /
  "Questions, bug reports, and feature requests go to the people
  building roducq. It's in early access, so feedback shapes what
  ships next." / "Get in touch ↗" (address is the published Studio
  contact on `/pricing`).

### Band 5 — CTA
- H2: `Try roducq with your own client work` (second half lavender).
- Lead: "Start free, paste your first client message, and watch it
  become a brief." ("Start free" is the published site-wide CTA.)
- Buttons: `Start free` → `/signup`; `See pricing` → `/pricing`
  (Roducq has **no demo route** — "Try the demo" is not copied).
- Note: "Free to start — signup doesn't activate a paid plan."
  (Verifiable per `FORMA_PRICING_REDESIGN.md`. The reference's
  "No credit card needed" is deliberately **not** used — `home/content.ts`
  records that "no credit card to sign up" phrasing is avoided.)
- Illustration: DOM/SVG pipeline card in the reference checklist's
  geometry, captioned **"Illustrative example · fictional client"**:
  header "From message to brief — 2 of 4", progress bar 50%, rows
  "Paste the client message / Done", "Review the flagged gaps / Done",
  "Draft the brief / Next" (highlighted), "Share the update link /
  Later". No fake client names or data; built as markup (the
  `WorkspacePreview` pattern), not a screenshot.
- The reference hero has no illustration, so `BriefSourceArt` leaves
  the page; the CTA card is the only artwork. Existing artwork
  components (`ClientWorkArt`) remain untouched.

### Metadata / shell
Title, description, canonical `/about`, OG/Twitter images: unchanged.
`SiteHeader`, `SiteFooter`, announcement band: unchanged.

---

## 7. Claim audit

**Not carried over from the reference** (Forma-specific or unsupported):
CSV/JSON export · "No credit card needed" · free-plan wording verbatim ·
demo · automations/calendar/pull-request product story · the entire
Forma "Where the time goes" narrative · task-manager checklist content ·
© 2026 Forma footer.

**Not invented for Roducq**: no founder story, team, headcount,
customers, revenue, funding, awards, testimonials, milestones, or
locations. Every proposed sentence traces to currently published
Roducq copy (`about/page.tsx`, `home/content.ts`, `/changelog`,
`/pricing` disclosures). The LIMITATION contract ("no e-signature, no
payment collection") is preserved and, in principle 05, surfaced.

**Test consequence (Phase 3, not a weakening)**: the
`forma-phase-f.test.ts` `BriefSourceArt` assertion becomes obsolete
and is proposed to be **replaced** with equal-or-stronger assertions in
a new `tests/components/about.test.ts` (exact approved copy, section
order, five principles, illustration label present, resolvable hrefs,
no demo link, hero not initialised at `opacity: 0`) — the same
replacement pattern accepted for pricing. All other existing tests are
preserved.

---

## 8. Decisions requested at the approval checkpoint

1. H1: `Why we are building roducq` (proposed) vs keeping the current
   published `A writing studio for client work.`
2. Band-2 heading `Where the context gets lost`, and the mirrored
   "We measure success…" sentence, or the stated alternative.
3. Principles heading: `How we make product decisions` vs
   `The decisions behind the product`.
4. Security card → Compare (`/vs`) replacement (no `/security` page
   exists; creating one is out of scope).
5. Contact destination: `mailto:hello@roducq.dev` (published on
   `/pricing`) — confirm it is monitored for feedback.
6. CTA secondary `See pricing` (no demo exists) and the note
   "Free to start — signup doesn't activate a paid plan."
7. Any verified company material the owner wants included — none is
   proposed, because none exists in the repo today.
