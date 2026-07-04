-- ============================================================================
--  Tutur — admin analytics read access (v4)
--
--  Run once in Supabase → SQL Editor (or `supabase db push`).
--  The admin "Wawasan" dashboard aggregates across ALL users, but the v1 RLS
--  policies restrict every table to the owner's own rows. This grants admins
--  (see 0003) read-only access to profiles, children, and activity_completions
--  so those aggregate counts are real. Feedback was already opened in 0003.
--
--  Guardians are unaffected — their existing self-only policies still apply;
--  these admin policies are OR'd on top. Admins get SELECT only (no writes).
--  Idempotent: safe to re-run.
-- ============================================================================

-- profiles — admins can read every guardian's profile row.
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

-- children — admins can read every child row.
drop policy if exists "children_select_admin" on public.children;
create policy "children_select_admin" on public.children
  for select using (public.is_admin());

-- activity_completions — admins can read every completion row.
drop policy if exists "completions_select_admin" on public.activity_completions;
create policy "completions_select_admin" on public.activity_completions
  for select using (public.is_admin());
