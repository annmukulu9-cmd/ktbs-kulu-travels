-- Cover foreign keys on the new operational tables.
create index if not exists itineraries_booking_id_idx on public.itineraries(booking_id);
create index if not exists itineraries_created_by_idx on public.itineraries(created_by);
create index if not exists itineraries_updated_by_idx on public.itineraries(updated_by);
create index if not exists tasks_client_id_idx on public.tasks(client_id);
create index if not exists tasks_booking_id_idx on public.tasks(booking_id);
create index if not exists tasks_created_by_idx on public.tasks(created_by);
create index if not exists tasks_updated_by_idx on public.tasks(updated_by);
create index if not exists calendar_events_assigned_to_idx on public.calendar_events(assigned_to);
create index if not exists calendar_events_booking_id_idx on public.calendar_events(booking_id);
create index if not exists calendar_events_client_id_idx on public.calendar_events(client_id);
create index if not exists calendar_events_created_by_idx on public.calendar_events(created_by);
create index if not exists calendar_events_updated_by_idx on public.calendar_events(updated_by);

drop policy if exists itineraries_select_org on public.itineraries;
create policy itineraries_select_org on public.itineraries for select to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or exists(select 1 from public.clients c where c.id=itineraries.client_id and c.organization_id=itineraries.organization_id and c.consultant_id=(select auth.uid()))));
drop policy if exists itineraries_insert_org on public.itineraries;
create policy itineraries_insert_org on public.itineraries for insert to authenticated
with check (
 public.is_org_member(organization_id) and created_by=(select auth.uid()) and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=itineraries.booking_id and b.organization_id=itineraries.organization_id and (itineraries.client_id is null or b.client_id=itineraries.client_id))) and
 (public.is_org_admin(organization_id) or exists(select 1 from public.clients c where c.id=itineraries.client_id and c.organization_id=itineraries.organization_id and c.consultant_id=(select auth.uid())))
);
drop policy if exists itineraries_update_org on public.itineraries;
create policy itineraries_update_org on public.itineraries for update to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or exists(select 1 from public.clients c where c.id=itineraries.client_id and c.organization_id=itineraries.organization_id and c.consultant_id=(select auth.uid()))))
with check (
 public.is_org_member(organization_id) and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=itineraries.booking_id and b.organization_id=itineraries.organization_id and (itineraries.client_id is null or b.client_id=itineraries.client_id))) and
 (public.is_org_admin(organization_id) or exists(select 1 from public.clients c where c.id=itineraries.client_id and c.organization_id=itineraries.organization_id and c.consultant_id=(select auth.uid())))
);
drop policy if exists itineraries_delete_admin on public.itineraries;
create policy itineraries_delete_admin on public.itineraries for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists tasks_select_org on public.tasks;
create policy tasks_select_org on public.tasks for select to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=(select auth.uid()) or created_by=(select auth.uid()) or exists(select 1 from public.clients c where c.id=tasks.client_id and c.organization_id=tasks.organization_id and c.consultant_id=(select auth.uid()))));
drop policy if exists tasks_insert_org on public.tasks;
create policy tasks_insert_org on public.tasks for insert to authenticated
with check (
 public.is_org_member(organization_id) and created_by=(select auth.uid()) and
 exists(select 1 from public.organization_memberships m join public.profiles p on p.id=m.user_id where m.organization_id=tasks.organization_id and m.user_id=tasks.assigned_to and m.active=true and p.active=true) and
 (client_id is null or exists(select 1 from public.clients c where c.id=tasks.client_id and c.organization_id=tasks.organization_id and (public.is_org_admin(organization_id) or c.consultant_id=(select auth.uid())))) and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=tasks.booking_id and b.organization_id=tasks.organization_id and (client_id is null or b.client_id=tasks.client_id))) and
 (public.is_org_admin(organization_id) or (assigned_to=(select auth.uid()) and (client_id is null or exists(select 1 from public.clients c where c.id=tasks.client_id and c.organization_id=tasks.organization_id and c.consultant_id=(select auth.uid())))))
);
drop policy if exists tasks_update_org on public.tasks;
create policy tasks_update_org on public.tasks for update to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=(select auth.uid())))
with check (
 public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=(select auth.uid())) and
 exists(select 1 from public.organization_memberships m join public.profiles p on p.id=m.user_id where m.organization_id=tasks.organization_id and m.user_id=tasks.assigned_to and m.active=true and p.active=true) and
 (client_id is null or exists(select 1 from public.clients c where c.id=tasks.client_id and c.organization_id=tasks.organization_id and (public.is_org_admin(organization_id) or c.consultant_id=(select auth.uid())))) and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=tasks.booking_id and b.organization_id=tasks.organization_id and (client_id is null or b.client_id=tasks.client_id)))
);
drop policy if exists tasks_delete_org on public.tasks;
create policy tasks_delete_org on public.tasks for delete to authenticated using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or (created_by=(select auth.uid()) and assigned_to=(select auth.uid()))));

