create or replace function public.prevent_profile_hard_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = 'Consultant profiles cannot be permanently deleted. Deactivate the account instead to preserve business records and audit history.';
end;
$$;

drop trigger if exists trg_prevent_profile_hard_delete on public.profiles;

create trigger trg_prevent_profile_hard_delete
before delete on public.profiles
for each row
execute function public.prevent_profile_hard_delete();