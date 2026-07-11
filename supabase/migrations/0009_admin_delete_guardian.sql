-- ============================================================================
--  Tutur — permanent guardian deletion (v9)
--
--  Run once in Supabase → SQL Editor (or `supabase db push`).
--
--  admin_delete_guardian(gid) — TRULY removes a guardian, forever. Deleting the
--  auth.users row cascades to profiles → children → activity_completions →
--  child_guardians → child_invites (all FK `on delete cascade`). Feedback is
--  `on delete set null`, so we delete those rows explicitly first — nothing of
--  the person remains.
--
--  Guarded: admins only, and an admin account can't be deleted (prevents
--  self-lockout / removing a fellow admin).
-- ============================================================================

create or replace function public.admin_delete_guardian(gid uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if exists (select 1 from public.profiles where id = gid and role = 'admin') then
    raise exception 'cannot delete an admin account';
  end if;

  -- Feedback would otherwise survive (guardian_id → null); remove it too.
  delete from public.feedback where guardian_id = gid;

  -- Deleting the auth user cascades away the profile and everything under it.
  delete from auth.users where id = gid;
end;
$$;

grant execute on function public.admin_delete_guardian(uuid) to authenticated;
