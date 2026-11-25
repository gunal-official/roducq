# Test Mode reset — delete all accounts and start clean

Use this when you want a genuinely clean Test Mode run: no leftover
subscriptions, no orphan bindings, no stuck intents, no invites.

**This deletes accounts and all workspace data.** Run it only against the
project you are deliberately resetting.

## Why the order matters

Four independent guards reject the obvious sequence, so a hand-written
`delete from auth.users` will fail partway and leave a half-reset project:

| Guard | What it blocks |
| --- | --- |
| `razorpay_subscription_bindings.workspace_id` → `on delete restrict` | deleting a workspace that still has a binding |
| `razorpay_checkout_intents.initiating_owner_id` → `on delete restrict` | deleting a user who owns an intent |
| `billing_subscriptions.razorpay_binding_id` FK → bindings | deleting a binding a subscription still points at |
| `workspace_members_keep_last_owner()` | deleting the last owner of a workspace |

The script below releases billing first, then membership, then the workspace.
Verified against the full migration chain: 1 workspace, 1 member, 1 invite,
1 subscription, 1 verified binding, 1 intent and 1 work row all delete cleanly
with no constraint violation, and the plan catalog is preserved.

## The reset

Run in **Supabase → SQL Editor**. Safe to repeat.

```sql
-- 1. Billing: release the binding FK before bindings can be deleted.
update public.billing_subscriptions set razorpay_binding_id = null
 where razorpay_binding_id is not null;
delete from public.billing_subscriptions;

-- 2. Razorpay ledger. webhook_work has no FK; bindings and intents are RESTRICT.
delete from public.razorpay_webhook_work;
delete from public.razorpay_subscription_bindings;
delete from public.razorpay_checkout_intents;

-- 3. Team invites.
delete from public.team_invites;

-- 4. Membership, then the workspace. Demote owners first so the
--    last-owner guard never sees an owner-less workspace mid-delete.
update public.workspace_members set role = 'member' where role = 'owner';
delete from public.workspace_members;
delete from public.workspaces;

-- 5. Profiles (FK to auth.users, cascade).
delete from public.profiles;
```

### Then delete the accounts

`auth.users` is not writable from the SQL editor by default. Use
**Supabase → Authentication → Users**, select each account, **Delete user**.

`profiles`, `workspace_members` and invites referencing that user are already
gone, and the remaining FKs are `on delete cascade` or `set null`, so the
delete succeeds.

Or in SQL, if you prefer:

```sql
delete from auth.users;
```

## What survives

`public.razorpay_plan_catalog` is **not** touched. The Razorpay Plan IDs
(₹2,900 Starter, ₹7,900 Team) stay seeded, so you do not need to re-run the
catalog seed — and every test run uses the same verified plan IDs.

Verified: catalog count is unchanged by the script.

## Clean up Razorpay too

Deleting rows here does **not** cancel subscriptions at Razorpay. Before a
clean run, cancel any leftover subscriptions in
**Razorpay Dashboard → Subscriptions**, otherwise their webhooks keep arriving
for subscriptions this database no longer knows about.

That is exactly what produces `binding_not_found` rows in
`razorpay_webhook_work` after a reset.

## Then run the full flow

With a clean project:

1. **Sign up** a fresh account → onboarding creates the workspace and owner
   membership.
2. **Seed** — the catalog is already seeded; re-run the verdict query to
   confirm `stage1b_rpcs = 9`, `active_test_plans = 2`, `auth_can_execute = true`.
3. **Choose Starter** on `/settings#plan` → Razorpay modal opens at ₹2,900.
4. **Pay** in Test Mode (UPI collects and auto-refunds in Test Mode).
5. **Confirm** the banner reads
   `Current plan: Starter · active · paid through …`
6. **Seat limit**: invite a second member → must be refused, because Starter
   includes 1 seat and the owner occupies it.
7. **Upgrade** to Team → the invite then succeeds, up to 5 occupied seats.
8. **Verify** with the verdict query: `subs=1`, `plan=starter|team`,
   `in_paid_period=true`, `verified_bindings>=1`, `pending_events=0`.

## Expected seat behaviour (measured)

| Plan | `workspace_billing_seat_limit` | Invites accepted before refusal |
| --- | --- | --- |
| no subscription | 1 | 0 — the owner already fills it |
| Starter | 1 | 0 |
| Team | 5 | 4 |
| Studio | 15 | 14 |

Measured against the real trigger: on Team the 5th invite raises
`workspace_seat_limit_reached`; on Starter and on Free the 1st does.

This surfaces a real product gap worth deciding on: **Team is advertised as
"Up to 5 seats" but the owner consumes one of them, so only 4 can be invited.**
If the intent is 5 *invitable* seats, `workspace_billing_seat_limit()` should
return `6` for Team, or the copy should say "5 people including you".
