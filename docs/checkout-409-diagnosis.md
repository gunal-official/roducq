# Diagnosing "Could not reserve checkout"

`POST /api/billing/checkout` answers **409** with a body like:

```json
{ "error": "Could not reserve checkout.", "code": "plan_not_available" }
```

The `code` names the exact reason. The billing page now shows it alongside
plain-language next steps. Use the table below to fix the underlying cause.

## Step 1 — read the code

Look at the red-boxed message on `/settings#plan`. The parenthesised word at the
end is the code (`plan_not_available`, `function_missing`, …).

Also check **Vercel → Deployment → Logs** and search for `[checkout] reserve`.
The adapter logs the classified kind, the SQLSTATE, and — when Postgres
provides one — a scrubbed `hint`.

## Step 2 — what each code means

| `code` | Meaning | Fix |
| --- | --- | --- |
| `plan_not_available` | No `active` test row in `razorpay_plan_catalog` for this tier and currency | Seed the catalog (Step 3) |
| `function_missing` | Stage 1B RPCs are not installed | Apply `20261104100000_razorpay_stage1b_rpcs.sql` |
| `schema_cache_stale` | RPCs exist but PostgREST has not reloaded | `notify pgrst, 'reload schema';` then retry |
| `intent_already_open` | Another intent is open for this workspace | Abandon it or wait for it to expire |
| `subscription_exists` | Workspace already has an active subscription | Manage the existing plan |
| `permission_denied` | The role lacks `EXECUTE` on the RPC | Re-run Stage 1B; check the grant block |
| `not_authorized` | Caller is not an authenticated workspace owner | Sign in as owner |
| `database_error` | Unclassified SQLSTATE | Read the logged SQLSTATE |

## Step 3 — the state check

Run this in **Supabase → SQL Editor**. It returns **exactly one row** in every
state — it has no `FROM` clause on the outer query, so it cannot return zero
rows — and it does not error when the functions are missing.

```sql
with rpc as (
  select count(*)::int n
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public'
     and p.proname in (
       'reserve_razorpay_checkout_intent','start_razorpay_checkout_create',
       'record_razorpay_subscription_created','finish_razorpay_checkout_create_failure',
       'verify_razorpay_checkout_binding','ingest_razorpay_webhook_work',
       'claim_razorpay_webhook_work','razorpay_minor_to_major',
       'finalize_razorpay_webhook_work')
), cat as (
  select count(*)::int total,
         count(*) filter (where provider_mode = 'test' and state = 'active')::int active
    from public.razorpay_plan_catalog
), grant_v as (
  select coalesce(bool_or(has_function_privilege('authenticated', p.oid, 'execute')), false) ok
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname = 'reserve_razorpay_checkout_intent'
     and exists (select 1 from pg_roles where rolname = 'authenticated')
)
select
  rpc.n as stage1b_rpcs,
  cat.total as catalog_rows,
  cat.active as active_test_plans,
  grant_v.ok as auth_can_execute,
  case
    when rpc.n = 0 then 'RPCs MISSING - apply stage1b migration'
    when cat.active = 0 then 'RPCs OK, CATALOG EMPTY - seed razorpay_plan_catalog'
    when not grant_v.ok then 'PLANS OK but authenticated cannot EXECUTE - re-run stage1b'
    else 'HEALTHY - retry checkout'
  end as verdict
from rpc, cat, grant_v;
```

### Reading the result

The `verdict` column names the action. Expected values:

| `verdict` | Action |
| --- | --- |
| `RPCs MISSING - apply stage1b migration` | Step 2 of the operator runbook |
| `RPCs OK, CATALOG EMPTY - seed razorpay_plan_catalog` | Step 4 below |
| `PLANS OK but authenticated cannot EXECUTE - re-run stage1b` | Re-run Stage 1B |
| `HEALTHY - retry checkout` | Retry `/settings#plan` |

> **"Success. No rows returned" means the query did not run.** This statement
> always emits one row. If you see that message, the editor executed something
> else — check the statement from `with` to `;` is fully selected and that you
> are in the right Supabase project. A quick calibration check is
> `select 1 as ok;`, which must return `1`.

Validated against three states: RPCs absent (`0 / 0 / 0 / false`), RPCs
installed but unseeded (`9 / 0 / 0 / true`), and healthy
(`9 / 2 / 2 / true`).

## Step 4 — seed the catalog

`razorpay_plan_catalog` rows must be inserted `inactive` and then promoted:
a trigger rejects any row that arrives already `active`.

Replace the two `plan_…` values with the ids from
**Razorpay Dashboard → Subscriptions → Plans**. Amounts are in **paise**:
₹2,900 is `290000`, not `2900`.

```sql
insert into public.razorpay_plan_catalog
  (provider_mode, provider_plan_id, tier, currency, amount_minor, included_seats,
   interval_unit, interval_count)
values
  ('test', 'plan_REPLACE_STARTER', 'starter', 'INR', 290000, 1, 'month', 1),
  ('test', 'plan_REPLACE_TEAM',    'team',    'INR', 790000, 5, 'month', 1)
on conflict (provider_mode, provider_plan_id) do nothing;

update public.razorpay_plan_catalog
   set state = 'active'
 where provider_mode = 'test'
   and provider_plan_id in ('plan_REPLACE_STARTER', 'plan_REPLACE_TEAM');
```

Re-run the Step 3 query: `active_test_plans` must be `2` and
`auth_can_execute` must be `true`.

## Step 5 — retry

Open `/settings#plan` and start checkout. The Razorpay modal should open at
₹2,900 for Starter or ₹7,900 for Team.

If it still refuses, the code on screen now names the reason — match it against
the table in Step 2.
