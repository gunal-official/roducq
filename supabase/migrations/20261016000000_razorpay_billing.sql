-- Razorpay-only billing (production readiness): ADDITIVE migration.
-- Legacy Stripe columns (stripe_customer_id / stripe_subscription_id) and
-- historical rows are PRESERVED untouched for financial history. New/active
-- billing writes Razorpay columns only. Apply via Supabase Dashboard -> SQL
-- Editor or `supabase db push`. NOT applied automatically by this PR.
alter table public.billing_subscriptions
  add column if not exists razorpay_customer_id text,
  add column if not exists razorpay_subscription_id text unique,
  add column if not exists provider text not null default 'stripe'
    check (provider in ('stripe', 'razorpay')),
  add column if not exists last_billing_event_at timestamptz;
alter table public.billing_subscriptions drop constraint if exists billing_subscriptions_status_check;
alter table public.billing_subscriptions add constraint billing_subscriptions_status_check
  check (status in ('active','canceled','created','authenticated','pending','halted','paused','completed','expired'));
-- Idempotent webhook ledger: event_key = sha256(raw body); duplicate
-- deliveries conflict on insert and are acknowledged without re-applying.
create table if not exists public.billing_webhook_events (
  event_key text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.billing_webhook_events enable row level security;
-- No user policies: service role (verified webhook route) only.
