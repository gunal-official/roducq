# Test Mode: full account-to-subscription run

A single pass from a deleted account to a working, enforced subscription.
Written to be followed in order. Each step states what you should see, so a
failure is obvious at the point it happens rather than three steps later.

**Environment:** Vercel-hosted production (`roducq.nanexi.com`), Supabase SQL
Editor, Razorpay Test Mode. No terminal, no local setup.

---

## Step 0 — Reset (once)

Skip if you have already reset and cancelled Razorpay subscriptions.

Two halves, both required: deleting database rows does **not** cancel the
subscription at Razorpay, and a live Razorpay subscription whose row is gone
produces `binding_not_found` noise on every billing event.

### 0a. Database

**Supabase → SQL Editor → New query**, paste, **Run**.

```sql
update public.billing_subscriptions set razorpay_binding_id = null
 where razorpay_binding_id is not null;
delete from public.billing_subscriptions;

delete from public.razorpay_webhook_work;
delete from public.razorpay_subscription_bindings;
delete from public.razorpay_checkout_intents;

delete from public.team_invites;

update public.workspace_members set role = 'member' where role = 'owner';
delete from public.workspace_members;
delete from public.workspaces;

delete from public.profiles;
```

Expect `Success. No rows returned` for each — for `DELETE` this is success, not
an error. The order matters: bindings and intents are `ON DELETE RESTRICT`
against workspaces and users, and `workspace_members_keep_last_owner()`
refuses to remove the last owner, so owners are demoted first.

### 0b. Accounts

**Supabase → Authentication → Users** → delete every account, one by one.

### 0c. Razorpay

**Razorpay Dashboard → Subscriptions** → cancel anything still listed.

---

## Step 1 — Confirm the platform is ready before creating anything

Do this now, while there is no account to confuse things. If it is wrong here,
no amount of retrying will help.

**Supabase → SQL Editor**:

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
select rpc.n as stage1b_rpcs, cat.total as catalog_rows,
       cat.active as active_test_plans, grant_v.ok as auth_can_execute,
       case
         when rpc.n = 0 then 'RPCs MISSING - apply stage1b migration'
         when cat.active = 0 then 'CATALOG EMPTY - seed razorpay_plan_catalog'
         when not grant_v.ok then 'NO EXECUTE - re-run stage1b'
         else 'HEALTHY'
       end as verdict
from rpc, cat, grant_v;
```

**Required:** `stage1b_rpcs = 9`, `active_test_plans = 2`, `auth_can_execute = true`, `verdict = HEALTHY`.

The catalog is untouched by the reset, so `active_test_plans = 2` should already
hold. If it does not, re-seed with your real Razorpay plan ids.

### Environment variables

**Vercel → Settings → Environment Variables**. All four must be set for
Production:

| Variable | Value |
| --- | --- |
| `RAZORPAY_KEY_ID` | `rzp_test_…` |
| `RAZORPAY_KEY_SECRET` | Test Mode secret |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you set on the Razorpay webhook |
| `RAZORPAY_LIVE_MODE_ENABLED` | must be **absent** or `false` |

If `RAZORPAY_WEBHOOK_SECRET` is missing, events are rejected at ingestion and
the queue stays empty — the payment succeeds at Razorpay and the plan never
activates.

---

## Step 2 — Create the account

1. Open **https://roducq.nanexi.com/signup**
2. Enter email and password, submit.

**What you should see:** if Supabase email confirmation is ON, a notice reading
*"Account created — check your email to confirm it, then log in."* Otherwise you
land straight in the app.

---

## Step 3 — Confirm the email (only if Step 2 asked you to)

Open the confirmation email, click the link.

**If no email arrives:** check spam. If it still does not arrive, the Supabase
project has no SMTP configured — the account exists but is unconfirmed. Fix that
in **Supabase → Authentication → Providers → Email** before continuing.

---

## Step 4 — Log in and name the workspace

1. **https://roducq.nanexi.com/login**, sign in.
2. If you land on **"Name your workspace"**, enter a name and click
   **Create workspace**.

You are the **owner** of that workspace, and you occupy **seat 1**.

**What you should see:** the app shell with your workspace in the sidebar.

---

## Step 5 — Confirm you start on Free

Open **https://roducq.nanexi.com/settings#plan**.

**Required:**

- **No** "Current plan" banner
- Starter shows **Choose plan** (enabled), Team shows **Choose plan**,
  Studio shows **Talk to us**
- Notice: *"Starter and Team checkout currently runs in Razorpay Test Mode."*

The absence of the banner is the correct state — you have no subscription yet.

---

## Step 6 — Start checkout on Starter

Click **Choose plan** on **Starter (₹2,900 / month)**.

**What you should see:** the Razorpay modal opens in Test Mode with
**Price Summary ₹2,900**, and payment options UPI / UPI QR / Cards / EMandate.

### If you instead see an error

The message now names the cause in parentheses:

| Code | Meaning |
| --- | --- |
| `plan_not_available` | Catalog empty or inactive — redo Step 1 |
| `function_missing` | Stage 1B not applied — redo Step 1 |
| `schema_cache_stale` | Wait 30s and retry; else run `notify pgrst, 'reload schema';` |
| `intent_already_open` | A previous intent is still inside its 15-minute window — wait, or expire it |
| `workspace_has_current_subscription` | You already have a plan — check Step 5 |

---

## Step 7 — Pay in Test Mode

Use any Test Mode method. For UPI, enter a test UPI id such as
`success@razorpay`. **Test Mode money is not real and UPI payments
auto-refund.**

**What you should see:** the modal closes and the page shows
*"Payment submitted. Your plan will update when the payment is confirmed."*

That message is deliberately non-committal — confirmation arrives by webhook,
a second or two later.

---

## Step 8 — Confirm the plan is live

Reload **https://roducq.nanexi.com/settings#plan** (hard reload:
**Cmd+Shift+R**).

**Required:**

- Banner: **`Current plan: Starter · active · paid through <date ~1 month out>`**
- Starter card shows a **`Your plan`** badge and a **disabled** button reading
  **`Current plan`**
- Team still shows an enabled **`Choose plan`**

If the banner does not appear, the webhook did not apply. Go to Step 10.

---

## Step 9 — Confirm the seat limit is enforced

**This is the step that proves the plan does something.** Setup → Team →
invite a second email address.

**Required:** the invite is **refused** with a seat-limit message.

Starter includes **1 seat and you occupy it**, so zero invites are possible.
This is measured behaviour, not an assumption:

| Plan | Seat limit | Invites that succeed |
| --- | --- | --- |
| Free | 1 | 0 |
| Starter | 1 | 0 |
| Team | 5 | 4 |
| Studio | 15 | 14 |

If the invite **succeeds** on Starter, entitlement is not reaching the gate —
stop and report it.

---

## Step 10 — Verify from the database

**Supabase → SQL Editor**:

```sql
select
  (select count(*)::int from public.billing_subscriptions) as subs,
  (select plan_name from public.billing_subscriptions limit 1) as plan,
  (select status from public.billing_subscriptions limit 1) as status,
  (select (paid_through > now()) from public.billing_subscriptions limit 1) as in_paid_period,
  (select count(*)::int from public.razorpay_subscription_bindings where state = 'verified') as verified_bindings,
  (select count(*)::int from public.razorpay_webhook_work
     where state in ('received','processing','retryable')) as pending_events,
  (select count(*)::int from public.razorpay_webhook_work
     where state in ('unresolved','dead_letter')) as terminal_events;
