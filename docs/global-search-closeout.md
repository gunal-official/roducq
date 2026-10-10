# Global search closeout (v1: 2026-10-07; v2: 2026-10-10)

**Scope:** the topbar "Search..." box — decorative since Step 34 — wired
to a real, server-rendered workspace search. Titles and client names
across briefs, proposals, plans, updates, contracts and invoices
(money-hiding respected), one plain GET form → `/search`. **Zero new npm
dependencies, zero migrations, no client-side data fetching.**

## 1. The shape (why a page, not a palette)

A command-palette dropdown would mean a client island doing debounced
fetches against a server action — new machinery. The house pattern is
server components + minimal islands, so v1 is the boring thing that
works everywhere: the topbar input (and the refine box on the results
page) is a **plain HTML GET form** to `/search?q=…`. It works without
JavaScript, needs no keyboard-trap/ARIA-combobox work, and renders
grouped results server-side. The input's wrapper classes were
load-bearing for the mobile row layout and the Step-33 structural
tests — the `div` became the `<form>` with identical classes.

## 2. Layers

- **`lib/search.ts`** (pure, zero-dep — node:test-locked like
  `lib/proposal-versions.ts`): query normalization (trim, collapse
  whitespace, 2-char floor, 100-char code-point-safe cap, first value of
  a repeated `?q=`), LIKE-wildcard escaping, the PostgREST `or=`
  builder, highlight segmentation, and the group registry (`key` ==
  DB table name, nav display order, `money` flag mirroring
  `MONEY_HREFS`).
- **`lib/data/search.ts`** (`server-only`): one PostgREST query per
  group — `.eq("workspace_id", …)` pin (Step 16), `.or(title/client_name
  ilike)`, `updated_at desc`, capped at 6 — fired in parallel.
  Viewer money groups are dropped **before** querying (RLS would return
  zero rows anyway; not asking is cheaper). Invoices ride
  `invoice_number` along for the `INV-000N` chip.
- **`app/(app)/search/page.tsx`**: grouped result cards (icon chip +
  label + count badge + "View all" link), hits as 44px-tap-target rows
  with `<mark>`-highlighted title/client, status + relative time, and
  the two empty states ("type more" prompt / "no results" with list
  shortcuts). Highlighting is segment-based — no
  `dangerouslySetInnerHTML` anywhere.

## 3. Hostile input is inert (the two-escapings rule)

A query is embedded in a PostgREST `or=` condition string, so it gets
escaped **twice, in the right order**:

1. **Postgres LIKE:** `\`, `%`, `_` → backslash-escaped, so `100%`
   and `a_b` match themselves (never "100<anything>").
2. **PostgREST transport:** the pattern is double-quoted — the
   documented way a value may contain `,` `(` `)` — and a literal `"`
   inside is `\"`-escaped.

`Acme "x", Inc.` therefore becomes
`title.ilike."%Acme \"x\", Inc.%"` — one condition, grammar intact.
`buildOrFilter` output is locked byte-for-byte by tests.

## 4. Gates

- `npx tsc --noEmit` ✅ · `npm run lint` ✅
- `npm test` — **431 pass / 0 fail** (409 baseline + 22 new:
  18 lib + 4 structural) ✅
- `npm run build` — `/search` route registered ✅
- `npm run verify:db` ✅ (no schema change — search adds none)
- `npm run verify:pdf` ✅ (CI gate, unaffected, re-run anyway)

## 5. V2 scope and boundaries (2026-10-10)

- **Search only `title` and `client_name`.** Every group uses a
  case-insensitive Postgres `ilike` contains pattern (`%q%`) on those two
  columns only. User input is escaped at both the Postgres LIKE and
  PostgREST `or=` transport layers; see §3.
- **No body or full-text search.** Bodies, deliverables, task lists and
  other content columns are not searched. V2 adds no `tsvector` column,
  index or migration.
- **Six newest hits per group.** Results are ordered by `updated_at desc`
  and capped at `SEARCH_GROUP_LIMIT` (6) per entity group. Search remains
  a jump surface, not an exhaustive result set.
- **Link to the full list; no pagination.** Each non-empty result group's
  “View all” link opens that entity's regular list page (`listHref`). The
  search results themselves have no pages, cursor or load-more control.
- **Substring matching** (`%q%`) relies on the small per-workspace row
  counts; no trigram index added (nothing to migrate until volume says so).
- **Responsive audit**: search is in the audit harness.
  `/search?q=Harbor` sits in the `scripts/verify-responsive.mjs` PAGES list.
  The slug is also in `COMPLEX`, so the 320/768 runs capture the full page (six stacked cards extend below the fold).
  The stub needed no `or=` support after all: its list responses ignore unrecognised filters and serve the Harbor fixtures, so all six group cards render and the sweep measures a fully-populated page. That audit is what caught the six "View all →" links sitting under the 44px tap-target floor — they are now `min-h-11` rows rather than bare inline anchors.
- Highlighting degrades to plain text (never corrupts) for the few code
  points whose `toLowerCase()` shifts length (the `İ` class).
