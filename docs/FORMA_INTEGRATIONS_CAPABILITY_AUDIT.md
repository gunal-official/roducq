# Roducq integration-capability audit (pre-implementation)

**Date:** 2026-10-26
**Purpose:** decide, from code, which capabilities `/integrations` may
advertise. Companion to `docs/FORMA_INTEGRATIONS_REFERENCE.md` (what the
reference page looks like) and `docs/FORMA_INTEGRATIONS_PAGE_AUDIT.md`
(what was built and verified).

**Classification:** `LIVE` = implemented and user-reachable today ·
`PARTIAL` = implemented with a documented limitation · `PLANNED` = written
down as future work, no code · `UNSUPPORTED` = no evidence anywhere.

The rule used throughout: a dependency, an env var, a logo or a closing doc's
aspiration is **not** evidence. A capability is `LIVE` only when a signed-in
user can reach it, and the path from UI to code is cited.

---

## 1. LIVE — verified, user-reachable

### 1.1 Slack — connect + read-only import

| Fact | Evidence |
| --- | --- |
| OAuth connect route (owner-gated, 302 to Slack) | `app/api/slack/connect/route.ts`; `lib/integrations/handler.ts:121` `handleIntegrationCallback` |
| Authorize/token endpoints | `lib/integrations/oauth.ts:15` `SLACK_AUTHORIZE_URL`, `SLACK_TOKEN_URL` |
| Import ≤25 newest items | `lib/integrations/sync.ts:20` `MAX_IMPORT_ITEMS = 25`, `:467` `fetchImportedItems` |
| Scope of reads | `conversations.list` / `conversations.history` / `users.list` — `SLACK_CHANNEL_CAP = 8`, `SLACK_HISTORY_PER_CHANNEL = 10` (`sync.ts:21-23`) |
| UI | `components/settings/IntegrationsCard.tsx` (Connect / Import now / Disconnect), `components/intake/IntegrationStaging.tsx` (Inbox → Staged imports) |
| Imported item → brief | `app/(app)/settings/integration-actions.ts:184` `createBriefFromImport` |
| Direction | **read-only**: the docblock of `lib/integrations/sync.ts` states the app never posts to Slack and no write path exists |

**Status: LIVE.** What a card may say: connect a Slack workspace, pull recent
messages into the Inbox, turn any one into a brief. It may **not** say
two-way sync, posting, notifications to Slack, or event-driven triggers.

### 1.2 Notion — connect + read-only import

Same routes and handler (`app/api/notion/connect/route.ts`,
`lib/integrations/handler.ts`), `NOTION_VERSION = "2022-06-28"` and
`NOTION_AUTHORIZE_URL` in `lib/integrations/oauth.ts`. Import is Notion
`search` + block children, plain-text blocks only (`sync.ts:406`
`page_size: MAX_IMPORT_ITEMS`).

**Status: LIVE**, with the documented limitations in §3.2.

### 1.3 Gmail / Outlook mailbox intake

| Fact | Evidence |
| --- | --- |
| Connect routes, signed state | `app/api/email/connect/route.ts:28` (`gmail` \| `outlook`), `app/api/email/callback/route.ts`, `lib/email/state.ts` |
| Read scopes | `lib/email/oauth.ts:20` `GMAIL_SCOPE = gmail.readonly`, `OUTLOOK_SCOPE = Mail.Read` |
| Inbox pull, 25 newest | `lib/email/sync.ts:219` (`maxResults=25`), `:235` (`$top=25`), `:206` `fetchInboxMessages` |
| Scheduled refresh | `app/api/cron/email/route.ts` (sweep across active accounts) |
| UI | `components/settings/MailboxCard.tsx` (Connect / Sync now / Disconnect), `components/intake/MailboxStaging.tsx` |

**Status: LIVE.** Read-only: the app never sends mail. One mailbox per
provider per workspace.

### 1.4 Outbound signed webhooks

