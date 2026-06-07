-- Legal warrant access control for Sovereign Eye.
-- Run after the base auth/profile and live operations migrations.

alter table public.orders
  add column if not exists court_order_file text,
  add column if not exists access_start_time timestamptz,
  add column if not exists access_end_time timestamptz,
  add column if not exists approved_by text,
  add column if not exists legal_basis_note text;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('draft', 'pending', 'active', 'expired', 'revoked', 'archived'));

create index if not exists orders_access_start_idx on public.orders(access_start_time);
create index if not exists orders_access_end_idx on public.orders(access_end_time);
create index if not exists orders_warrant_status_idx on public.orders(order_type, status, access_end_time);

update public.roles
set label_en = 'Super Admin',
    label_ps = 'ستر اډمین',
    description = 'First account owner with unrestricted platform administration'
where slug = 'super_admin';

update public.roles
set label_en = 'System Administrator',
    label_ps = 'سیستم اډمین',
    description = 'Platform administration and user management'
where slug = 'admin';

update public.roles
set label_en = 'Operations Officer',
    label_ps = 'عملیاتي مسئول',
    description = 'Operational case and network workflows'
where slug = 'operations_officer';

update public.roles
set label_en = 'Legal Supervisor',
    label_ps = 'قانوني ناظر',
    description = 'Legal orders, audit review, and evidence oversight'
where slug = 'legal_supervisor';

update public.roles
set label_en = 'Viewer',
    label_ps = 'کتونکی',
    description = 'Read-only operational visibility'
where slug = 'viewer';

notify pgrst, 'reload schema';
