-- Stage 1B Razorpay RPC layer. Additive and inert until explicitly wired.
-- No direct table grants are added. All provider calls remain in server code.
-- The Stage 1A billing binding guard requires the finalizer's SECURITY DEFINER
-- owner to match billing_subscriptions' table owner (normally postgres).

-- Preserve untrusted note hints for diagnostics only. These columns have no FK
-- and are never used to resolve or authorize a workspace/binding.
alter table public.razorpay_webhook_work
  add column candidate_workspace_hint_id uuid;

create or replace function public.reserve_razorpay_checkout_intent(
  p_workspace_id uuid,
  p_tier text,
  p_currency text,
  p_request_key uuid
)
returns public.razorpay_checkout_intents
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_plan public.razorpay_plan_catalog%rowtype;
  v_intent public.razorpay_checkout_intents%rowtype;
  v_billing public.billing_subscriptions%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_workspace_id is null or p_request_key is null
     or p_tier not in ('pro', 'starter', 'team')
     or p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_checkout_request' using errcode = '22023';
  end if;

  -- Serialize reservations with one another and with Stage 1B finalization.
  perform 1 from public.workspaces w where w.id = p_workspace_id for update;
  if not found then
    raise exception 'workspace_not_found' using errcode = 'P0002';
  end if;

  perform 1
    from public.workspace_members wm
   where wm.workspace_id = p_workspace_id
     and wm.user_id = v_user_id
     and wm.role = 'owner'
   for share;
  if not found or not public.is_workspace_owner(p_workspace_id) then
    raise exception 'workspace_owner_required' using errcode = '42501';
  end if;

  -- Return a prior idempotent result even if billing became active afterward.
  select i.* into v_intent
    from public.razorpay_checkout_intents i
   where i.workspace_id = p_workspace_id
     and i.initiating_owner_id = v_user_id
     and i.request_key = p_request_key
   for update;
  if found then
    select c.* into v_plan
      from public.razorpay_plan_catalog c
     where c.id = v_intent.plan_catalog_id;
    if v_plan.provider_mode <> 'test'
       or v_plan.tier <> p_tier
       or v_plan.currency <> p_currency then
      raise exception 'idempotency_key_reused_for_different_plan' using errcode = '23505';
    end if;
    return v_intent;
  end if;

  -- Critical additional Stage 1B gate: active billing always blocks; canceled
  -- billing blocks while a paid-through entitlement is still in force.
  select b.* into v_billing
    from public.billing_subscriptions b
   where b.workspace_id = p_workspace_id
   for update;
  if found and (
    v_billing.status = 'active'
    or (v_billing.status = 'canceled' and v_billing.paid_through > v_now)
  ) then
    raise exception 'workspace_has_current_subscription' using errcode = '23514';
  end if;

  update public.razorpay_checkout_intents i
     set state = 'expired', closed_at = v_now,
         last_error_code = 'reservation_expired'
   where i.workspace_id = p_workspace_id
     and i.state = 'reserved'
     and i.reservation_expires_at <= v_now;

  if exists (
    select 1 from public.razorpay_checkout_intents i
     where i.workspace_id = p_workspace_id
       and i.state in ('reserved', 'provider_create_started', 'provider_created', 'reconciliation_required')
  ) then
    raise exception 'checkout_intent_already_open' using errcode = '23505';
  end if;

  select c.* into v_plan
    from public.razorpay_plan_catalog c
   where c.provider_mode = 'test'
     and c.tier = p_tier
     and c.currency = p_currency
     and c.state = 'active'
   for share;
  if not found then
    raise exception 'test_plan_not_available' using errcode = 'P0002';
  end if;

  insert into public.razorpay_checkout_intents (
    workspace_id, initiating_owner_id, plan_catalog_id, request_key,
    state, created_at, reservation_expires_at
  ) values (
    p_workspace_id, v_user_id, v_plan.id, p_request_key,
    'reserved', v_now, v_now + interval '15 minutes'
  ) returning * into v_intent;
  return v_intent;
end;
$$;

