# Razorpay Security Hardening — Architecture, Policy and Operator Runbook

**Status:** Implemented on branch `arena/47215b0d-roducq`, opened as a follow-up PR (see §11).
**Supersedes:** the "dedup after billing update" fix described in `docs/razorpay-premerge-security-review.md`. That fix narrowed the window but did not make processing atomic. The current design replaces it (§3).
**Production:** https://roducq.nanexi.com — **no deploy, no migration applied, no live billing enabled by this work.**

Labels used throughout:

- **VERIFIED**: proven by an automated test or command in this repository, run in this session.
- **NOT VERIFIED**: not proven here. Stated as a limitation, not a claim.
- **REQUIRES OPERATOR ACTION**: a human step outside the codebase is required before production billing can be called ready.

---

## 0. Repository safety and baseline (VERIFIED)

| Check | Result |
|---|---|
| `origin/main` at start | `1093a5ad0ff3ded41a4d476588cae1da6b33dbab` |
| PR #43 | **MERGED** 2026-10-16T14:22:26Z (title: "fix: Razorpay security hardening — post-merge audit of PR #42"). A merged PR cannot be updated, so this work ships as a **follow-up PR**. |
| Push access to `gunal-official/roducq` | Confirmed (`push: true` via `gh api`). |
| Branch | `arena/47215b0d-roducq` (session-bound). |
| Baseline `npm test` | 909 pass, 0 fail (before this change). |
| Baseline `npm run lint`, `npx tsc --noEmit`, `npm run build` | Clean. |
| Baseline `npm run verify:db` | All database checks passed. |
| Baseline `npm run verify:pdf` | 14 documents, 0 findings. |
| Baseline `npm run verify:responsive` | **NOT VERIFIED**: Chromium cannot be downloaded in this sandbox (the Playwright CDN host is not on the outbound allowlist). See §10. |

Nothing was force-pushed. No unrelated work was overwritten. The repository's existing `scope-detection.patch` (an empty file) is untouched.

---

## 1. Current architecture (documented before changes)

```
Browser (Settings → Plan)
  │  Checkout.js (client): payment_id, subscription_id, signature
  │  ── browser success is NOT trusted ──
  ▼
POST /api/razorpay/verify  (owner-only, getWorkspaceContext)
  │  HMAC(payment_id|subscription_id) with key secret  [timing-safe]
  │  GET /subscriptions/:id  (server-side, Razorpay API)
  │  check notes.workspace_id == requesting workspace
  │  check plan_id ∈ RAZORPAY_PLANS (server env)
  ▼
billing_subscriptions  (one row per workspace; service-role writes only)

Razorpay servers
  │  POST /api/razorpay/webhook   (X-Razorpay-Signature over RAW body)
  ▼
billing_webhook_events (ledger)   billing_subscriptions (state)

Entitlement readers
  settings/page.tsx  → plan badge, upgrade/manage buttons
  settings/actions.ts → checkout gate (owner-only), cancel (owner-only, cycle end)
```

Findings in the **pre-change** code (all addressed in this change):

| # | Finding | Severity | Where | Status |
|---|---|---|---|---|
| F1 | Settings filtered billing with `.eq("provider","razorpay")`, so **legacy Stripe rows were invisible**: a paying legacy subscriber was silently shown as Free. This is a silent revocation. | HIGH | `app/(app)/settings/page.tsx` | Fixed (§5). |
| F2 | Settings granted Pro on `status === 'active'` alone, with no paid-through date. A stale active row grants indefinite Pro. | HIGH | `app/(app)/settings/page.tsx` | Fixed (§5). |
| F3 | Webhook wrote billing state and the dedup ledger as **separate** statements. A crash between them, or a concurrent duplicate, could double-apply or leave inconsistent state. | HIGH | `app/api/razorpay/webhook/route.ts` | Fixed (§3). |
| F4 | Webhook fell back to **local arrival time** when `created_at` was missing, which breaks ordering. | MEDIUM | webhook route | Fixed: missing trusted time is rejected (§4). |
| F5 | Webhook currency/amount were copied from the existing row, not from the server plan config. | LOW | webhook route | Fixed: taken from `RAZORPAY_PLANS` (§3). |
| F6 | Verify route used `upsert` on the workspace row. A second, unrelated subscription could **overwrite a live subscription** on file. | MEDIUM | verify route | Fixed: superseded unless the existing one has ended (§4). |
| F7 | A legacy Stripe `active` row did not block a Razorpay checkout. A customer could pay twice (Stripe and Razorpay). | HIGH (financial) | checkout / webhook | Fixed: blocked in both the UI gate and the database (§4, §5). |
| F8 | Checkout could create a Razorpay subscription that the database would then refuse to apply (an orphaned paid subscription). | MEDIUM | `createRazorpayCheckout` | Fixed: the same rule runs before the Razorpay call (§5). |
| F9 | `billing_subscriptions` had no paid-through column. Nothing in the schema could verify a legacy paid period. | HIGH (design) | schema | Fixed additively (§2). The date is never invented. |

