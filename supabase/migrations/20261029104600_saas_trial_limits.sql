-- KTBS subscription trial foundation.
-- This source migration mirrors the database changes applied to the linked Supabase project.

alter table public.organizations
  add column if not exists country text not null default 'Kenya',
  add column if not exists currency text not null default 'KES';

create table if not exists public.subscription_plans (
  code text primary key,
  name text not null,
  price_monthly numeric(12,2) not null default 0 check (price_monthly >= 0),
  currency text not null default 'KES',
  trial_days integer not null default 14 check (trial_days >= 0),
  max_staff integer,
  max_clients integer,
  max_quotations integer,
  max_bookings integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.subscription_plans
  (code,name,price_monthly,currency,trial_days,max_staff,max_clients,max_quotations,max_bookings,active)
values
  ('trial','14-Day Limited Trial',0,'KES',14,2,100,25,10,true),
  ('starter','KTBS Starter',0,'KES',0,3,500,200,100,false),
  ('growth','KTBS Growth',0,'KES',0,10,5000,2000,1000,false)
on conflict (code) do update set
  name=excluded.name, trial_days=excluded.trial_days, max_staff=excluded.max_staff,
  max_clients=excluded.max_clients, max_quotations=excluded.max_quotations,
  max_bookings=excluded.max_bookings;

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  status text not null default 'trial'
    check (status in ('trial','active','trial_expired','past_due','suspended','cancelled')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  billing_provider text,
  billing_customer_ref text,
  billing_subscription_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;
alter table public.organization_subscriptions enable row level security;
drop policy if exists "subscription plans readable by everyone" on public.subscription_plans;
create policy "subscription plans readable by everyone" on public.subscription_plans
  for select to anon, authenticated using (active = true);
drop policy if exists "organization members can view their subscription" on public.organization_subscriptions;
create policy "organization members can view their subscription" on public.organization_subscriptions
  for select to authenticated using (public.is_org_member(organization_id));
revoke insert, update, delete on public.subscription_plans from anon, authenticated;
revoke insert, update, delete on public.organization_subscriptions from anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
grant select on public.organization_subscriptions to authenticated;

insert into public.organization_subscriptions (organization_id, plan_code, status, trial_started_at, trial_ends_at)
select id, 'trial', 'active', null, null from public.organizations where slug = 'kulu-travels'
on conflict (organization_id) do nothing;

create or replace function public.enforce_ktbs_trial_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_sub public.organization_subscriptions%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_count bigint;
  v_resource text;
  v_limit integer;
begin
  v_org := coalesce(new.organization_id, public.current_organization_id());
  if v_org is null then return new; end if;
  select * into v_sub from public.organization_subscriptions where organization_id = v_org;
  if not found then return new; end if;
  if v_sub.status = 'trial' and v_sub.trial_ends_at is not null and v_sub.trial_ends_at <= now() then
    update public.organization_subscriptions set status='trial_expired', updated_at=now()
      where organization_id=v_org and status='trial';
    raise exception 'Your KTBS free trial has expired. Choose a subscription plan to continue adding or changing records.';
  end if;
  if v_sub.status in ('trial_expired','past_due','suspended','cancelled') then
    raise exception 'This KTBS workspace is read-only because its subscription is %. Please contact KTBS support or update billing.', v_sub.status;
  end if;
  if v_sub.status <> 'trial' then return new; end if;
  select * into v_plan from public.subscription_plans where code=v_sub.plan_code;
  if not found then return new; end if;

  if tg_table_name='organization_memberships' then
    if new.active is not true then return new; end if;
    v_resource:='staff'; v_limit:=v_plan.max_staff;
    select count(*) into v_count from public.organization_memberships where organization_id=v_org and active=true;
  elsif tg_table_name='clients' then
    v_resource:='clients'; v_limit:=v_plan.max_clients;
    select count(*) into v_count from public.clients where organization_id=v_org;
  elsif tg_table_name='quotations' then
    v_resource:='quotations'; v_limit:=v_plan.max_quotations;
    select count(*) into v_count from public.quotations where organization_id=v_org;
  elsif tg_table_name='bookings' then
    v_resource:='bookings'; v_limit:=v_plan.max_bookings;
    select count(*) into v_count from public.bookings where organization_id=v_org;
  else return new;
  end if;
  if v_limit is not null and v_count >= v_limit then
    raise exception 'Your free trial limit for % is % records. Upgrade your KTBS plan to continue.', v_resource, v_limit;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_trial_limit_membership on public.organization_memberships;
create trigger enforce_trial_limit_membership before insert on public.organization_memberships
for each row execute function public.enforce_ktbs_trial_limits();
drop trigger if exists enforce_trial_limit_clients on public.clients;
create trigger enforce_trial_limit_clients before insert on public.clients
for each row execute function public.enforce_ktbs_trial_limits();
drop trigger if exists enforce_trial_limit_quotations on public.quotations;
create trigger enforce_trial_limit_quotations before insert on public.quotations
for each row execute function public.enforce_ktbs_trial_limits();
drop trigger if exists enforce_trial_limit_bookings on public.bookings;
create trigger enforce_trial_limit_bookings before insert on public.bookings
for each row execute function public.enforce_ktbs_trial_limits();

create or replace function public.enforce_ktbs_subscription_write_access()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_status text; v_end timestamptz;
begin
  v_org := coalesce(new.organization_id, public.current_organization_id());
  if v_org is null then return new; end if;
  select status, trial_ends_at into v_status, v_end from public.organization_subscriptions where organization_id=v_org;
  if v_status is null then return new; end if;
  if v_status='trial' and v_end is not null and v_end <= now() then
    update public.organization_subscriptions set status='trial_expired', updated_at=now()
      where organization_id=v_org and status='trial';
    raise exception 'Your KTBS free trial has expired. Choose a subscription plan to continue editing records.';
  end if;
  if v_status in ('trial_expired','past_due','suspended','cancelled') then
    raise exception 'This KTBS workspace is read-only because its subscription is %. Please contact KTBS support or update billing.', v_status;
  end if;
  return new;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['organization_memberships','clients','quotations','quotation_items','bookings','client_payments','supplier_payments','expenses','suppliers','hotels','services','travel_history'] loop
    execute format('drop trigger if exists enforce_subscription_write_%I on public.%I', t, t);
    execute format('create trigger enforce_subscription_write_%I before insert or update or delete on public.%I for each row execute function public.enforce_ktbs_subscription_write_access()', t, t);
  end loop;
end $$;
revoke all on function public.enforce_ktbs_trial_limits() from public, anon, authenticated;
revoke all on function public.enforce_ktbs_subscription_write_access() from public, anon, authenticated;

create table if not exists public.ktbs_signup_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists ktbs_signup_attempts_ip_time_idx on public.ktbs_signup_attempts (ip_hash, created_at desc);
alter table public.ktbs_signup_attempts enable row level security;
revoke all on public.ktbs_signup_attempts from anon, authenticated;
