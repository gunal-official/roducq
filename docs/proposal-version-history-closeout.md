# Proposal version history closeout (2026-10-06)

**Scope:** Queue item #7 (Audit #24) — automatic, immutable snapshots of
proposal content with list / view / restore on the proposal detail page.
Proposals ONLY (briefs, plans, contracts, updates untouched). No diffs UI,
no historical PDF export, no Supabase Storage. **Zero new npm
dependencies.** Restore is auditable by construction; history is
append-only at the database level.

## 1. Snapshot model (the crucial decision)

`public.proposal_versions` (migration
`supabase/migrations/20261006000000_proposal_versions.sql`) stores **the
creation state plus every displaced state** of a proposal: when content
changes, the OUTGOING state is appended. The current row is versioned
exactly once — the moment a change replaces it. Consequences:

- Every version in the list is a state the proposal actually held at a
  point in time; "view" shows exactly what the document looked like.
- Every state the document has ever held appears in history exactly once
  (dedup rule below), and the newest version always differs from the
  current content — so "Restore" on the newest row is always a real undo.
- Restore never needs special bookkeeping to protect the current state:
  displacing it IS what versions it.

Snapshot fields = the five mutable content columns of `proposals`:
`title`, `client_name`, `status`, `budget_timeline`, `deliverables`
(jsonb). Plus audit metadata: `workspace_id` (RLS anchor),
`version_number` (1-based, gapless per proposal), `reason`
(`created | edited | restored`), `created_by`, `created_at`.

## 2. Automatic capture (DB triggers — every write path covered)

Two AFTER triggers on `proposals`:

- **INSERT → `('created')`** snapshots the creation state.
- **UPDATE → `('edited')`** snapshots the outgoing state, but the
  trigger's WHEN clause fires only when one of the five content columns
  `is distinct from` the other side. Re-selecting the same status (or any
  other no-op UPDATE that merely bumps `updated_at`) creates nothing —
  "meaningful changes only".

**Dedup.** The update function skips the capture when the outgoing state
is already the newest snapshot. This covers two situations and makes
consecutive identical snapshots impossible:

1. the creation state at the first content edit (already stored by the
   insert trigger), and
2. `restore_proposal_version()`'s own `('restored')` capture, which the
   RPC writes BEFORE applying the target snapshot — the subsequent update
   trigger then sees the outgoing state equals its newest row and stays
   quiet. One restore writes exactly one history row.

Because versioning is a DB trigger (not application code), the status
select, future edit surfaces, RPCs, and direct SQL are all captured
identically. The capture INSERT runs SECURITY INVOKER, so the
editor-only insert policy re-checks every row the trigger writes.

## 3. Append-only RLS (locked security model)

