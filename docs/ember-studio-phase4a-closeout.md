# Ember Studio — Phase 4A closeout: Briefs and Proposals

Phase 4 finishes the Ember Studio redesign across the authenticated app. It ships
as four PRs: **4A Briefs + Proposals** (this doc), 4B Plans / My Work / Updates,
4C Invoices / Contracts / Time / Reports, 4D remaining surfaces + final responsive
cleanup. Phases 1–3 (PRs #28–#30) are merged; this branch is cut from `main` at
`58598ce`, which contains #30.

## Route audit (what exists)

The prompt's route list was checked against `app/`. These routes **do not exist**
and were not invented: `/clients`, `/clients/[id]`, `/my-work`, `/templates`,
`/workspace`, `/team`. Templates, workspace and team management live inside
`/settings` (Phase 3). Clients appear as a text field on briefs and proposals.

Authenticated routes in the app today: `/`, `/intake`, `/intake/inbox`,
`/briefs`, `/briefs/[id]`, `/proposals`, `/proposals/[id]`,
`/proposals/[id]/versions/[versionId]`, `/plans`, `/plans/[id]`, `/updates`,
`/updates/[id]`, `/invoices`, `/invoices/[id]`, `/contracts`, `/contracts/[id]`,
`/time`, `/reports`, `/settings`, `/search`, plus `/onboarding`.

## What changed in 4A

Presentation only. Server actions, data reads, the PDF route, status and
restore flows, and the resolve/source composers are unchanged.

- **Shared vocabulary:** `HistoryList` / `HistoryItem` added to
  `components/ui/page.tsx`. Brief edit history and proposal version history
  both render through it.
- **Briefs list:** `PageHeader` (workspace eyebrow, New brief action),
  shared `FilterChips` (replaces the underline tab strip, which could not
  fit 320px), shared `EmptyState`.
- **Brief detail:** `DocHeader` + `SectionCard` panels; `desk:` (1024px)
  split with the status control and "Generate proposal" in the same rail;
  readable brief copy (`max-w-prose`, `whitespace-pre-line`); history
  newest first.
- **Proposals list:** `PageHeader` with the "Open briefs" action, `FilterChips`,
  `EmptyState`.
- **Proposal document:** body split into **Scope of work** and **Budget &
  timeline** sections (same copy and data). Used by the live page and the
  read-only snapshot.
- **Proposal detail + snapshot:** rail moved to `SectionCard`s on the `desk:`
  band; version history uses `HistoryList`; PDF export still in the header.
- **Status badges:** proposal statuses match the invoice vocabulary
  (draft muted · sent info blue · accepted success · declined error). Brief
  approved is success green; in-review keeps the accent tint.

## Decisions to review

1. **Amber not used for open questions or in-review.** The design guard
   (`tests/lib/design-guide.test.ts`) restricts amber classes to an explicit
   allowlist: toast, search highlights, pricing. The prompt asks for amber on
   notifications and highlights. Extending the allowlist is a design-governance
   call, so I kept the existing accent tint and did not change the guard. If you
   want amber on open questions, add `brief-detail` and `StatusBadge` to the
   allowlist.
2. **Mobile stat tiles.** The three stat tiles stack on phones, which pushes
   the filter row about one screen down on /briefs. This matches the Phase 3
   Pipeline pattern. A compact mobile variant is a candidate for 4D.

## Verification

```
npm ci                      ok
npm test                    714/714 pass (690 existing + 24 new Phase 4A structural tests)
npm run lint                clean
npx tsc --noEmit            clean
npm run build               clean
npm run verify:db           passed
npm run verify:pdf          passed
npm run verify:responsive   273 page×width probes (39 routes × 7 widths)
```

### Responsive audit (real Chromium)

Chromium: Playwright's CDN was unreachable from the sandbox, so the browser
was a Chromium 153 build taken from the npm package `@sparticuz/chromium` and
launched with `--no-zygote`. Each run used the harness's own `CHROMIUM_EXECUTABLE_PATH`
hook. This is real browser rendering, not simulated.

- **After (this branch):** every 4A route — briefs, brief-detail, proposals,
  proposal-detail, proposal-version — has `overflowX=0 off=0 cut=0 tap<44=0` at
  320 / 375 / 414 / 600 / 768 / 1024 / 1440.
- **Before (`main`):** one finding, `/vs/dubsado` at 320px (`cut=1`).
- **After:** the same single finding, unchanged. It is marketing copy, outside
  4A, and is scheduled for 4D.

The harness gained the `/proposals/[id]/versions/[versionId]` route (it was
missing from the audit) with two version fixtures, and a `PAGE_SHOTS_SET=phase4a`
screenshot set. Phase 3's default set is unchanged.

### Screenshots

`docs/screenshots/` — real captures, 30 files: 5 pages × {mobile 375 viewport,
tablet 768 full, desktop 1440 full} × {light, dark}. File names follow the
Phase 3 pattern, e.g. `briefs-mobile-light.png`, `proposal-detail-desktop-dark-full.png`.

## Not in this PR

- `/vs/dubsado` 320px clipping: scheduled for 4D, the final responsive cleanup.
- Phase 4B–4D surfaces.