No browser-supplied plan, price, or status is trusted in any path. This was already true before the change and remains true. The new tests pin it (§8).

---

## 2. Schema changes (additive)

File: `supabase/migrations/20261016120000_razorpay_atomic_ledger_entitlements.sql`

| Object | Change | Why |
|---|---|---|
| `billing_subscriptions.paid_through timestamptz` | new, nullable | The verified end of the paid period. |
| `billing_subscriptions.paid_through_source` | new, nullable, CHECK in (`razorpay_webhook`, `razorpay_api`, `stripe_reconciled`) | Audit trail of where a date came from. |
| `billing_webhook_events.body_sha256` | new, CHECK 64-hex | Second idempotency key. |
| `billing_webhook_events.razorpay_event_id`, `workspace_id`, `razorpay_subscription_id`, `event_created_at` | new, nullable | Audit context. `workspace_id` is a FK with `on delete set null`. |
| `billing_webhook_events.outcome` | new, NOT NULL, default `legacy`, CHECK on the outcome set | Records `applied / duplicate / stale / superseded / rejected / unknown_workspace / ignored`. |
| Backfill | `body_sha256 = event_key` for PR #42 rows whose key is a 64-hex hash | Lets legacy events be recognised as duplicates. |
| Unique index `billing_webhook_events_body_sha256_key` | partial, `where body_sha256 is not null` | One raw body = one event. |
| Function `apply_razorpay_subscription_event(...)` | new, SECURITY DEFINER, `search_path = public, pg_temp` | The only write path for Razorpay state (§3). |
| Grants | `REVOKE` from PUBLIC / anon / authenticated; `GRANT EXECUTE` to `service_role` only | Browser clients cannot call it. |
| Table privileges | `anon`: no access. `authenticated`: no insert/update/delete on `billing_subscriptions`, no access to the ledger. | Defence in depth. RLS already blocked writes. |

**Not changed:** `stripe_customer_id`, `stripe_subscription_id`, every existing row, every `billing_subscriptions` status CHECK value, and all of `billing_webhook_events`'s existing rows. Nothing is dropped or deleted.

---

## 3. Atomic webhook design (VERIFIED: 31 real-Postgres tests)

**Problem.** The old handler ran up to three independent statements (read, upsert, ledger insert). Any failure between them, or two deliveries racing, could leave the workspace and the ledger disagreeing.

**Design.** The entire decision is one SQL function call, which is one transaction:

1. **Validate inputs** (status allowlist, ID formats, currency, amount, hash format, key length, trusted timestamp present). Any violation raises, so nothing is written.
2. **Claim the event**: `INSERT INTO billing_webhook_events ... ON CONFLICT DO NOTHING`. A conflict on the event key *or* the body hash means **duplicate**: return, change nothing. A concurrent duplicate blocks on the unique index until the first transaction commits or rolls back, then sees the conflict.
3. **Resolve the workspace.** The subscription ID is authoritative once bound. A workspace given in the notes must agree with the binding, or the event is `rejected`.
4. **Lock** the workspace's billing row (`SELECT ... FOR UPDATE`).
5. **Apply the ordering and takeover rules** (§4).
6. **Record the outcome** on the ledger row.
7. **Commit.** Any exception rolls back steps 2–6 together, including the ledger claim. So Razorpay's retry starts from a clean state.

