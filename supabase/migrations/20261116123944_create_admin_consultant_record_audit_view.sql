create or replace view public.admin_consultant_record_audit
with (security_invoker = true)
as
select h.organization_id, 'hotel'::text as record_type, h.id as record_id,
       h.name as record_label, h.created_at, h.created_by,
       p.full_name as created_by_name, null::uuid as assigned_consultant_id,
       case when h.active then 'Active' else 'Inactive' end as record_status
from public.hotels h
left join public.profiles p on p.id = h.created_by
where public.is_org_admin(h.organization_id)

union all
select s.organization_id, 'supplier', s.id, s.name, s.created_at, s.created_by,
       p.full_name, null::uuid,
       case when s.active then 'Active' else 'Inactive' end
from public.suppliers s
left join public.profiles p on p.id = s.created_by
where public.is_org_admin(s.organization_id)

union all
select s.organization_id, 'service', s.id, s.name, s.created_at, s.created_by,
       p.full_name, null::uuid,
       case when s.active then 'Active' else 'Inactive' end
from public.services s
left join public.profiles p on p.id = s.created_by
where public.is_org_admin(s.organization_id)

union all
select c.organization_id, 'client', c.id, c.name, c.created_at, c.created_by,
       p.full_name, c.consultant_id, c.status
from public.clients c
left join public.profiles p on p.id = c.created_by
where public.is_org_admin(c.organization_id)

union all
select q.organization_id, 'quotation', q.id, q.quotation_no, q.created_at, q.created_by,
       p.full_name, q.consultant_id, q.status
from public.quotations q
left join public.profiles p on p.id = q.created_by
where public.is_org_admin(q.organization_id)

union all
select b.organization_id, 'booking', b.id, b.booking_no, b.created_at, b.created_by,
       p.full_name, b.consultant_id, b.status
from public.bookings b
left join public.profiles p on p.id = b.created_by
where public.is_org_admin(b.organization_id)

union all
select cp.organization_id, 'client_payment', cp.id, coalesce(cp.reference, cp.id::text),
       cp.created_at, cp.created_by, p.full_name, null::uuid, 'Recorded'::text
from public.client_payments cp
left join public.profiles p on p.id = cp.created_by
where public.is_org_admin(cp.organization_id)

union all
select sp.organization_id, 'supplier_payment', sp.id, coalesce(sp.reference, sp.id::text),
       sp.created_at, sp.created_by, p.full_name, null::uuid, 'Recorded'::text
from public.supplier_payments sp
left join public.profiles p on p.id = sp.created_by
where public.is_org_admin(sp.organization_id)

union all
select e.organization_id, 'expense', e.id, e.description, e.created_at, e.created_by,
       p.full_name, null::uuid, 'Recorded'::text
from public.expenses e
left join public.profiles p on p.id = e.created_by
where public.is_org_admin(e.organization_id);

grant select on public.admin_consultant_record_audit to authenticated;