-- Allow active organization members, including consultants, to add shared hotel and supplier directory records.
-- Updates and deletes remain restricted to organization admins.

drop policy if exists hotels_insert_admin_tenant on public.hotels;
drop policy if exists hotels_insert_tenant on public.hotels;
create policy hotels_insert_tenant
on public.hotels for insert to authenticated
with check (public.is_org_member(organization_id));

drop policy if exists suppliers_insert_admin_tenant on public.suppliers;
drop policy if exists suppliers_insert_tenant on public.suppliers;
create policy suppliers_insert_tenant
on public.suppliers for insert to authenticated
with check (public.is_org_member(organization_id));
