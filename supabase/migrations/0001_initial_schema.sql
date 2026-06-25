-- ============================================================================
--  Tutur — initial schema (v1)
--
--  Run once in Supabase → SQL Editor (or `supabase db push`).
--  Persists guardian profiles, the child being helped, and activity
--  completions. Settings (AAC voice, notifications, language) stay client-side
--  (localStorage) for now, so they are intentionally NOT stored here.
--
--  Security: Row-Level Security is enabled on every table so each guardian can
--  only ever read/write their own family's rows.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  profiles — one row per authenticated guardian (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  guardian_name text,
  relationship  text,
  guardian_age  text,
  email         text,
  -- onboarding anchors chosen after profiling
  primary_goal  text,                          -- e.g. 'G1'
  routines      text[] not null default '{}',  -- e.g. '{R1,R3}'
  activities    text[] not null default '{}',  -- curated 'A' codes
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  children — the child being helped. One per guardian for now; the table
--  already supports several so multi-child is a UI change later, not a migration.
-- ---------------------------------------------------------------------------
create table public.children (
  id                uuid primary key default gen_random_uuid(),
  guardian_id       uuid not null references public.profiles (id) on delete cascade,
  name              text,
  age               text,
  stage             int check (stage between 1 and 5),
  profiled_at       date,
  profiling_answers jsonb,                       -- the 16 raw profiling answers
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index children_guardian_id_idx on public.children (guardian_id);

-- ---------------------------------------------------------------------------
--  activity_completions — the core log. One row per completed activity, with a
--  real timestamp so Kemajuan Jun, streaks, and Analisis are computed, not faked.
-- ---------------------------------------------------------------------------
create table public.activity_completions (
  id                  uuid primary key default gen_random_uuid(),
  guardian_id         uuid not null references public.profiles (id) on delete cascade,
  child_id            uuid references public.children (id) on delete cascade,
  activity_code       text not null,             -- e.g. 'A1'
  note                text,                       -- the parent's refleksi
  seconds             int  not null default 0,    -- time spent on the Papan AAC
  stage_at_completion int,                        -- stage snapshot (optional)
  completed_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);
create index activity_completions_guardian_time_idx
  on public.activity_completions (guardian_id, completed_at desc);

-- ---------------------------------------------------------------------------
--  updated_at — keep it current on every update
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger children_set_updated_at
  before update on public.children
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
--  Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
--  Row-Level Security — a guardian sees only their own family's rows
-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.children             enable row level security;
alter table public.activity_completions enable row level security;

-- profiles: the row IS the auth user
create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- children: owned through guardian_id
create policy "children_owner_all" on public.children
  for all using (auth.uid() = guardian_id) with check (auth.uid() = guardian_id);

-- activity_completions: owned through guardian_id
create policy "completions_owner_all" on public.activity_completions
  for all using (auth.uid() = guardian_id) with check (auth.uid() = guardian_id);