- `SELECT` → `is_workspace_member(workspace_id)` — **viewers read
  history** (they're members); strangers see zero rows, indistinguishable
  from empty.
- `INSERT` → `is_workspace_editor(workspace_id)` — app writes happen via
  triggers (editor-gated by the proposals write path) and the RPC.
- **ZERO UPDATE / DELETE policies** — history can never be rewritten or
  purged, even by the owner (events / invoice_links precedent).
  `verify:db` proves both the policy layout (pg_policies count) and the
  runtime behaviour (tamper + purge as owner affect 0 rows).

## 4. Restore — `public.restore_proposal_version(proposal_id, version_id)`

SECURITY DEFINER RPC (PostgREST can't compose lock + capture + update in
one transaction). In order:

1. `SELECT … FOR UPDATE` on the proposal — row lock serializes
   restore-vs-restore and restore-vs-edit, so version numbers can't
   collide (both the trigger and the RPC compute `max + 1`).
2. Re-gate on `is_workspace_editor()` — viewers and strangers are refused
   (`not_authorized`) even calling the function directly; the definer
   context bypasses RLS, so this check is the workspace-isolation anchor.
3. `version_not_found` unless the version belongs to THAT proposal — a
   version id from another proposal/workspace is useless.
4. `already_current` — a restore that would change nothing writes no
   history.
5. Insert `('restored')` capturing the **pre-restore state**, attributed
   via `auth.uid()`; then apply the snapshot (update trigger dedups — see
   §2). Returns the new version id.

**Deliberately no `events` rows:** a restore landing status on
accepted/declined is a rollback, not a fresh client decision; firing
`proposal.accepted` would lie to webhooks. The versions table is the
audit trail (its `('restored')` row says what was displaced, by whom,
when).

## 5. App surface

**Data** (`lib/data/proposals.ts`): `getProposalVersions(proposalId)`
(newest first) and `getProposalVersionById(versionId)` — both through the
session client, so RLS (member read) is the gate.

**Pure helpers** (`lib/proposal-versions.ts`, dependency-free for the
node:test runner): `versionReasonLabel()`, and `versionMatchesCurrent()`
— compares a snapshot against the live proposal so the UI can show a
"Current" mark instead of a Restore button that would only no-op (the
RPC is the real guard; this is the friendly layer).

**Detail page** (`/proposals/:id`): new "Version history" rail card
(`components/proposals/ProposalVersionHistory.tsx`) — newest → oldest,
each row `v N · reason · You/Teammate/System · ago · “title”`, a **View**
link per row, editors-only **Restore** (two-click inline confirm — the
house pattern, `components/proposals/RestoreVersionButton.tsx`), and a
footer stating snapshots can't be edited or deleted. The live document
body was extracted into `components/proposals/ProposalContent.tsx` so…

**Snapshot view** (`/proposals/:id/versions/:versionId`): the SAME
ProposalContent renders the frozen document identically to how it looked
at capture. Read-only banner ("Versions can't be edited or deleted. PDF
export always uses the current proposal."), no status select, no PDF
button, snapshot metadata card (version / captured / reason / by), and an
editors-only Restore card (hidden when the snapshot IS the current
content). A version id belonging to a different proposal renders the same
"not found" state as a bogus one — no cross-URL reads.

**Action** (`restoreProposalVersion` server action): session check +
`requireEditor()` (viewer guard) → RPC → friendly error mapping
(`already_current` / `not_authorized` / `*_not_found`) → revalidates
`/proposals` and `/proposals/:id`; the button also `router.refresh()`es
for the snapshot subroute.

## 6. Coverage

- `tests/db/proposal-versions.test.ts` (PGlite, real migrations):
  creation capture + attribution, first-edit dedup, pre-change snapshot
  content, no-op updates ignored (text + identical jsonb), gapless
  newest→oldest ordering, exact frozen snapshot read, restore applies
  content, **restore auditable** (exactly one `('restored')` row holding
  the pre-restore state, returned id, actor), no-op restore refused,
  cross-proposal version refused, post-restore captures keep working,
  **viewer reads but cannot restore/edit/insert**, stranger isolation,
  zero UPDATE/DELETE policies + zero-effect tamper/purge. (17 tests)
- `scripts/verify-db.mjs`: same contract asserted in the offline DB gate
  (17 new checks), including a viewer fixture and policy-count probes.
- `tests/lib/proposal-versions.test.ts`: reason labels,
  `versionMatchesCurrent` across every content field, deep-copy equality,
  jsonb order semantics. (4 tests)
- `tests/components/proposal-version-history.test.ts`: UI structure —
  View links, CanEdit gating, Current marking, two-click confirm copy,
  read-only banner, no PDF/status-select on the snapshot page, RPC +
  error mapping in the action. (16 assertions)

## 7. Gates

`npm test` (409 passing, +41), `npx tsc --noEmit`, `npm run lint`,
`npm run verify:db`, `npm run build`, `npm run verify:pdf` — all green
(see commit message for the exact run). Baseline before this slice:
368 tests passing on main.
