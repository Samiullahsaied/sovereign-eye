-- Sovereign Eye production Supabase schema
-- Run this in the Supabase SQL Editor before deploying the app.

create extension if not exists pgcrypto;
create schema if not exists app_private;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_en text not null,
  label_ps text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.roles drop constraint if exists roles_slug_check;
alter table public.roles drop constraint if exists roles_slug_valid;
alter table public.roles
  add constraint roles_slug_valid
  check (slug in ('super_admin', 'admin', 'operations_officer', 'legal_supervisor', 'viewer'));

insert into public.roles (slug, label_en, label_ps, description)
values
  ('super_admin', 'Super Admin', 'ستر اډمین', 'First account owner with unrestricted platform administration'),
  ('admin', 'System Administrator', 'سیستم اډمین', 'Platform administration and user management'),
  ('operations_officer', 'Operations Officer', 'عملیاتي مسئول', 'Operational case and network workflows'),
  ('legal_supervisor', 'Legal Supervisor', 'قانوني ناظر', 'Legal orders, audit review, and evidence oversight'),
  ('viewer', 'Viewer', 'کتونکی', 'Read-only operational visibility')
on conflict (slug) do update
set
  label_en = excluded.label_en,
  label_ps = excluded.label_ps,
  description = excluded.description;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role_id uuid not null references public.roles(id),
  status text not null default 'active' check (status in ('active', 'suspended', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.user_profiles(id) on delete set null,
  order_number text not null unique,
  order_type text not null default 'warrant',
  country text not null default 'Afghanistan',
  status text not null default 'active' check (status in ('draft', 'pending', 'active', 'expired', 'revoked', 'archived')),
  court_order_file text,
  access_start_time timestamptz,
  access_end_time timestamptz,
  approved_by text,
  legal_basis_note text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete set null,
  action text not null,
  detail text,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid references public.user_profiles(id) on delete set null,
  evidence_type text not null default 'record',
  title text not null,
  detail text,
  storage_path text,
  sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.status (
  id uuid primary key default gen_random_uuid(),
  service_name text not null unique,
  status text not null check (status in ('ready', 'warning', 'down', 'unknown')),
  message text,
  checked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_role_idx on public.user_profiles(role_id);
create index if not exists user_profiles_status_idx on public.user_profiles(status);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_type_idx on public.orders(order_type);
create index if not exists orders_created_by_idx on public.orders(created_by);
create index if not exists orders_access_start_idx on public.orders(access_start_time);
create index if not exists orders_access_end_idx on public.orders(access_end_time);
create index if not exists orders_warrant_status_idx on public.orders(order_type, status, access_end_time);
create index if not exists audit_logs_user_created_idx on public.audit_logs(user_id, created_at desc);
create index if not exists evidence_order_created_idx on public.evidence(order_id, created_at desc);
create index if not exists evidence_created_by_idx on public.evidence(created_by, created_at desc);
create index if not exists status_checked_idx on public.status(checked_at desc);
create index if not exists settings_public_idx on public.settings(is_public);

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function app_private.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function app_private.set_updated_at();

create or replace function app_private.current_role_slug()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.slug
  from public.user_profiles up
  join public.roles r on r.id = up.role_id
  where up.id = (select auth.uid())
    and up.status = 'active'
  limit 1
$$;

create or replace function app_private.has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app_private.current_role_slug() = any(allowed_roles), false)
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('sovereign_eye_first_profile'));

  select id into assigned_role_id
  from public.roles
  where slug = case
    when not exists (select 1 from public.user_profiles) then 'super_admin'
    else 'viewer'
  end;

  if assigned_role_id is null then
    raise exception 'required role is missing';
  end if;

  insert into public.user_profiles (id, email, display_name, role_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    assigned_role_id
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

insert into public.user_profiles (id, email, display_name, role_id)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)),
  r.id
from auth.users au
cross join public.roles r
where r.slug = 'viewer'
on conflict (id) do nothing;

update public.user_profiles
set role_id = (select id from public.roles where slug = 'super_admin'),
    updated_at = now()
where id = (
  select up.id
  from public.user_profiles up
  order by up.created_at asc, up.id asc
  limit 1
)
and not exists (
  select 1
  from public.user_profiles up
  join public.roles r on r.id = up.role_id
  where r.slug = 'super_admin'
);

