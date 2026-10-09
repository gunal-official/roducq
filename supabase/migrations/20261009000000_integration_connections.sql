-- Slack + Notion OAuth connections (workspace integrations).
-- Additive only — does not alter existing tables, RPCs, or policies.
--
-- DESIGN DECISIONS:
--   * One row per (workspace, provider) — reconnection rotates tokens in
--     place (the OAuth callback upserts on that unique key). v1 is one
--     Slack workspace and one Notion workspace per Roducq workspace.
--   * Tokens are stored ONLY as AES-256-GCM ciphertext (lib/email/crypto,
--     keyed by EMAIL_TOKEN_ENCRYPTION_KEY or a SHA-256 of AUTH_SECRET /
--     SUPABASE_SERVICE_ROLE_KEY). Members' SELECT returns ciphertext by
--     design — column-level filtering doesn't exist in RLS, and the
--     ciphertext is useless without the server-side key.
--   * NO user write policies: rows are written only by the service role
--     (OAuth callback + owner disconnect action), matching email_accounts.
--   * refresh_token_enc is nullable: Slack bot tokens from oauth.v2.access
--     typically have no refresh token; Notion may or may not issue one.

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('slack', 'notion')),
  -- Slack team id / Notion workspace id
  external_id text not null,
  display_name text,
  access_token_enc text not null,
  refresh_token_enc text,
  token_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'needs_reauth')),
  last_error text,
  created_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

create index if not exists integration_connections_workspace_idx
  on public.integration_connections (workspace_id);

alter table public.integration_connections enable row level security;

create policy "integration_connections: members can select"
  on public.integration_connections for select
  using (public.is_workspace_member(workspace_id));

-- No insert/update/delete policies: the OAuth callback route and the
-- owner-side disconnect action write through the service role.
