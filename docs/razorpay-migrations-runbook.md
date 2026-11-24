# Applying the Razorpay migrations to a project that is missing them

## The symptom

```sql
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in (
     'reserve_razorpay_checkout_intent',
     'start_razorpay_checkout_create',
     'record_razorpay_subscription_created'
   );
```

returns **`Success. No rows returned`**.

That means the functions do not exist, so `POST /api/billing/checkout` is calling
an RPC that was never created and answers:

```json
{"error":"Could not reserve checkout.","code":"…"}
```

Before PR #107 this was invisible: the handler discarded the adapter's error
code, so "the RPC does not exist" and "there is no plan row" produced the same
blank 409.

> This is a **deployment** gap, not a code bug. The migrations are committed and
> covered by `npm run verify:db`; they were never applied to that project.

---

## 1. Confirm how much is missing

```sql
select 'base: is_workspace_owner' as check, count(*)::int as present
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='is_workspace_owner'
union all
select 'billing_subscriptions.razorpay_subscription_id column', count(*)::int
  from information_schema.columns
 where table_schema='public' and table_name='billing_subscriptions'
   and column_name='razorpay_subscription_id'
union all
select 'billing_subscriptions.plan_name column (stage 1C)', count(*)::int
  from information_schema.columns
 where table_schema='public' and table_name='billing_subscriptions'
   and column_name='plan_name'
union all
select 'stage1A tables (of 4)', count(*)::int
  from information_schema.tables
 where table_schema='public'
   and table_name in ('razorpay_plan_catalog','razorpay_checkout_intents',
                      'razorpay_subscription_bindings','razorpay_webhook_work')
union all
select 'stage1B RPCs (of 9)', count(*)::int
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in (
   'reserve_razorpay_checkout_intent','start_razorpay_checkout_create',
   'record_razorpay_subscription_created','finish_razorpay_checkout_create_failure',
   'verify_razorpay_checkout_binding','ingest_razorpay_webhook_work',
   'claim_razorpay_webhook_work','finalize_razorpay_webhook_work',
   'razorpay_minor_to_major')
union all
select 'apply_razorpay_subscription_event', count(*)::int
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='apply_razorpay_subscription_event'
union all
select 'stage2: workspace_billing_seat_limit', count(*)::int
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='workspace_billing_seat_limit'
order by 1;
```

A **fully migrated** project returns `1` on every row, with
`stage1A tables = 4` and `stage1B RPCs = 9`.

Interpretation:

| Result | Meaning |
|---|---|
| `stage1B RPCs = 0`, others `1` | Only Stage 1B is missing — the common case |
| `stage1B RPCs = 0` **and** `stage1A tables = 0` | Stage 1A + 1B (+ likely 1C) never applied |
| `razorpay_subscription_id column = 0` | The whole Razorpay stack is missing |
| `base: is_workspace_owner = 0` | Wrong database — check the project ref |

---

## 2. Produce the SQL to apply

### Option A — Supabase CLI (preferred when available)

```bash
supabase db push
```

Applies every pending migration in timestamp order. Nothing else needed.

### Option B — one paste-able file (browser-only operators)

```bash
npm run migrations:bundle
# → razorpay-migrations.bundle.sql  (~93 KB)
```

The bundle is **generated from `supabase/migrations/`** rather than committed,
so it can never drift from the canonical files. `npm run migrations:bundle --
--list` shows what goes in it.

Then: Supabase → **SQL Editor → New query** → paste the whole file → **Run**.

If the editor rejects the size, run the six files individually in the order in
§3, one query each, confirming success before continuing.

---

## 3. The six files and why the order matters

| # | File | Creates |
|---|---|---|
| 1 | `20261016000000_razorpay_billing.sql` | `razorpay_*` columns on `billing_subscriptions`, `billing_webhook_events` |
| 2 | `20261016120000_razorpay_atomic_ledger_entitlements.sql` | `apply_razorpay_subscription_event` |
| 3 | `20261030100000_razorpay_stage1a_schema_foundation.sql` | the four `razorpay_*` tables |
| 4 | `20261104100000_razorpay_stage1b_rpcs.sql` | **the 9 checkout/webhook RPCs** |
| 5 | `20261104120000_razorpay_stage1c_runtime.sql` | runtime replacements for webhook/apply |
| 6 | `20261105100000_billing_stage2_seat_limits.sql` | seat-limit RPCs |

- **3 needs 1**: Stage 1A adds a foreign key to `billing_subscriptions` columns
  created by file 1, so it fails without them.
- **4 needs 2 and 3**: Stage 1B calls `apply_razorpay_subscription_event` and
  reads/writes the four tables. It also calls `is_workspace_owner`, which comes
  from the very first migration in the repo.
- **6 needs 3**: it reads `razorpay_plan_catalog`.

---

## 4. Safety

- All six are **additive**: new tables, `add column if not exists`, new
  functions. No table is dropped and no rows are deleted.
- The only constraint work is dropping and re-adding
  `billing_subscriptions_status_check`. It fails safely (without applying) if an
  existing row has a status outside the allowed set.
- Take a Supabase backup first: **Database → Backups**. For a production
  project the runbook's standing gate applies — confirm you are on the intended
  project before running anything.

### The bundle is NOT re-runnable

Stage 1A/1B use plain `create table` (no `IF NOT EXISTS`) and plain
`create function` (no `OR REPLACE`). A second run stops at the first existing
object:

```
ERROR: relation "razorpay_plan_catalog" already exists
```

That is safe — nothing is damaged, the batch halts. **Do not just retry.**
Instead:

1. Read the error; it names the object that already exists.
2. Map it to a file using §3 (the four `razorpay_*` tables → file 3).
3. Skip to the file after it and run the remainder in order.
4. Re-run the §1 query — it reports installed state definitively.

If you would rather not reason about partial state, restore the pre-run backup
and apply the individual files one at a time.

---

## 5. Verify

Re-run the §1 query: expect `4`, `9`, `1`, `1`, `1`, and `1` everywhere else.
Then confirm the three RPCs exist (the query from "The symptom" above) → **3
rows**.

---

## 6. Seeding is still required

The migrations create **schema only**. Stage 1A deliberately seeds no plan rows,
and the migrations revoke all privileges on `razorpay_plan_catalog` from
`public`, `anon`, `authenticated` **and** `service_role` — so the application
cannot create them even with the service-role key. Seeding is an operator step.

Until it is done, checkout fails with `code: "plan_not_available"` instead of a
missing function. See `docs/RAZORPAY_TEST_MODE_SETUP.md` §"Seed
`razorpay_plan_catalog`" for the two-statement SQL and the paise rule
(`starter 290000`, `team 790000`).

---

## What was verified before this document was written

The bundle was applied to a real Postgres that had the other 30 migrations
present and these six absent — the exact failure state — and produced:

```
stage1A tables (of 4)                4
stage1B RPCs (of 9)                  9
plan_name column                     1
apply_razorpay_subscription_event    1
workspace_billing_seat_limit         1
reserve via installed RPC -> state = reserved
```

The combined file was applied as a **single statement batch**, not file-by-file.