alter table public.roles enable row level security;
alter table public.user_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.audit_logs enable row level security;
alter table public.evidence enable row level security;
alter table public.status enable row level security;
alter table public.settings enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.roles to authenticated;
grant select, update on public.user_profiles to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant select, insert, update, delete on public.evidence to authenticated;
grant select, insert, update, delete on public.status to authenticated;
grant select, insert, update on public.settings to authenticated;

drop policy if exists "authenticated can read roles" on public.roles;
create policy "authenticated can read roles"
  on public.roles for select
  to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "users can read own profile or supervisors can read profiles" on public.user_profiles;
create policy "users can read own profile or supervisors can read profiles"
  on public.user_profiles for select
  to authenticated
  using ((select auth.uid()) = id or app_private.has_role(array['super_admin', 'admin', 'legal_supervisor']));

drop policy if exists "super admins and admins can manage profiles" on public.user_profiles;
create policy "super admins and admins can manage profiles"
  on public.user_profiles for update
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin']))
  with check (app_private.has_role(array['super_admin', 'admin']));

drop policy if exists "active users can read orders" on public.orders;
create policy "active users can read orders"
  on public.orders for select
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor', 'viewer']));

drop policy if exists "authorized roles can create orders" on public.orders;
create policy "authorized roles can create orders"
  on public.orders for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor'])
  );

drop policy if exists "authorized roles can update orders" on public.orders;
create policy "authorized roles can update orders"
  on public.orders for update
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']))
  with check (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "authorized roles can delete orders" on public.orders;
create policy "authorized roles can delete orders"
  on public.orders for delete
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'legal_supervisor']));

drop policy if exists "authenticated users can append own audit logs" on public.audit_logs;
create policy "authenticated users can append own audit logs"
  on public.audit_logs for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "users can read own audit logs and supervisors can review" on public.audit_logs;
create policy "users can read own audit logs and supervisors can review"
  on public.audit_logs for select
  to authenticated
  using (user_id = (select auth.uid()) or app_private.has_role(array['super_admin', 'admin', 'legal_supervisor']));

drop policy if exists "authorized roles can read evidence" on public.evidence;
create policy "authorized roles can read evidence"
  on public.evidence for select
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "authorized roles can create evidence" on public.evidence;
create policy "authorized roles can create evidence"
  on public.evidence for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor'])
  );

drop policy if exists "authorized roles can update evidence" on public.evidence;
create policy "authorized roles can update evidence"
  on public.evidence for update
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']))
  with check (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "authorized roles can delete evidence" on public.evidence;
create policy "authorized roles can delete evidence"
  on public.evidence for delete
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'legal_supervisor']));

drop policy if exists "active users can read status" on public.status;
create policy "active users can read status"
  on public.status for select
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor', 'viewer']));

drop policy if exists "admins can manage status" on public.status;
create policy "admins can manage status"
  on public.status for all
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin']))
  with check (app_private.has_role(array['super_admin', 'admin']));

drop policy if exists "active users can read settings" on public.settings;
create policy "active users can read settings"
  on public.settings for select
  to authenticated
  using (is_public = true or app_private.has_role(array['super_admin', 'admin']));

drop policy if exists "admins can manage settings" on public.settings;
create policy "admins can manage settings"
  on public.settings for all
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin']))
  with check (app_private.has_role(array['super_admin', 'admin']));


-- Behavioral Identity Graph tables.
-- Analytical support only; final identity decisions remain outside this module.

