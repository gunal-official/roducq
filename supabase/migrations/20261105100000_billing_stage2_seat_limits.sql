-- Stage 2 billing: preserve contact-only Studio while supporting its
-- operator-managed seat tier, and enforce invitation capacity atomically.
-- This migration is intentionally additive to billing runtime behavior.

-- Studio is not a client-checkout tier. It is allowed in trusted catalog and
-- billing metadata so contact-led plans can be represented and enforce 15 seats.
alter table public.razorpay_plan_catalog
  drop constraint if exists razorpay_plan_catalog_tier_check,
  drop constraint if exists razorpay_plan_catalog_tier_seats_check;

alter table public.razorpay_plan_catalog
  add constraint razorpay_plan_catalog_tier_check
    check (tier in ('pro', 'starter', 'team', 'studio')),
  add constraint razorpay_plan_catalog_tier_seats_check
    check (
      (tier = 'pro' and included_seats is null)
      or (tier = 'starter' and included_seats = 1)
      or (tier = 'team' and included_seats = 5)
      or (tier = 'studio' and included_seats = 15)
    );

alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_plan_name_check;
alter table public.billing_subscriptions
  add constraint billing_subscriptions_plan_name_check
    check (plan_name is null or plan_name in ('pro', 'starter', 'team', 'studio'));

-- Shared SQL policy for both invite insertion and invitation acceptance.
-- Payment status/date are fail-closed; canceled subscriptions retain seats
-- only through their verified paid-through time.
create or replace function public.workspace_billing_seat_limit(p_workspace_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_plan text;
  v_status text;
  v_paid_through timestamptz;
begin
  select b.plan_name, b.status, b.paid_through
    into v_plan, v_status, v_paid_through
    from public.billing_subscriptions b
   where b.workspace_id = p_workspace_id;

  if v_paid_through is null
     or v_paid_through <= clock_timestamp()
     or coalesce(v_status, '') not in ('active', 'canceled') then
    return 1;
  end if;

  return case v_plan
    when 'team' then 5
    when 'studio' then 15
    else 1
  end;
end;
$$;

revoke all on function public.workspace_billing_seat_limit(uuid) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.workspace_billing_seat_limit(uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.workspace_billing_seat_limit(uuid) from authenticated';
  end if;
end;
$$;

-- Serialize invite creation per workspace so simultaneous requests cannot
-- both consume the same final seat. Active members and unexpired, live invites
-- both occupy a seat.
create or replace function public.enforce_team_invite_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_limit integer;
  v_members integer;
  v_pending_invites integer;
begin
  perform 1
    from public.workspaces w
   where w.id = new.workspace_id
   for update;
  if not found then
    raise exception 'workspace_not_found' using errcode = '23503';
  end if;

  v_limit := public.workspace_billing_seat_limit(new.workspace_id);
  select count(*) into v_members
    from public.workspace_members wm
   where wm.workspace_id = new.workspace_id;
  select count(*) into v_pending_invites
    from public.team_invites ti
   where ti.workspace_id = new.workspace_id
     and ti.accepted_at is null
     and ti.revoked_at is null
     and ti.expires_at > clock_timestamp();

  if v_members + v_pending_invites >= v_limit then
    raise exception 'workspace_seat_limit_reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_team_invite_seat_limit() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.enforce_team_invite_seat_limit() from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.enforce_team_invite_seat_limit() from authenticated';
  end if;
end;
$$;

create trigger team_invites_enforce_seat_limit
  before insert on public.team_invites
  for each row execute function public.enforce_team_invite_seat_limit();

-- Accepting a previously issued invitation also rechecks capacity. A plan
-- downgrade may occur after an invite was sent; existing members are kept,
-- but the pending invite cannot add a member beyond the new limit.
create or replace function public.accept_team_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.team_invites%rowtype;
  v_email text;
  v_limit integer;
  v_members integer;
  v_already_member boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select ti.* into v_invite
    from public.team_invites ti
   where ti.token = p_token
     and ti.revoked_at is null
     and ti.accepted_at is null
     and ti.expires_at > now()
   for update;

  if not found then
    raise exception 'invite_invalid_or_expired';
  end if;

  select u.email into v_email
    from auth.users u
   where u.id = auth.uid();

  if lower(btrim(v_invite.email)) <> lower(btrim(coalesce(v_email, ''))) then
    raise exception 'invite_email_mismatch';
  end if;

  -- Coordinate with invite creation and other acceptances for this workspace.
  perform 1
    from public.workspaces w
   where w.id = v_invite.workspace_id
   for update;
  if not found then
    raise exception 'invite_invalid_or_expired';
  end if;

  select exists (
    select 1 from public.workspace_members wm
     where wm.workspace_id = v_invite.workspace_id
       and wm.user_id = auth.uid()
  ) into v_already_member;

  -- Preserve the existing idempotent already-a-member acceptance path.
  if not v_already_member then
    v_limit := public.workspace_billing_seat_limit(v_invite.workspace_id);
    select count(*) into v_members
      from public.workspace_members wm
     where wm.workspace_id = v_invite.workspace_id;
    if v_members >= v_limit then
      raise exception 'workspace_seat_limit_reached' using errcode = '23514';
    end if;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (v_invite.workspace_id, auth.uid(), 'member');
  end if;

  update public.team_invites ti
     set accepted_at = now(),
         accepted_by = auth.uid()
   where ti.id = v_invite.id;

  return v_invite.workspace_id;
end;
$$;