| Fact | Evidence |
| --- | --- |
| HMAC-SHA256 signing, `X-Roducq-Signature` | `lib/webhooks.ts:39` `signPayload`, `:19` `SIGNATURE_HEADER` |
| Dispatch + 3 attempts (15s / 60s backoff) | `lib/webhook-dispatch.ts` (docblock), `lib/webhooks.ts:26` `RETRY_BACKOFF_MS` |
| Serverless retry sweep | `app/api/cron/webhooks/route.ts` |
| UI | `components/settings/WebhooksCard.tsx` |
| Event vocabulary | `lib/events.ts:16` `EVENT_TYPES` — 10 types: `brief.created`, `proposal.accepted`, `proposal.declined`, `plan.task_completed`, `invoice.paid`, `contract.signed`, `team.member.joined`, `team.member.left`, `team.member.removed`, `template.created` |

**Status: LIVE.** This is Roducq's own integration *surface* — any endpoint a
customer controls. It is a genuine answer to "can I connect my tools?" without
naming a vendor Roducq has not built.

### 1.5 PDF export

| Fact | Evidence |
| --- | --- |
| Five document kinds + workspace reports/time | `app/api/pdf/[kind]/[id]/route.ts:34` `KINDS = ["invoice","contract","proposal","update","plan"]`; `app/api/pdf/reports/route.ts`, `app/api/pdf/time/route.ts`, `app/api/pdf/shared/invoice/[token]/route.ts` |
| Builders | `lib/pdf/documents.ts:159` `buildInvoicePdf`, `:251` contract, `:312` proposal, `:396` update, `:454` plan, `:526` time, `:591` reports |
| Workspace letterhead logo | `lib/pdf/layout.ts`; `components/settings/WorkspaceBrandingCard.tsx` |
| Limits | PNG/JPEG only, ≤256 KiB, ≤4 MP; **no font embedding/subsetting** (`docs/pdf-export-closeout.md`) |

**Status: LIVE.** Not a third-party integration; a native output. Must be
labelled native.

### 1.6 File import (DOCX / PDF / TXT / MD)

`lib/intake/extract.ts:68` `extractUploadText`, `lib/intake/docx.ts`,
`lib/intake/pdf.ts`, `lib/intake/shared.ts:40` `MAX_UPLOAD_BYTES` (5 MB),
`:43` `MAX_OUTPUT_CHARS` (100 000); UI `components/intake/SourceFilePicker.tsx`
→ `app/api/intake/extract/route.ts`. Magic-byte detection; **bytes are
discarded after extraction** (no storage bucket).

**Status: LIVE.** Native import, not a connector.

### 1.7 Shareable links

| Fact | Evidence |
| --- | --- |
| Public read-only update link | `app/share/[token]/page.tsx`, `lib/data/shares.ts:38` `getSharedDocumentByToken` (SECURITY DEFINER RPC; invalid and revoked are indistinguishable) |
| Public invoice link + PDF | `app/invoice/[token]/page.tsx`, `app/api/pdf/shared/invoice/[token]/route.ts`, `lib/invoice-sharing.ts:40` `canShareInvoice` |
| Revocation | `lib/data/shares.ts` (share panel) |

**Status: LIVE.** Native sharing; no third-party account required.

### 1.8 Invite email (SMTP)

`lib/invite-email.ts:64` reads `SMTP_HOST` etc.; sends workspace invitations.

**Status: LIVE** but **operationally dependent**: with no SMTP env the invite
flow degrades to a copy-the-link path. It must never be presented as a
customer-connectable mail integration — that is §1.3's job.

### 1.9 AI brief extraction (vendor-side)

`lib/ai/brief-generator.ts:63` uses OpenAI when `OPENAI_API_KEY` is set and
otherwise a deterministic heuristic extractor. UI `app/(app)/intake/page.tsx`.

**Status: LIVE**, but it is **server-side infrastructure**, not a
customer-connectable integration. An API key, a dependency or a vendor name
does not make a card. It is intentionally **not** advertised as an
integration.

---

## 2. PARTIAL — real, with a limitation the copy must carry