```

**Healthy:**

```
subs=1  plan=starter  status=active  in_paid_period=true  verified_bindings=1  pending_events=0
```

`terminal_events` may be non-zero. Check what they are before worrying:

```sql
select event_type, provider_subscription_id, resolution_code, attempt_count
  from public.razorpay_webhook_work
 where state in ('unresolved','dead_letter') order by created_at desc;
```

`subscription_id_missing` on a `payment.captured` row is **benign** — a one-off
payment with no subscription id. Nothing to fix.

---

## Step 11 — Test the upgrade path

1. On `/settings#plan`, click **Choose plan** on **Team (₹7,900)**.
2. Expect `workspace_has_current_subscription` or a fresh checkout depending on
   plan-change policy — capture whichever you see.
3. After Team is active, the invite from Step 9 now **succeeds**, and the 5th
   invite is refused.

---

## Step 12 — Optional: verify the webhook is the thing doing the work

**Razorpay → Settings → Webhooks** — the endpoint must point at
`https://roducq.nanexi.com/api/billing/webhook` and have the *Payment captured*
and *Subscription* events enabled.

Then in Supabase:

```sql
select event_type, state, attempt_count, resolution_code, created_at
  from public.razorpay_webhook_work
 order by created_at desc limit 10;
```

Events should reach `applied` with `attempt_count` small. That proves the drain
ran in-request rather than waiting for a cron that is not configured.

---

## Failure map

| Symptom | Cause | Fix |
| --- | --- | --- |
| `plan_not_available` | catalog empty | Step 1 |
| `function_missing` | Stage 1B absent | Step 1 |
| `intent_already_open` | prior intent within 15 min | wait, or expire it |
| Modal opens, payment done, no plan | webhook not applied | Step 10, then check `RAZORPAY_WEBHOOK_SECRET` |
| Plan active in DB, not on page | stale build | hard reload; confirm the deploy is current |
| Invite succeeds on Starter | entitlement not enforced | report immediately |
| `binding_not_found` in work table | subscription cancelled at Razorpay but rows remain | Step 0b |

## Known gaps

- **Team's "5 seats" includes the owner** — only 4 can be invited. Pending a
  product decision: return 6 from `workspace_billing_seat_limit()` for Team, or
  reword the copy to "5 people including you".
- **Studio** is contact-only; no online checkout exists for it.
- **No annual billing** — monthly only.
- **No additional-seat billing** — Team is flat ₹7,900 for 5.
- **Catalog seeding is manual** per environment.
