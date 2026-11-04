-- Stage 1C: complete durable Test Mode checkout/webhook processing.
-- Additive schema changes and SECURITY DEFINER RPC replacements only. This
-- migration is not applied to production by this PR.

alter table public.billing_subscriptions
  add column if not exists plan_name text,
  add column if not exists seat_limit smallint;

alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_status_check;
alter table public.billing_subscriptions
  add constraint billing_subscriptions_status_check
  check (status in ('active','canceled','created','authenticated','pending','past_due','halted','paused','completed','expired'));

alter table public.razorpay_webhook_work
  drop constraint if exists razorpay_webhook_work_claimed_status_check;
alter table public.razorpay_webhook_work
  add constraint razorpay_webhook_work_claimed_status_check
  check (claimed_status is null or claimed_status in (
    'created','authenticated','active','pending','past_due','halted','paused','canceled','completed','expired'
  ));

alter table public.billing_subscriptions
  add constraint billing_subscriptions_plan_name_check
    check (plan_name is null or plan_name in ('pro','starter','team')),
  add constraint billing_subscriptions_seat_limit_check
    check (seat_limit is null or seat_limit > 0);

-- Plan metadata follows only the already-authorized binding. Browser input and
-- webhook notes can never set plan_name or seat_limit.
create or replace function public.sync_razorpay_billing_plan_metadata()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tier text;
  v_seats smallint;
begin
  if new.razorpay_binding_id is null then
    return new;
  end if;
  select c.tier, c.included_seats into v_tier, v_seats
    from public.razorpay_subscription_bindings b
    join public.razorpay_plan_catalog c on c.id = b.plan_catalog_id
   where b.id = new.razorpay_binding_id
     and b.workspace_id = new.workspace_id
     and b.provider_subscription_id = new.razorpay_subscription_id;
  if not found then raise exception 'razorpay_binding_metadata_not_found'; end if;
  new.plan_name := v_tier;
  new.seat_limit := v_seats;
  return new;
end;
$$;

create trigger billing_subscriptions_sync_razorpay_plan_metadata
  before insert or update on public.billing_subscriptions
  for each row execute function public.sync_razorpay_billing_plan_metadata();

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
  if p_status is null or p_status not in ('created','authenticated','active','pending','past_due','halted','paused','canceled','completed','expired') then
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
          v_allow := v_row.status in ('created','authenticated','past_due','halted','canceled','completed','expired');
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

create or replace function public.ingest_razorpay_webhook_work(
  p_body_sha256 text,
  p_event_id_header text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_provider_subscription_id text,
  p_claimed_plan_id text,
  p_claimed_status text,
  p_claimed_current_end timestamptz,
  p_candidate_intent_id uuid,
  p_candidate_workspace_hint_id uuid
)
returns table (inserted boolean, work_row jsonb)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_inserted boolean := false;
  v_work public.razorpay_webhook_work%rowtype;
begin
  if p_body_sha256 !~ '^[0-9a-f]{64}$' or p_event_created_at is null
     or p_event_type not in (
       'subscription.authenticated', 'subscription.activated', 'subscription.charged',
       'subscription.pending', 'subscription.halted', 'subscription.paused',
       'subscription.resumed', 'subscription.cancelled', 'subscription.completed',
       'subscription.updated', 'payment.failed', 'payment.captured'
     )
     or (p_event_id_header is not null and p_event_id_header !~ '^[A-Za-z0-9_.:-]{1,128}$')
     or (p_provider_subscription_id is not null and p_provider_subscription_id !~ '^sub_[A-Za-z0-9]{1,80}$')
     or (p_claimed_plan_id is not null and p_claimed_plan_id !~ '^plan_[A-Za-z0-9]{1,80}$') then
    raise exception 'invalid_webhook_work_input' using errcode = '22023';
  end if;

  insert into public.razorpay_webhook_work (
    body_sha256, event_id_header, event_type, event_created_at,
    provider_subscription_id, claimed_plan_id, claimed_status, claimed_current_end,
    candidate_intent_id, candidate_workspace_hint_id, state, next_attempt_at
  ) values (
    p_body_sha256, p_event_id_header, p_event_type, p_event_created_at,
    p_provider_subscription_id, p_claimed_plan_id, p_claimed_status, p_claimed_current_end,
    p_candidate_intent_id, p_candidate_workspace_hint_id, 'received', clock_timestamp()
  ) on conflict (body_sha256) do nothing returning * into v_work;

  v_inserted := found;
  if not v_inserted then
    select w.* into v_work from public.razorpay_webhook_work w where w.body_sha256 = p_body_sha256;
  end if;
  return query select v_inserted, to_jsonb(v_work);
end;
$$;

