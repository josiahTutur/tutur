-- ============================================================================
--  Tutur — per-user login days (v10)
--
--  Run once in Supabase → SQL Editor (or `supabase db push`).
--
--  Personalized engagement: one row per (guardian, calendar day) the user
--  opened Tutur. Drives the "hari aktif" counter. Server-side so it's tied to
--  the ACCOUNT (not the device) and syncs across devices. RLS keeps each user
--  to their own rows.
-- ============================================================================

create table if not exists public.login_days (
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  day         date not null,
  primary key (guardian_id, day)
);

alter table public.login_days enable row level security;

drop policy if exists "login_days_self" on public.login_days;
create policy "login_days_self" on public.login_days
  for all using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());
