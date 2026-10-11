# Ember Studio — Phase 3 closeout: page-level UI redesign

Phase 1 (PR #28) delivered the design tokens, radii, motion and typography.
Phase 2 (PR #29) rebuilt the application shell around them. **Phase 3
redesigns the four priority pages themselves** — Pipeline, Intake, Inbox and
Settings — on top of those two layers, changing presentation only.

Every other authenticated page (briefs, proposals, plans, updates, invoices,
contracts, time, reports, search, detail routes) is untouched and will be
reviewed in a later pass.

## Shared vocabulary (new)

`components/ui/page.tsx` — the page-shaped counterpart to Step 34's
document vocabulary (`doc-detail.tsx`):

| Piece | Contract |
|---|---|
| `PageHeader` | Accent `icon-chip` + Playfair title + eyebrow/subtitle + a `meta` slot (real counts only) + an action row. Actions sit beside the title from 600px and take their **own full-width row below it** on phones, so a long title never squeezes them. |
| `SectionCard` | `<section>` with a hairlined head: tinted `icon-chip`, `<h2>`, description, and an **action slot pinned to the head's end** — every card now places its primary control in the same place. 12px surface, `scroll-mt-6` for in-page anchors, `aria-labelledby` wired to its own heading, optional footer band. Tones: accent / success / muted / error. |
| `EmptyState` | Dashed tile, 20px icon, one optional action. The only place a dashed border is the right signal. |

`components/ui/filter-chips.tsx` — the accessible filter row: a labelled
`role="group"` of 44px toggle buttons using `aria-pressed` (the list
re-filters instantly; nothing is submitted). It renders `null` when there
is nothing to choose between.

`icon-chip-error` was added to `app/globals.css` (a `color-mix` tint of the
error token) for the error-toned section head — amber stays reserved for
highlights/notifications per `docs/icon-audit.md`.

## Page by page

### Pipeline (`app/(app)/dashboard/page.tsx`)
- `PageHeader` (workspace eyebrow, date subtitle) with **Inbox** +
  **New brief** actions; the stat tiles are now links into their lists.
- Flow stages: a `grid gap-2 tab:grid-cols-5` of compact linked cards
  (icon, uppercase label, live count). On phones they stack with a chevron
  between them; the chevron is `tab:hidden`.
- "Needs you", Money, This week and Recent activity all became
  `SectionCard`s, so their heads and paddings match.
- Grid: one column below 1024, `desk:grid-cols-[minmax(0,1fr)_20rem]`
  above it.
- New honest empty state when the workspace has no briefs, proposals,
  plans, updates or threads.

### Intake (`/intake`)
- `PageHeader` + a **Start over** action once a draft exists.
- Grid: one column on phones, `desk:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`
  from 1024px (source → draft reading order).
- Phones: the panels stack, and **the draft leads once one exists**
  (`draftFirst` → `order-*`), because that is what the user came to edit.
  Before generating, the source panel keeps the lead.
- Source textarea is `min-h-[220px] tab:min-h-[340px]`; the draft form
  pairs only the short fields (title + client) from 600px, with objective,
  deliverables and budget staying full width (`tab:col-span-2`).
- Both panels and the brief empty/loading states are built on
  `SectionCard` / `EmptyState`; the viewer fallback on the page is an
  `EmptyState` too. Generation, saving, deliverable checkboxes, open
  questions and the file picker are unchanged.

### Inbox (`/intake/inbox`)
- `PageHeader` with real counts in the `meta` slot: threads, sources and
  staged items (derived from the rows the server already returns).
- New **source-type filter** (`All` + one chip per type that actually
  exists in this workspace, each with its own count). Filtering is client
  state over the existing rows — no new data, no invented metrics. The
  follow-up composer survives filtering, and a filter that outlives its
  data falls back to `All`.
- Grid: one column below 1024, `desk:grid-cols-[minmax(0,1fr)_20rem]`
  above it. The **staged Slack/Notion + mail rail leads on phones** (it is
  the actionable part) and moves into the rail at 1024px
  (`order-first desk:order-none`).
- Thread cards are `SectionCard`s; staged mail and staged imports were
  rebuilt on `SectionCard` so the whole page is one language.

### Settings (`/settings`)
- `PageHeader` (workspace eyebrow) + a **desktop-only section rail**
  (`components/settings/SettingsNav.tsx`): plain in-page anchors, sticky
  at `desk:top-6`, built from the sections the page actually renders — a
  viewer never gets a link to the owner-only danger zone.
- Layout: one column below 1024 (the rail is `hidden desk:block`), 
  `desk:grid-cols-[13.75rem_minmax(0,1fr)]` above it.
- All ten cards (workspace, branding, team, templates, plan & billing,
  webhooks, mailbox, integrations, activity, danger zone) were rebuilt on
  `SectionCard` and now carry matching anchor ids. Owner/member/viewer
  gating, permissions, invites, roles, Stripe checkout, webhook secrets
  and the danger zone are unchanged — only their chrome moved.

## What was deliberately NOT added

- No new metrics, KPIs, notifications, badges or "insights": every number
  on these pages was already being fetched before this phase.
- No new routes, no new data reads, no new server actions.
- No changes to permission rules, billing flows or integration behaviour.

## Verification

```
npm test                    690/690 pass (35 new Phase 3 structural tests)
npm run lint                clean
npx tsc --noEmit            clean
npm run build               clean
npm run verify:db           passed
npm run verify:pdf          passed (14 documents · 20 pages · 0 findings)
npm run verify:responsive   39 pages × 320/375/414/600/768/1024/1440
```

### Responsive audit

`overflowX=0 off=0 cut=0 tap<44=0` on all four redesigned pages at every
width. The single audit finding is the **pre-existing** 3px text cutoff on
the marketing `/vs/dubsado` card at 320px — outside this phase and
unchanged by it.

### New opt-in audit modes

Two modes were added to `scripts/verify-responsive.mjs` so the responsive
contract is provable, not just screenshottable:

- `LAYOUT_PROOF=1` — measures real `getBoundingClientRect()` geometry for
  each page's two regions at 375 / 768 / 1440 and asserts side-by-side
  (≥1024) vs. stacked order (<1024), including that the settings rail is a
  zero box below 1024. **12/12 probes pass.**
- `PAGE_SHOTS=1` — captures the four pages at 375 / 768 / 1440 in light
  and dark. Each combination gets a viewport shot (phone tab bar and
  desktop sidebar in frame) plus a `-full` capture that flattens the
  scrolling `(app)` shell and hides fixed chrome so the whole page fits.

`CHROMIUM_EXECUTABLE_PATH` was also added so the audit can run where the
Playwright CDN is unreachable but a Chromium binary exists; the default
path (`npx playwright-core install chromium`) is unchanged.

### Test fixtures

The audit's in-process Supabase stub now serves **inbox threads** (sources
embedded in the `briefs` rows, exactly how `getInboxThreads()` reads them)
and **staged Slack/Notion imports**, so the Inbox renders real threads and
a real staged rail in the audit and in the screenshots instead of an empty
state.

## Screenshots

`docs/screenshots/` — four pages × three bands × two themes:

| | Light | Dark |
|---|---|---|
| **Pipeline** mobile (375) | `pipeline-mobile-light.png` | `pipeline-mobile-dark.png` |
| **Pipeline** tablet (768) | `pipeline-tablet-light.png` | `pipeline-tablet-dark.png` |
| **Pipeline** desktop (1440) | `pipeline-desktop-light.png` | `pipeline-desktop-dark.png` |
| **Intake** mobile / tablet / desktop | `intake-mobile-light.png` · `intake-tablet-light.png` · `intake-desktop-light.png` | `intake-mobile-dark.png` · `intake-tablet-dark.png` · `intake-desktop-dark.png` |
| **Inbox** mobile / tablet / desktop | `inbox-mobile-light.png` · `inbox-tablet-light.png` · `inbox-desktop-light.png` | `inbox-mobile-dark.png` · `inbox-tablet-dark.png` · `inbox-desktop-dark.png` |
| **Settings** mobile / tablet / desktop | `settings-mobile-light.png` · `settings-tablet-light.png` · `settings-desktop-light.png` | `settings-mobile-dark.png` · `settings-tablet-dark.png` · `settings-desktop-dark.png` |

Mobile shots are viewport captures (Phase 2 bottom tab bar in frame);
tablet and desktop are the full-page captures.
