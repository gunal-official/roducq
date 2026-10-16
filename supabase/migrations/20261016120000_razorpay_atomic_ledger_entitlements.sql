-- Razorpay hardening follow-up (ADDITIVE): atomic webhook processing,
-- event-ordering ledger, verified paid-through dates, legacy-Stripe-safe
-- grants. Nothing is dropped, deleted or re-typed. Legacy Stripe columns and
-- every historical row are preserved.
--
-- Apply order: after 20261016000000_razorpay_billing.sql (this file depends on
-- its razorpay_* columns and provider check). Apply manually via the Supabase
-- SQL Editor or `supabase db push` — NOT applied automatically by this PR.
--
-- DESIGN (locked):
--   * paid_through is a VERIFIED end-of-paid-period timestamp. For Razorpay it
--     is Razorpay's own current_end (webhook payload or server-side API fetch).
--     For legacy Stripe it may ONLY be written by an operator reconciliation
--     from the Stripe dashboard/export. No code path invents it.
--   * All state changes from Razorpay go through ONE SECURITY DEFINER function
--     that (1) claims the event in billing_webhook_events, (2) enforces event
--     ordering on trusted Razorpay timestamps, (3) enforces workspace binding,
--     (4) applies the change. A raised exception rolls back the whole call —
--     including the ledger claim — so Razorpay's retry starts from a clean slate.

-- ── 1. Columns ────────────────────────────────────────────────────────
alter table public.billing_subscriptions
  add column if not exists paid_through timestamptz,
  add column if not exists paid_through_source text
    check (paid_through_source is null or paid_through_source in ('razorpay_webhook', 'razorpay_api', 'stripe_reconciled'));

alter table public.billing_webhook_events
  add column if not exists body_sha256 text
    check (body_sha256 is null or body_sha256 ~ '^[0-9a-f]{64}$'),
  add column if not exists razorpay_event_id text,
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null,
  add column if not exists razorpay_subscription_id text,
  add column if not exists event_created_at timestamptz,
  add column if not exists outcome text not null default 'legacy'
    check (outcome in ('pending', 'applied', 'duplicate', 'stale', 'superseded', 'rejected', 'unknown_workspace', 'ignored', 'legacy'));

-- Rows written by the PR #42 webhook used sha256(raw body) as event_key. Mark
-- them so the body-hash uniqueness below also covers them.
update public.billing_webhook_events
   set body_sha256 = event_key
 where body_sha256 is null
   and event_key ~ '^[0-9a-f]{64}$';

-- A given raw body is one event: a second delivery with the same body is a
-- duplicate even if the event key differs (e.g. header id missing on retry).
create unique index if not exists billing_webhook_events_body_sha256_key
  on public.billing_webhook_events (body_sha256)
  where body_sha256 is not null;

