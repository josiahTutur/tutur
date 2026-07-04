-- ============================================================================
--  Tutur — account deletion (v5)
--
--  Run once in Supabase → SQL Editor (or `supabase db push`).
--  Adds soft-delete support: a deleted account is MARKED (deleted_at) rather
--  than dropped, and the app scrubs personal fields (names, email, ages) at the
--  same time. This keeps de-identified research data (activity_completions,
--  feedback) intact while erasing the parent's & child's identifying details.
--
--  A full erasure of the auth.users row (true "right to be forgotten") requires
--  the service_role and is done from an Edge Function — see notes in the app's
--  db.ts / deleteAccount(). This migration only covers the client-side path.
-- ============================================================================

alter table public.profiles
  add column if not exists deleted_at timestamptz;

-- Handy partial index for excluding deleted accounts from admin analytics.
create index if not exists profiles_active_idx
  on public.profiles (id)
  where deleted_at is null;
