-- ============================================================================
--  Tutur — admin role & feedback analytics access (v3)
--
--  Run once in Supabase → SQL Editor (or `supabase db push`).
--  Adds a 'role' to each profile so a small number of users can be marked
--  admin and read ALL feedback for the analysis dashboard. Guardians keep
--  seeing only their own rows; admins see everyone's.
--
--  Security: role changes are locked down so a guardian cannot promote
--  themselves — admins are set only from the SQL Editor / service key.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1. role — every profile is a 'guardian' unless explicitly made 'admin'
--  `if not exists` so this whole script is safe to re-run.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'guardian';

-- Add the value check separately so a re-run doesn't fail if the column
-- already exists (add-column-if-not-exists would skip the constraint).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('guardian', 'admin'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
--  2. is_admin() — "is the current user an admin?"
--  SECURITY DEFINER so it can read profiles without recursing through the
--  profiles RLS policies. Used inside other tables' policies.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
--  3. Admins can read ALL feedback.
--  Policies are OR'd together, so this coexists with feedback_select_self:
--  a guardian still reads their own row; an admin reads every row.
-- ---------------------------------------------------------------------------
drop policy if exists "feedback_select_admin" on public.feedback;
create policy "feedback_select_admin" on public.feedback
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
--  4. Prevent role self-escalation.
--  profiles_update_self lets a user update their own row, which would let them
--  set role = 'admin'. This trigger blocks any change to `role` that comes from
--  an authenticated user (auth.uid() is set). Changes made from the SQL Editor
--  or with the service key have no auth.uid(), so those are still allowed.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'role cannot be changed by the user';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_self_change();

-- ---------------------------------------------------------------------------
--  5. Make the admins. Add each admin's email to the list.
--  Matches against auth.users (not profiles.email, which can be null) so the
--  promote never silently misses. Runs from the SQL Editor (no auth.uid()), so
--  the self-escalation trigger above allows it.
-- ---------------------------------------------------------------------------
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id and u.email in ('josiahsoh@gmail.com');
