drop policy if exists hotels_insert_tenant on public.hotels;
create policy hotels_insert_admin_tenant on public.hotels for insert to authenticated with check (public.is_org_admin(organization_id));
drop policy if exists suppliers_insert_tenant on public.suppliers;
create policy suppliers_insert_admin_tenant on public.suppliers for insert to authenticated with check (public.is_org_admin(organization_id));