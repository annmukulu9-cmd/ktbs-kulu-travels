create or replace function public.admin_reassign_client_portfolio(
  p_client_id uuid,
  p_new_consultant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_client_name text;
  v_quotes integer := 0;
  v_bookings integer := 0;
begin
  v_org := public.current_organization_id();

  if v_org is null or not public.is_org_admin(v_org) then
    raise exception 'Only an active workspace administrator can reassign client portfolios.';
  end if;

  if p_new_consultant_id is null then
    raise exception 'Select an active consultant before reassigning this portfolio.';
  end if;

  if not exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.user_id
    where m.organization_id = v_org
      and m.user_id = p_new_consultant_id
      and m.active = true
      and p.active = true
      and p.role = 'consultant'
  ) then
    raise exception 'The selected consultant is not an active consultant in this workspace.';
  end if;

  select c.name into v_client_name
  from public.clients c
  where c.id = p_client_id
    and c.organization_id = v_org
  for update;

  if not found then
    raise exception 'Client not found in the active workspace.';
  end if;

  update public.clients
  set consultant_id = p_new_consultant_id,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_client_id
    and organization_id = v_org;

  update public.quotations
  set consultant_id = p_new_consultant_id,
      updated_at = now(),
      updated_by = auth.uid()
  where client_id = p_client_id
    and organization_id = v_org;
  get diagnostics v_quotes = row_count;

  update public.bookings
  set consultant_id = p_new_consultant_id,
      updated_at = now(),
      updated_by = auth.uid()
  where client_id = p_client_id
    and organization_id = v_org;
  get diagnostics v_bookings = row_count;

  return jsonb_build_object(
    'client_name', v_client_name,
    'consultant_id', p_new_consultant_id,
    'quotations_reassigned', v_quotes,
    'bookings_reassigned', v_bookings
  );
end;
$$;

revoke all on function public.admin_reassign_client_portfolio(uuid, uuid) from public;
revoke all on function public.admin_reassign_client_portfolio(uuid, uuid) from anon;
grant execute on function public.admin_reassign_client_portfolio(uuid, uuid) to authenticated;