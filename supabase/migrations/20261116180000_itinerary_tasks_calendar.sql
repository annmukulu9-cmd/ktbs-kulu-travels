-- KTBS itinerary builder, task management and calendar module
create table if not exists public.itineraries (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 client_id uuid references public.clients(id) on delete set null,
 booking_id uuid references public.bookings(id) on delete set null,
 title text not null,
 destination text,
 start_date date,
 end_date date,
 status text not null default 'Draft' check (status in ('Draft','Ready','Shared','Archived')),
 introduction text,
 days jsonb not null default '[]'::jsonb check (jsonb_typeof(days)='array'),
 created_by uuid references public.profiles(id),
 updated_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists itineraries_org_dates_idx on public.itineraries(organization_id,start_date);
create index if not exists itineraries_client_idx on public.itineraries(client_id);

create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null,
 description text,
 category text not null default 'General',
 priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
 status text not null default 'Open' check (status in ('Open','In Progress','Completed','Cancelled')),
 assigned_to uuid not null references public.profiles(id),
 client_id uuid references public.clients(id) on delete set null,
 booking_id uuid references public.bookings(id) on delete set null,
 due_at timestamptz,
 completed_at timestamptz,
 created_by uuid not null references public.profiles(id),
 updated_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists tasks_org_due_idx on public.tasks(organization_id,due_at);
create index if not exists tasks_assignee_status_idx on public.tasks(assigned_to,status,due_at);

create table if not exists public.calendar_events (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null,
 description text,
 event_type text not null default 'Other',
 start_at timestamptz not null,
 end_at timestamptz,
 all_day boolean not null default false,
 assigned_to uuid references public.profiles(id),
 client_id uuid references public.clients(id) on delete set null,
 booking_id uuid references public.bookings(id) on delete set null,
 created_by uuid not null references public.profiles(id),
 updated_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint calendar_events_end_after_start check (end_at is null or end_at >= start_at)
);
create index if not exists calendar_events_org_start_idx on public.calendar_events(organization_id,start_at);

alter table public.itineraries enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;

drop policy if exists itineraries_select_org on public.itineraries;
create policy itineraries_select_org on public.itineraries for select to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or exists(select 1 from public.clients c where c.id=itineraries.client_id and c.organization_id=itineraries.organization_id and c.consultant_id=auth.uid())));
drop policy if exists itineraries_insert_org on public.itineraries;
create policy itineraries_insert_org on public.itineraries for insert to authenticated
with check (
 public.is_org_member(organization_id) and created_by=auth.uid() and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=itineraries.booking_id and b.organization_id=itineraries.organization_id and (itineraries.client_id is null or b.client_id=itineraries.client_id))) and
 (public.is_org_admin(organization_id) or exists(select 1 from public.clients c where c.id=itineraries.client_id and c.organization_id=itineraries.organization_id and c.consultant_id=auth.uid()))
);
drop policy if exists itineraries_update_org on public.itineraries;
create policy itineraries_update_org on public.itineraries for update to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or exists(select 1 from public.clients c where c.id=itineraries.client_id and c.organization_id=itineraries.organization_id and c.consultant_id=auth.uid())))
with check (
 public.is_org_member(organization_id) and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=itineraries.booking_id and b.organization_id=itineraries.organization_id and (itineraries.client_id is null or b.client_id=itineraries.client_id))) and
 (public.is_org_admin(organization_id) or exists(select 1 from public.clients c where c.id=itineraries.client_id and c.organization_id=itineraries.organization_id and c.consultant_id=auth.uid()))
);
drop policy if exists itineraries_delete_admin on public.itineraries;
create policy itineraries_delete_admin on public.itineraries for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists tasks_select_org on public.tasks;
create policy tasks_select_org on public.tasks for select to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=auth.uid() or created_by=auth.uid() or exists(select 1 from public.clients c where c.id=tasks.client_id and c.organization_id=tasks.organization_id and c.consultant_id=auth.uid())));
drop policy if exists tasks_insert_org on public.tasks;
create policy tasks_insert_org on public.tasks for insert to authenticated
with check (
 public.is_org_member(organization_id) and created_by=auth.uid() and
 exists(select 1 from public.organization_memberships m join public.profiles p on p.id=m.user_id where m.organization_id=tasks.organization_id and m.user_id=tasks.assigned_to and m.active=true and p.active=true) and
 (client_id is null or exists(select 1 from public.clients c where c.id=tasks.client_id and c.organization_id=tasks.organization_id and (public.is_org_admin(organization_id) or c.consultant_id=auth.uid()))) and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=tasks.booking_id and b.organization_id=tasks.organization_id and (client_id is null or b.client_id=tasks.client_id))) and
 (public.is_org_admin(organization_id) or (assigned_to=auth.uid() and (client_id is null or exists(select 1 from public.clients c where c.id=tasks.client_id and c.organization_id=tasks.organization_id and c.consultant_id=auth.uid()))))
);
drop policy if exists tasks_update_org on public.tasks;
create policy tasks_update_org on public.tasks for update to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=auth.uid()))
with check (
 public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=auth.uid()) and
 exists(select 1 from public.organization_memberships m join public.profiles p on p.id=m.user_id where m.organization_id=tasks.organization_id and m.user_id=tasks.assigned_to and m.active=true and p.active=true) and
 (client_id is null or exists(select 1 from public.clients c where c.id=tasks.client_id and c.organization_id=tasks.organization_id and (public.is_org_admin(organization_id) or c.consultant_id=auth.uid()))) and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=tasks.booking_id and b.organization_id=tasks.organization_id and (client_id is null or b.client_id=tasks.client_id)))
);
drop policy if exists tasks_delete_org on public.tasks;
create policy tasks_delete_org on public.tasks for delete to authenticated using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or (created_by=auth.uid() and assigned_to=auth.uid())));