| Capability | Limitation (source) |
| --- | --- |
| Slack import | ≤25 newest items per run; ≤8 conversations × 10 messages; no paging (`docs/integration-imports-closeout.md` §4) |
| Notion import | ≤25 pages; plain-text blocks only; child pages and images skipped; pages not shared with the integration stay invisible (Notion's model) |
| Mailbox intake | one mailbox per provider per workspace; read-only; 25 newest per sync |
| One connection per provider | one Slack + one Notion per workspace; swap by disconnecting (`20261009000000_integration_connections.sql`, unique `(workspace_id, provider)`) |
| Webhooks | 3 attempts then terminal `failed`; delivery may duplicate in a narrow freeze window (receivers dedupe on the stable event id) |
| PDF | no font embedding; PNG/JPEG logo only; no CSV/JSON export of data |
| Import-triggered automation | no event type fires for an import; `brief.created` fires only when a staged item becomes a brief |
| Slack posting | `chat:write` is requested in the bot scopes but **no code posts**; treat as reserved, not as a feature |

---

## 3. PLANNED — written down, no implementation

| Item | Source | Why it is not LIVE |
| --- | --- | --- |
| Slack Events / slash commands | `docs/integrations-closeout.md` §1 ("no Slack event subscriptions"), `lib/integrations/oauth.ts` comment "needed later for Events/slash commands"; `SLACK_SIGNING_SECRET` is read but unused | no route, no handler |
| Notion write-back | `docs/integration-imports-closeout.md` ("the app never … writes Notion pages") | read-only by design |
| Second SSO provider (Microsoft / Okta) | `docs/sso-closeout.md` §4 ("the seam (`lib/auth/oauth.ts`) is what a Microsoft button would extend") | only Google exists |

**"Coming soon" may be used for these three and nothing else.** They are also
all *account/plumbing* concerns, not catalog cards; the content gate decides
whether they appear at all.

---

## 4. UNSUPPORTED — must not appear anywhere on the page

| Candidate | Evidence of absence |
| --- | --- |
| Google Calendar / Outlook Calendar | no calendar code; `app/(marketing)/vs/[slug]/vs-pages.ts:178` states "Not a scheduling tool — meetings stay in your own calendar app" |
| Zapier / Make / n8n | zero references |
| Figma, Linear, GitHub, Google Drive, Dropbox, Teams, Slack-as-chat-product beyond §1.1 | zero references |
| CSV / JSON data export | `docs/FORMA_FEATURES_PAGE_AUDIT.md:351` — "no … CSV/JSON export"; `app/(marketing)/features/content.ts:24` repeats it as deliberately absent |
| Import from boards/trackers (Jira, Trello, Asana, ClickUp) | zero references |
| Two-way sync of any kind | `sync.ts` and `email/sync.ts` are read-only |
| Razorpay as an *integration* | it is the billing provider (`lib/razorpay.ts`); it is not connectable, and payments are deliberately disabled in production config. Must not be a card |
| Supabase, Sentry, Vercel | infrastructure, not integrations |
| Google sign-in as an integration | it is an auth provider (`lib/auth/oauth.ts`); belongs on `/login`, not in a catalog |
| Public API / REST API keys | no route, no token table |

---

## 5. What the page can therefore honestly contain

**External connectors (3):** Slack, Notion, and a connected mailbox
(Gmail / Outlook).

**Native outputs and flows that a "works with" catalog can carry as
non-connectors (4):** signed outbound webhooks, PDF export, file import
(DOCX/PDF/TXT/MD), and shareable client links.

That is **7 verified entries**, versus the reference's 12. The reference's
count line is data ("12 integrations"); the recreation's must be derived from
its own data and will read differently — that is a truthful deviation, not a
fidelity gap, and §"Deviations" of the page audit will record it.

Categories that exist among those 7 (replacing the reference's
Communication / Calendar / Docs / Planning / Design):

- **Chat** (Slack)
- **Docs & notes** (Notion)
- **Email** (connected mailbox)
- **Automation** (webhooks)
- **Files & exports** (PDF export, file import)
- **Sharing** (client links)

No category is invented to fill the reference's six-chip row; the chip row's
*count* is allowed to differ.
