-- ===========================================================================
--  0020 · TESTER role + self-service data reset.
--
--  Run once in Supabase → SQL Editor. Requires 0003 (role), 0011, 0015–0019.
--
--  ── THE PROBLEM THIS SOLVES ───────────────────────────────────────────────
--  A pilot tester needs to walk onboarding → Day 1 → tracker → reflection over
--  and over. Today that means deleting the auth user and signing up again, every
--  single time. So the tester's own data becomes the bottleneck for testing.
--
--  A tester can now wipe their own family and start clean, keeping their login.
--
--  ── WHY A ROLE AND NOT A FLAG ─────────────────────────────────────────────
--  `reset_my_test_data()` is a destructive, irreversible delete. It must be
--  unreachable by a real family — not merely un-clicked, but unreachable. So the
--  function itself refuses to run for anyone whose role is not 'tester'. Hiding
--  the button would only hide the button; the RPC would still be there.
--
--  A tester is otherwise EXACTLY a guardian: same screens, same RLS, no admin
--  cockpit. They must see what a real parent sees, or they are not testing it.
-- ===========================================================================

-- ── 1. 'tester' becomes a legal role ──────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('guardian', 'admin', 'tester'));

create or replace function public.is_tester()
returns boolean
language sql
security definer
set search_path = public
stable
as $is_tester$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'tester'
  );
$is_tester$;

grant execute on function public.is_tester() to authenticated;


-- ── 2. reset_my_test_data() ───────────────────────────────────────────────
--  Deletes the CALLER'S OWN family, entirely. Login survives; nothing else does.
--
--  Note how little this has to delete explicitly: almost every table hangs off
--  `children` with `on delete cascade`, so removing the child takes the day
--  sessions, runs, tracker records, milestones, reflections, support triggers,
--  screening baseline and vault rows with it. That cascade is not a convenience
--  here — it is the reason this function cannot leave orphaned clinical rows
--  behind for the next run to trip over.
create or replace function public.reset_my_test_data()
returns void
language plpgsql
security definer
set search_path = public, identity_vault
as $reset$
declare
  uid uuid := auth.uid();
  r   text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select role into r from public.profiles where id = uid;
  if r is distinct from 'tester' then
    -- Not "you may not press this button" — "this function does not exist for you."
    raise exception 'reset_my_test_data is available to testers only';
  end if;

  -- The child, and by cascade everything hanging off it: preverb_day_session,
  -- preverb_activity_run, tracker_record, milestone_event, reflection_record,
  -- support_trigger, screening_baseline, parent_confidence, and both
  -- identity_vault child tables (word_bank_entry, reflection_moment).
  delete from public.children where guardian_id = uid;

  -- Rows keyed on the GUARDIAN, which the child cascade does not reach.
  delete from public.onboarding_draft      where guardian_id = uid;
  delete from public.activity_completions  where guardian_id = uid;  -- Goal Base
  delete from identity_vault.family_identity where guardian_id = uid;

  -- Back to a blank profile — otherwise onboarding resumes half-filled and the
  -- tester is not actually testing the first-run experience.
  --
  -- routines/activities are NOT NULL with a '{}' default, so they are emptied,
  -- not nulled. `stage` and `onboarded_at` are NOT on profiles — they live on
  -- `children`, and went with the delete above.
  update public.profiles
     set guardian_name = null,
         relationship  = null,
         guardian_age  = null,
         primary_goal  = null,
         routines      = '{}',
         activities    = '{}'
   where id = uid;
end;
$reset$;

revoke execute on function public.reset_my_test_data() from public, anon;
grant  execute on function public.reset_my_test_data() to authenticated;


-- ===========================================================================
--  3. PROMOTE THE TESTERS
--
--  ⚠ The accounts must EXIST first. Create them by signing up through the app
--     (Supabase → Authentication → Providers → "Allow new users to sign up" has
--     to be ON while you do, and MAINTENANCE hides the sign-up switch in the UI).
--     Then run this block.
--
--  ⚠ PLUS-ADDRESSING, ON PURPOSE. `mahen@gmail.com` and friends are almost
--     certainly real strangers' mailboxes: password-reset mail would go to them,
--     and they could take the account over. `josiahsoh+mahen@gmail.com` lands in
--     YOUR inbox, is a distinct Supabase user, and nobody else can ever receive
--     its mail. Change the base address below if you use a different one.
-- ===========================================================================
--  ⚠ THE ADMIN IS NOT IN THIS LIST, AND MUST NOT BE.
--     josiahsoh@gmail.com stays 'admin'. Note that `josiah@gmail.com` and
--     `josiahsoh+josiah@gmail.com` are BOTH different users from it — the local
--     part differs — so neither can touch the admin account. Four testers, one
--     admin, and the two never overlap.
--
--  Both forms are listed because the accounts may have been registered either
--  way. An `in (...)` list that matches nothing updates zero rows and reports no
--  error, which is exactly how the first run appeared to succeed and did nothing.
update public.profiles p
   set role = 'tester'
  from auth.users u
 where u.id = p.id
   and lower(u.email) in (
     -- as registered
     'mahen@gmail.com',
     'alum@gmail.com',
     'azrena@gmail.com',
     'josiah@gmail.com',
     -- plus-addressed (safer: the mail lands in an inbox you control)
     'josiahsoh+mahen@gmail.com',
     'josiahsoh+alum@gmail.com',
     'josiahsoh+azrena@gmail.com',
     'josiahsoh+josiah@gmail.com'
   );

-- Check it took. Expect four testers and one admin, and no overlap.
select u.email, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.role in ('tester', 'admin')
 order by p.role, u.email;