drop policy if exists calendar_events_select_org on public.calendar_events;
create policy calendar_events_select_org on public.calendar_events for select to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=auth.uid() or created_by=auth.uid() or exists(select 1 from public.clients c where c.id=calendar_events.client_id and c.organization_id=calendar_events.organization_id and c.consultant_id=auth.uid())));
drop policy if exists calendar_events_insert_org on public.calendar_events;
create policy calendar_events_insert_org on public.calendar_events for insert to authenticated
with check (
 public.is_org_member(organization_id) and created_by=auth.uid() and
 (assigned_to is null or exists(select 1 from public.organization_memberships m join public.profiles p on p.id=m.user_id where m.organization_id=calendar_events.organization_id and m.user_id=calendar_events.assigned_to and m.active=true and p.active=true)) and
 (client_id is null or exists(select 1 from public.clients c where c.id=calendar_events.client_id and c.organization_id=calendar_events.organization_id and (public.is_org_admin(organization_id) or c.consultant_id=auth.uid()))) and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=calendar_events.booking_id and b.organization_id=calendar_events.organization_id and (client_id is null or b.client_id=calendar_events.client_id))) and
 (public.is_org_admin(organization_id) or ((assigned_to is null or assigned_to=auth.uid()) and (client_id is null or exists(select 1 from public.clients c where c.id=calendar_events.client_id and c.organization_id=calendar_events.organization_id and c.consultant_id=auth.uid()))))
);
drop policy if exists calendar_events_update_org on public.calendar_events;
create policy calendar_events_update_org on public.calendar_events for update to authenticated
using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=auth.uid()))
with check (
 public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or assigned_to=auth.uid()) and
 (assigned_to is null or exists(select 1 from public.organization_memberships m join public.profiles p on p.id=m.user_id where m.organization_id=calendar_events.organization_id and m.user_id=calendar_events.assigned_to and m.active=true and p.active=true)) and
 (client_id is null or exists(select 1 from public.clients c where c.id=calendar_events.client_id and c.organization_id=calendar_events.organization_id and (public.is_org_admin(organization_id) or c.consultant_id=auth.uid()))) and
 (booking_id is null or exists(select 1 from public.bookings b where b.id=calendar_events.booking_id and b.organization_id=calendar_events.organization_id and (client_id is null or b.client_id=calendar_events.client_id)))
);
drop policy if exists calendar_events_delete_org on public.calendar_events;
create policy calendar_events_delete_org on public.calendar_events for delete to authenticated using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or created_by=auth.uid()));

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