The route (`app/api/razorpay/webhook/route.ts`) is a thin shell. The logic lives in `lib/billing/webhook-processor.ts`, which is dependency-injected and unit-tested with mocks, and `lib/billing/apply-event.ts`, the adapter to the RPC.

**Response codes.** `200` for every outcome that is final (applied, duplicate, stale, superseded, rejected, ignored), so Razorpay stops retrying. `500` for a database error or a paid-through date that cannot be verified, so Razorpay retries. `400` for bad signatures or malformed payloads. Razorpay retries on non-2xx responses.

**Event key.** `X-Razorpay-Event-Id` when present and well-formed; otherwise `sha256(raw body)`. The body hash is also stored and unique, so a redelivery is caught either way.

**Logging.** Only sanitised database error text is logged. Signatures, secrets, keys, customer IDs and payloads are not logged. Tests assert this on the failure paths.

---

## 4. Event-ordering and conflict-resolution policy

**Clock.** The ordering key is Razorpay's `created_at` (unix seconds) for webhooks. For checkout verification, which is a fresh read of Razorpay's state, the database clock is used. Local request arrival time is never the ordering source. A webhook without `created_at` is rejected with `400`.

**Rules, in order:**

| Situation | Outcome | Effect |
|---|---|---|
| Event key or body hash already in the ledger | `duplicate` | No change. |
| Subscription bound to a different workspace than the notes name | `rejected` | No change. Recorded. |
| Unknown subscription and unknown or missing workspace | `unknown_workspace` | No change. Recorded. |
| Same subscription, event older than `last_billing_event_at` | `stale` | No change. This is the out-of-order rule. |
| `payment.failed` and the subscription is not `active` | `ignored` | No change. A failure can only downgrade an active subscription. |
| `payment.failed` for a different subscription | `ignored` | Failures never take over a workspace. |
| Same subscription, newer event | `applied` | State, paid-through, currency and amount updated (`coalesce` keeps verified values when a payload omits them). |
| Different subscription, existing Razorpay row that is **live** (`active`, `pending`, `halted`, `paused`) | `superseded` | Current subscription kept. Checkout returns `409`. |
| Different subscription, existing Razorpay row that has **ended or was never paid** (`created`, `authenticated`, `canceled`, `completed`, `expired`) | `applied` (takeover) | New subscription becomes the workspace's subscription, subject to the ordering check. |
| Different subscription, existing **legacy Stripe** row that is `active` or whose verified paid period is still running | `superseded` | Never double-bill a live Stripe plan. |
| Different subscription, legacy Stripe row that is not active and has no running paid period | `applied` (takeover) | Permitted. |
| No row, `payment.failed` | `ignored` | No row is created or revived. |
| No row, other event, valid workspace | `applied` (insert) | Created as `provider='razorpay'`. |

**Ties.** An event with the same `created_at` second as the stored one is applied. Only a strictly older event is stale. Within one second, Razorpay's ordering is ambiguous. The stored state is always the one from the most recent applied event.

### Razorpay state interpretation

| Razorpay status | Stored as | Grants Pro? | Notes |
|---|---|---|---|
| `active` | `active` | Yes, while `paid_through` is in the future, or within a **3-day grace** window after it (renewal webhook lag). | Stale beyond grace → Free and flagged for reconciliation. Missing date → Free (fail closed). |
| `cancelled` / `canceled` | `canceled` | Yes, only until a `paid_through` in the future. | Razorpay's `current_end` is the paid-through date, so the user keeps what they paid for. |
| `pending` | `pending` | **No** | A payment failed and Razorpay is still retrying. This is a product choice: access is off during retries, and `payment.failed` moves an active subscription here. Decision to confirm (§9). |
| `halted` | `halted` | No | Retries exhausted. |
| `paused` | `paused` | No | |
| `created`, `authenticated` | same | No | Checkout started, not yet paid. |
| `completed`, `expired` | same | No | Term ended. |

**Paid-through date.** Taken from `current_end` in the webhook payload. If it is absent for a state that grants or preserves access (`active` or `canceled`), the server fetches the subscription from Razorpay's API. If that fetch fails, the handler returns `500` so Razorpay retries, and no state is written. A guessed date is never used.

---

## 5. Legacy Stripe entitlement policy

