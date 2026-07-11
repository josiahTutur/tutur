-- ============================================================================
--  Tutur — admin controls (v8)
--
--  Run once in Supabase → SQL Editor (or `supabase db push`).
--
--  1. app_settings — a single-row settings table holding the runtime
--     maintenance flag, so an admin can pause new sign-ups from the UI (no
--     redeploy). Readable by everyone (the signed-out landing needs it);
--     writable by admins only.
--  2. set_guardian_deleted(gid, del) — an admin RPC to soft-delete OR reactivate
--     any guardian (used by the "Reactivate" button in the Users tab).
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1) app_settings — one row (id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id          int primary key default 1,
  maintenance boolean not null default false,
  updated_at  timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);
insert into public.app_settings (id, maintenance)
  values (1, false)
  on conflict (id) do nothing;

alter table public.app_settings enable row level security;

-- Anyone (including signed-out visitors) may read the maintenance flag.
drop policy if exists "app_settings_read_all" on public.app_settings;
create policy "app_settings_read_all" on public.app_settings
  for select using (true);

-- Only admins may change it.
drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write" on public.app_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  2) set_guardian_deleted — admin soft-delete / reactivate any guardian
-- ---------------------------------------------------------------------------
create or replace function public.set_guardian_deleted(gid uuid, del boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  update public.profiles
    set deleted_at = case when del then now() else null end
    where id = gid;
end;
$$;

grant execute on function public.set_guardian_deleted(uuid, boolean) to authenticated;
