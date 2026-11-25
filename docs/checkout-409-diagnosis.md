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

Run this in **Supabase → SQL Editor**. It is safe on any state and does not
error when objects are missing.

```sql
select
  (select count(*)::int from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname in (
      'reserve_razorpay_checkout_intent','start_razorpay_checkout_create',
      'record_razorpay_subscription_created','finish_razorpay_checkout_create_failure',
      'verify_razorpay_checkout_binding','ingest_razorpay_webhook_work',
      'claim_razorpay_webhook_work','razorpay_minor_to_major',
      'finalize_razorpay_webhook_work')) as stage1b_rpcs,
  (select count(*)::int from public.razorpay_plan_catalog) as catalog_rows,
  (select count(*)::int from public.razorpay_plan_catalog
    where provider_mode = 'test' and state = 'active') as active_test_plans,
  (select coalesce(string_agg(tier || '/' || currency || '/' || amount_minor, ', ' order by tier),
                   '(none)')
     from public.razorpay_plan_catalog
    where provider_mode = 'test' and state = 'active') as active_detail,
  (select coalesce(bool_or(has_function_privilege('authenticated', p.oid, 'execute')), false)
     from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = 'reserve_razorpay_checkout_intent')
    as auth_can_execute;
```

### Reading the result

| `stage1b_rpcs` | `active_test_plans` | Diagnosis | Action |
| --- | --- | --- | --- |
| `0` | any | RPCs missing → `function_missing` | Apply Stage 1B |
| `9` | `0` | RPCs fine, catalog empty → `plan_not_available` | Seed the catalog |
| `9` | `2` | Healthy | `auth_can_execute` must be `true` |
| `9` | `2` | `auth_can_execute = false` | Re-run Stage 1B (grant block) |

A healthy result is `9 / 2 / starter/INR/290000, team/INR/790000 / true`.

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
