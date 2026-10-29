-- Persist expired trial status when a workspace owner or staff member signs in.
create or replace function public.refresh_current_subscription_status()
returns text language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_status text;
begin
  v_org := public.current_organization_id();
  if v_org is null then return null; end if;
  update public.organization_subscriptions
     set status='trial_expired', updated_at=now()
   where organization_id=v_org and status='trial'
     and trial_ends_at is not null and trial_ends_at <= now();
  select status into v_status from public.organization_subscriptions where organization_id=v_org;
  return v_status;
end;
$$;
revoke all on function public.refresh_current_subscription_status() from public, anon;
grant execute on function public.refresh_current_subscription_status() to authenticated;
