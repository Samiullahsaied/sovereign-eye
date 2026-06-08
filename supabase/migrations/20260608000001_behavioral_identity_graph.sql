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
