-- Secure platform-level operator administration.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to authenticated;
drop policy if exists "platform admins can see their own grant" on public.platform_admins;
create policy "platform admins can see their own grant" on public.platform_admins
for select to authenticated using (user_id=auth.uid());
insert into public.platform_admins(user_id)
values ('c7ee51c7-aa45-4eb8-a785-b65448ad3707'::uuid)
on conflict(user_id) do nothing;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.platform_admins pa
   join public.profiles p on p.id=pa.user_id
   where pa.user_id=auth.uid() and p.active=true);
$$;
revoke all on function public.is_platform_admin() from public,anon;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.platform_admin_list_workspaces()
returns table (
 organization_id uuid, organization_name text, slug text, organization_status text,
 country text, currency text, plan_code text, subscription_status text,
 trial_started_at timestamptz, trial_ends_at timestamptz, current_period_ends_at timestamptz,
 staff_count bigint, client_count bigint, quotation_count bigint, booking_count bigint
)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_platform_admin() then raise exception 'Platform administrator access required.'; end if;
 return query
 select o.id,o.name,o.slug,o.status,o.country,o.currency,s.plan_code,s.status,
        s.trial_started_at,s.trial_ends_at,s.current_period_ends_at,
        (select count(*) from public.organization_memberships m where m.organization_id=o.id and m.active=true),
        (select count(*) from public.clients c where c.organization_id=o.id),
        (select count(*) from public.quotations q where q.organization_id=o.id),
        (select count(*) from public.bookings b where b.organization_id=o.id)
 from public.organizations o left join public.organization_subscriptions s on s.organization_id=o.id
 order by o.created_at desc;
end;
$$;
revoke all on function public.platform_admin_list_workspaces() from public,anon;
grant execute on function public.platform_admin_list_workspaces() to authenticated;

create or replace function public.platform_admin_update_subscription(
 p_organization_id uuid,p_plan_code text,p_status text,
 p_trial_ends_at timestamptz default null,p_current_period_ends_at timestamptz default null
)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_platform_admin() then raise exception 'Platform administrator access required.'; end if;
 if p_status not in ('trial','active','trial_expired','past_due','suspended','cancelled') then raise exception 'Unsupported subscription status.'; end if;
 if not exists(select 1 from public.subscription_plans where code=p_plan_code) then raise exception 'Unknown subscription plan.'; end if;
 update public.organization_subscriptions
 set plan_code=p_plan_code,status=p_status,
     trial_ends_at=coalesce(p_trial_ends_at,trial_ends_at),
     current_period_ends_at=coalesce(p_current_period_ends_at,current_period_ends_at),
     updated_at=now()
 where organization_id=p_organization_id;
 if not found then raise exception 'Subscription record not found for this workspace.'; end if;
end;
$$;
revoke all on function public.platform_admin_update_subscription(uuid,text,text,timestamptz,timestamptz) from public,anon;
grant execute on function public.platform_admin_update_subscription(uuid,text,text,timestamptz,timestamptz) to authenticated;
