-- Sovereign Eye live operational data
-- Run after 20260604000001_supabase_auth_profiles.sql.

create table if not exists public.traffic_records (
  id uuid primary key default gen_random_uuid(),
  captured_by uuid references public.user_profiles(id) on delete set null,
  ip inet not null,
  country text,
  region text,
  city text,
  org text,
  latitude double precision,
  longitude double precision,
  vpn boolean not null default false,
  proxy boolean not null default false,
  tor boolean not null default false,
  relay boolean not null default false,
  hosting boolean not null default false,
  risk text not null default 'normal' check (risk in ('normal', 'medium', 'high')),
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.user_profiles(id) on delete set null,
  traffic_record_id uuid references public.traffic_records(id) on delete set null,
  level text not null default 'warn' check (level in ('info', 'warn', 'critical')),
  message text not null,
  status text not null default 'new' check (status in ('new', 'acknowledged', 'resolved')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  acknowledged_by uuid references public.user_profiles(id) on delete set null,
  acknowledged_at timestamptz
);

create table if not exists public.dashboard_stats (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  auth_session_id text,
  status text not null default 'active' check (status in ('active', 'signed_out', 'expired')),
  user_agent text,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists traffic_records_observed_idx on public.traffic_records(observed_at desc);
create index if not exists traffic_records_ip_idx on public.traffic_records(ip);
create index if not exists traffic_records_country_idx on public.traffic_records(country);
create index if not exists traffic_records_risk_idx on public.traffic_records(risk);
create index if not exists traffic_records_captured_by_idx on public.traffic_records(captured_by);
create index if not exists alerts_status_created_idx on public.alerts(status, created_at desc);
create index if not exists alerts_created_by_idx on public.alerts(created_by, created_at desc);
create index if not exists dashboard_stats_updated_idx on public.dashboard_stats(updated_at desc);
create index if not exists user_sessions_user_status_idx on public.user_sessions(user_id, status, started_at desc);

alter table public.traffic_records enable row level security;
alter table public.alerts enable row level security;
alter table public.dashboard_stats enable row level security;
alter table public.user_sessions enable row level security;

grant select, insert, update, delete on public.traffic_records to authenticated;
grant select, insert, update on public.alerts to authenticated;
grant select, insert, update on public.dashboard_stats to authenticated;
grant select, insert, update on public.user_sessions to authenticated;

drop policy if exists "active users can read traffic records" on public.traffic_records;
create policy "active users can read traffic records"
  on public.traffic_records for select
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor', 'viewer']));

drop policy if exists "authorized roles can create traffic records" on public.traffic_records;
create policy "authorized roles can create traffic records"
  on public.traffic_records for insert
  to authenticated
  with check (
    captured_by = (select auth.uid())
    and app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor'])
  );

drop policy if exists "authorized roles can update traffic records" on public.traffic_records;
create policy "authorized roles can update traffic records"
  on public.traffic_records for update
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']))
  with check (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "admins can delete traffic records" on public.traffic_records;
create policy "admins can delete traffic records"
  on public.traffic_records for delete
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin']));

drop policy if exists "active users can read alerts" on public.alerts;
create policy "active users can read alerts"
  on public.alerts for select
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor', 'viewer']));

drop policy if exists "authorized roles can create alerts" on public.alerts;
create policy "authorized roles can create alerts"
  on public.alerts for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor'])
  );

drop policy if exists "authorized roles can acknowledge alerts" on public.alerts;
create policy "authorized roles can acknowledge alerts"
  on public.alerts for update
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']))
  with check (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor']));

drop policy if exists "active users can read dashboard stats" on public.dashboard_stats;
create policy "active users can read dashboard stats"
  on public.dashboard_stats for select
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin', 'operations_officer', 'legal_supervisor', 'viewer']));

drop policy if exists "admins can manage dashboard stats" on public.dashboard_stats;
create policy "admins can manage dashboard stats"
  on public.dashboard_stats for all
  to authenticated
  using (app_private.has_role(array['super_admin', 'admin']))
  with check (app_private.has_role(array['super_admin', 'admin']));

drop policy if exists "users can insert own sessions" on public.user_sessions;
create policy "users can insert own sessions"
  on public.user_sessions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "users can read own sessions and supervisors can review" on public.user_sessions;
create policy "users can read own sessions and supervisors can review"
  on public.user_sessions for select
  to authenticated
  using (user_id = (select auth.uid()) or app_private.has_role(array['super_admin', 'admin', 'legal_supervisor']));

drop policy if exists "users can update own sessions" on public.user_sessions;
create policy "users can update own sessions"
  on public.user_sessions for update
  to authenticated
  using (user_id = (select auth.uid()) or app_private.has_role(array['super_admin', 'admin']))
  with check (user_id = (select auth.uid()) or app_private.has_role(array['super_admin', 'admin']));

insert into public.dashboard_stats (key, value)
values
  ('latency_ms', '{"value": 0, "label": "0ms"}'::jsonb),
  ('live_collector_status', '{"status": "awaiting_records"}'::jsonb)
on conflict (key) do nothing;

notify pgrst, 'reload schema';
