-- Step 30 (Queue #7): proposal version history. Automatic, immutable
-- snapshots of proposal content — list / view / restore.
--
-- DESIGN DECISIONS (locked):
--   * SNAPSHOT MODEL: proposal_versions stores the CREATION state plus
--     every DISPLACED state — the current row is versioned the moment a
--     change replaces it. A version is always a state the proposal
--     actually held; "restore v N" = make that state current again.
--   * AUTOMATIC: two AFTER triggers on proposals (insert → 'created',
--     update → 'edited') snapshot at the DB layer, so every present and
--     FUTURE write path (app action, RPC, direct SQL) is captured. Only
--     MEANINGFUL changes version: title / client_name / status /
--     budget_timeline / deliverables. A no-op UPDATE (e.g. re-selecting
--     the same status) bumps updated_at alone and creates nothing.
--   * DEDUP: the update trigger skips the capture when the outgoing
--     state already IS the newest snapshot — that covers the creation
--     state at first edit (already stored by the insert trigger) and
--     lets restore_proposal_version() write its own 'restored' capture
--     before applying, without the trigger double-logging it. Consecutive
--     identical snapshots are therefore impossible.
--   * APPEND-ONLY AUDIT: SELECT for every workspace member (viewers
--     READ history), INSERT for editors, and ZERO update / delete
--     policies (events / invoice_links precedent — the rows are the
--     audit trail; history can never be rewritten).
--   * RESTORE = restore_proposal_version() RPC: row-locks the proposal,
--     re-gates on is_workspace_editor() (viewers blocked even from a
--     direct RPC call), verifies the version belongs to THAT proposal,
--     refuses no-op restores, captures the PRE-RESTORE state as a new
--     'restored' version, then applies the snapshot. One transaction —
--     restore can never lose the state it displaces.
--   * No event-log rows: changing status back to accepted/declined via
--     restore is a rollback, not a fresh client decision — the versions
--     table is the audit trail for it.

-- ──────────────────────────── Table ─────────────────────────────

create table if not exists public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  version_number integer not null,          -- 1-based, strictly increasing per proposal, no gaps
  reason text not null
    check (reason in ('created', 'edited', 'restored')),
  -- The snapshot: every mutable content column of proposals, frozen.
  title text not null,
  client_name text,
  status text not null
    check (status in ('draft', 'sent', 'accepted', 'declined')),
  budget_timeline text,
  deliverables jsonb not null default '[]'::jsonb, -- array of {id, text, checked}
  created_by uuid references auth.users(id) on delete set null, -- who displaced/created it; null = unknown/system
  created_at timestamptz not null default now()
);

-- One version number per proposal, ascending without gaps (both the
-- trigger and the restore RPC compute next = max + 1 while the proposals
-- row lock serializes writers).
create unique index if not exists proposal_versions_proposal_version_idx
  on public.proposal_versions (proposal_id, version_number desc);

create index if not exists proposal_versions_workspace_id_idx
  on public.proposal_versions (workspace_id, created_at desc);

alter table public.proposal_versions enable row level security;

-- ──────────────────────────── Policies ──────────────────────────
-- proposals carries workspace_id directly and so do its versions —
-- policies call is_workspace_member/editor inline (proposals precedent).
-- Viewers are members: they READ history but can never write it. There
-- are deliberately NO update/delete policies (append-only).

create policy "proposal_versions: members can select"
  on public.proposal_versions for select
  using (public.is_workspace_member(workspace_id));

create policy "proposal_versions: editors can insert"
  on public.proposal_versions for insert
  with check (public.is_workspace_editor(workspace_id));

-- ───────────── Trigger: automatic snapshots ─────────────────────
-- SECURITY INVOKER on purpose: the INSERT into proposal_versions runs as
-- the calling user, so the editor insert policy re-checks every capture.
-- Writers of proposals are editors by RLS already, so legitimate writes
-- always pass; anything that bypassed the proposals policies dies here.

create or replace function public.snapshot_proposal_version()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_source public.proposals%rowtype;
  v_reason text;
begin
  if tg_op = 'INSERT' then
    v_source := new;
    v_reason := 'created';
  else
    -- UPDATE: snapshot the OUTGOING (pre-change) state …
    v_source := old;
    v_reason := 'edited';

    -- … unless that state is already the newest snapshot. Two cases:
    -- the creation state at the first content edit (stored by the
    -- insert trigger), and restore_proposal_version()'s 'restored'
    -- capture written just before it applies the target snapshot.
    if exists (
      select 1
        from public.proposal_versions pv
       where pv.proposal_id = new.id
         and pv.version_number = (
           select max(version_number)
             from public.proposal_versions
            where proposal_id = new.id
         )
         and pv.title is not distinct from old.title
         and pv.client_name is not distinct from old.client_name
         and pv.status is not distinct from old.status
         and pv.budget_timeline is not distinct from old.budget_timeline
         and pv.deliverables is not distinct from old.deliverables
    ) then
      return null;
    end if;
  end if;

  insert into public.proposal_versions (
    workspace_id, proposal_id, version_number, reason,
    title, client_name, status, budget_timeline, deliverables, created_by
  ) values (
    new.workspace_id, new.id,
    coalesce(
      (select max(version_number)
         from public.proposal_versions
        where proposal_id = new.id),
      0
    ) + 1,
    v_reason,
    v_source.title, v_source.client_name, v_source.status,
    v_source.budget_timeline, v_source.deliverables,
    auth.uid()
  );

  return null;