**Facts found.** The only Stripe-era data is in `billing_subscriptions`: `stripe_customer_id`, `stripe_subscription_id`, `status`, `currency`, `amount`, `updated_at`. **The schema has no Stripe period-end column.** No code path records a legacy paid-through date, so the true paid period of any legacy subscriber is unknown to the application.

**Policy** (`lib/billing/entitlements.ts`, single source for the settings page, the checkout gate and the tests):

| Legacy row | Access | Flag |
|---|---|---|
| `active`, operator-verified `paid_through` in the future | **Pro** until that date | none |
| `active`, `paid_through` in the past | Free | reconciliation |
| `active`, no `paid_through` | **Free**, unless the operator bridge `LEGACY_STRIPE_ACCESS_UNTIL` is set and has not passed | reconciliation |
| `canceled`, verified `paid_through` in the future | **Pro** until that date | none |
| `canceled`, `paid_through` in the past or absent | Free | reconciliation if absent |

**The bridge.** `LEGACY_STRIPE_ACCESS_UNTIL=YYYY-MM-DD` keeps unverified legacy *active* subscribers on Pro until that date. It is an explicit operator decision and is bounded: it cannot extend itself, it does not apply to canceled rows, and a verified date always takes precedence. It is never set by code.

**Revocation safety.** A paying legacy customer is never silently revoked. Where access changes, the owner sees a notice (`legacyBillingNotice`) that says what is known, and that nothing has been cancelled or charged. Rows without a verified date show "must be reconciled before Pro access can be confirmed". Checkout and manage-billing buttons are hidden for these rows, so a legacy customer cannot be double-billed through the UI.

**Double-billing guard.** A live legacy subscription, including an unverified active one, blocks a new Razorpay checkout in both places: the UI gate (`canStartNewRazorpaySubscription`) and the database takeover rule. The database rule is authoritative.

**What the code cannot know.** Whether a given legacy Stripe subscription is still being charged in Stripe. That can only be established from the Stripe dashboard (§9).

### Operator reconciliation for legacy rows

REQUIRES OPERATOR ACTION. Run the read-only query first, against a **backup or read replica**:

```sql
select workspace_id, provider, status, stripe_customer_id, stripe_subscription_id,
       currency, amount, paid_through, updated_at
  from public.billing_subscriptions
 where provider = 'stripe'
 order by status, updated_at;
```

For each row, using the Stripe dashboard or an export (never guessed):

1. Confirm whether the subscription is still live in Stripe and its current period end. Stripe calls this `current_period_end`.
2. If it is live and paid, set `paid_through` to that instant, `paid_through_source = 'stripe_reconciled'`, and keep `status` as Stripe reports it.
3. If it has ended, set `status = 'canceled'` (or keep it) and set `paid_through` to the real end, or leave it null if the period has clearly ended. Record the decision outside the database.
4. If Stripe still charges and the customer has no verified period, **do not** guess. Contact the customer, then decide with the business owner. A bridge date via `LEGACY_STRIPE_ACCESS_UNTIL` is the only interim option.

Example template (do not run as-is; replace the placeholders with values from Stripe):

```sql
update public.billing_subscriptions
   set paid_through = '<ISO-8601 instant from Stripe>',
       paid_through_source = 'stripe_reconciled'
 where workspace_id = '<workspace uuid>'
   and provider = 'stripe'
   and stripe_subscription_id = '<stripe subscription id>';
```

Keep a written record of each change: who, when, and the Stripe evidence.

---

## 6. Migration steps

REQUIRES OPERATOR ACTION. Nothing in this change runs against production.

