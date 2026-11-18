-- Kulu AI Concierge conversation history
-- Conversations are private to their owner; organisation admins may view within their workspace.
create table public.kulu_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint kulu_ai_conversations_title_length check (char_length(title) between 1 and 160),
  constraint kulu_ai_conversations_id_org_user_unique unique (id, organization_id, user_id)
);

create table public.kulu_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  organization_id uuid not null,
  user_id uuid not null,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  created_at timestamptz not null default now(),
  constraint kulu_ai_messages_conversation_owner_fk
    foreign key (conversation_id, organization_id, user_id)
    references public.kulu_ai_conversations(id, organization_id, user_id)
    on delete cascade
);

create index kulu_ai_conversations_org_user_recent_idx
  on public.kulu_ai_conversations (organization_id, user_id, last_message_at desc);
create index kulu_ai_conversations_org_recent_idx
  on public.kulu_ai_conversations (organization_id, last_message_at desc);
create index kulu_ai_messages_conversation_created_idx
  on public.kulu_ai_messages (conversation_id, created_at);

alter table public.kulu_ai_conversations enable row level security;
alter table public.kulu_ai_messages enable row level security;

grant select, insert, update, delete on public.kulu_ai_conversations to authenticated;
grant select, insert, delete on public.kulu_ai_messages to authenticated;

create policy "kulu_ai_conversations_read_owner_or_org_admin"
on public.kulu_ai_conversations for select to authenticated
using (
  organization_id = (select public.current_organization_id())
  and (
    user_id = (select auth.uid())
    or public.is_org_admin(organization_id)
  )
);

create policy "kulu_ai_conversations_insert_owner"
on public.kulu_ai_conversations for insert to authenticated
with check (
  organization_id = (select public.current_organization_id())
  and user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.active = true
  )
);

create policy "kulu_ai_conversations_update_owner"
on public.kulu_ai_conversations for update to authenticated
using (
  organization_id = (select public.current_organization_id())
  and user_id = (select auth.uid())
)
with check (
  organization_id = (select public.current_organization_id())
  and user_id = (select auth.uid())
);

create policy "kulu_ai_conversations_delete_owner"
on public.kulu_ai_conversations for delete to authenticated
using (
  organization_id = (select public.current_organization_id())
  and user_id = (select auth.uid())
);

create policy "kulu_ai_messages_read_owner_or_org_admin"
on public.kulu_ai_messages for select to authenticated
using (
  organization_id = (select public.current_organization_id())
  and exists (
    select 1 from public.kulu_ai_conversations c
    where c.id = conversation_id
      and c.organization_id = kulu_ai_messages.organization_id
      and c.user_id = kulu_ai_messages.user_id
      and (
        c.user_id = (select auth.uid())
        or public.is_org_admin(c.organization_id)
      )
  )
);

create policy "kulu_ai_messages_insert_owner"
on public.kulu_ai_messages for insert to authenticated
with check (
  organization_id = (select public.current_organization_id())
  and user_id = (select auth.uid())
  and exists (
    select 1 from public.kulu_ai_conversations c
    where c.id = conversation_id
      and c.organization_id = kulu_ai_messages.organization_id
      and c.user_id = (select auth.uid())
  )
);

create policy "kulu_ai_messages_delete_owner"
on public.kulu_ai_messages for delete to authenticated
using (
  organization_id = (select public.current_organization_id())
  and user_id = (select auth.uid())
  and exists (
    select 1 from public.kulu_ai_conversations c
    where c.id = conversation_id
      and c.organization_id = kulu_ai_messages.organization_id
      and c.user_id = (select auth.uid())
  )
);

comment on table public.kulu_ai_conversations is
  'Persistent Kulu AI Concierge conversation headers; scoped to an organization and owning authenticated staff member.';
comment on table public.kulu_ai_messages is
  'Persistent Kulu AI Concierge messages; access follows the owning conversation and organization.';
