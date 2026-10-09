# Slack + Notion OAuth closeout (2026-10-09)

**Scope:** production was 404ing `/api/slack/connect`, `/api/slack/callback`,
`/api/notion/connect`, and `/api/notion/callback`. This ships those exact
App Router routes, encrypted token storage, and a Settings entry.

Deliberate boundaries for this slice: **connect + persist** (no Slack
event subscriptions, no `/api/cron/slack`). Intake import of recent
messages/pages is the follow-up in `docs/integration-imports-closeout.md`.
Cron email + webhooks GET compatibility is unchanged.

## 1. What's in the app now

- **`GET /api/slack/connect`** — owner-gated 302 to
  `https://slack.com/oauth/v2/authorize`. Unauthenticated callers 302 to
  `/login` (so `curl -I` is 302, never 404).
- **`GET /api/slack/callback`** — verifies the HMAC-signed `state`,
  exchanges `code` via **`oauth.v2.access`**, encrypts the bot token,
  upserts `integration_connections`. Bare GET/HEAD (no `code`) returns
  **400**, never 404.
- **`GET /api/notion/connect`** / **`GET /api/notion/callback`** — same
  contract against Notion's v1 OAuth (`/v1/oauth/authorize` +
  `/v1/oauth/token` with Basic auth).
- **Settings → Integrations** — Connect Slack / Connect Notion, connected
  vs disconnected state, owner-only disconnect (best-effort provider
  revoke).
- **DB:** `integration_connections` (migration `20261009000000`) — members
  SELECT, no user write policies (service role only). Unique
  `(workspace_id, provider)` — one Slack + one Notion per workspace.

OAuth `state` is the existing mailbox signer (`lib/email/state.ts`,
`AUTH_SECRET` falling back to `SUPABASE_SERVICE_ROLE_KEY`). Tokens use
AES-256-GCM (`lib/email/crypto.ts`) keyed by `EMAIL_TOKEN_ENCRYPTION_KEY`
or SHA-256(`AUTH_SECRET` / service role).

## 2. Operator setup

**Slack:** create a Slack app → OAuth & Permissions → redirect URLs:

- `https://roducq.nanexi.com/api/slack/callback`
- `http://localhost:3000/api/slack/callback`

Bot token scopes must include whatever you set as `SLACK_BOT_SCOPES`
(default covers history/read + `chat:write` so Import now works). Set
`SLACK_CLIENT_ID` + `SLACK_CLIENT_SECRET`. `SLACK_SIGNING_SECRET` is
optional (needed later for Events/slash commands; unused by connect).

**Notion:** public integration → OAuth redirect URI
`https://<your-domain>/api/notion/callback` (and localhost). Set
`NOTION_CLIENT_ID` + `NOTION_CLIENT_SECRET`.

**Both:** set `AUTH_SECRET` (HMAC + token-key fallback) and
`SUPABASE_SERVICE_ROLE_KEY` (callback persist). Apply migration
`20261009000000_integration_connections.sql`.

## 3. Verification

- `npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run build`
- `npm run verify:db` (integrations block: RLS user-write denial, provider
  CHECK, unique `(workspace, provider)`, member SELECT)
- After deploy:

```bash
curl -I https://roducq.nanexi.com/api/slack/connect    # 302
curl -I https://roducq.nanexi.com/api/notion/connect   # 302
curl -I https://roducq.nanexi.com/api/slack/callback   # 400 (not 404)
curl -I https://roducq.nanexi.com/api/notion/callback  # 400 (not 404)
```
