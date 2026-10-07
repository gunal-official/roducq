# Global search closeout (2026-10-07)

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
- `npm test` — **430 pass / 0 fail** (409 baseline + 21 new:
  18 lib + 3 structural) ✅
- `npm run build` — `/search` route registered ✅
- `npm run verify:db` ✅ (no schema change — search adds none)
- `npm run verify:pdf` ✅ (CI gate, unaffected, re-run anyway)

## 5. Known limits / follow-ups (v1 decisions, not drops)

- **Titles + client names only.** Body text, deliverables and task
  lists are not indexed — a full-text `tsvector` migration is the v2
  path if wanted.
- **Six hits per group** (`SEARCH_GROUP_LIMIT`), newest first — search
  is a jump surface; every group card links to its filtered-elsewhere
  list. No pagination.
- **`ilike` prefix-anywhere** (`%q%`) relies on the small per-workspace
  row counts; no trigram index added (nothing to migrate until volume
  says so).
- **Not in the responsive audit harness.** `scripts/verify-responsive.mjs`
  has a fixed PAGES list and its Supabase stub would need `or=` support
  to serve `/search?q=…` results; the page follows the audited card/list
  patterns, and adding it to the harness is the follow-up if the stub
  grows filter support.
- Highlighting degrades to plain text (never corrupts) for the few code
  points whose `toLowerCase()` shifts length (the `İ` class).