1. **Backup.** Take a Supabase backup or point-in-time snapshot. Export `billing_subscriptions` and `billing_webhook_events` as CSV as well.
2. **Confirm state.** Check whether `20261016000000_razorpay_billing.sql` has already been applied (`provider` and `razorpay_subscription_id` columns exist). If not, apply it first.
3. **Apply `20261016120000_razorpay_atomic_ledger_entitlements.sql`** via the Supabase SQL Editor or `supabase db push`. It is additive and idempotent: the backfill and the index are guarded, the columns use `if not exists`, and the function uses `create or replace`.
4. **Verify the migration** (read-only):
   ```sql
   select has_function_privilege('service_role', 'public.apply_razorpay_subscription_event(text,text,timestamptz,text,uuid,text,text,timestamptz,text,text,numeric,boolean,text,text)', 'EXECUTE') as service_ok,
          has_function_privilege('authenticated', 'public.apply_razorpay_subscription_event(text,text,timestamptz,text,uuid,text,text,timestamptz,text,text,numeric,boolean,text,text)', 'EXECUTE') as auth_ok,
          has_function_privilege('anon', 'public.apply_razorpay_subscription_event(text,text,timestamptz,text,uuid,text,text,timestamptz,text,text,numeric,boolean,text,text)', 'EXECUTE') as anon_ok;
   ```
   Expected: `service_ok = true`, `auth_ok = false`, `anon_ok = false`.
5. **Reconcile legacy rows** (§5) before enabling any legacy-facing behaviour change.
6. **Set `LEGACY_STRIPE_ACCESS_UNTIL`** only if the business has decided on a bridge date. Otherwise leave it unset.
7. **Deploy the application code** (a separate, explicitly authorised step).
8. **Run the Razorpay Test Mode checklist** (§9) before any live key is used.

**Compatibility.** The new code reads the new columns. Rows without `paid_through` and with `provider='razorpay'` therefore fail closed for `active` (see §4). The first Razorpay webhook or verification writes the date, so a deployment that precedes a Test Mode run is safe for new subscribers as long as Test Mode confirms the date arrives.

**Rollback.**

- **Code.** Redeploy the previous build. This restores the old `provider='razorpay'` filter, which hides legacy Stripe rows again. **Only roll back code if legacy rows have first been reconciled, or the owner has accepted a silent revocation.** Prefer a fix-forward.
- **Database.** Leave the additive columns and the function in place. They are harmless to the previous build. If a full rollback is required: export `paid_through` and `paid_through_source` first, then `drop function public.apply_razorpay_subscription_event(...)`, then drop the index and columns. Do not drop the legacy Stripe columns or the ledger rows.
- **Data.** Never delete `billing_webhook_events`. It is the audit trail for every Razorpay event.

---

## 7. Security permissions

| Object | anon | authenticated | service_role | Notes |
|---|---|---|---|---|
| `apply_razorpay_subscription_event` | none | none | EXECUTE | SECURITY DEFINER, pinned `search_path`, no dynamic SQL, every input validated. VERIFIED on PGlite with simulated roles. |
| `billing_subscriptions` | none | SELECT via RLS (owner or member of the workspace); no INSERT/UPDATE/DELETE | full (bypasses RLS) | Writes only from server routes behind verified signatures or owner checks. |
| `billing_webhook_events` | none | none | full | Ledger. Never exposed to browsers. |

Other controls (unchanged, re-verified by tests):

- HMAC-SHA256 over the **raw** request body for webhooks; HMAC over `payment_id|subscription_id` for checkout. Both compare in constant time (`timingSafeEqual`).
- Plan IDs and amounts come from `RAZORPAY_PLANS` only.
- Only owners may start checkout, verify, or cancel.
- Cancellation is at cycle end.
- Checkout is refused before Razorpay is called if the database would refuse the takeover.

---

## 8. Regression tests (VERIFIED unless marked)

