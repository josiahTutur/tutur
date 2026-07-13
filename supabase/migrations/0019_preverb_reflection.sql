-- ===========================================================================
--  0019 · PREVERB · reflection (C15–C17) + the support branch.
--
--  Run once in Supabase → SQL Editor. Requires 0011, 0015, 0018.
--
--  ── THE PARENT IS THE LEADING INDICATOR ───────────────────────────────────
--  The SLT document says it twice: "Refleksi ibu bapa = leading indicator.
--  Kemajuan anak = lagging indicator." The child's change may not surface until
--  Day 7–14; the parent's shows in days, and it is what CAUSES the child's.
--
--  So this table is not an appendix to tracker_record. It is the other half of
--  the measurement — and the half that moves first.
--
--  ── THREE PLACES, AGAIN, FOR THE SAME REASON AS 0018 ──────────────────────
--    reflection_record             — the four flags + the feeling. Enums.
--    support_trigger               — "perlukan bantuan". Operational, not clinical.
--    identity_vault.reflection_moment — "satu momen bermakna". FREE TEXT.
--
--  The moment is the most personal thing in the app. A parent writing "hari ini
--  Adam pandang saya dan senyum, saya menangis" is not producing clinical data —
--  she is confiding. It goes in the vault, with no admin SELECT, reachable only
--  through SECURITY DEFINER functions that check auth.uid().
-- ===========================================================================

-- ── 1. reflection_record ──────────────────────────────────────────────────
create table if not exists public.reflection_record (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  session_id  uuid references public.preverb_day_session (id) on delete cascade,

  day_number  int  not null check (day_number between 1 and 14),

  -- C15 "Hari ini saya sedar…" — the four statements she ticked. Ticking NONE is
  -- a real answer, so an empty array is meaningful and must not be read as "not
  -- answered"; `answered_at` is what tells you she was here.
  statements  text[] not null default '{}',

  -- C16 "Hari ini saya rasa…"
  feeling     text check (feeling in
    ('lebih_seronok','lebih_yakin','masih_keliru','perlukan_bantuan')),

  -- C17. The TEXT is in the vault; this only records that there was one.
  has_moment  boolean not null default false,

  answered_at timestamptz not null default now(),

  unique (child_id, day_number)
);

create index if not exists reflection_child_day_idx
  on public.reflection_record (child_id, day_number);

alter table public.reflection_record enable row level security;

drop policy if exists reflection_owner_all on public.reflection_record;
create policy reflection_owner_all on public.reflection_record
  for all using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());

drop policy if exists reflection_member_all on public.reflection_record;
create policy reflection_member_all on public.reflection_record
  for all using (public.is_child_guardian(child_id))
  with check (public.is_child_guardian(child_id));

drop policy if exists reflection_select_admin on public.reflection_record;
create policy reflection_select_admin on public.reflection_record
  for select using (public.is_admin());


-- ── 2. support_trigger ────────────────────────────────────────────────────
--  A parent said "perlukan bantuan". This is the one row in the schema that a
--  HUMAN is supposed to act on. It is not clinical data; it is a request.
--
--  `resolved_at` exists so the pilot team can see what they have not answered
--  yet. A support request nobody can see they missed is the same as no support.
create table if not exists public.support_trigger (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,

  day_number  int  not null,
  source      text not null default 'reflection',  -- where she asked from
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,

  -- One open request per day. Asking twice on Day 3 is one Day 3 request.
  unique (child_id, day_number)
);

alter table public.support_trigger enable row level security;

drop policy if exists support_owner_all on public.support_trigger;
create policy support_owner_all on public.support_trigger
  for all using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());

drop policy if exists support_member_all on public.support_trigger;
create policy support_member_all on public.support_trigger
  for all using (public.is_child_guardian(child_id))
  with check (public.is_child_guardian(child_id));

-- Admins MUST see these — that is the entire point of the table.
drop policy if exists support_select_admin on public.support_trigger;
create policy support_select_admin on public.support_trigger
  for select using (public.is_admin());

drop policy if exists support_update_admin on public.support_trigger;
create policy support_update_admin on public.support_trigger
  for update using (public.is_admin()) with check (public.is_admin());


-- ── 3. identity_vault.reflection_moment ───────────────────────────────────
create table if not exists identity_vault.reflection_moment (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  day_number  int  not null,
  moment      text not null,
  created_at  timestamptz not null default now(),
  unique (child_id, day_number)
);

alter table identity_vault.reflection_moment enable row level security;
-- No policies, and none are needed: the schema is not exposed to PostgREST. The
-- only way in is the functions below. Deliberately NO admin SELECT.

create or replace function public.save_reflection_moment(
  p_child_id   uuid,
  p_day_number int,
  p_moment     text
) returns void
language plpgsql
security definer
set search_path = identity_vault, public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_child_guardian(p_child_id) then
    raise exception 'not a guardian of this child';
  end if;

  insert into identity_vault.reflection_moment (child_id, guardian_id, day_number, moment)
  values (p_child_id, auth.uid(), p_day_number, p_moment)
  on conflict (child_id, day_number) do update set moment = excluded.moment;
end;
$$;

create or replace function public.get_reflection_moments(p_child_id uuid)
returns table (day_number int, moment text, created_at timestamptz)
language plpgsql
security definer
set search_path = identity_vault, public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_child_guardian(p_child_id) then
    raise exception 'not a guardian of this child';
  end if;

  return query
    select m.day_number, m.moment, m.created_at
    from identity_vault.reflection_moment m
    where m.child_id = p_child_id
    order by m.day_number;
end;
$$;

revoke execute on function public.save_reflection_moment(uuid, int, text) from public, anon;
revoke execute on function public.get_reflection_moments(uuid) from public, anon;
grant  execute on function public.save_reflection_moment(uuid, int, text) to authenticated;
grant  execute on function public.get_reflection_moments(uuid) to authenticated;