create or replace function public.start_razorpay_checkout_create(
  p_intent_id uuid,
  p_workspace_id uuid,
  p_initiating_owner_id uuid
)
returns table (
  provider_call_authorized boolean,
  intent_row jsonb,
  provider_plan_id text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_intent public.razorpay_checkout_intents%rowtype;
  v_provider_plan_id text;
  v_now timestamptz := clock_timestamp();
begin
  select i.* into v_intent
    from public.razorpay_checkout_intents i
   where i.id = p_intent_id
     and i.workspace_id = p_workspace_id
     and i.initiating_owner_id = p_initiating_owner_id
   for update;
  if not found then
    raise exception 'checkout_intent_not_found' using errcode = 'P0002';
  end if;

  if v_intent.state = 'reserved' and v_intent.reservation_expires_at > v_now then
    select c.provider_plan_id into v_provider_plan_id
      from public.razorpay_plan_catalog c
     where c.id = v_intent.plan_catalog_id
       and c.provider_mode = 'test'
       and c.state = 'active';
    if not found then
      update public.razorpay_checkout_intents i
         set state = 'failed', closed_at = v_now, last_error_code = 'plan_no_longer_active'
       where i.id = v_intent.id returning * into v_intent;
      return query select false, to_jsonb(v_intent), null::text;
      return;
    end if;
    update public.razorpay_checkout_intents i
       set state = 'provider_create_started', provider_create_started_at = v_now
     where i.id = v_intent.id returning * into v_intent;
    return query select true, to_jsonb(v_intent), v_provider_plan_id;
    return;
  end if;

  if v_intent.state = 'reserved' and v_intent.reservation_expires_at <= v_now then
    update public.razorpay_checkout_intents i
       set state = 'expired', closed_at = v_now,
           last_error_code = 'reservation_expired'
     where i.id = v_intent.id returning * into v_intent;
  end if;
  return query select false, to_jsonb(v_intent), null::text;
end;
$$;

create or replace function public.record_razorpay_subscription_created(
  p_intent_id uuid,
  p_provider_subscription_id text,
  p_provider_plan_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_intent public.razorpay_checkout_intents%rowtype;
  v_plan public.razorpay_plan_catalog%rowtype;
  v_binding public.razorpay_subscription_bindings%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if p_provider_subscription_id is null
     or p_provider_subscription_id !~ '^sub_[A-Za-z0-9]{1,80}$'
     or p_provider_plan_id is null
     or p_provider_plan_id !~ '^plan_[A-Za-z0-9]{1,80}$' then
    raise exception 'invalid_provider_response' using errcode = '22023';
  end if;

  select i.* into v_intent
    from public.razorpay_checkout_intents i where i.id = p_intent_id for update;
  if not found then
    raise exception 'checkout_intent_not_found' using errcode = 'P0002';
  end if;
  select c.* into v_plan
    from public.razorpay_plan_catalog c where c.id = v_intent.plan_catalog_id;

  if v_intent.state = 'provider_created' then
    select b.* into v_binding
      from public.razorpay_subscription_bindings b
     where b.checkout_intent_id = v_intent.id;
    if found and v_binding.provider_subscription_id = p_provider_subscription_id then
      return jsonb_build_object('outcome', 'already_recorded', 'intent_id', v_intent.id, 'binding_id', v_binding.id);
    end if;
    raise exception 'intent_already_bound_to_different_subscription' using errcode = '23505';
  end if;
  if v_intent.state <> 'provider_create_started' then
    raise exception 'intent_not_awaiting_provider_response' using errcode = '23514';
  end if;

  if v_plan.provider_mode <> 'test' or v_plan.provider_plan_id <> p_provider_plan_id then
    update public.razorpay_checkout_intents
       set state = 'reconciliation_required', last_error_code = 'provider_plan_mismatch'
     where id = v_intent.id;
    return jsonb_build_object('outcome', 'reconciliation_required', 'reason', 'provider_plan_mismatch', 'intent_id', v_intent.id);
  end if;

  if exists (
    select 1 from public.razorpay_subscription_bindings b
     where b.provider_subscription_id = p_provider_subscription_id
        or b.checkout_intent_id = v_intent.id
  ) then
    update public.razorpay_checkout_intents
       set state = 'reconciliation_required', last_error_code = 'provider_subscription_already_bound'
     where id = v_intent.id;
    return jsonb_build_object('outcome', 'reconciliation_required', 'reason', 'provider_subscription_already_bound', 'intent_id', v_intent.id);
  end if;

  begin
    insert into public.razorpay_subscription_bindings (
      provider_subscription_id, workspace_id, plan_catalog_id,
      checkout_intent_id, source, state, bound_at
    ) values (
      p_provider_subscription_id, v_intent.workspace_id, v_intent.plan_catalog_id,
      v_intent.id, 'checkout_intent', 'provider_created', v_now
    ) returning * into v_binding;
  exception when unique_violation then
    update public.razorpay_checkout_intents
       set state = 'reconciliation_required', last_error_code = 'provider_subscription_already_bound'
     where id = v_intent.id;
    return jsonb_build_object('outcome', 'reconciliation_required', 'reason', 'provider_subscription_already_bound', 'intent_id', v_intent.id);
  end;

  update public.razorpay_checkout_intents
     set state = 'provider_created', provider_created_at = v_now, last_error_code = null
   where id = v_intent.id;

  return jsonb_build_object('outcome', 'recorded', 'intent_id', v_intent.id, 'binding_id', v_binding.id,
                            'provider_subscription_id', v_binding.provider_subscription_id);
end;
$$;

create or replace function public.finish_razorpay_checkout_create_failure(
  p_intent_id uuid,
  p_is_ambiguous boolean,
  p_error_code text
)
returns public.razorpay_checkout_intents
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_intent public.razorpay_checkout_intents%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if p_error_code is null or p_error_code !~ '^[a-z0-9_]{1,80}$' then
    raise exception 'invalid_error_code' using errcode = '22023';
  end if;
  select i.* into v_intent from public.razorpay_checkout_intents i where i.id = p_intent_id for update;
  if not found then raise exception 'checkout_intent_not_found' using errcode = 'P0002'; end if;
  if v_intent.state <> 'provider_create_started' then return v_intent; end if;

  if p_is_ambiguous then
    update public.razorpay_checkout_intents
       set state = 'reconciliation_required', last_error_code = p_error_code
     where id = v_intent.id returning * into v_intent;
  else
    update public.razorpay_checkout_intents
       set state = 'failed', closed_at = v_now, last_error_code = p_error_code
     where id = v_intent.id returning * into v_intent;
  end if;
  return v_intent;
end;
$$;

create or replace function public.verify_razorpay_checkout_binding(
  p_intent_id uuid,
  p_provider_subscription_id text,
  p_provider_plan_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_intent public.razorpay_checkout_intents%rowtype;
  v_binding public.razorpay_subscription_bindings%rowtype;
  v_plan public.razorpay_plan_catalog%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  select i.* into v_intent from public.razorpay_checkout_intents i where i.id = p_intent_id for update;
  if not found then raise exception 'checkout_intent_not_found' using errcode = 'P0002'; end if;
  select b.* into v_binding
    from public.razorpay_subscription_bindings b
   where b.checkout_intent_id = v_intent.id for update;
  if not found or v_binding.provider_subscription_id <> p_provider_subscription_id then
    raise exception 'subscription_binding_mismatch' using errcode = '42501';
  end if;
  select c.* into v_plan from public.razorpay_plan_catalog c where c.id = v_binding.plan_catalog_id;

  if p_provider_subscription_id is null or p_provider_plan_id is null
     or p_provider_subscription_id !~ '^sub_[A-Za-z0-9]{1,80}$'
     or p_provider_plan_id !~ '^plan_[A-Za-z0-9]{1,80}$' then
    raise exception 'invalid_provider_response' using errcode = '22023';
  end if;

  if p_provider_plan_id <> v_plan.provider_plan_id then
    if v_intent.state = 'provider_created' then
      update public.razorpay_checkout_intents
         set state = 'reconciliation_required', last_error_code = 'provider_plan_mismatch'
       where id = v_intent.id;
      return jsonb_build_object('outcome', 'reconciliation_required', 'reason', 'provider_plan_mismatch');
    end if;
    return jsonb_build_object('outcome', 'rejected', 'reason', 'provider_plan_mismatch');
  end if;

  update public.razorpay_subscription_bindings
     set state = 'verified', verified_at = coalesce(verified_at, v_now)
   where id = v_binding.id;
  update public.razorpay_checkout_intents
     set state = 'verified', verified_at = coalesce(verified_at, v_now), last_error_code = null
   where id = v_intent.id;
  return jsonb_build_object('outcome', 'verified', 'intent_id', v_intent.id, 'binding_id', v_binding.id);
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
       'subscription.updated', 'payment.failed'
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

create or replace function public.claim_razorpay_webhook_work(p_limit integer default 20)
returns setof public.razorpay_webhook_work
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 100));
begin
  update public.razorpay_webhook_work w
     set state = 'dead_letter', lease_token = null, lease_expires_at = null,
         next_attempt_at = null, resolution_code = 'attempt_limit_exceeded',
         resolution_detail = 'Worker attempt limit exceeded.', updated_at = v_now,
         completed_at = v_now
   where w.attempt_count >= 12
     and (w.state in ('received', 'retryable')
          or (w.state = 'processing' and w.lease_expires_at <= v_now));

  return query
  with due as (
    select w.body_sha256
      from public.razorpay_webhook_work w
     where w.attempt_count < 12
       and ((w.state in ('received', 'retryable')
             and coalesce(w.next_attempt_at, '-infinity'::timestamptz) <= v_now)
         or (w.state = 'processing' and w.lease_expires_at <= v_now))
     order by coalesce(w.next_attempt_at, w.created_at), w.created_at
     for update skip locked
     limit v_limit
  )
  update public.razorpay_webhook_work w
     set state = 'processing', attempt_count = w.attempt_count + 1,
         lease_token = gen_random_uuid(), lease_expires_at = v_now + interval '2 minutes',
         next_attempt_at = null, updated_at = v_now
    from due where w.body_sha256 = due.body_sha256
  returning w.*;
end;
$$;

create or replace function public.razorpay_minor_to_major(p_currency text, p_amount_minor bigint)
returns numeric
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select p_amount_minor::numeric / case
    when p_currency in ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') then 1
    when p_currency in ('BHD','IQD','JOD','KWD','LYD','OMR','TND') then 1000
    else 100
  end
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
     or p_verified_status not in ('created','authenticated','active','pending','halted','paused','canceled','completed','expired')
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

-- All RPCs are SECURITY DEFINER with a fixed search_path. Only the owner-facing
-- reserve RPC is executable by authenticated; all other execution is service-only.
revoke all on function public.reserve_razorpay_checkout_intent(uuid,text,text,uuid) from public;
revoke all on function public.start_razorpay_checkout_create(uuid,uuid,uuid) from public;
revoke all on function public.record_razorpay_subscription_created(uuid,text,text) from public;
revoke all on function public.finish_razorpay_checkout_create_failure(uuid,boolean,text) from public;
revoke all on function public.verify_razorpay_checkout_binding(uuid,text,text) from public;
revoke all on function public.ingest_razorpay_webhook_work(text,text,text,timestamptz,text,text,text,timestamptz,uuid,uuid) from public;
revoke all on function public.claim_razorpay_webhook_work(integer) from public;
revoke all on function public.finalize_razorpay_webhook_work(text,uuid,text,text,text,text,text,timestamptz,text) from public;
revoke all on function public.razorpay_minor_to_major(text,bigint) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.reserve_razorpay_checkout_intent(uuid,text,text,uuid), public.start_razorpay_checkout_create(uuid,uuid,uuid), public.record_razorpay_subscription_created(uuid,text,text), public.finish_razorpay_checkout_create_failure(uuid,boolean,text), public.verify_razorpay_checkout_binding(uuid,text,text), public.ingest_razorpay_webhook_work(text,text,text,timestamptz,text,text,text,timestamptz,uuid,uuid), public.claim_razorpay_webhook_work(integer), public.finalize_razorpay_webhook_work(text,uuid,text,text,text,text,text,timestamptz,text), public.razorpay_minor_to_major(text,bigint) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.start_razorpay_checkout_create(uuid,uuid,uuid), public.record_razorpay_subscription_created(uuid,text,text), public.finish_razorpay_checkout_create_failure(uuid,boolean,text), public.verify_razorpay_checkout_binding(uuid,text,text), public.ingest_razorpay_webhook_work(text,text,text,timestamptz,text,text,text,timestamptz,uuid,uuid), public.claim_razorpay_webhook_work(integer), public.finalize_razorpay_webhook_work(text,uuid,text,text,text,text,text,timestamptz,text), public.razorpay_minor_to_major(text,bigint) from authenticated';
    execute 'grant execute on function public.reserve_razorpay_checkout_intent(uuid,text,text,uuid) to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'revoke all on function public.reserve_razorpay_checkout_intent(uuid,text,text,uuid) from service_role';
    execute 'grant execute on function public.start_razorpay_checkout_create(uuid,uuid,uuid), public.record_razorpay_subscription_created(uuid,text,text), public.finish_razorpay_checkout_create_failure(uuid,boolean,text), public.verify_razorpay_checkout_binding(uuid,text,text), public.ingest_razorpay_webhook_work(text,text,text,timestamptz,text,text,text,timestamptz,uuid,uuid), public.claim_razorpay_webhook_work(integer), public.finalize_razorpay_webhook_work(text,uuid,text,text,text,text,text,timestamptz,text) to service_role';
  end if;
end;
$$;

-- The deploy role must own these SECURITY DEFINER functions as the billing
-- table owner so the existing binding-id trigger permits the finalizer update.
do $$
declare
  v_owner name;
begin
  select pg_get_userbyid(c.relowner) into v_owner
    from pg_class c where c.oid = 'public.billing_subscriptions'::regclass;
  if v_owner is null then raise exception 'billing_subscriptions_owner_not_found'; end if;
  execute format('alter function public.finalize_razorpay_webhook_work(text,uuid,text,text,text,text,text,timestamptz,text) owner to %I', v_owner);
  execute format('alter function public.razorpay_minor_to_major(text,bigint) owner to %I', v_owner);
end;
$$;