| Brief requirement | Test (file) | Type |
|---|---|---|
| Valid Razorpay subscription | `tests/db/razorpay-billing.test.ts`, `tests/lib/billing-webhook.test.ts` | real Postgres + mocked processor |
| Invalid subscription signature | `billing-webhook.test.ts`: invalid, tampered, missing, no-secret | mocked |
| Cross-workspace subscription | `razorpay-billing.test.ts`: cross-workspace; `billing-webhook.test.ts`: rejected; checkout: notes mismatch → 403 | real + mocked |
| Duplicate webhook | `razorpay-billing.test.ts`: same key; same body, different key | real Postgres |
| Concurrent duplicate webhook | `billing-webhook.test.ts`: five concurrent deliveries, exactly one `applied` | **mocked serialisation only**. See below. |
| Out-of-order webhook | `razorpay-billing.test.ts`; `billing-webhook.test.ts` | real + mocked |
| Partial database failure | `razorpay-billing.test.ts`: fault injected after the ledger claim, **rolled back** | real Postgres |
| Event ledger failure | `razorpay-billing.test.ts`: invalid key raises; `billing-webhook.test.ts`: ledger error → 500, no ledger row, retry succeeds | real + mocked |
| Failed payment after recovery | `razorpay-billing.test.ts`; `billing-webhook.test.ts` | real + mocked |
| Legacy Stripe subscription still paid | `tests/lib/billing-entitlements.test.ts` (verified period, bridge) | unit |
| Legacy Stripe subscription expired | `billing-entitlements.test.ts` | unit |
| Legacy cancellation with remaining paid period | `billing-entitlements.test.ts` | unit |
| Stale legacy active record | `billing-entitlements.test.ts` | unit |
| Missing paid-through date | `billing-entitlements.test.ts` (Razorpay and legacy), `billing-webhook.test.ts` (fetch used; fetch failure → 500) | unit + mocked |
| Unauthorized entitlement access | `billing-webhook.test.ts`: non-owner verify → 403; `razorpay-billing.test.ts`: anon/authenticated cannot EXECUTE or write | mocked + real |

**Concurrency is only partly verified.** PGlite has one connection, so the database test cannot create two competing transactions. The concurrent-duplicate test proves the *application* logic with a serialised fake. The database's row-lock and unique-index behaviour under true concurrency is **NOT VERIFIED** in this environment. It requires a multi-connection Postgres (for example, a Supabase branch database) and is listed under §9.

Existing source-level guard tests (`tests/lib/razorpay-security.test.ts`, `tests/lib/razorpay.test.ts`) were **updated, not weakened**. They now point at the new modules and assert the atomic design. The old assertions (dedup after update; `provider='razorpay'` filter) encoded the behaviour this change removes.

No test contacts live Razorpay or live Stripe. All Razorpay calls are injected stubs.

---

## 9. Verification results

Results from this session (`arena/47215b0d-roducq`):

| Command | Result |
|---|---|
| `npm test` | **1009 pass, 0 fail** (baseline 909). New: 31 real-Postgres tests, 67 unit and mocked tests, plus updated guard tests. |
| `npm run lint` | Clean. |
| `npx tsc --noEmit` | Clean. |
| `npm run build` | Compiled successfully. |
| `npm run verify:db` | All database checks passed (the new migration applies cleanly in order). |
| `npm run verify:pdf` | Passed (14 documents, 0 findings). |
| `npm run verify:responsive` | **NOT VERIFIED.** Chromium not installable: `Download failure` from the Playwright CDN, which is outside the sandbox allowlist. Exact error: `Failed to download Chrome for Testing 153.0.8010.12 (playwright chromium v1243)`. |

### NOT VERIFIED: requires Razorpay Test Mode and a real Supabase project

The brief says production billing must not be declared ready until these pass. **None has been run.** Do not treat production billing as ready until they have.