end;
$$;

comment on function public.snapshot_proposal_version() is
  'Appends the creation state (INSERT) or the displaced state (UPDATE, content columns only) to proposal_versions. Skips the capture when the outgoing state is already the newest snapshot (creation dedup, restore dedup).';

drop trigger if exists proposals_snapshot_created on public.proposals;
create trigger proposals_snapshot_created
  after insert on public.proposals
  for each row
  execute function public.snapshot_proposal_version();

-- Only MEANINGFUL changes version — the WHEN keeps no-op updates (and
-- updated_at-only touches) out of history before the function even runs.
drop trigger if exists proposals_snapshot_edited on public.proposals;
create trigger proposals_snapshot_edited
  after update on public.proposals
  for each row
  when (
    old.title is distinct from new.title
    or old.client_name is distinct from new.client_name
    or old.status is distinct from new.status
    or old.budget_timeline is distinct from new.budget_timeline
    or old.deliverables is distinct from new.deliverables
  )
  execute function public.snapshot_proposal_version();

-- ───────────── RPC: restore a version ───────────────────────────
-- SECURITY DEFINER because it must (a) read the proposal + the version
-- and (b) insert the pre-restore capture + write proposals in ONE
-- transaction, none of which PostgREST can compose. The explicit
-- is_workspace_editor() guard is the re-gate — viewers and strangers are
-- refused here even though the definer context bypasses RLS.
-- Returns the id of the NEW 'restored' version (the displaced state).

create or replace function public.restore_proposal_version(
  p_proposal_id uuid,
  p_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_cur_title text;
  v_cur_client_name text;
  v_cur_status text;
  v_cur_budget_timeline text;
  v_cur_deliverables jsonb;
  v_tgt_title text;
  v_tgt_client_name text;
  v_tgt_status text;
  v_tgt_budget_timeline text;
  v_tgt_deliverables jsonb;
  v_next integer;
  v_new_version_id uuid;
begin
  -- Lock the proposal row: serializes restore-vs-restore and
  -- restore-vs-edit so version numbers can never collide.
  select workspace_id, title, client_name, status, budget_timeline, deliverables
    into v_workspace_id, v_cur_title, v_cur_client_name, v_cur_status,
         v_cur_budget_timeline, v_cur_deliverables
    from public.proposals
   where id = p_proposal_id
   for update;

  if not found then
    raise exception 'proposal_not_found: %', p_proposal_id;
  end if;

  -- Editors only — the viewer/stranger re-gate (RLS is bypassed here).
  if not public.is_workspace_editor(v_workspace_id) then
    raise exception 'not_authorized: only editors can restore versions';
  end if;

  -- The version must belong to THIS proposal (no cross-proposal /
  -- cross-workspace restores; workspace_ids can never disagree).
  select title, client_name, status, budget_timeline, deliverables
    into v_tgt_title, v_tgt_client_name, v_tgt_status,
         v_tgt_budget_timeline, v_tgt_deliverables
    from public.proposal_versions
   where id = p_version_id
     and proposal_id = p_proposal_id;

  if not found then
    raise exception 'version_not_found: %', p_version_id;
  end if;

  -- A restore that would change nothing writes no history.
  if v_cur_title is not distinct from v_tgt_title
     and v_cur_client_name is not distinct from v_tgt_client_name
     and v_cur_status is not distinct from v_tgt_status
     and v_cur_budget_timeline is not distinct from v_tgt_budget_timeline
     and v_cur_deliverables is not distinct from v_tgt_deliverables then
    raise exception 'already_current: that version is the current content';
  end if;

  -- 1. Capture the PRE-RESTORE state — restore is auditable: the
  --    displaced state lands in history BEFORE it is replaced.
  v_next := coalesce(
    (select max(version_number)
       from public.proposal_versions
      where proposal_id = p_proposal_id),
    0
  ) + 1;

  insert into public.proposal_versions (
    workspace_id, proposal_id, version_number, reason,
    title, client_name, status, budget_timeline, deliverables, created_by
  ) values (
    v_workspace_id, p_proposal_id, v_next, 'restored',
    v_cur_title, v_cur_client_name, v_cur_status,
    v_cur_budget_timeline, v_cur_deliverables,
    auth.uid()
  )
  returning id into v_new_version_id;

  -- 2. Apply the snapshot. The update trigger fires but dedups against
  --    the capture we just wrote (the outgoing state IS the newest
  --    snapshot), so exactly ONE row documents this restore.
  update public.proposals
     set title = v_tgt_title,
         client_name = v_tgt_client_name,
         status = v_tgt_status,
         budget_timeline = v_tgt_budget_timeline,
         deliverables = v_tgt_deliverables
   where id = p_proposal_id;

  return v_new_version_id;
end;
$$;

comment on function public.restore_proposal_version(uuid, uuid) is
  'Editors-only restore: row-locks the proposal, snapshots the pre-restore state as a new ''restored'' version, then applies the target snapshot. Refuses unknown ids, non-editors, and no-op restores.';