create table if not exists public.behavioral_identities (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.user_profiles(id) on delete set null,
  account_name text not null,
  platform text not null,
  username text not null,
  device_hint text,
  typing_profile_id text,
  activity_times text,
  language_style_notes text,
  known_case_id text,
  data_mode text not null default 'real' check (data_mode in ('real', 'sample', 'local')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.identity_comparisons (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.user_profiles(id) on delete set null,
  title text not null,
  identity_ids uuid[] not null default '{}'::uuid[],
  typing_similarity integer not null default 0 check (typing_similarity between 0 and 100),
  writing_style_similarity integer not null default 0 check (writing_style_similarity between 0 and 100),
  activity_time_similarity integer not null default 0 check (activity_time_similarity between 0 and 100),
  device_pattern_similarity integer not null default 0 check (device_pattern_similarity between 0 and 100),
  network_signal_similarity integer not null default 0 check (network_signal_similarity between 0 and 100),
  overall_similarity_score integer not null default 0 check (overall_similarity_score between 0 and 100),
  confidence_label text not null default 'Insufficient signal confidence',
  result_level text not null check (result_level in ('Low similarity', 'Medium similarity', 'High similarity', 'Needs human review')),
  warning text not null default 'This is an analytical similarity estimate only. Final judgment requires legal investigation, evidence review, and authorized human approval.',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.identity_graph_edges (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid references public.identity_comparisons(id) on delete cascade,
  source_identity_id uuid references public.behavioral_identities(id) on delete cascade,
  target_identity_id uuid references public.behavioral_identities(id) on delete cascade,
  similarity_score integer not null check (similarity_score between 0 and 100),
  result_level text not null check (result_level in ('Low similarity', 'Medium similarity', 'High similarity', 'Needs human review')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.identity_analysis_notes (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid references public.identity_comparisons(id) on delete cascade,
  identity_id uuid references public.behavioral_identities(id) on delete set null,
  created_by uuid references public.user_profiles(id) on delete set null,
  note text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists behavioral_identities_created_by_idx on public.behavioral_identities(created_by, created_at desc);
create index if not exists behavioral_identities_case_idx on public.behavioral_identities(known_case_id);
create index if not exists identity_comparisons_created_by_idx on public.identity_comparisons(created_by, created_at desc);
create index if not exists identity_graph_edges_comparison_idx on public.identity_graph_edges(comparison_id);
create index if not exists identity_analysis_notes_comparison_idx on public.identity_analysis_notes(comparison_id, created_at desc);

drop trigger if exists set_behavioral_identities_updated_at on public.behavioral_identities;
create trigger set_behavioral_identities_updated_at
before update on public.behavioral_identities
for each row execute function app_private.set_updated_at();

alter table public.behavioral_identities enable row level security;
alter table public.identity_comparisons enable row level security;
alter table public.identity_graph_edges enable row level security;
alter table public.identity_analysis_notes enable row level security;

grant select, insert, update, delete on public.behavioral_identities to authenticated;
grant select, insert, update, delete on public.identity_comparisons to authenticated;
grant select, insert, update, delete on public.identity_graph_edges to authenticated;
grant select, insert, update, delete on public.identity_analysis_notes to authenticated;

drop policy if exists "authorized roles can read behavioral identities" on public.behavioral_identities;
create policy "authorized roles can read behavioral identities"
  on public.behavioral_identities for select
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "authorized roles can create behavioral identities" on public.behavioral_identities;
create policy "authorized roles can create behavioral identities"
  on public.behavioral_identities for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor'])
  );

drop policy if exists "authorized roles can update behavioral identities" on public.behavioral_identities;
create policy "authorized roles can update behavioral identities"
  on public.behavioral_identities for update
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']))
  with check (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "legal supervisors can delete behavioral identities" on public.behavioral_identities;
create policy "legal supervisors can delete behavioral identities"
  on public.behavioral_identities for delete
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'legal_supervisor']));

drop policy if exists "authorized roles can read identity comparisons" on public.identity_comparisons;
create policy "authorized roles can read identity comparisons"
  on public.identity_comparisons for select
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "authorized roles can create identity comparisons" on public.identity_comparisons;
create policy "authorized roles can create identity comparisons"
  on public.identity_comparisons for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor'])
  );

drop policy if exists "authorized roles can manage identity comparisons" on public.identity_comparisons;
create policy "authorized roles can manage identity comparisons"
  on public.identity_comparisons for update
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']))
  with check (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "legal supervisors can delete identity comparisons" on public.identity_comparisons;
create policy "legal supervisors can delete identity comparisons"
  on public.identity_comparisons for delete
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'legal_supervisor']));

drop policy if exists "authorized roles can read graph edges" on public.identity_graph_edges;
create policy "authorized roles can read graph edges"
  on public.identity_graph_edges for select
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "authorized roles can create graph edges" on public.identity_graph_edges;
create policy "authorized roles can create graph edges"
  on public.identity_graph_edges for insert
  to authenticated
  with check (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "authorized roles can read analysis notes" on public.identity_analysis_notes;
create policy "authorized roles can read analysis notes"
  on public.identity_analysis_notes for select
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "authorized roles can create analysis notes" on public.identity_analysis_notes;
create policy "authorized roles can create analysis notes"
  on public.identity_analysis_notes for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor'])
  );

notify pgrst, 'reload schema';
