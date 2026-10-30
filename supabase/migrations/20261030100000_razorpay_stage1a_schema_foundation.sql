-- Stage 1A Razorpay billing schema foundation (inert, additive only).
--
-- This migration creates storage and constraints only. It intentionally does
-- NOT seed Plans, create billing-execution RPCs, modify billing runtime code,
-- change grants on the existing apply_razorpay_subscription_event function,
-- or modify billing_webhook_events. No new runtime role is granted access.
--
-- Existing billing_subscriptions rows retain NULL razorpay_binding_id. The
-- column-level trigger prevents an existing broad table UPDATE grant (for
-- example, a managed Supabase service role grant) from being used to populate
-- this new reference outside a database-owner/SECURITY DEFINER path. Stage 1B
-- must replace/retire that inert guard as part of an explicitly approved cutover.

-- ── 1. Trusted, initially inactive provider Plan catalog ──────────────
create table public.razorpay_plan_catalog (
  id uuid primary key default gen_random_uuid(),
  provider_mode text not null
    check (provider_mode in ('test', 'live')),
  provider_plan_id text not null
    check (provider_plan_id ~ '^plan_[A-Za-z0-9]{1,80}$'),
  tier text not null
    check (tier in ('pro', 'starter', 'team')),
  currency text not null
    check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null
    check (amount_minor > 0),
  interval_unit text not null default 'month'
    check (interval_unit = 'month'),
  interval_count smallint not null default 1
    check (interval_count = 1),
  included_seats smallint,
  state text not null default 'inactive'
    check (state in ('inactive', 'active', 'retired')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  retired_at timestamptz,
  constraint razorpay_plan_catalog_mode_plan_id_key
    unique (provider_mode, provider_plan_id),
  constraint razorpay_plan_catalog_tier_seats_check
    check (
      (tier = 'pro' and included_seats is null)
      or (tier = 'starter' and included_seats = 1)
      or (tier = 'team' and included_seats = 5)
    ),
  constraint razorpay_plan_catalog_retired_at_check
    check ((state = 'retired') = (retired_at is not null))
);

create unique index razorpay_plan_catalog_one_active_tier_key
  on public.razorpay_plan_catalog
    (provider_mode, tier, currency, interval_unit, interval_count)
  where state = 'active';

create function public.guard_razorpay_plan_catalog()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.state <> 'inactive' or new.retired_at is not null then
      raise exception 'razorpay_plan_must_start_inactive' using errcode = '23514';
    end if;
    return new;
  end if;

  if row(
       new.provider_mode, new.provider_plan_id, new.tier, new.currency,
       new.amount_minor, new.interval_unit, new.interval_count,
       new.included_seats, new.created_at, new.created_by
     ) is distinct from row(
       old.provider_mode, old.provider_plan_id, old.tier, old.currency,
       old.amount_minor, old.interval_unit, old.interval_count,
       old.included_seats, old.created_at, old.created_by
     ) then
    raise exception 'razorpay_plan_identity_and_pricing_are_immutable' using errcode = '23514';
  end if;

  if new.state = old.state then
    if new.retired_at is distinct from old.retired_at then
      raise exception 'razorpay_plan_lifecycle_fields_must_change_together' using errcode = '23514';
    end if;
    return new;
  end if;

  if old.state = 'inactive' and new.state = 'active' and new.retired_at is null then
    return new;
  end if;

  if old.state in ('inactive', 'active')
     and new.state = 'retired'
     and new.retired_at is not null then
    return new;
  end if;

  raise exception 'invalid_razorpay_plan_lifecycle_transition' using errcode = '23514';
end;
$$;

create trigger razorpay_plan_catalog_guard
  before insert or update on public.razorpay_plan_catalog
  for each row execute function public.guard_razorpay_plan_catalog();

-- ── 2. Server-authorized checkout intent reservations ─────────────────
create table public.razorpay_checkout_intents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  initiating_owner_id uuid not null references auth.users(id) on delete restrict,
  plan_catalog_id uuid not null references public.razorpay_plan_catalog(id) on delete restrict,
  request_key uuid not null,
  state text not null default 'reserved'
    check (state in (
      'reserved', 'provider_create_started', 'provider_created', 'verified',
      'reconciliation_required', 'failed', 'expired'
    )),
  created_at timestamptz not null default now(),
  reservation_expires_at timestamptz not null,
  provider_create_started_at timestamptz,
  provider_created_at timestamptz,
  verified_at timestamptz,
  closed_at timestamptz,
  last_error_code text,
  constraint razorpay_checkout_intents_request_key
    unique (workspace_id, initiating_owner_id, request_key),
  -- Referenced by the binding composite FK: a binding must use this exact
  -- intent, workspace, and catalog row.
  constraint razorpay_checkout_intents_binding_target_key
    unique (id, workspace_id, plan_catalog_id),
  constraint razorpay_checkout_intents_expiry_check
    check (reservation_expires_at > created_at),
  constraint razorpay_checkout_intents_timestamp_shape_check
    check (
      (provider_create_started_at is null or provider_create_started_at >= created_at)
      and (provider_created_at is null or provider_create_started_at is not null)
      and (verified_at is null or provider_created_at is not null)
      and (
        (state = 'reserved'
          and provider_create_started_at is null
          and provider_created_at is null
          and verified_at is null
          and closed_at is null)
        or (state = 'provider_create_started'
          and provider_create_started_at is not null
          and provider_created_at is null
          and verified_at is null
          and closed_at is null)
        or (state = 'provider_created'
          and provider_create_started_at is not null
          and provider_created_at is not null
          and verified_at is null
          and closed_at is null)
        or (state = 'verified'
          and provider_create_started_at is not null
          and provider_created_at is not null
          and verified_at is not null)
        or (state = 'reconciliation_required'
          and provider_create_started_at is not null
          and verified_at is null
          and closed_at is null)
        or (state in ('failed', 'expired')
          and closed_at is not null
          and verified_at is null)
      )
    )
);

