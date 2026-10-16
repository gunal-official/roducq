# Forma Phase C — implementation and verification status

## Base and safety

2026-10-16. PR #35 was confirmed MERGED (merge commit
`6fe9611a2d5cb803a3c6719858471bdedfec99c5`), identical to fetched main.
Work stays on the Arena-pinned `arena/6c8d0751-roducq` branch. Push dry-run
succeeded. Phase A semantic tokens, Phase B shell and locally hosted Manrope
were inspected before editing. Baseline: 725 passing tests, lint and tsc clean.

## Routes and composition

- Authenticated `/`: middleware rewrites to `app/(app)/dashboard/page.tsx`.
  Public `app/(marketing)/page.tsx` is untouched. New split lavender showcase,
  original animated process map and explanatory copy supplement real count
  tiles, functional stage links, attention items and activity/money panels.
- `/intake`: two-panel source composer and illustrated review guidance. The
  initial blank preview becomes an actionable three-step explanation; existing
  generated draft, skeleton, editable results, errors and save flow remain.
  Composer now has an explicit associated label and error alert.
- `/intake/inbox`: conversation heading with derived visible/total counts,
  lavender filter toolbar with purple pressed state, soft elevated thread
  panels. No empty right-hand rail when no imports exist. Staged imports
  still lead on mobile; original source metadata and follow-up forms remain.
- `/settings`: workspace introduction, refined sticky desktop anchor rail,
  target-section focus treatment and rounded workspace panels. Existing
  section order and owner-only controls are preserved.

## Components

`PageHeader`, `SectionCard`, `EmptyState`, `FilterChips` gain compatible hooks;
new geometry is scoped to `.forma-core`. `SettingsNav`, `InboxThreadList`,
`IntakeClient`, `SourcePanel` and the four route compositions were updated.
New `components/workflow/WorkflowArt.tsx` provides original workflow and intake
art. Existing StatusBadge, history components, buttons, dialogs, input APIs,
tabs, source bubbles and skeletons were inspected/reused rather than replaced.
They retain the Phase A semantic styling outside the scoped page treatment.

## Motion and themes

CSS path reveal and a small traveling marker illustrate Intake → Brief →
Proposal → Plan → Update. The accessible SVG description explicitly says
that every stage requires review and action; this is not a live progress or
conversion metric. Desktop workflow controls still show actual query counts.
Card hover lift, filter transitions, existing `forma-rise` entrance and chart
height transitions add feedback without another animation dependency.
Motion is opt-in under `prefers-reduced-motion: no-preference`; a route-scoped
reduce rule disables all transitions and animations. No animation fill mode
or hidden base content is introduced. Static artwork remains drawn.

Scoped semantic aliases provide the requested purple/lavender light palette.
Dark mode uses deep lavender surfaces and lilac interactions, retaining global
semantic success/error/warning colors and the existing dark on-accent token.
Local Manrope and the Phase B navigation are unchanged.

## Accessibility and responsive intent

One shared H1 per route, subordinate H2/H3 headings, named SVGs, native anchor
navigation, pressed filter buttons, explicit composer label, error alert and
2px focus-visible outlines. Existing 44px controls and wrapping filter layout
remain. Showcase stacks below 768px; intake stacks under the existing desk
breakpoint; staged inbox imports retain their mobile-first reading order.
The sticky settings rail is desktop-only to avoid a large mobile navigation
block. These are implementation observations, **not browser validation**.

## Verification

| Gate | Result |
| --- | --- |
| `npm test` | PASS — 732 tests, including 7 new Phase C contract tests |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `npm run verify:db` | PASS — all database checks |
| `npm run verify:pdf` | PASS — 14 documents / 20 pages, no findings |
| `npm run verify:responsive` | BLOCKED — Chromium launch failure |

New tests cover route scoping/H1 structure, accessible workflow description,
retained real count links, intake state handling/label/error, derived inbox
counts/filter semantics, permission-derived settings anchors and motion guards.
Existing tests were not weakened. No data queries, authentication, permissions,
server actions, billing code, import/dedupe logic or PDF code were changed.

## Exact limitations / evidence outstanding

There is no installed system Chromium. An npm-only, untracked
`@sparticuz/chromium` provisioning attempt supplied `/tmp/chromium`, but both
the real-browser reference attempt and the responsive audit failed at launch:

```
/tmp/chromium: error while loading shared libraries: libnspr4.so:
cannot open shared object file: No such file or directory
```

Thus the Forma reference was **not inspected in a rendered browser**. Styling
uses the supplied direction and existing Forma foundations, not a claim of
reference fidelity. No new screenshot files were generated. Earlier screenshots
in `docs/screenshots/` are not Phase C evidence. Browser review is required before
calling Phase C complete: 320/375/414/600/768/1024/1440 in both themes, keyboard
flows, contrast, reduced motion, and overflow. Capture all four pages at
375/768/1440 (light/dark), including workflow, composer, filters and settings rail.
Use existing `PAGE_SHOTS=1 PAGE_SHOTS_DIR=docs/screenshots/forma-phase-c`
with `npm run verify:responsive` on a browser-enabled machine.

No production Supabase/integration/Stripe operation was exercised. DB/PDF gates
use repository test infrastructure, not production services. The production
visual and live integration review remains outstanding. Phase D was not started.
