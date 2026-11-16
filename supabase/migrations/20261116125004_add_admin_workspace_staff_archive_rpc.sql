create or replace function public.admin_list_workspace_staff()
returns table (
  user_id uuid,
  full_name text,
  role text,
  profile_active boolean,
  membership_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  v_org := public.current_organization_id();
  if v_org is null or not public.is_org_admin(v_org) then
    raise exception 'Only an active workspace administrator can view staff records.';
  end if;

  return query
  select p.id, p.full_name, p.role, p.active, m.active, p.created_at
  from public.profiles p
  join public.organization_memberships m
    on m.user_id = p.id
   and m.organization_id = v_org
  order by p.active desc, p.full_name asc;
end;
$$;

revoke all on function public.admin_list_workspace_staff() from public;
revoke all on function public.admin_list_workspace_staff() from anon;
grant execute on function public.admin_list_workspace_staff() to authenticated;