create unique index razorpay_checkout_intents_one_open_per_workspace
  on public.razorpay_checkout_intents (workspace_id)
  where state in (
    'reserved', 'provider_create_started', 'provider_created', 'reconciliation_required'
  );

create index razorpay_checkout_intents_workspace_state_created_idx
  on public.razorpay_checkout_intents (workspace_id, state, created_at desc);

-- ── 3. Canonical provider-subscription binding registry ───────────────
create table public.razorpay_subscription_bindings (
  id uuid primary key default gen_random_uuid(),
  provider_subscription_id text not null
    check (provider_subscription_id ~ '^sub_[A-Za-z0-9]{1,80}$'),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  plan_catalog_id uuid not null references public.razorpay_plan_catalog(id) on delete restrict,
  checkout_intent_id uuid,
  source text not null,
  state text not null
    check (state in ('provider_created', 'verified', 'legacy_verified')),
  bound_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  approval_ref text,
  constraint razorpay_subscription_bindings_provider_subscription_key
    unique (provider_subscription_id),
  constraint razorpay_subscription_bindings_checkout_intent_key
    unique (checkout_intent_id),
  -- Referenced by billing_subscriptions' composite FK.
  constraint razorpay_subscription_bindings_billing_target_key
    unique (id, workspace_id, provider_subscription_id),
  constraint razorpay_subscription_bindings_intent_workspace_plan_fkey
    foreign key (checkout_intent_id, workspace_id, plan_catalog_id)
    references public.razorpay_checkout_intents (id, workspace_id, plan_catalog_id)
    on delete restrict,
  constraint razorpay_subscription_bindings_source_check
    check (
      (source = 'checkout_intent'
        and checkout_intent_id is not null
        and approval_ref is null
        and state in ('provider_created', 'verified'))
      or (source = 'operator_reconciled'
        and checkout_intent_id is null
        and approval_ref is not null
        and length(btrim(approval_ref)) > 0
        and verified_by is not null
        and state = 'legacy_verified')
    ),
  constraint razorpay_subscription_bindings_verified_at_check
    check (
      (state = 'provider_created' and verified_at is null)
      or (state in ('verified', 'legacy_verified') and verified_at is not null)
    )
);

create index razorpay_subscription_bindings_workspace_state_idx
  on public.razorpay_subscription_bindings (workspace_id, state);

-- ── 4. Durable, body-hash-keyed webhook work ──────────────────────────
create table public.razorpay_webhook_work (
  body_sha256 text primary key
    check (body_sha256 ~ '^[0-9a-f]{64}$'),
  event_id_header text
    check (event_id_header is null or char_length(event_id_header) <= 128),
  event_type text not null
    check (char_length(event_type) between 1 and 100),
  event_created_at timestamptz not null,
  provider_subscription_id text
    check (provider_subscription_id is null or provider_subscription_id ~ '^sub_[A-Za-z0-9]{1,80}$'),
  claimed_plan_id text
    check (claimed_plan_id is null or claimed_plan_id ~ '^plan_[A-Za-z0-9]{1,80}$'),
  claimed_status text
    check (claimed_status is null or claimed_status in (
      'created', 'authenticated', 'active', 'pending', 'halted', 'paused',
      'canceled', 'completed', 'expired'
    )),
  claimed_current_end timestamptz,
  -- Untrusted note-derived hint. Deliberately no FK and never authorization.
  candidate_intent_id uuid,
  resolved_intent_id uuid references public.razorpay_checkout_intents(id) on delete set null,
  resolved_binding_id uuid references public.razorpay_subscription_bindings(id) on delete set null,
  resolved_workspace_id uuid references public.workspaces(id) on delete set null,
  state text not null default 'received'
    check (state in (
      'received', 'processing', 'retryable', 'unresolved', 'applied', 'stale',
      'superseded', 'rejected', 'ignored', 'dead_letter'
    )),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  resolution_code text,
  resolution_detail text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint razorpay_webhook_work_lease_shape_check
    check (
      (state = 'processing' and lease_token is not null and lease_expires_at is not null)
      or (state <> 'processing' and lease_token is null and lease_expires_at is null)
    )
);

