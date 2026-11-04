# Razorpay Test Mode Setup — RoduCQ

Status of this milestone: **PARTIALLY COMPLETE.** All implementation, automated
testing and offline verification is done. The live Test Mode checkout and the
live webhook round-trip are **BLOCKED** on external credentials (Razorpay,
Supabase, Vercel) — see [§12 Verification results](#12-verification-results) for
the item-by-item status.

Production payments are **DISABLED** and cannot be enabled by configuration.
See [§11 Production activation safety](#11-production-activation-safety).

---

## Contents

1. [Credentials](#1-test-mode-credentials)
2. [Environment variables](#2-environment-variables)
3. [Test subscription plans](#3-test-subscription-plans)
4. [Supabase migrations](#4-supabase-migrations)
5. [Webhook URL + events](#5-webhook-url-and-events)
6. [Vercel configuration](#6-vercel-configuration)
7. [Test checkout walkthrough](#7-test-checkout-walkthrough)
8. [Subscription lifecycle verification](#8-subscription-lifecycle-verification)
9. [How RoduCQ decides Pro access](#9-how-roducq-decides-pro-access)
10. [Troubleshooting](#10-troubleshooting)
11. [Production activation safety](#11-production-activation-safety)
12. [Verification results](#12-verification-results)

---

## 1. Test Mode credentials

Get these from the Razorpay Dashboard with the **Test Mode** toggle ON
(top-right Live/Test switch):

| Value | Where | Env var |
| --- | --- | --- |
| Test Key Id (`rzp_test_…`) | Settings → API Keys | `RAZORPAY_KEY_ID` |
| Test Key Secret | Settings → API Keys (shown once) | `RAZORPAY_KEY_SECRET` |
| Webhook signing secret | Developers → Webhooks → your webhook | `RAZORPAY_WEBHOOK_SECRET` |

Notes:

- Test and Live keys are **separate key pairs**. A `rzp_test_` secret never works
  with a `rzp_live_` id and vice versa.
- The key **secret** and the **webhook secret** are different values. Mixing them
  produces signature failures that look like bugs but are not.
- Never commit these. `.env*` is gitignored (`.gitignore` keeps only
  `.env.local.example`). RoduCQ also has a regression test that fails if a real
  `rzp_test_`/`rzp_live_` key or a secret value appears in the billing source or
  in `.env.local.example`.

## 2. Environment variables

Copy `.env.local.example` → `.env.local` and fill in:

```bash
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_PLANS='[{"currency":"INR","planId":"plan_xxxxxxxxxxxx","amount":1499}]'

# Required by the webhook + verify routes (service-role writes only).
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional — only if you want the client key visible as an env var.
# NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
```

### `RAZORPAY_MODE`

| Value | Effect |
| --- | --- |
| unset / blank | **`test`** — the safe default. Never live. |
| `test` | Test Mode. The only allowed value. |
| `live` | **Refused.** Billing fails closed with a clear error. |
| anything else | **Refused.** Configuration error, not a silent fallback. |

`RAZORPAY_MODE` and the `RAZORPAY_KEY_ID` prefix must **agree**. A `rzp_live_`
key with `RAZORPAY_MODE=test` is refused (and so is the reverse) rather than
guessed — two half-configured environments must never be reconciled silently.

### `NEXT_PUBLIC_RAZORPAY_KEY_ID`

**Optional.** The server key id is the source of truth and is handed to
Checkout.js by the `createRazorpayCheckout` server action, so the app works
without this variable at all. If you set it, it **must equal**
`RAZORPAY_KEY_ID`; a mismatch is refused *before* a subscription is created, so
a half-migrated deploy cannot open checkout against the wrong Razorpay account
and leave an orphaned subscription behind.

Leaving it unset is the recommended default — one fewer place for a value to
drift.

### Which values reach the browser?

| Value | Browser-visible? |
| --- | --- |
| `RAZORPAY_KEY_ID` | Yes — it is a public key by design (sent to Checkout.js) |
| `RAZORPAY_KEY_SECRET` | **No** — server only |
| `RAZORPAY_WEBHOOK_SECRET` | **No** — server only |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** — server only |
| `RAZORPAY_PLANS` | Its *display* values (currency + amount) are rendered; plan ids are used server-side to create the subscription |

## 3. Test subscription plans

RoduCQ has **one paid tier** — Pro, billed **per workspace per month**, quantity
hard-coded to `1`. There is no per-seat or per-brief pricing. So Test Mode needs
**one Razorpay Plan per currency you sell in**, and `RAZORPAY_PLANS` lists
exactly those.

Do not invent a plan id. Create the Plan first, then use the id Razorpay returns.

### 3a. Validate your plan specs (no credentials needed)

```bash
npm run billing:plans -- --dry-run \
  --specs '[{"name":"RoduCQ Pro","amount":1499,"currency":"INR"}]'
```

Prints what would be created (including the paise conversion) and calls nothing.
Validates: non-empty name, uppercase 3-letter currency, positive amount, and
**one plan per currency** (which is what `RAZORPAY_PLANS` requires).

### 3b. Create the plans in Test Mode

```bash
RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=yyy \
  npm run billing:plans -- --interval month --period 1 \
  --specs '[{"name":"RoduCQ Pro","amount":1499,"currency":"INR"}]'
```

The script POSTs to `/v1/plans`, then prints the exact value to paste:

```
RAZORPAY_PLANS='[{"currency":"INR","planId":"plan_XXXXXXXXXXXX","amount":1499}]'
```

For a batch, put the specs in `razorpay-plans.local.json` (gitignored) and use
`--file razorpay-plans.local.json`.

The script **refuses `rzp_live_` keys** and **refuses `RAZORPAY_MODE=live`** —
there is no flag that enables Live Mode.

### 3c. Or create them in the Dashboard

Subscriptions → Plans → New Plan:

| Field | Value |
| --- | --- |
| Name | `RoduCQ Pro` |
| Amount | `149900` paise (= ₹1,499). The dashboard asks for **paise**; `RAZORPAY_PLANS.amount` is in **major units**. |
| Currency | `INR` |
| Billing cycle | `1` `month` |

Then copy the resulting `plan_…` id into `RAZORPAY_PLANS`.

### 3d. Confirm the mapping

```bash
RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=yyy npm run billing:plans -- --list
```

Lists the plans on that key with their ids, amounts and intervals. Check the
amount matches `RAZORPAY_PLANS` — RoduCQ displays `RAZORPAY_PLANS.amount` and
**Razorpay charges the Plan's own amount**. A mismatch means the price shown is
not the price charged.

> **Plans are per-mode.** A Plan created with a Test Mode key does not exist for
> a Live Mode key. Any future Live Mode milestone must re-run §3 against the live
> key and update `RAZORPAY_PLANS`.

## 4. Supabase migrations

Five migration files carry the Razorpay schema. The Stage 1C additions are
additive; existing Stripe columns and billing history are preserved.

| File | What it does |
| --- | --- |
| `supabase/migrations/20261016000000_razorpay_billing.sql` | Adds Razorpay billing columns and the `billing_webhook_events` ledger; widens the billing status CHECK. |
| `supabase/migrations/20261016120000_razorpay_atomic_ledger_entitlements.sql` | Adds verified paid-through fields and the atomic `apply_razorpay_subscription_event()` function. |
| `supabase/migrations/20261030100000_razorpay_stage1a_schema_foundation.sql` | Stage 1A: adds the initially inert Plan catalog, checkout intents, subscription bindings, webhook work table, and nullable composite-checked `billing_subscriptions.razorpay_binding_id`. |
| `supabase/migrations/20261104100000_razorpay_stage1b_rpcs.sql` | Stage 1B: adds owner-gated reservation/create authorization, binding, webhook ingestion/lease/finalization RPCs; grants narrowly scoped runtime execution. |
| `supabase/migrations/20261104120000_razorpay_stage1c_runtime.sql` | Stage 1C: adds server-owned plan/seat metadata, `past_due`, accepts `payment.captured`, and updates atomic apply/webhook RPC validation. |

### Staged implementation status

The prerequisite code milestones are merged to `main`: PR #96 (isolated Starter/Team catalog), #97 (baseline characterization), #98 (Stage 1A inert schema), #99 (Stage 1B guarded RPCs/adapters), and #100 (multi-connection PostgreSQL concurrency verification). Stage 1C adds the authenticated checkout route and durable webhook worker; its public UI is deliberately not wired. PR merges do not apply any Supabase migration.

Apply the Razorpay migrations in timestamp order only to a verified non-production project. The offline `npm run verify:db` applies the repository migrations to disposable in-memory PGlite and is not a Supabase operation.

### Stage 1A prerequisites and scope

Before applying Stage 1A to a non-production staging project, confirm that the
first two Razorpay migrations have been applied in timestamp order and that the
project has the referenced `public.workspaces`, `public.billing_subscriptions`,
and `auth.users` objects. The migration also revokes access for the standard
Supabase `anon`, `authenticated`, and `service_role` roles when they exist.

Stage 1A is schema foundation only: it inserts no Plan IDs or checkout rows,
adds no billing RPC, grants no runtime-role access to the new tables, and does
not wire application checkout or webhook behavior to them. It does not enable
Live Mode. Do not infer historical Plan IDs or populate the catalog without a
separately reviewed source of truth.

> **PRODUCTION SAFETY GATE:** Do **not** apply
> any Razorpay migration to production without separate, explicit approval.
> Merging a PR is not approval to run a migration. Do not run `supabase db push`
> against a production-linked project as part of merge or CI. Confirm the linked
> Supabase project/ref before any manual `db push` or SQL Editor use. The Stage
> 1C migration replaces SECURITY DEFINER functions and changes billing metadata;
> it must first be reviewed and tested on a disposable/non-production database.

### Apply to staging only

After staging prerequisites and the target project have been verified, the
repository’s normal migration command is:

```bash
supabase db push
```

This applies all pending migrations for the linked project, not just the
Razorpay Stage 1C file. Alternatively, apply all required files in timestamp
order using the Supabase Dashboard SQL Editor. Confirm the project is non-production before
either method. Production application requires the separate approval above.

### Verify after staging apply

```bash
npm run verify:live           # schema shape
npm run verify:live:policies  # RLS policies
```

Use credentials for the staging project. These checks need a real Supabase
connection and are intentionally excluded from CI; do not point them at
production without separate approval.

### Offline check

`npm run verify:db` applies every migration into an in-memory PGlite Postgres;
it does not connect to Supabase or apply production changes. The focused
`tests/db/razorpay-foundation.test.ts` checks the Stage 1A constraints, role ACL
metadata, preserved billing state, and inactive/no-seed catalog behavior;
`tests/db/razorpay-billing.test.ts` applies the full migration sequence including
Stage 1B/1C. PGlite is single-connection and does not prove real multi-connection
concurrency or all managed-Supabase role/ACL behavior; PR #100 provides the
separate disposable-PostgreSQL concurrency suite.

### Security model (already in place)

- `billing_subscriptions` has a **SELECT** policy for workspace members and
  **no** insert/update/delete policy — verified webhook-worker and checkout-verify
  processing are the only billing writers, via the service role and atomic RPCs.
- `billing_webhook_events` has **no** user policies at all.
- `INSERT/UPDATE/DELETE` are additionally revoked from `anon` and
  `authenticated` at the role level (defence in depth).
- `apply_razorpay_subscription_event` is `EXECUTE`-granted to `service_role`
  only, with a fixed `search_path` and no dynamic SQL.

So a client cannot forge a subscription status even with a valid session — the
write path is not reachable from the browser.

## 5. Webhook URL and events

### URL

```
https://<your-vercel-domain>/api/billing/webhook
```

For local testing, expose your dev server (e.g. `ngrok http 3000`) and register
the tunnel URL — Razorpay must reach it from the public internet.

The endpoint is **publicly reachable by design**: the Next.js middleware
(`proxy.ts` → `lib/supabase/middleware.ts`) only gates the `APP_PREFIXES` page
routes (`/settings`, `/dashboard`, …). `/api/billing/webhook` is not in that
list and is not in `RATE_LIMITED_PREFIXES`, so an unauthenticated Razorpay POST
passes straight through to the route. Authentication is the HMAC signature, not
a session.

### Register it

Dashboard (Test Mode) → Developers → Webhooks → Add New Webhook:

1. URL: the webhook URL above.
2. Secret: generate one, then put it in `RAZORPAY_WEBHOOK_SECRET` **exactly**.
3. Alert email: an address you read (Razorpay emails you when it disables a
   webhook after 24 h of failures).

### Events to enable

These are the events RoduCQ actually handles
(`lib/razorpay.ts` → `RAZORPAY_WEBHOOK_EVENTS`). Verified against Razorpay's
"Subscriptions Webhook Events" and "Payments Webhook Events" docs:

| Event | RoduCQ behaviour |
| --- | --- |
| `subscription.authenticated` | after provider re-fetch and binding checks, status → `active` only with verified paid-through evidence |
| `subscription.activated` | status → `active` + verified `paid_through` → Pro |
| `subscription.charged` | renewal: status → `active`, `paid_through` advances |
| `subscription.pending` | charge failed, Razorpay still retrying → Pro **off** |
| `subscription.halted` | status → `past_due`; Pro **off**, needs payment recovery |
| `subscription.cancelled` | status → `canceled`; Pro kept only until `paid_through` |
| `subscription.completed` | all invoices generated → `completed` → Free |
| `subscription.paused` / `subscription.resumed` | → `paused` / `active` |
| `subscription.updated` | accepted (idempotency ledger records it); no state change unless the payload carries a newer status |
| `payment.failed` | moves an **active** subscription to `pending`; can never create or revive one |
| `payment.captured` | after binding/provider verification, marks the subscription `active` and advances verified paid-through |

Anything not on the list is acknowledged with `200 { received: true, ignored: … }`
so Razorpay stops retrying, and nothing is written.

### Response contract

Razorpay requires **2xx within 5 seconds**; non-2xx triggers exponential-backoff
retries for 24 h, after which the webhook is **disabled** until you re-enable it.
RoduCQ therefore acknowledges a **verified queue insertion** with `200 { received: true }`; the separate cron worker (`POST /api/cron/webhooks`, authenticated by `CRON_SECRET`) claims and applies work asynchronously through the lease and atomic-apply RPCs. Duplicate body hashes are also acknowledged safely.

- returns `401` for a signature mismatch, `400` for malformed signed event data, and `413` for an oversized body;
- returns `500` for missing webhook configuration or a transient queue/database failure so Razorpay retries;
- the worker returns each leased item to an applied, ignored/rejected, or retryable/dead-letter state. Database event ordering, binding checks, and entitlement writes remain atomic.

### What the handler guarantees

1. HMAC-SHA256 over the **raw** body against `RAZORPAY_WEBHOOK_SECRET`, compared
   with `timingSafeEqual` (constant time), before JSON parsing or database access.
2. Secret unset returns `500`; a signature mismatch returns `401`; signed but
   malformed data or missing trusted `created_at` returns `400`.
3. `sha256(raw body)` uniquely keys durable queue insertion. The event header (or
   body hash fallback) is used by the atomic event ledger for idempotent apply.
4. The cron worker leases one item at a time with `SKIP LOCKED`, fetches the
   provider subscription using Test Mode credentials, and finalizes each result.
5. Ordering is enforced on Razorpay's own timestamp — a stale event cannot
   reactivate a cancelled subscription.
6. Tier/price/seat values come from the bound server-side Plan catalog, never
   from the payload. Subscription-id binding is authoritative; disagreeing
   notes hints are rejected.
7. `paid_through` comes from Razorpay's `current_end` in the signed payload or
   server-side `GET /subscriptions/{id}`. No code path invents a date.
8. No signature, secret, or raw payload is logged or returned.

## 6. Vercel configuration

There is no `vercel.json`; Vercel auto-detects the Next.js app. A Vercel project
**is** already connected to this repository — the `Vercel` status check on PR #45
passed, so preview deployments build cleanly with these changes. What is still
outstanding is the environment-variable configuration below (needs Dashboard or
CLI access).

Set env vars in Project → Settings → Environment Variables for **Production**,
**Preview** and **Development**:

| Variable | Production | Preview | Dev | Sensitive? |
| --- | --- | --- | --- | --- |
| `RAZORPAY_MODE` | `test` | `test` | `test` | no |
| `RAZORPAY_LIVE_MODE_ENABLED` | `false` | `false` | `false` | no |
| `RAZORPAY_KEY_ID` | `rzp_test_…` | ✓ | ✓ | no (public key) |
| `RAZORPAY_KEY_SECRET` | test secret | ✓ | ✓ | **yes** |
| `RAZORPAY_WEBHOOK_SECRET` | webhook secret | ✓ | ✓ | **yes** |
| `RAZORPAY_PLANS` | the JSON array | ✓ | ✓ | no |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✓ | no |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | ✓ | **yes** |
| `CRON_SECRET` | ✓ | ✓ | ✓ | **yes** |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | optional | optional | optional | no |

Do **not** mark `RAZORPAY_KEY_ID` or `RAZORPAY_PLANS` as sensitive-only if you
need them at build time; the billing surfaces that read them render on the
server per request, so plain variables are correct here.

Notes:

- Mark the secrets (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET`) **Sensitive** in Vercel so
  their values cannot be read back in the dashboard or logs.
- A **production deploy does not enable live payments.** `RAZORPAY_MODE=test` in
  Production is the intended state for this milestone, and Live Mode is refused
  by code regardless of what is set. See §11.
- Preview deployments can safely share the same Test Mode credentials.
- Register the webhook URL **per environment** — Production and Preview have
  different hostnames.

### Check the deployment

```bash
curl -i -X POST https://<your-domain>/api/billing/webhook \
  -H 'content-type: application/json' -H 'x-razorpay-signature: deadbeef' \
  --data '{"event":"subscription.activated"}'
```

Expected: **HTTP 401 `{"error":"Invalid signature."}`** — proof the endpoint is
reachable, not blocked by middleware, and enforcing signature verification.

A correctly signed, supported event is durably queued and acknowledged with
`200 {"received":true}`; its subscription state is applied asynchronously by
the authenticated `/api/cron/webhooks` worker.

## 7. Existing Pro checkout walkthrough

This section describes the existing Pro/Checkout.js surface. Stage 1C adds the
separate Starter/Team API at `/api/billing/checkout` but deliberately does not
wire public buttons or a modal; use the Test Mode runbook in §12 for that API.

Test payment methods in Razorpay Test Mode:

| Method | Input | Result |
| --- | --- | --- |
| Card (domestic Visa) | `4111 1111 1111 1111`, any future expiry, any CVV | mock page with **Success** / **Failure** buttons |
| Card (domestic Mastercard) | `5267 3181 8797 5449` | same |
| Card (RuPay) | `6527 6589 0000 1005` | same |
| UPI | `success@razorpay` | success |
| UPI | `failure@razorpay` | failure |
| Netbanking / wallet | any listed bank/wallet | mock page with Success / Failure |

Razorpay's own caveat: UPI *Intent* and *QR* flows need Live Mode; entering a
test UPI **id** at Checkout works in Test Mode.

### Steps

1. Sign in to RoduCQ as a workspace **owner** (members see no billing controls,
   and the server actions re-check the role).
2. Go to **Settings → Plan & billing**.
3. Confirm the **"Razorpay Test Mode"** indicator is showing. If it is not,
   billing is either unconfigured or misconfigured — see §10.
4. Pick a currency (the selector only appears when more than one plan is
   configured) and click **Upgrade to Pro — ₹1,499 INR**.
5. The server verifies the session, the owner role, the mode gate, the client
   key and the existing subscription state, then creates the Razorpay
   subscription and returns `{ subscriptionId, keyId, currency, amount }`.
6. Checkout.js opens against the test key. Complete payment with a method above.
7. Checkout.js POSTs its response to `/api/razorpay/verify`. That route
   (a) checks the HMAC over `payment_id|subscription_id`, (b) fetches the
   subscription from Razorpay, (c) confirms the workspace note and that the plan
   id is one of ours, then (d) writes through the same atomic function the
   webhook uses.
8. The toast reads *"Payment confirmed — your plan will update here shortly."*
   — not "you are on Pro", because the entitlement is computed from the
   database row, not from the browser.
9. The page reloads and the Plan card shows **Pro** with the billing amount,
   driven by `resolveEntitlement`.

### What never grants access

- Checkout.js `handler` firing.
- The `handler` response body.
- Any URL parameter or client-side state.

Only (a) a verified checkout **plus** a server-side subscription fetch, or (b) a
signature-verified webhook, writes billing state.

## 8. Subscription lifecycle verification

| Scenario | How to trigger | Expected in RoduCQ |
| --- | --- | --- |
| **A. New subscription** | §7 above | `subscription.activated` → status `active`, `paid_through` = `current_end`, Plan card shows Pro |
| **B. Renewal** | Wait for the next cycle, or shorten the cycle by creating the Plan with `--interval minute --period 5` | `subscription.charged` advances `paid_through`; access is continuous; a duplicate delivery creates no second ledger effect |
| **C. Payment failure** | Use `failure@razorpay` on a renewal | `subscription.pending` (or `halted` once retries are exhausted) → Pro **off**; the card shows *"Payment needs attention"* and the recovery note |
| **D. Cancellation** | Settings → Plan → **Cancel subscription** (cancels at cycle end) | `cancel_at_cycle_end=1` is sent; local status flips on the `subscription.cancelled` webhook; Pro is kept **until `paid_through`**, then Free |
| **E. Duplicate webhook** | Re-send the same event body from Dashboard → Webhooks → logs, or `curl` it twice | Second delivery → `200 { outcome: "duplicate" }`; no duplicate payment record; state unchanged |
| **F. Invalid webhook** | POST with a wrong `x-razorpay-signature` | `400 {"error":"Invalid signature."}`; **no** database change; a sanitised log line at most |

Grace-period / entitlement policy (unchanged by this milestone, in
`lib/billing/entitlements.ts`):

- `active` → Pro while `paid_through` is in the future, plus a **3-day** grace
  window (`RAZORPAY_ACTIVE_GRACE_MS`) for webhook lag.
- `active` with **no** `paid_through` → **Free** + flagged for operator
  reconciliation (fail closed; never assume an indefinite period).
- `active` stale beyond the grace window → Free + flagged.
- `canceled` → Pro only until `paid_through`.
- `pending` / `halted` / `paused` / `created` / `authenticated` / `completed` /
  `expired` → Free.

## 9. How RoduCQ decides Pro access

Single source of truth: `lib/billing/entitlements.ts` → `resolveEntitlement`.
Input is a `billing_subscriptions` row (absent row = Free). Browser claims,
Checkout.js success and URL params never enter that function.

Writes go through exactly one path —
`apply_razorpay_subscription_event` (SECURITY DEFINER, service role) — which does
idempotency claim, ordering, workspace binding, state change and ledger record in
**one transaction**.

## 10. Troubleshooting

**The "Razorpay Test Mode" indicator is missing.**
`isRazorpayTestModeActive()` requires all of: valid `RAZORPAY_KEY_ID` +
`RAZORPAY_KEY_SECRET` that pass the mode gate, a parseable non-empty
`RAZORPAY_PLANS`, and a matching (or unset) `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
Check each in turn — the indicator is deliberately conservative, so "missing"
means "this billing path is not coherent", not "cosmetic bug".

**"Billing is not configured yet — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."**
Those two variables are missing in the environment the request actually ran in.
On Vercel, confirm the variable exists for the *right* environment (Production vs
Preview) and that you redeployed after adding it.

**"RAZORPAY_MODE=live but RAZORPAY_KEY_ID is a test-mode key."** (or the reverse)
The declared mode and the key prefix disagree. Set both to the same mode. This is
intentional: a mismatch means two environments are half-configured.

**"Razorpay Live Mode is disabled in this build…"**
Someone set `RAZORPAY_MODE=live` with an `rzp_live_` key. This is the production
safety gate working. Use Test Mode credentials (§11 explains why this is not a
bug and how to change it deliberately).

**"RAZORPAY_MODE must be \"test\" (got …)."**
Typo in the variable. Only `test` is accepted (case-insensitive); unset also means
`test`.

**"NEXT_PUBLIC_RAZORPAY_KEY_ID does not match RAZORPAY_KEY_ID…"**
The two key ids differ. Make them identical, or delete
`NEXT_PUBLIC_RAZORPAY_KEY_ID` (recommended). Nothing is created at Razorpay
before this check, so there is no orphaned subscription to clean up.

**"Payment signature verification failed."**
`RAZORPAY_KEY_SECRET` does not match the key the checkout opened with — usually a
live secret against a test key, or a rotated secret that was not updated in
Vercel.

**Webhook returns 400 "Invalid signature."**
`RAZORPAY_WEBHOOK_SECRET` is not byte-identical to the Dashboard webhook secret.
Also confirm the signature is HMAC over the **raw** body (re-serialising the JSON
changes the bytes and breaks the HMAC).

**Webhook returns 500 "Billing webhooks are not configured…"**
`RAZORPAY_WEBHOOK_SECRET` is unset in that environment.

**Webhook returns 500 "Webhook handling failed."**
A database error. Check the server log for the `[razorpay] …` line — it carries
the database message and nothing sensitive. The transaction rolled back, so
Razorpay's retry will be processed cleanly once the cause is fixed. If this
persists for 24 h Razorpay disables the webhook; re-enable it in the Dashboard
after fixing.

**Webhook returns 500 "Webhook handling failed." only for some events.**
Most likely the paid-through verification fetch failed (the event granted access
but the payload had no `current_end`). Confirm `RAZORPAY_KEY_ID`/`SECRET` are set
and outbound calls to `api.razorpay.com` are allowed.

**Checkout says "Your workspace already has a Razorpay subscription that is still
in progress".**
Intentional. A workspace with an `active`/`pending`/`halted`/`paused` subscription
cannot start a second one (that would orphan a paid subscription). Reconcile the
existing one first.

**"Could not load Razorpay Checkout — check your connection."**
`checkout.razorpay.com` is blocked (CSP, ad blocker, corporate proxy).

**The Plan card still says Free right after a successful payment.**
Correct until the entitlement actually changes. Confirm a `billing_subscriptions`
row exists with `status='active'` and a future `paid_through`. If `paid_through`
is NULL, Pro is denied on purpose and the row is flagged for reconciliation —
see §9.

**Plans were created but checkout fails with a plan error.**
`RAZORPAY_PLANS` contains an id from a different mode (test ids do not exist on a
live key) or a stale id. Re-run `npm run billing:plans -- --list` and compare.

## 11. Production activation safety

Production payments are **DISABLED**, and this is enforced in code, not in
configuration:

```ts
// lib/razorpay.ts
export const ALLOWED_RAZORPAY_MODES: readonly RazorpayMode[] = ["test"];
```

- `getRazorpayServerConfig()` is the **single** credential chokepoint for
  subscription creation, checkout verification, webhook fetches and cancellation.
  It refuses anything not in `ALLOWED_RAZORPAY_MODES`.
- **There is no environment variable, feature flag or runtime switch that enables
  Live Mode.** A regression test asserts no `process.env.*LIVE*` /
  `*PRODUCTION*` / `*ENABLE*` read exists in `lib/razorpay.ts`. Enabling Live
  Mode requires editing that constant — a code change in a reviewed milestone.
- **A Vercel production deploy cannot turn on real charges.** Setting
  `rzp_live_` credentials in Production makes billing fail closed with a clear
  error; it does not start charging.
- The unset default is `test`. There is no path where a missing variable yields
  Live Mode.
- `scripts/create-razorpay-plans.mjs` applies the same rule and refuses
  `rzp_live_` keys, so plans cannot be created against a live account by
  accident either.

Other safeguards preserved from the existing architecture:

| Risk | Safeguard |
| --- | --- |
| Unverified subscription activation | Activation requires HMAC **and** a server-side subscription fetch, or a verified webhook |
| Client-side status manipulation | No user insert/update/delete policy on `billing_subscriptions`; writes are service-role only via a SECURITY DEFINER function |
| Unsigned webhook processing | Raw-body HMAC, constant-time compare, reject before any write |
| Duplicate payment records | Unique index on the event key **and** the body hash; duplicates return `200 duplicate` |
| Stale event reactivating a cancelled subscription | Ordering enforced on Razorpay's timestamp → `stale` |
| Cross-workspace billing | Subscription-id binding is authoritative; disagreement → `rejected` |
| Double-billing a live legacy plan | Legacy Stripe rows block takeover unless ended |
| Leaked secrets | Service-role and webhook secrets server-only; no secrets in logs or error responses |

### To enable Live Mode later (deliberately, in a future milestone)

1. Complete Test Mode verification (§12) end to end.
2. Change `ALLOWED_RAZORPAY_MODES` in `lib/razorpay.ts` in a reviewed PR, and
   update the tests that assert Live Mode is refused — the failing tests are the
   point: they force the decision to be explicit.
3. Create **live** Razorpay Plans (§3 against the live key) and update
   `RAZORPAY_PLANS`.
4. Register a **separate** live webhook with its own signing secret.
5. Set live credentials + `RAZORPAY_MODE=live` in Vercel.
6. Re-run the §8 lifecycle matrix against live credentials before announcing.

## 12. Verification results and Test Mode E2E

Legend: **PASS** verified in this code milestone · **BLOCKED** needs external
credentials/access or a separate checkout surface · **NOT TESTED** not run.

| # | Item | Status | Evidence / what is needed |
| --- | --- | --- | --- |
| 1 | Stage 1 prerequisite PRs | **PASS** | PRs #96, #97, #98, #99 and #100 are merged to `main`; see §4. |
| 2 | Test Mode checkout/webhook implementation | **PASS** (automated) | Stage 1C reservation → create authorization → provider create → success/failure recording, raw-body signature queueing, and leased worker are covered by focused tests. |
| 3 | Razorpay schema migrations | **PASS** (offline) | `npm run verify:db` applies all 35 migrations, including Stage 1C, to disposable PGlite. This is not a Supabase action. |
| 4 | Staging migration application | **NOT TESTED** | No Supabase project was connected or migrated. Verify the target is non-production and obtain separate approval before any real apply. |
| 5 | Live/Test Mode credentials and Test Plans | **BLOCKED** | No external Razorpay API was contacted. Supply Test Mode credentials and activate reviewed Test Mode Plan IDs in the Stage 1A catalog; no Plan IDs are guessed or seeded. |
| 6 | Webhook registration and Test Mode round-trip | **BLOCKED** | Requires Razorpay Dashboard access, Test Mode webhook secret, and deployed staging/preview configuration (§5–6). |
| 7 | Customer-facing checkout/payment | **BLOCKED** | This PR deliberately does not wire public UI buttons or a Checkout.js modal. The authenticated API creates a provider subscription; a separately reviewed private Test Mode harness/UI is needed to complete a customer payment. |
| 8 | Worker/cron execution | **PASS** (automated), **BLOCKED** (external) | Unit tests cover claim/process/finalize outcomes. Live scheduling requires a protected `/api/cron/webhooks` call with `CRON_SECRET`. |
| 9 | Live billing / production migrations | **DISABLED / NOT RUN** | `ALLOWED_RAZORPAY_MODES` remains Test-only; `RAZORPAY_LIVE_MODE_ENABLED` must remain `false`. No production Supabase migration or Live Razorpay API call was made. |

### Test Mode E2E runbook (staging only; not executed here)

1. **Select a disposable Supabase staging project.** Confirm its project ref
   independently before any SQL or migration command. Apply migrations through
   `20261104120000_razorpay_stage1c_runtime.sql` in timestamp order only after
   staging prerequisites are met. Never use a production-linked project for
   this runbook.
2. Create/verify Razorpay **Test Mode** Plans using the reviewed catalog; do not
   copy Live Plan IDs. Keep `RAZORPAY_MODE=test` and
   `RAZORPAY_LIVE_MODE_ENABLED=false`, set only `rzp_test_…` credentials,
   `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and the matching
   active Stage 1A `razorpay_plan_catalog` rows for Starter/Team. Configure
   `RAZORPAY_PLANS` separately only for the existing Pro checkout surface.
3. Register `https://<staging-host>/api/billing/webhook` in the Razorpay Test
   Mode Dashboard with the same webhook secret. Enable the supported events in
   §5, including `payment.captured`. Configure the protected cron call to
   `POST /api/cron/webhooks` with `Authorization: Bearer $CRON_SECRET`.
4. Sign in as a workspace owner and POST
   `{"tier":"starter","request_key":"<fresh UUID>"}` or
   `{"tier":"team","request_key":"<fresh UUID>"}` to
   `/api/billing/checkout` using that authenticated session. Expect HTTP 201
   with an intent and Test Mode subscription ID. `studio` and other tiers must
   be rejected; a member/viewer must not create a subscription.
5. Inspect the subscription in the Razorpay **Test Mode** Dashboard and, using
   a separately reviewed private Test Mode customer-payment harness (not added
   by this PR), complete a test payment. Confirm Razorpay sends the signed
   event to `/api/billing/webhook`, which responds `{ "received": true }` only
   after durable queue ingestion.
6. Invoke the protected cron endpoint. Confirm the worker claims the event,
   verifies the provider subscription, and the bound workspace row records the
   catalog-derived `plan_name`/`seat_limit`, status, and verified
   `paid_through`. Exercise renewal, `payment.failed`, `subscription.halted`,
   `subscription.cancelled`, duplicate delivery, and stale delivery; confirm
   `past_due`/`canceled` remain non-entitled or paid-through-limited as expected.
7. Repeat only with Test Mode keys. Do not set Live Mode true, use Live keys,
   apply migrations to production, or treat a mocked test as a payment E2E.

### Automated results for this PR

The four required gates are recorded after the final local run below. They do
not establish Razorpay, Supabase staging, or customer-payment E2E readiness.

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | **PASS** |
| `npm run lint` | **PASS** |
| `npm test` | **PASS** — 1,493 tests, 0 failures (1,480 standard + 13 server-only adapter/worker) |
| `npm run build` | **PASS** |
| `npm run verify:db` | **PASS** — 35 migrations apply in PGlite; no external database touched |