create or replace function public.finalize_razorpay_webhook_work(
  p_body_sha256 text,
  p_lease_token uuid,
  p_resolution text,
  p_resolution_code text,
  p_verified_plan_id text default null,
  p_verified_customer_id text default null,
  p_verified_status text default null,
  p_verified_current_end timestamptz default null,
  p_paid_through_source text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_work public.razorpay_webhook_work%rowtype;
  v_binding public.razorpay_subscription_bindings%rowtype;
  v_plan public.razorpay_plan_catalog%rowtype;
  v_apply jsonb;
  v_target_state text;
  v_now timestamptz := clock_timestamp();
  v_event_key text;
  v_updated integer;
  v_delay double precision;
begin
  if p_body_sha256 !~ '^[0-9a-f]{64}$' or p_lease_token is null
     or p_resolution is null or p_resolution not in ('ready', 'retryable', 'unresolved', 'rejected')
     or p_resolution_code is null or p_resolution_code !~ '^[a-z0-9_]{1,80}$' then
    raise exception 'invalid_finalize_input' using errcode = '22023';
  end if;
  select w.* into v_work from public.razorpay_webhook_work w
   where w.body_sha256 = p_body_sha256 for update;
  if not found then raise exception 'webhook_work_not_found' using errcode = 'P0002'; end if;
  if v_work.state <> 'processing' or v_work.lease_token <> p_lease_token
     or v_work.lease_expires_at <= v_now then
    return jsonb_build_object('outcome', 'stale_lease');
  end if;

  if p_resolution <> 'ready' then
    if p_resolution = 'retryable' and v_work.attempt_count < 12 then
      v_delay := least(3600::numeric,
        5::numeric * power(2::numeric, least(v_work.attempt_count - 1, 10)))::double precision;
      update public.razorpay_webhook_work
         set state = 'retryable', lease_token = null, lease_expires_at = null,
             next_attempt_at = v_now + make_interval(secs => v_delay),
             resolution_code = p_resolution_code, resolution_detail = null, updated_at = v_now
       where body_sha256 = v_work.body_sha256;
      return jsonb_build_object('outcome', 'retryable');
    end if;
    v_target_state := case when p_resolution = 'retryable' then 'dead_letter' else p_resolution end;
    update public.razorpay_webhook_work
       set state = v_target_state, lease_token = null, lease_expires_at = null,
           next_attempt_at = null, resolution_code = p_resolution_code,
           resolution_detail = null, updated_at = v_now,
           completed_at = case when v_target_state in ('rejected', 'dead_letter') then v_now else null end
     where body_sha256 = v_work.body_sha256;
    return jsonb_build_object('outcome', v_target_state);
  end if;

  if v_work.provider_subscription_id is null then
    update public.razorpay_webhook_work
       set state = 'unresolved', lease_token = null, lease_expires_at = null,
           resolution_code = 'subscription_id_missing', updated_at = v_now
     where body_sha256 = v_work.body_sha256;
    return jsonb_build_object('outcome', 'unresolved');
  end if;

  select b.* into v_binding
    from public.razorpay_subscription_bindings b
   where b.provider_subscription_id = v_work.provider_subscription_id for update;
  if not found then
    if v_work.attempt_count < 12 then
      v_delay := least(3600::numeric,
        5::numeric * power(2::numeric, least(v_work.attempt_count - 1, 10)))::double precision;
      update public.razorpay_webhook_work
         set state = 'retryable', lease_token = null, lease_expires_at = null,
             next_attempt_at = v_now + make_interval(secs => v_delay),
             resolution_code = 'binding_not_yet_found', updated_at = v_now
       where body_sha256 = v_work.body_sha256;
      return jsonb_build_object('outcome', 'retryable');
    end if;
    update public.razorpay_webhook_work
       set state = 'unresolved', lease_token = null, lease_expires_at = null,
           resolution_code = 'binding_not_found', updated_at = v_now
     where body_sha256 = v_work.body_sha256;
    return jsonb_build_object('outcome', 'unresolved');
  end if;

  if (v_work.candidate_intent_id is not null
      and v_work.candidate_intent_id is distinct from v_binding.checkout_intent_id)
     or (v_work.candidate_workspace_hint_id is not null
      and v_work.candidate_workspace_hint_id is distinct from v_binding.workspace_id) then
    update public.razorpay_webhook_work
       set state = 'rejected', lease_token = null, lease_expires_at = null,
           resolution_code = 'notes_hint_mismatch', resolved_binding_id = v_binding.id,
           resolved_workspace_id = v_binding.workspace_id, updated_at = v_now, completed_at = v_now
     where body_sha256 = v_work.body_sha256;
    return jsonb_build_object('outcome', 'rejected');
  end if;

  select c.* into v_plan from public.razorpay_plan_catalog c where c.id = v_binding.plan_catalog_id;
  if p_verified_plan_id is null then
    if v_work.attempt_count < 12 then
      update public.razorpay_webhook_work
         set state = 'retryable', lease_token = null, lease_expires_at = null,
             next_attempt_at = v_now + interval '30 seconds',
             resolution_code = 'provider_plan_unavailable', updated_at = v_now
       where body_sha256 = v_work.body_sha256;
      return jsonb_build_object('outcome', 'retryable');
    end if;
    update public.razorpay_webhook_work
       set state = 'unresolved', lease_token = null, lease_expires_at = null,
           resolution_code = 'provider_plan_unavailable', updated_at = v_now
     where body_sha256 = v_work.body_sha256;
    return jsonb_build_object('outcome', 'unresolved');
  end if;

  if p_verified_plan_id <> v_plan.provider_plan_id
     or (v_work.claimed_plan_id is not null and v_work.claimed_plan_id <> v_plan.provider_plan_id) then
    update public.razorpay_webhook_work
       set state = 'rejected', lease_token = null, lease_expires_at = null,
           resolution_code = 'provider_plan_mismatch', resolved_binding_id = v_binding.id,
           resolved_workspace_id = v_binding.workspace_id, updated_at = v_now, completed_at = v_now
     where body_sha256 = v_work.body_sha256;
    return jsonb_build_object('outcome', 'rejected');
  end if;

  if p_verified_status in ('active','canceled') and p_verified_current_end is null then
    if v_work.attempt_count < 12 then
      update public.razorpay_webhook_work
         set state = 'retryable', lease_token = null, lease_expires_at = null,
             next_attempt_at = v_now + interval '30 seconds',
             resolution_code = 'paid_through_unavailable', updated_at = v_now
       where body_sha256 = v_work.body_sha256;
      return jsonb_build_object('outcome', 'retryable');
    end if;
    update public.razorpay_webhook_work
       set state = 'unresolved', lease_token = null, lease_expires_at = null,
           resolution_code = 'paid_through_unavailable', updated_at = v_now
     where body_sha256 = v_work.body_sha256;
    return jsonb_build_object('outcome', 'unresolved');
  end if;

  if p_verified_status is null
     or p_verified_status not in ('created','authenticated','active','pending','past_due','halted','paused','canceled','completed','expired')
     or (p_paid_through_source is not null and p_paid_through_source not in ('razorpay_webhook','razorpay_api'))
     or (p_verified_status in ('active','canceled') and p_paid_through_source is null) then
    raise exception 'invalid_verified_provider_facts' using errcode = '22023';
  end if;

  -- Lock in the same workspace order as reservation, then delegate billing
  -- ordering, dedupe, and Stripe-safe takeover to the established atomic RPC.
  perform 1 from public.workspaces w where w.id = v_binding.workspace_id for update;
  if not found then raise exception 'bound_workspace_missing'; end if;
  v_event_key := coalesce(v_work.event_id_header, v_work.body_sha256);
  v_apply := public.apply_razorpay_subscription_event(
    v_event_key, v_work.event_type, v_work.event_created_at,
    v_binding.provider_subscription_id, v_binding.workspace_id, p_verified_status,
    p_verified_customer_id, p_verified_current_end, p_paid_through_source,
    v_plan.currency, public.razorpay_minor_to_major(v_plan.currency, v_plan.amount_minor),
    (v_work.event_type = 'payment.failed'), v_work.body_sha256, v_work.event_id_header
  );

  if v_apply->>'outcome' = 'applied' then
    update public.razorpay_subscription_bindings
       set state = 'verified', verified_at = coalesce(verified_at, v_now)
     where id = v_binding.id and state = 'provider_created';
    update public.razorpay_checkout_intents
       set state = 'verified', verified_at = coalesce(verified_at, v_now), last_error_code = null
     where id = v_binding.checkout_intent_id and state = 'provider_created';
    update public.billing_subscriptions
       set razorpay_binding_id = v_binding.id
     where workspace_id = v_binding.workspace_id
       and provider = 'razorpay'
       and razorpay_subscription_id = v_binding.provider_subscription_id;
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then raise exception 'billing_binding_reference_not_updated'; end if;

    update public.razorpay_webhook_work
       set state = 'applied', lease_token = null, lease_expires_at = null,
           next_attempt_at = null, resolved_binding_id = v_binding.id,
           resolved_workspace_id = v_binding.workspace_id, resolution_code = 'applied',
           updated_at = v_now, completed_at = v_now
     where body_sha256 = v_work.body_sha256;
    return jsonb_build_object('outcome', 'applied', 'apply_result', v_apply);
  end if;

  if v_apply->>'outcome' in ('stale','superseded') then
    v_target_state := v_apply->>'outcome';
  elsif v_apply->>'outcome' in ('rejected','unknown_workspace') then
    v_target_state := 'rejected';
  else
    v_target_state := 'ignored';
  end if;
  update public.razorpay_webhook_work
     set state = v_target_state, lease_token = null, lease_expires_at = null,
         next_attempt_at = null, resolved_binding_id = v_binding.id,
         resolved_workspace_id = v_binding.workspace_id,
         resolution_code = coalesce(v_apply->>'outcome', 'unknown_apply_outcome'),
         updated_at = v_now, completed_at = v_now
   where body_sha256 = v_work.body_sha256;
  return jsonb_build_object('outcome', v_target_state, 'apply_result', v_apply);
end;
$$;

revoke all on function public.sync_razorpay_billing_plan_metadata() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.sync_razorpay_billing_plan_metadata() from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.sync_razorpay_billing_plan_metadata() from authenticated;
  end if;
end;
$$;