create index razorpay_webhook_work_due_idx
  on public.razorpay_webhook_work (next_attempt_at, created_at)
  where state in ('received', 'retryable');

create index razorpay_webhook_work_state_created_idx
  on public.razorpay_webhook_work (state, created_at);

create index razorpay_webhook_work_subscription_idx
  on public.razorpay_webhook_work (provider_subscription_id)
  where provider_subscription_id is not null;

create index razorpay_webhook_work_candidate_intent_idx
  on public.razorpay_webhook_work (candidate_intent_id)
  where candidate_intent_id is not null;

-- ── 5. Nullable, composite-checked billing reference ──────────────────
alter table public.billing_subscriptions
  add column razorpay_binding_id uuid,
  add constraint billing_subscriptions_razorpay_binding_unique
    unique (razorpay_binding_id),
  add constraint billing_subscriptions_razorpay_binding_requires_razorpay_id
    check (
      razorpay_binding_id is null
      or (provider = 'razorpay' and razorpay_subscription_id is not null)
    ),
  add constraint billing_subscriptions_razorpay_binding_fkey
    foreign key (razorpay_binding_id, workspace_id, razorpay_subscription_id)
    references public.razorpay_subscription_bindings
      (id, workspace_id, provider_subscription_id);

create function public.guard_billing_razorpay_binding_id()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_table_owner name;
begin
  if tg_op = 'INSERT' then
    if new.razorpay_binding_id is null then
      return new;
    end if;
  elsif new.razorpay_binding_id is not distinct from old.razorpay_binding_id then
    return new;
  end if;

  select pg_catalog.pg_get_userbyid(c.relowner)
    into v_table_owner
    from pg_catalog.pg_class c
   where c.oid = 'public.billing_subscriptions'::pg_catalog.regclass;

  if current_user <> v_table_owner then
    raise exception 'razorpay_binding_reference_is_inert_until_guarded_integration' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger billing_subscriptions_guard_razorpay_binding_id
  before insert or update on public.billing_subscriptions
  for each row execute function public.guard_billing_razorpay_binding_id();

-- ── 6. RLS and explicit inert grants ─────────────────────────────────
-- No policies are created. RLS blocks API roles; explicit revokes also cover
-- managed Supabase/default ACL grants, including service_role on new tables.
alter table public.razorpay_plan_catalog enable row level security;
alter table public.razorpay_checkout_intents enable row level security;
alter table public.razorpay_subscription_bindings enable row level security;
alter table public.razorpay_webhook_work enable row level security;

revoke all privileges on table public.razorpay_plan_catalog from public;
revoke all privileges on table public.razorpay_checkout_intents from public;
revoke all privileges on table public.razorpay_subscription_bindings from public;
revoke all privileges on table public.razorpay_webhook_work from public;

-- Supabase provides these roles; conditional revokes also let plain local
-- PostgreSQL/PGlite migration harnesses run without manufacturing platform roles.
do $$
declare
  v_role name;
begin
  foreach v_role in array array['anon'::name, 'authenticated'::name, 'service_role'::name] loop
    if exists (select 1 from pg_catalog.pg_roles where rolname = v_role) then
      execute format(
        'revoke all privileges on table public.razorpay_plan_catalog, public.razorpay_checkout_intents, public.razorpay_subscription_bindings, public.razorpay_webhook_work from %I',
        v_role
      );
    end if;
  end loop;
end;
$$;

-- PostgreSQL grants EXECUTE to PUBLIC on functions by default. These functions
-- are trigger-only helpers, not RPCs; remove that default and runtime grants.
revoke all privileges on function public.guard_razorpay_plan_catalog() from public;
revoke all privileges on function public.guard_billing_razorpay_binding_id() from public;

do $$
declare
  v_role name;
begin
  foreach v_role in array array['anon'::name, 'authenticated'::name, 'service_role'::name] loop
    if exists (select 1 from pg_catalog.pg_roles where rolname = v_role) then
      execute format(
        'revoke all privileges on function public.guard_razorpay_plan_catalog(), public.guard_billing_razorpay_binding_id() from %I',
        v_role
      );
    end if;
  end loop;
end;
$$;
