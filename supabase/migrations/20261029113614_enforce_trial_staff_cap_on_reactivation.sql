-- Enforce the staff limit when reactivating an existing membership as well as on insert.
drop trigger if exists enforce_trial_limit_membership on public.organization_memberships;
create trigger enforce_trial_limit_membership
before insert or update of active on public.organization_memberships
for each row execute function public.enforce_ktbs_trial_limits();
