-- Fix: a completed checkout could deadlock the workspace permanently.
--
-- Stage 1B's reserve_razorpay_checkout_intent only expired intents in state
-- 'reserved' whose reservation had lapsed. An intent that reached
-- 'provider_create_started' or 'provider_created' was never expired, because
-- the expiry filter excluded those states. Once such a row existed, every
-- later reserve raised checkout_intent_already_open forever:
--
--   update ... where state = 'reserved' and reservation_expires_at <= now()
--   if exists (... state in ('reserved','provider_create_started',
--                            'provider_created','reconciliation_required'))
--     raise exception 'checkout_intent_already_open'
--
-- Observed in production as: a Razorpay subscription was created (so a real
-- sub_ row exists at Razorpay and razorpay_subscription_bindings holds it),
-- but the Stripe-style "returned to site" redirect happened without any
-- provider confirmation being processed. The plan did not activate, and
-- Choose plan answered intent_already_open from then on, for both tiers.
--
-- The window matters: the expression index only covers
-- reservation_expires_at, so 'provider_create_started' and 'provider_created'
-- rows are unreachable by the expiry sweep no matter what. This migration
-- widens the sweep to every open state.
--
-- Safety of expiring a provider_created intent:
--   * The binding row in razorpay_subscription_bindings is untouched. An
--     intent reaching 'verified' is excluded from this sweep.
--   * finalize_razorpay_webhook_work resolves the target subscription from the
--     binding/work row, not from the intent state, so a late webhook for an
--     already-created subscription still applies normally.
--   * The partial unique index only covers active rows, so a new reservation
--     can coexist with the expired row.
--
-- Additive and idempotent: create or replace only, no table or column change.

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
  v_user_id uuid;
  v_now timestamptz := now();
  v_intent public.razorpay_checkout_intents;
  v_plan public.razorpay_plan_catalog;
  v_billing public.billing_subscriptions;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_workspace_id is null or p_request_key is null
     or p_currency is null or char_length(p_currency) <> 3 then
    raise exception 'invalid_checkout_request' using errcode = '22023';
  end if;

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
  if not found then
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

  -- Expire every lapsed open intent, not just 'reserved'.
  --
  -- Previously this was `state = 'reserved' and reservation_expires_at <= v_now`,
  -- which left 'provider_create_started' and 'provider_created' rows in place
  -- forever: the expression index on reservation_expires_at does not cover
  -- them, and the gate below raises on all four open states. A checkout that
  -- created its subscription but never received confirmation therefore blocked
  -- the workspace permanently. Widening to the full open set restores the
  -- intended behaviour — an abandoned checkout stops blocking after 15 minutes.
  --
  -- 'reconciliation_required' is deliberately included: it is only set for
  -- provider mismatches and duplicate bindings, and it must not gate a user
  -- out indefinitely. 'verified' is excluded; that is a completed checkout.
  update public.razorpay_checkout_intents i
     set state = 'expired', closed_at = v_now,
         last_error_code = 'reservation_expired'
   where i.workspace_id = p_workspace_id
     and i.state in ('reserved', 'provider_create_started',
                     'provider_created', 'reconciliation_required')
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

revoke all on function public.reserve_razorpay_checkout_intent(uuid,text,text,uuid) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.reserve_razorpay_checkout_intent(uuid,text,text,uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.reserve_razorpay_checkout_intent(uuid,text,text,uuid) to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'revoke all on function public.reserve_razorpay_checkout_intent(uuid,text,text,uuid) from service_role';
  end if;
end;
$$;
