# Forma Phase E — financial surfaces (Invoices, Contracts, Time, Reports, Search)

2026-10-16. This document is the closeout for **Phase E — the financial
workflow**: every Invoices, Contracts, Time and Reports surface (list,
detail, composer, chart), plus the global Search page, rebuilt on the Forma
design language established in Phases A–D.

It records the route inventory taken before editing, what changed, the
evidence actually captured, and the limits of that evidence.

---

## 1. Base and safety gate

| Check | Result |
| --- | --- |
| PR [#37](https://github.com/gunal-official/roducq/pull/37) (Phase D) | **MERGED** — `mergedAt 2026-10-16T09:03:20Z`, merge commit `6a0a4d7` |
| Local base | The Arena-pinned branch `arena/eb78665b-roducq`, branched from that exact commit; `origin/main` re-fetched and confirmed identical before editing |
| Phase A tokens | Verified in `app/globals.css` + `lib/design-tokens.ts` (purple `#5B3FE0`, lavender `#EFEBFF`, plum, semantic success/warning/error/info) |
| Phase B shell | Verified — sidebar/topbar/dock/More drawer, `RoduMark`, split auth screens; untouched by this phase |
| Phase C pages | Verified — `forma-core` planes on Pipeline, Intake, Inbox, Settings; untouched |
| Phase D pages | Verified — `forma-briefs/proposals/plans/updates` planes; untouched (no Phase C/D selector was edited — the Phase E block re-exposes the shared vocabulary for its own planes by new selector group) |
| Manrope typography | Verified — self-hosted `app/fonts/Manrope-Variable.woff2`; no new font introduced |
| Push access | Verified with a dry-run push to `origin/arena/eb78665b-roducq` |
| Baselines before editing | `npm test` 758 passing · `npm run lint` clean · `npx tsc --noEmit` clean · `npm run build` clean · `verify:db` ✔ · `verify:pdf` ✔ |

---

## 2. Route inventory (taken before editing)

Every authenticated route was inspected. Routes already carrying a
Phase C/D plane were audited and left alone; the seven below were the
remaining visually unmigrated application surfaces.

| Route | Source | Visual state before | Phase E scope |
| --- | --- | --- | --- |
| `/invoices` | `app/(app)/invoices/page.tsx` + `components/invoices/InvoicesList.tsx` | Step-17/33 vocabulary: bare `h1`, shadcn `Tabs` strip, generic Card grid, plain inline create form | List: showcase band, stat tiles kept, chips toolbar, work cards with figure rows, composer-shell create form |
| `/invoices/[id]` | `app/(app)/invoices/[id]/page.tsx` + `InvoiceComposer`, `InvoiceLinkPanel` | Step-34(b) doc vocabulary, but no plane, hand-rolled `RailCard`s, generic Card composer | Detail: financial plane, status band with art, labelled ledger, SectionCard rails, reshelled composer |
| `/contracts` | `app/(app)/contracts/page.tsx` + `components/contracts/ContractsList.tsx` | Same Step-17/33 vocabulary as invoices | Same treatment as invoices, agreement-flavoured |
| `/contracts/[id]` | `app/(app)/contracts/[id]/page.tsx` + `ContractComposer` | Step-34(b); same gaps as the invoice detail | Detail: signing band with art, SectionCard rails, reshelled composer |
| `/time` | `app/(app)/time/page.tsx` + `components/time/TimeLog.tsx` | Step-18: `rounded-md` lists, `h-9` inputs, bare day groups | Time workspace: band with elapsed-time art, chips toolbar, day panels with white entry rows, composer-shell form |
| `/reports` | `app/(app)/reports/page.tsx` + `components/reports/ReportsView.tsx` | Step-20: three plain Cards, bare stat rows | Report: band with the meaningful money-split drawing, SectionCards, accessible by-brief chart |
| `/search` | `app/(app)/search/page.tsx` | Step-33: plain Card groups, plain form row | Search: lavender hero band (plain GET form kept), SectionCard groups, lavender hit rows |

**Audited, already migrated, not touched:** `/` (Pipeline), `/intake`,
`/intake/inbox`, `/briefs`, `/briefs/[id]`, `/proposals`,
`/proposals/[id]`, `/proposals/[id]/versions/[versionId]`, `/plans`,
`/plans/[id]`, `/updates`, `/updates/[id]`, `/settings` (Phase C/D planes,
re-measured clean by this phase's audit run).

**Audited, kept as-is deliberately:** the public `/invoice/[token]` and
`/share/[token]` document views (already the Step-34/35 paper vocabulary —
same `PaperCard` the member pages use; both are re-swept by the audit with
0 findings), `/invite/[token]` (Phase B vocabulary), the (app)
`loading.tsx` skeleton (token-based, content-shaped) and the API/PDF
routes. The `(app)/error.tsx` boundary was given the shared `EmptyState`
vocabulary (one line of copy, a 44px Try again button, the Sentry hook
untouched).

**Note on scope:** the Phase D checklist placed Search in Phase F; this
phase pulled it forward because the brief scopes it here and because the
result cards share the exact vocabulary the financial lists were getting
(chips, SectionCards, lavender rows). Phase F remains the cross-cutting
forms/dialogs/menus pass, the shared motion audit, and the marketing
header fixes.

**Functional dependencies, all preserved (§7):** `lib/data/invoices|contracts|time|briefs`,
`lib/invoice-totals`, `lib/reports`, `lib/search`, `lib/data/search`,
every server action in `app/(app)/invoices/**`, `app/(app)/contracts/**`,
`app/(app)/time/actions.ts`, the PDF endpoints (`/api/pdf/invoice/[id]`,
`/api/pdf/contract/[id]`, `/api/pdf/time`, `/api/pdf/reports`,
`/api/pdf/shared/invoice/[token]`), `PrintInvoiceDocument` /
`PrintContractDocument`, the `CanEdit` / `canSeeMoney` gates and the
`TimeTimer` floating pill.

---

## 3. What actually changed

This is a recomposition, not a recolour. The specifics:

**The five planes.** A single `/* Phase E: */` block in `app/globals.css`
declares `.forma-invoices`, `.forma-contracts`, `.forma-time`,
`.forma-reports`, `.forma-search` with the same alias discipline as Phase D
(light and dark), and re-exposes the shared `work-*` vocabulary (toolbar,
card arrival, hover) for those planes by *new selector group* — no Phase
C/D rule was edited, so those pages cannot drift. The block also owns the
new financial vocabulary: the card **figure row**, the **ledger** (column
headers from 600px, wrapping rows below), the **time day panels**, the
**report chart**, the **search hero/hit rows**, and the
**container-query-aware line-item editor rows** (§5).

**Lists (invoices, contracts).** Both open with a lavender **showcase
band** — kicker, honest orientation copy, the real counts (outstanding
money / overdue count; signed count / expiring count), and one original
drawing. The existing `StatTile`/`StackedBar` summary rows are kept (they
carry real totals). The `Tabs` strip became the shared `FilterChips` row
(counts derived from the rows on the page), the search field is
`type="search"`, and both sit on one tinted toolbar that stacks under
600px. Cards became `WorkCard`s with a new **figure row**: the document's
real number beside its computed total (invoices) or its expiry/brief
(contracts). Overdue is written in words ("Overdue — was due Mar 3"),
never left to a colour. The create forms moved into `SectionCard` +
`composer` shells with real `<label>`s, a `role="alert"` error line and an
action bar. The grid uses the app's own bands (`sm: 2`, `desk: 3`).

**Invoice detail.** Now a `forma-invoices` plane: shared back link,
`DocHeader`, then a **payment-status band** — the invoice-flow drawing,
one honest sentence per state ("Awaiting payment; you mark it paid when
the money lands"), and chips carrying the number, the total (with tax
note) and the due date. The paper document keeps its letterhead but its
line items became a **labelled ledger** (Description/Qty/Unit/Amount
headers from 600px; each row wraps below that, so nothing clips) and the
totals block is the same `ledger-totals` hierarchy the composer computes
live. The rail's three hand-rolled `RailCard`s became `SectionCard`s
(Public link / Details / Activity). The `PaperCard`, `InvoiceLinkPanel`,
`InvoiceStatusSelect`, both print paths and the activity timeline are
unchanged in behavior.

**Contract detail.** The same treatment with a **signing band**: the
engagement-letter drawing, one honest sentence per stage, and the
Draft → Sent → Signed flow chips moved into the band. The signature-block
letter, `SigningFlow`, `ContractStatusSelect`, `CanEdit` gates and the
print document are unchanged.

**Composers.** `InvoiceComposer` and `ContractComposer` keep every state
field, parser (`centsFromDollars`/`qtyFromInput`/`taxFromInput`), the
motion-row add/remove behavior, the props re-sync, the dirty chip and the
save actions. Their shells became the `composer` classes: labelled
fields, hints that state the real behavior ("Plain text, kept exactly as
written"), a live-totals block that mirrors the document's, and an action
bar with the Unsaved-changes/Save pair. Errors are `role="alert"`.

**Time.** `TimeLog` keeps its grouping (`worked_on`), per-day totals,
today/month computation, brief filter, backdating form, edit flow and the
two-step delete (still the only destructive control). Presentation: the
band carries the clock drawing and the real today/month/entry-count
totals; the toolbar carries the brief filter and Log time; days are
labelled sections with real per-day totals on muted panels, each entry a
white row (description + brief, tabular duration, 44px Edit/Delete with
the "Sure?" confirm); the create/edit form is the same composer shell as
everywhere else. Empty states use the shared `EmptyState`, including the
distinct "no entries for this brief" case.

**Reports.** `ReportsView` keeps rendering pure computed values only. It
now opens with the money-split band — the one **meaningful** Phase E
drawing (§4) — and the real collected / hours-this-month / contracts
stats. The three sections are `SectionCard`s with the app's stat-row
vocabulary; the by-brief chart keeps its pure-CSS bars (lavender rail,
accent gradient fill) with **every value as visible text** beside its
rail, and the rail itself is `aria-hidden` decoration. A footnote states
the fixed-window promise (D4: no date picker) in plain language.

**Search.** The refine form — still the same plain GET `role="search"`
form that works without JavaScript — sits in a lavender **hero band**
with the search drawing from 900px, a 3rem input and the honest scope
hint. Results render as `SectionCard` groups (icon, label, count badge)
with 44px hit rows (title + client · status · updated, `INV-000N` code
chip) on lavender hover, and the "View all →" links keep their 44px
targets. The prompt and no-results states use the shared `EmptyState`;
query matches keep the design-guide-pinned amber `bg-highlight-soft`
mark (highlights are that token's stated purpose — pinned by
`tests/lib/design-guide.test.ts`).

---

## 4. SVG artwork and motion

Five new drawings in `components/workflow/FinancialArt.tsx`, all original,
all token-coloured, one vocabulary with Phase D (lavender plane, white
sheet, single accent rule):

| Drawing | Where | Data |
| --- | --- | --- |
| `InvoiceFlowArt` | `/invoices`, `/invoices/[id]` | none (decorative; the real money sits in the band stats and tiles) |
| `ContractStagesArt` | `/contracts`, `/contracts/[id]` | none (decorative; the real Draft→Sent→Signed stamps sit in the band and rail) |
| `TimeElapsedArt` | `/time` | none (decorative; the real today/month totals sit in the band stats) |
| `ReportSplitArt` | `/reports` | **the real money split** — three rails scaled to collected/outstanding/draft cents; `role="img"` with a label generated from the same cents (`Invoice money split: $X collected, $Y outstanding, $Z in draft.`), and an honest "no invoices yet" degradation |
| `SearchArt` | `/search` | none (decorative) |

Rules enforced (and asserted by the new test suite):

* **The drawing is complete without the animation.** Base states are final
  values (`stroke-dashoffset: 0`, `transform: none`); keyframes only
  describe arrival; no `animation-fill-mode` anywhere in the Phase E
  block. The `art-*-reduced-motion` captures are the proof.
* **No SMIL**; motion lives in reduced-motion-aware CSS, and the Phase E
  planes carry their own `prefers-reduced-motion: reduce` kill switch.
* **No fake metrics.** `ReportSplitArt` is the only data-bearing drawing
  and it draws exactly the cents passed in, scaled to their share of the
  billed total; the by-brief chart renders only `time.by_brief` rows.
* **Movement is transform/opacity/dash-offset only.** The report bars
  arrive by `scaleX` (`e-split`), never by animating width.
* Decorative drawings are `aria-hidden`; the meaningful one is labelled
  from the same numbers it draws.

---

## 5. Responsive strategy — and one real fix

| Band | Layout |
| --- | --- |
| < 600px | One column everywhere. Bands stack (copy above drawing), toolbars stack (chips above search), the ledger rows wrap (description, then qty/unit/amount), the line-item editor wraps to a 2-column arrangement, day panels are single-column 44px rows. Measured: no horizontal overflow at 320px. |
| 600–899px | Lists 2-up; ledger gains column headers; the search hero stays stacked (the form never competes with the drawing). |
| 900–1023px | Bands go side-by-side (copy + drawing); detail pages still one column. |
| ≥ 1024px (`desk`) | Detail pages split document + rail `2fr / 1fr`; lists 3-up; the search hero splits form/drawing. |

**The fix.** The first full audit found a genuine finding: at the 1024px
desk band the invoice composer's *Line description* inputs measured
43.33px wide — the 2fr detail column is ~320px there, and the editor's
`md:`-breakpoint single-row grid (5.5+7.5+6+2 rem of fixed tracks) left
the description track 43px. A viewport media query cannot see the column
width, so the fix is a **native CSS container query** (`.line-items` is
the container): the row lays out on one line while it fits, and below a
32rem container wraps to a two-column arrangement (description full
width, then qty/unit, then amount/remove) with every control ≥44px. The
re-run measured `tap<44 = 0` and `minW = 44px` at every width. The
wrapped/one-line arrangements are both visible in the committed
`invoice-detail-375-*` and `invoice-detail-1440-*` frames.

**Harness fixtures.** The audit's time/money fixtures were frozen at
2026-09-25, so with the real clock in October the /time band read "0m
this month" and the /reports by-brief chart rendered empty — not because
of a bug, but because the fixtures had drifted from the clock. The
fixtures now derive `worked_on`, `due_date` and `expires_on` from the run
date, mirroring what `supabase/seed.sql` has always done (`now()`,
`now() - interval '1 day'`, …). This surfaces *more* content (the Today
group, the month totals, the chart) and hides nothing; the finding
counts on untouched routes did not move (91 before, 91 after).

---

## 6. Verification

### 6.1 Gates

| Gate | Result |
| --- | --- |
| `npm test` | **PASS** — 798 tests (40 new Phase E structural tests in `tests/components/forma-phase-e.test.ts`) |
| `npm run lint` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| `npm run verify:db` | **PASS** — all database checks |
| `npm run verify:pdf` | **PASS** — 14 documents / 20 pages, 0 findings |
| `npm run verify:responsive` | **RAN IN REAL CHROMIUM** — all 7 Phase E routes × 7 widths measured: **49/49 clean**. The script's overall exit code is non-zero because of the same 91 pre-existing findings on the 13 untouched marketing routes (mobile header overflow + small targets) documented in the Phase D closeout §11.6 — identical count before and after this phase. |

### 6.2 Chromium, actually resolved

Same chain as Phase D: `npm pack @sparticuz/chromium` → brotli-decode
`chromium.br` + `al2023.tar.br` with Node's `zlib.brotliDecompressSync` →
`LD_LIBRARY_PATH` at the extracted `lib/` (which ships `libnspr4.so`) →
`CHROMIUM_EXECUTABLE_PATH` into the repository's own audit script,
unmodified except for the additions described in §5 and the shot sets
below. `chromium --version` → `Chromium 153.0.8010.0`.

### 6.3 Measured results (final run, frozen code)

```
invoices · invoice-detail · contracts · contract-detail · time · reports · search
× 320 / 375 / 414 / 600 / 768 / 1024 / 1440        = 49 combinations
```

| Finding | Result |
| --- | --- |
| `overflowX > 0` | **0 / 49** |
| clipped text (`cutoffs`) | **0 / 49** |
| elements escaping the viewport (`offenders`) | **0 / 49** |
| fixed chrome escaping (`fixedEscapes`) | **0 / 49** |
| controls under 44×44 (`smallTaps`) | **0 / 49** — at every width, including the 1024 band the composer fix targets |
| page errors | **0 / 49** |
| shortest control | **44.00px × 44.00px at every width** |

The numbers are re-derivable from the committed
`docs/screenshots/forma-phase-e/metrics.json` / `summary.json`.

### 6.4 Screenshots (real Chromium, both themes)

`docs/screenshots/forma-phase-e/` — **84 page frames** (7 routes ×
375/768/1440 × light/dark; each a viewport frame plus a full-page frame)
and **17 artwork evidence entries** in `art/`: 15 frames (5 drawings ×
light/dark/`prefers-reduced-motion: reduce`) plus two machine-read
probes — the money split's generated `aria-label`
("Invoice money split: $0.00 collected, $1,428.00 outstanding, $0.00 in
draft.") and the invoice cards' figure rows ("INV-0007 · $1,428.00") —
recorded in `art/art-report.json`.

Reproduce:

```bash
npm run verify:responsive:setup        # or CHROMIUM_EXECUTABLE_PATH=… (LD_LIBRARY_PATH at the extracted libs)
CHROMIUM_EXECUTABLE_PATH=/path/to/chromium \
SHOTS_DIR=/tmp/forma-e PAGE_SHOTS=1 PAGE_SHOTS_SET=phaseE \
PAGE_SHOTS_DIR=docs/screenshots/forma-phase-e \
ART_SHOTS=1 ART_SHOTS_SET=phaseE ART_SHOTS_DIR=docs/screenshots/forma-phase-e/art \
npm run verify:responsive
```

### 6.5 Not run / not exercised

* **No production Supabase, Stripe, email or integration call was made.**
  The DB and PDF gates use the repository's own test infrastructure
  (pglite); the browser audit runs against the dev server with the
  in-process Supabase stub and its fixtures.
* No keyboard-only or screen-reader pass was executed by a human; the
  structural guarantees (labels, roles, heading order, 44px targets,
  focus-visible rings, reduced-motion kill switch) are pinned by tests
  and measured by the audit. The human review gate remains open for all
  phases (§12).

---

## 7. Functional preservation

The redesign is presentation-only. Pinned by the new test suite and
unchanged in the diff:

* **Queries & gates** — `getInvoices/getContracts/getTimeEntries/
  getBriefs` scoping, the `canSeeMoney` viewer gates on invoices and
  time, `CanEdit` on the contract composer.
* **Calculations** — `lib/invoice-totals` (used by the detail page, the
  composer, the public view and the PDF), the time day/month grouping,
  `lib/reports` aggregation: all byte-identical.
* **Server actions** — `createInvoice`, `saveInvoiceContent`,
  `setInvoiceStatus`, link create/revoke/regenerate, `createContract`,
  `saveContract`, `setContractStatus`, `logTimeAction`,
  `updateTimeAction`, `deleteTimeAction`: signatures, payloads and
  guards untouched.
* **Exports & print** — the four PDF endpoints and both print documents
  are untouched; the on-screen editor remains `print:hidden` so browser
  print still yields only the document (re-verified by `verify:pdf`).
* **Search** — the GET form, query normalizer, escaping, ranking,
  group caps and permission scoping are untouched.

---

## 8. Accessibility

* One `h1` per route (shared header on lists/reports, `DocHeader` on
  details, a single `sr-only` h1 beside the search hero); sections are
  `h2` via `SectionCard`, day groups are labelled `h2` + `aria-label`
  sections, band stats are a `dl`.
* Status is never colour-alone: invoice badges keep four distinct token
  families (info-blue sent, success-green paid, quiet draft, red-outline
  void — pinned by the existing `invoice-detail-page.test.ts`), and
  overdue/expiry states are additionally written in words on the card,
  band and rail.
* Every composer field has a real `<label htmlFor>`; errors are
  `role="alert"`; the two-step delete states its armed state in text.
* Charts: the by-brief chart's every value is visible text beside its
  `aria-hidden` rail; the money split is a labelled `role="img"`.
* Focus rings: the planes inherit `forma-core`'s 2px accent
  `:focus-visible` outline; controls are 44px (measured, §6.3).
* Reduced motion: the Phase E planes carry their own kill switch;
  `art-*-reduced-motion.png` frames prove the drawings stay complete.

---

## 9. Light and dark

Both themes were captured at 375/768/1440 for all seven routes (84
frames). The Phase E dark block mirrors Phase D's values exactly (deep
plum background `#17121e`, lavender `#312447`, lifted sheets, lilac
accent `#b9a0ff`, the same 90/10 secondary-text mix that clears 4.5:1 on
every tinted surface — measured by the contrast tests carried over from
the Phase D suite conventions and re-asserted for the Phase E palette
aliases).

---

## 10. Known limitations

1. **The marketing header findings remain** (91 page×width findings, all
   on the 13 marketing routes) — identical count to the Phase D baseline;
   fixing them is Phase F work and was not smuggled into this PR.
2. **RoduCQ still does not collect payments.** No page implies it does:
   statuses are stamps a member sets; the band copy says so. No
   e-signature is advertised — the contract flow prints signature lines
   and records a typed signatory, exactly as before.
3. **The money split drawing is only as granular as the report** — it
   renders three status buckets, not a time series; there is no
   date-range anything (D4 fixed windows), so no chart pretends
   otherwise.
4. **One timer per browser** (the `TimeTimer` v1 limitation) — unchanged,
   out of scope for a presentation phase.
5. **Chromium provisioning is not committed** — same as Phase D: the
   binary lives outside the repo; reviewers run
   `npm run verify:responsive:setup` or point `CHROMIUM_EXECUTABLE_PATH`
   at a local build (steps in §6.2).
6. **Search result marks keep the amber highlight token**, not purple —
   that is the design guide's own rule (`tests/lib/design-guide.test.ts`
   pins `bg-highlight-soft` on this page), not an oversight.

---

## 11. Files changed

**Pages:** `app/(app)/invoices/page.tsx`, `app/(app)/invoices/[id]/page.tsx`,
`app/(app)/contracts/page.tsx`, `app/(app)/contracts/[id]/page.tsx`,
`app/(app)/time/page.tsx`, `app/(app)/reports/page.tsx`,
`app/(app)/search/page.tsx`, `app/(app)/error.tsx`.

**Components:** `components/invoices/InvoicesList.tsx`,
`components/invoices/InvoiceComposer.tsx`,
`components/contracts/ContractsList.tsx`,
`components/contracts/ContractComposer.tsx`,
`components/time/TimeLog.tsx`, `components/reports/ReportsView.tsx`,
`components/workflow/FinancialArt.tsx` (new),
`components/workflow/WorkCard.tsx` (new optional `figure` slot +
`CardFigure`, presentational).

**Styles:** one appended `/* Phase E: */` block in `app/globals.css`
(planes, aliases, financial vocabulary, artwork, motion, kill switch).

**Tooling & tests:** `scripts/verify-responsive.mjs` (phaseE page-shot
set, phaseE artwork set + money probes, date-relative fixtures — no
measurement logic changed), `tests/components/forma-phase-e.test.ts`
(new, 40 assertions).

**Docs:** this file, plus the checklist update in
`docs/forma-phase-a-route-inventory.md`.

---

## 12. Full-product migration checklist (updated)

From `docs/forma-phase-a-route-inventory.md`:

- [x] **Phase A — Design foundation** — tokens, type scale, radii,
      shadows, motion, self-hosted Manrope, theme selection.
- [x] **Phase B — Application shell** — sidebar/topbar/tablet rail/phone
      dock, workspace and account planes, auth screens, brand mark.
- [x] **Phase C — Daily workflow** — Pipeline, Intake, Inbox, Settings.
- [x] **Phase D — Delivery workflow** — Briefs, Proposals (incl. version
      snapshots), Plans and the task workspace, Updates.
- [x] **Phase E — Financial workflow** — Invoices, Contracts, Time,
      Reports, Search (this phase).
- [ ] **Phase F — Workspace and finishing pass** — cross-cutting
      forms/dialogs/tables/menus, shared motion audit, the marketing
      header fixes, and the final consistency/responsiveness sweep.
- [ ] **Human review gate (all phases)** — keyboard-only pass,
      screen-reader pass, contrast spot-check on production data,
      print/PDF review.

---

## 13. Phase E acceptance criteria

- [x] Invoices list + detail redesigned
- [x] Contracts list + detail redesigned
- [x] Time tracking redesigned (band, day workspace, composer shell; timer untouched)
- [x] Reports redesigned (meaningful money-split drawing, accessible chart)
- [x] Search redesigned (hero band, section-card groups, 44px rows)
- [x] Remaining authenticated routes audited (§2) — every route either
      redesigned this phase or already on a Phase C/D plane
- [x] Forma typography consistent (Manrope, no new font)
- [x] Purple/lavender palette consistent (one scoped Phase E block)
- [x] Financial document layouts polished (labelled ledger, totals hierarchy)
- [x] Tables responsive (wrapping ledger, container-query editor rows)
- [x] Charts accessible (text values, labelled image, no colour-only meaning)
- [x] SVG illustrations implemented where useful (five, arrival-only motion)
- [x] Motion respects reduced-motion (kill switch + proof frames)
- [x] Light mode polished — captured at 375/768/1440
- [x] Dark mode polished — captured at 375/768/1440
- [x] Mobile layouts polished — measured at 320/375/414/600
- [x] Tablet layouts polished — measured at 768
- [x] Desktop layouts polished — measured at 1024/1440
- [x] Business logic preserved — pinned by tests, unchanged in diff
- [x] Required verification gates passed (`test`, `lint`, `tsc`, `build`,
      `verify:db`, `verify:pdf`, `verify:responsive` in real Chromium —
      Phase E routes 49/49 clean; overall exit non-zero only from the
      pre-existing marketing findings, count unchanged)
- [x] Real screenshots captured (84 page frames + 15 artwork frames +
      machine-read data proofs, committed)
