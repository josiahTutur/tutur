-- ============================================================================
--  Tutur — account deletion (v5)
--
--  Run once in Supabase → SQL Editor (or `supabase db push`).
--  Adds soft-delete support: a deleted account is MARKED with a `deleted_at`
--  timestamp rather than dropped. ALL data is retained (names, email, child,
--  completions, feedback) — the account is simply hidden and the app's boot
--  guard stops the user from logging back in. Nothing is erased or anonymised.
-- ============================================================================

alter table public.profiles
  add column if not exists deleted_at timestamptz;

-- Handy partial index for excluding deleted accounts from admin analytics.
create index if not exists profiles_active_idx
  on public.profiles (id)
  where deleted_at is null;
