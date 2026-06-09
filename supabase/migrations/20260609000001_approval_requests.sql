-- Administrator approval workflow for permission-first assistant requests.

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.user_profiles(id) on delete set null,
  action text not null,
  risk_level text,
  summary text not null default '',
  impact text not null default '',
  required_permissions text not null default '',
  affected_records jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references public.user_profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approval_requests_status_created_idx on public.approval_requests(status, created_at desc);
create index if not exists approval_requests_requested_by_idx on public.approval_requests(requested_by, created_at desc);
create index if not exists approval_requests_reviewed_by_idx on public.approval_requests(reviewed_by, reviewed_at desc);

drop trigger if exists set_approval_requests_updated_at on public.approval_requests;
create trigger set_approval_requests_updated_at
before update on public.approval_requests
for each row execute function app_private.set_updated_at();

alter table public.approval_requests enable row level security;

grant select, insert, update on public.approval_requests to authenticated;

drop policy if exists "requesters and administrators can read approval requests" on public.approval_requests;
create policy "requesters and administrators can read approval requests"
  on public.approval_requests for select
  to authenticated
  using (
    requested_by = (select auth.uid())
    or app_private.has_role(array['super_admin', 'admin', 'legal_supervisor'])
  );

drop policy if exists "authorized users can create approval requests" on public.approval_requests;
create policy "authorized users can create approval requests"
  on public.approval_requests for insert
  to authenticated
  with check (
    requested_by = (select auth.uid())
    and app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor'])
  );

drop policy if exists "administrators can review approval requests" on public.approval_requests;
create policy "administrators can review approval requests"
  on public.approval_requests for update
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'legal_supervisor']))
  with check (app_private.has_role(array['super_admin', 'admin', 'legal_supervisor']));

notify pgrst, 'reload schema';