-- ── 2. Atomic apply function ──────────────────────────────────────────
-- Returns jsonb { outcome, workspace_id } where outcome is one of:
--   applied | duplicate | stale | superseded | rejected | unknown_workspace | ignored
-- Non-applied outcomes are NORMAL returns (ledger row kept, nothing else
-- changed) so Razorpay gets a 2xx and stops retrying. Validation failures and
-- DB errors RAISE, which rolls the entire call back.
--
-- Security: SECURITY DEFINER with a fixed search_path, no dynamic SQL, all
-- inputs validated, EXECUTE granted to service_role only (see §4).
create or replace function public.apply_razorpay_subscription_event(
  p_event_key text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_subscription_id text,
  p_workspace_id uuid,
  p_status text,
  p_customer_id text,
  p_paid_through timestamptz,
  p_paid_through_source text,
  p_currency text,
  p_amount numeric,
  p_only_if_active boolean,
  p_body_sha256 text,
  p_razorpay_event_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_claimed text;
  v_outcome text;
  v_ws uuid;
  v_found public.billing_subscriptions%rowtype;
  v_has_found boolean := false;
  v_row public.billing_subscriptions%rowtype;
  v_has_row boolean := false;
  v_allow boolean;
  v_created timestamptz;
begin
  -- 1. Input validation (raises → full rollback).
  if p_status is null or p_status not in ('created','authenticated','active','pending','halted','paused','canceled','completed','expired') then
    raise exception 'invalid_status';
  end if;
  if p_event_key is not null and (char_length(p_event_key) < 1 or char_length(p_event_key) > 200) then
    raise exception 'invalid_event_key';
  end if;
  if p_event_type is null or char_length(p_event_type) < 1 or char_length(p_event_type) > 100 then
    raise exception 'invalid_event_type';
  end if;
  if p_event_key is not null and p_event_created_at is null then
    raise exception 'missing_event_timestamp';
  end if;
  v_created := coalesce(p_event_created_at, v_now);
  if p_subscription_id is not null and p_subscription_id !~ '^sub_[A-Za-z0-9]{1,80}$' then
    raise exception 'invalid_subscription_id';
  end if;
  if p_currency is not null and p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_currency';
  end if;
  if p_amount is not null and p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;
  if p_body_sha256 is not null and p_body_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_body_hash';
  end if;
  if p_razorpay_event_id is not null and char_length(p_razorpay_event_id) > 128 then
    raise exception 'invalid_razorpay_event_id';
  end if;

  -- 2. Idempotency: claim the event. ON CONFLICT covers both the event key and
  -- the body hash. A concurrent duplicate blocks here until the first
  -- transaction commits (or rolls back), then sees the conflict.
  if p_event_key is not null then
    insert into public.billing_webhook_events
      (event_key, event_type, body_sha256, razorpay_event_id, event_created_at, razorpay_subscription_id, outcome)
    values
      (p_event_key, p_event_type, p_body_sha256, p_razorpay_event_id, v_created, p_subscription_id, 'pending')
    on conflict do nothing
    returning event_key into v_claimed;
    if v_claimed is null then
      return jsonb_build_object('outcome', 'duplicate', 'workspace_id', null);
    end if;
  end if;

  -- 3. Resolve the workspace. The subscription id is authoritative once bound;
  -- a notes-supplied workspace must agree with that binding.
  v_outcome := null;
  v_ws := null;
  if p_subscription_id is null then
    v_outcome := 'ignored';
  else
    select * into v_found from public.billing_subscriptions
     where razorpay_subscription_id = p_subscription_id
     for update;
    v_has_found := found;
    if v_has_found then
      v_ws := v_found.workspace_id;
      if p_workspace_id is not null and p_workspace_id <> v_ws then
        v_outcome := 'rejected';
      end if;
    else
      v_ws := p_workspace_id;
      if v_ws is null or not exists (select 1 from public.workspaces w where w.id = v_ws) then
        v_outcome := 'unknown_workspace';
      end if;
    end if;
  end if;

  if v_outcome is null then
    -- Lock the workspace's billing row (one row per workspace).
    select * into v_row from public.billing_subscriptions where workspace_id = v_ws for update;
    v_has_row := found;

    if not v_has_row then
      if p_only_if_active then
        v_outcome := 'ignored';
      else
        insert into public.billing_subscriptions
          (workspace_id, provider, razorpay_customer_id, razorpay_subscription_id, status,
           currency, amount, paid_through, paid_through_source, last_billing_event_at)
        values
          (v_ws, 'razorpay', p_customer_id, p_subscription_id, p_status,
           p_currency, p_amount, p_paid_through, p_paid_through_source, v_created);
        v_outcome := 'applied';
      end if;

    elsif v_row.razorpay_subscription_id is not distinct from p_subscription_id then
      -- Same subscription: enforce event ordering on the trusted Razorpay time.
      if v_row.last_billing_event_at is not null and v_created < v_row.last_billing_event_at then
        v_outcome := 'stale';
      elsif p_only_if_active and v_row.status <> 'active' then
        v_outcome := 'ignored';
      else
        update public.billing_subscriptions set
          status = p_status,
          razorpay_customer_id = coalesce(p_customer_id, razorpay_customer_id),
          paid_through = coalesce(p_paid_through, paid_through),
          paid_through_source = coalesce(p_paid_through_source, paid_through_source),
          currency = coalesce(p_currency, currency),
          amount = coalesce(p_amount, amount),
          last_billing_event_at = v_created
        where workspace_id = v_ws;
        v_outcome := 'applied';
      end if;

    else
      -- A different subscription than the one on file. Payment-failure events
      -- never take over a workspace.
      if p_only_if_active then
        v_outcome := 'ignored';
      else
        -- Takeover rules (mirrored in lib/billing/entitlements.ts):
        --   razorpay row: only a never-paid or ended subscription may be replaced.
        --   legacy stripe row: only if it is not active and has no verified
        --   paid period still running — never double-bill a live Stripe plan.
        if v_row.provider = 'razorpay' then
          v_allow := v_row.status in ('created','authenticated','canceled','completed','expired');
        else
          v_allow := v_row.status <> 'active'
                 and (v_row.paid_through is null or v_row.paid_through <= v_now);
        end if;

        if not v_allow then
          v_outcome := 'superseded';
        elsif v_row.last_billing_event_at is not null and v_created < v_row.last_billing_event_at then
          v_outcome := 'stale';
        else
          update public.billing_subscriptions set
            provider = 'razorpay',
            razorpay_subscription_id = p_subscription_id,
            razorpay_customer_id = p_customer_id,
            status = p_status,
            paid_through = p_paid_through,
            paid_through_source = p_paid_through_source,
            currency = coalesce(p_currency, currency),
            amount = coalesce(p_amount, amount),
            last_billing_event_at = v_created
          where workspace_id = v_ws;
          v_outcome := 'applied';
        end if;
      end if;
    end if;
  end if;

  -- Only reference a workspace that actually exists (an unknown id is recorded
  -- as outcome 'unknown_workspace' with a NULL reference, not a FK failure).
  if v_ws is not null and not exists (select 1 from public.workspaces w where w.id = v_ws) then
    v_ws := null;
  end if;

  -- 4. Record the outcome on the ledger row, in the same transaction.
  if p_event_key is not null then
    update public.billing_webhook_events
       set outcome = v_outcome,
           workspace_id = v_ws
     where event_key = v_claimed;
  end if;

  return jsonb_build_object(
    'outcome', v_outcome,
    'workspace_id', v_ws
  );
end;
$$;

-- ── 3. Table privileges (defence in depth; RLS already blocks writes) ──
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.billing_subscriptions from anon;
    revoke all on public.billing_webhook_events from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke insert, update, delete on public.billing_subscriptions from authenticated;
    revoke all on public.billing_webhook_events from authenticated;
  end if;
end
$$;

-- ── 4. Function privileges ────────────────────────────────────────────
revoke all on function public.apply_razorpay_subscription_event(text, text, timestamptz, text, uuid, text, text, timestamptz, text, text, numeric, boolean, text, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.apply_razorpay_subscription_event(text, text, timestamptz, text, uuid, text, text, timestamptz, text, text, numeric, boolean, text, text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.apply_razorpay_subscription_event(text, text, timestamptz, text, uuid, text, text, timestamptz, text, text, numeric, boolean, text, text) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.apply_razorpay_subscription_event(text, text, timestamptz, text, uuid, text, text, timestamptz, text, text, numeric, boolean, text, text) to service_role;
  end if;
end
$$;
