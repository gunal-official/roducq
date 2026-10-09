# Slack + Notion intake import closeout (2026-10-10)

**Scope:** after OAuth connect (PR #17 / `20261009000000`), owners can
**Import now** from a connected Slack or Notion workspace. Recent
messages/pages stage in the Inbox; editors turn any item into a brief
through the existing `create_brief_bundle` RPC. Deliberate boundaries:
**read-only** (the app never posts to Slack or writes Notion pages),
**on-demand** (no `/api/cron/slack` — don't schedule one), **zero new
dependencies** (raw `fetch` — the house mailbox pattern).

## 1. What's in the app now

- **Settings → Integrations → Import now** (`IntegrationsCard`): pulls
  ≤25 newest Slack messages (across up to 8 conversations) or Notion
  pages (search + block children), upserts them into
  `integration_imports`, stamps `last_synced_at`. A dead token marks the
  connection `needs_reauth` (Connect again). Owner-only.
- **Inbox → Staged imports** (`IntegrationStaging`): the 20 newest
  unattached items (title, author, snippet, time-ago, Slack/Notion chip)
  with **Create brief** (editors). Slack → `source_type 'chat'`; Notion
  → `source_type 'manual'`. The row is then marked attached, so it drops
  out of staging and appears on the brief's Sources card.
- **Dedupe:** `unique(connection_id, external_id)` — Slack ids are
  `{channel_id}:{ts}`, Notion ids are the page id. Re-importing the same
  item refreshes content in place and never resets `attached_brief_id`
  (the column is omitted from the upsert). A batch is also deduped
  in-process so one statement never ships duplicate keys.
- **DB:** migration `20261010000000_integration_imports.sql` — additive
  `last_synced_at` on `integration_connections` plus
  `integration_imports` (members SELECT, no user write policies; service
  role only). `attached_brief_id → briefs` ON DELETE SET NULL;
  disconnecting the provider cascades the imports.

## 2. Operator setup (scopes)

**Slack:** the default `SLACK_BOT_SCOPES` now includes the history/read
scopes import needs:

```
channels:history,channels:read,groups:history,groups:read,im:history,mpim:history,users:read,chat:write
```

Add those on the Slack app → OAuth & Permissions, then **reconnect** so
the new scopes land on the bot token. A `missing_scope` error from
Import now is the hint to do that. `SLACK_SIGNING_SECRET` is still
unused (Events / slash commands, later).

**Notion:** the existing public-integration token is enough (search +
block children). Pages the integration hasn't been granted stay out of
search — that's Notion's sharing model, not a bug.

Apply migration `20261010000000_integration_imports.sql` after
`20261009000000_integration_connections.sql`.

## 3. Verification

- `npx tsc --noEmit` · `npm run lint` · `npm test` (incl.
  `tests/lib/integrations-sync.test.ts`: Slack/Notion fixtures, in-batch
  dedupe, 401 → re-auth, missing_scope hint) · `npm run build`
- `npm run verify:db` (imports block: RLS user-write denial, provider
  CHECK, unique `(connection, external_id)`, per-connection id reuse,
  staging attach/detach, `last_synced_at` column)
- After deploy: Settings → Integrations → Import now on a connected
  workspace; Inbox shows **Staged imports**; Create brief lands on
  `/briefs/[id]`.

## 4. Known limitations / decisions (v1)

- One Slack workspace + one Notion workspace per Roducq workspace
  (disconnect to swap) — unchanged from connect.
- Import pulls ≤25 newest items (≤8 Slack conversations × 10 messages,
  Notion search page_size 25). High-volume workspaces are covered by
  clicking Import now again, not paging.
- Slack channel_join / topic / archive subtypes are skipped; empty
  bodies are skipped. User names come from a best-effort `users.list`.
- Notion HTML is unused — block `plain_text` only. Child pages and
  images are skipped. A page whose blocks fail to load still stages
  with its title.
- No event-type for imports (the fixed 10 event types are unchanged;
  `brief.created` IS recorded when a staged item becomes a brief).
- No `/api/cron/slack`. Members see staged items; only owners import;
  only editors create briefs.
