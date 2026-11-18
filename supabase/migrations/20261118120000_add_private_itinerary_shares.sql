-- Private, revocable client-facing itinerary links. Tokens are stored only as SHA-256 hashes.
create table if not exists public.itinerary_shares (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 itinerary_id uuid not null references public.itineraries(id) on delete cascade,
 token_hash text not null unique,
 expires_at timestamptz,
 revoked_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 last_viewed_at timestamptz,
 view_count integer not null default 0 check (view_count >= 0)
);
create index if not exists itinerary_shares_itinerary_idx on public.itinerary_shares(itinerary_id,created_at desc);
create index if not exists itinerary_shares_org_idx on public.itinerary_shares(organization_id);
alter table public.itinerary_shares enable row level security;
drop policy if exists itinerary_shares_select_org on public.itinerary_shares;
drop policy if exists itinerary_shares_insert_org on public.itinerary_shares;
drop policy if exists itinerary_shares_update_org on public.itinerary_shares;
create policy itinerary_shares_select_org on public.itinerary_shares for select to authenticated using (
 public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or exists (
  select 1 from public.itineraries i join public.clients c on c.id=i.client_id
  where i.id=itinerary_shares.itinerary_id and c.consultant_id=(select auth.uid())
 ))
);
create policy itinerary_shares_insert_org on public.itinerary_shares for insert to authenticated with check (
 public.is_org_member(organization_id) and created_by=(select auth.uid()) and exists (
  select 1 from public.itineraries i where i.id=itinerary_shares.itinerary_id and i.organization_id=itinerary_shares.organization_id
  and (public.is_org_admin(organization_id) or exists(select 1 from public.clients c where c.id=i.client_id and c.consultant_id=(select auth.uid())))
 )
);
create policy itinerary_shares_update_org on public.itinerary_shares for update to authenticated using (
 public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or exists (
  select 1 from public.itineraries i join public.clients c on c.id=i.client_id
  where i.id=itinerary_shares.itinerary_id and c.consultant_id=(select auth.uid())
 )) 
) with check (public.is_org_member(organization_id));
grant select,insert,update on public.itinerary_shares to authenticated;
revoke all on public.itinerary_shares from anon;