- [ ] Razorpay **Test Mode** checkout completes end-to-end with a test card or UPI.
- [ ] Webhook delivery reaches `/api/razorpay/webhook` with a valid signature, and the response is `200 outcome=applied`.
- [ ] `X-Razorpay-Event-Id` is present on real deliveries (it is documented by Razorpay, but not observed here).
- [ ] `current_end` is present on `subscription.activated` and `subscription.charged` in Test Mode payloads.
- [ ] Renewal, `payment.failed` → `pending` → recovery, `halted`, `cancelled` at cycle end, and `completed` each produce the state in §4.
- [ ] Duplicate and concurrent redelivery (Razorpay's "resend") produce one state change.
- [ ] Two real database connections racing the same event produce one `applied` (§8 caveat).
- [ ] `has_function_privilege` returns the §6 expected values on the real project.
- [ ] `verify:responsive` passes in a machine with Chromium.

---

## 10. Operator actions

REQUIRES OPERATOR ACTION, in this order:

1. **Decide the legacy Stripe policy.** Confirm whether any `provider='stripe'` rows are live in Stripe, and how the business wants to treat unverified active rows (§5). Set `LEGACY_STRIPE_ACCESS_UNTIL` only if a bridge date is chosen.
2. **Stop legacy double-billing risk.** In the Stripe dashboard, confirm that no subscription is charging a workspace that will also subscribe through Razorpay. Cancel any that are live, after agreeing with the customer.
3. **Reconcile legacy rows** (§5) against a backup, and record the evidence.
4. **Take a backup** and apply `20261016120000_razorpay_atomic_ledger_entitlements.sql` (§6), after `20261016000000_razorpay_billing.sql` if that has not been applied.
5. **Run the §6 privilege check.**
6. **Razorpay Dashboard hygiene.** Cancel any abandoned `created` or `authenticated` subscriptions. A late payment on one of them would be `superseded`, which means the customer pays for nothing. Halted subscriptions must be cancelled in Razorpay before the customer can subscribe again: the database refuses to replace a `halted` subscription, by design.
7. **Confirm the webhook secret** and the webhook URL in Razorpay Test Mode. Confirm that `RAZORPAY_PLANS` in Test Mode matches the Test plan amounts.
8. **Run the §9 Test Mode checklist.** Only then consider live keys. Live billing needs explicit business authorisation. It is not enabled by this change.
9. **Optional but recommended:** schedule a periodic read-only check that lists `active` rows with `paid_through` older than the grace window. Those are the stale-active records §4 refuses to honour.

---

## 11. Delivery

- Branch: `arena/47215b0d-roducq`. PR #43 is merged, so this is a **follow-up PR** into `main`, titled `fix: Harden Razorpay webhooks and legacy entitlements`.
- Not merged automatically. Not deployed. Migrations not applied to any environment.
- Commit SHA and PR URL: recorded in the final message for this session.

---

## 12. Remaining risks

| Risk | Severity | Mitigation / status |
|---|---|---|
| True multi-connection concurrency is not exercised against Postgres here | MEDIUM | §8 caveat. Confirm on a real branch database (§9). |
| Legacy Stripe subscriptions may still be live outside the database | HIGH (financial) | Operator action 2 (§10). The code cannot detect this. |
| Legacy rows lack a verified paid-through date | HIGH (customer impact) | Fail closed with a visible notice. Reconciliation required (§5). The bridge is bounded. |
| `pending` (payment retrying) grants no Pro | MEDIUM (product) | Documented decision. Confirm with the business, since some providers keep access during dunning. |
| Abandoned `authenticated` subscriptions in Razorpay could later activate | MEDIUM | Takeover is allowed for them, so a late payment is `superseded`. Operator action 6. |
| Razorpay field names (`current_end`, `X-Razorpay-Event-Id`, `created_at`) are taken from Razorpay's public docs, not from a live payload here | MEDIUM | Confirm in Test Mode (§9). The code fails closed if `current_end` is missing (it fetches, and if that fails it retries). |
| Same-second events are ambiguous | LOW | Ties apply. Documented in §4. |
| Ledger grows without bound | LOW | Acceptable for webhook volume. Retention policy is not defined; do not delete rows without an audit decision. |
| `verify:responsive` not run | MEDIUM | Chromium not installable in the sandbox. Run it on a machine with Chromium before release. |
| The pre-change review doc (`razorpay-premerge-security-review.md`) described dedup-after-update as a fix | LOW | Superseded by this document (§3). |

---

## Appendix: files

- Migration: `supabase/migrations/20261016120000_razorpay_atomic_ledger_entitlements.sql`
- Policy: `lib/billing/entitlements.ts`
- Webhook core: `lib/billing/webhook-processor.ts`, adapter `lib/billing/apply-event.ts`
- Checkout verify core: `lib/billing/checkout-verify.ts`
- Routes (thin): `app/api/razorpay/webhook/route.ts`, `app/api/razorpay/verify/route.ts`
- Settings: `app/(app)/settings/page.tsx`, `app/(app)/settings/actions.ts`, `components/settings/PlanCard.tsx`
- Razorpay helpers: `lib/razorpay.ts` (adds `current_end` parsing)
- Tests: `tests/db/razorpay-billing.test.ts`, `tests/lib/billing-entitlements.test.ts`, `tests/lib/billing-webhook.test.ts`; updated `tests/lib/razorpay-security.test.ts`, `tests/lib/razorpay.test.ts`
- Config: `.env.local.example` (`LEGACY_STRIPE_ACCESS_UNTIL`)
