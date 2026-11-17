-- Prevent an expired workspace selection from overriding an operator's active primary workspace.
-- This is particularly important when a trial/test workspace has expired but the owner
-- still belongs to an active production workspace.
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select coalesce(
    (
      select c.organization_id
      from public.user_organization_context c
      where c.user_id = auth.uid()
        and public.is_org_member(c.organization_id)
        and exists (
          select 1
          from public.organization_subscriptions s
          where s.organization_id = c.organization_id
            and s.status in ('trial','active','past_due')
        )
      limit 1
    ),
    (
      select m.organization_id
      from public.organization_memberships m
      join public.profiles p on p.id = m.user_id
      join public.organizations o on o.id = m.organization_id
      join public.organization_subscriptions s on s.organization_id = m.organization_id
      where m.user_id = auth.uid()
        and m.active = true
        and p.active = true
        and o.status in ('trial','active','past_due')
        and s.status in ('trial','active','past_due')
      order by m.is_primary desc, m.created_at
      limit 1
    )
  );
$function$;