drop policy if exists calendar_events_select_org on public.calendar_events;
create policy calendar_events_select_org on public.calendar_events for select to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=(select auth.uid()) or created_by=(select auth.uid()) or exists(select 1 from public.clients c where c.id=calendar_events.client_id and c.organization_id=calendar_events.organization_id and c.consultant_id=(select auth.uid()))));
drop policy if exists calendar_events_insert_org on public.calendar_events;
create policy calendar_events_insert_org on public.calendar_events for insert to authenticated
with check (
 public.is_org_member(organization_id) and created_by=(select auth.uid()) and
 (assigned_to is null or exists(select 1 from public.organization_memberships m join public.profiles p on p.id=m.user_id where m.organization_id=calendar_events.organization_id and m.user_id=calendar_events.assigned_to and m.active=true and p.active=true)) and
 (client_id is null or exists(select 1 from public.clients c where c.id=calendar_events.client_id and c.organization_id=calendar_events.organization_id and (public.is_org_admin(organization_id) or c.consultant_id=(select auth.uid())))) and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=calendar_events.booking_id and b.organization_id=calendar_events.organization_id and (client_id is null or b.client_id=calendar_events.client_id))) and
 (public.is_org_admin(organization_id) or ((assigned_to is null or assigned_to=(select auth.uid())) and (client_id is null or exists(select 1 from public.clients c where c.id=calendar_events.client_id and c.organization_id=calendar_events.organization_id and c.consultant_id=(select auth.uid())))))
);
drop policy if exists calendar_events_update_org on public.calendar_events;
create policy calendar_events_update_org on public.calendar_events for update to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=(select auth.uid())))
with check (
 public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=(select auth.uid())) and
 (assigned_to is null or exists(select 1 from public.organization_memberships m join public.profiles p on p.id=m.user_id where m.organization_id=calendar_events.organization_id and m.user_id=calendar_events.assigned_to and m.active=true and p.active=true)) and
 (client_id is null or exists(select 1 from public.clients c where c.id=calendar_events.client_id and c.organization_id=calendar_events.organization_id and (public.is_org_admin(organization_id) or c.consultant_id=(select auth.uid())))) and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=calendar_events.booking_id and b.organization_id=calendar_events.organization_id and (client_id is null or b.client_id=calendar_events.client_id)))
);
drop policy if exists calendar_events_delete_org on public.calendar_events;
create policy calendar_events_delete_org on public.calendar_events for delete to authenticated using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or created_by=(select auth.uid())));

grant select,insert,update,delete on public.itineraries,public.tasks,public.calendar_events to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('itinerary-images','itinerary-images',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists itinerary_images_select_org on storage.objects;
create policy itinerary_images_select_org on storage.objects for select to authenticated
using (bucket_id='itinerary-images' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.is_org_member(public.current_organization_id()) and ((storage.foldername(name))[2]=(select auth.uid())::text or exists(select 1 from public.itineraries i where i.id::text=(storage.foldername(name))[3] and i.organization_id=public.current_organization_id())));
drop policy if exists itinerary_images_insert_org on storage.objects;
create policy itinerary_images_insert_org on storage.objects for insert to authenticated
with check (bucket_id='itinerary-images' and (storage.foldername(name))[1]=public.current_organization_id()::text and (storage.foldername(name))[2]=(select auth.uid())::text and public.is_org_member(public.current_organization_id()));
drop policy if exists itinerary_images_delete_org on storage.objects;
create policy itinerary_images_delete_org on storage.objects for delete to authenticated
using (bucket_id='itinerary-images' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.is_org_member(public.current_organization_id()) and ((storage.foldername(name))[2]=(select auth.uid())::text or public.is_org_admin(public.current_organization_id()) or exists(select 1 from public.itineraries i where i.id::text=(storage.foldername(name))[3] and i.organization_id=public.current_organization_id())));
