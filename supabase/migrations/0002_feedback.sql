-- ============================================================================
--  Tutur — feedback survey responses
--  Run once in Supabase → SQL Editor.
--  One row per submitted feedback form; the answers are stored as JSON so the
--  survey can evolve without schema changes.
-- ============================================================================

create table public.feedback (
  id          uuid primary key default gen_random_uuid(),
  guardian_id uuid references public.profiles (id) on delete set null,
  responses   jsonb not null,
  created_at  timestamptz not null default now()
);
create index feedback_guardian_idx on public.feedback (guardian_id);

alter table public.feedback enable row level security;

-- A user can submit their own feedback and read it back.
create policy "feedback_insert_self" on public.feedback
  for insert with check (auth.uid() = guardian_id);
create policy "feedback_select_self" on public.feedback
  for select using (auth.uid() = guardian_id);
