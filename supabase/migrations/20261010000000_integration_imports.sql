-- Slack + Notion intake import (follow-up to 20261009000000).
-- Connected Slack/Notion workspaces stage recent messages/pages for the
-- Roducq workspace; staged items become briefs through the EXISTING
-- create_brief_bundle() RPC (source_type 'chat' for Slack, 'manual' for
-- Notion — both first-class since the briefs schema). This migration
-- adds last_synced_at on the connection row and the staged-import table.
--
-- DESIGN DECISIONS (locked):
--   * unique(connection_id, external_id) makes every import idempotent:
--     the same Slack message (channel:ts) or Notion page id is never
--     staged twice. Re-import upserts content in place and does NOT
--     reset attached_brief_id (the column is omitted from the upsert).
--   * Tokens stay on integration_connections; this table holds only
--     the imported payload (title/author/snippet/body). No user write
--     policies — rows are written by the service role (owner Import now
--     action). Members SELECT so the Inbox staging list can render.
--   * attached_brief_id → briefs(id) ON DELETE SET NULL: deleting a
--     brief detaches the import (the row is a sync artifact, not a
--     brief child). Disconnecting the provider cascades the imports.
--   * last_synced_at on integration_connections mirrors email_accounts
--     so Settings can show "Last imported …" without a join.
--   * NO /api/cron/slack — import is on-demand (Import now). The
--     existing cron email + webhooks GET compatibility is unchanged.

alter table public.integration_connections
  add column if not exists last_synced_at timestamptz;

create table if not exists public.integration_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  provider text not null check (provider in ('slack', 'notion')),
  -- Slack: "{channel_id}:{ts}"; Notion: page id
  external_id text not null,
  title text,
  author text,
  snippet text,
  body_text text,
  permalink text,
  occurred_at timestamptz not null,
  attached_brief_id uuid references public.briefs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (connection_id, external_id)
);

create index if not exists integration_imports_workspace_occurred_idx
  on public.integration_imports (workspace_id, occurred_at desc);

create index if not exists integration_imports_staging_idx
  on public.integration_imports (workspace_id) where attached_brief_id is null;

alter table public.integration_imports enable row level security;

create policy "integration_imports: members can select"
  on public.integration_imports for select
  using (public.is_workspace_member(workspace_id));

-- No insert/update/delete policies: the owner-side Import now action
-- and the editor-side "create brief from import" mark-attached write
-- go through the service role (mailbox staging precedent).
