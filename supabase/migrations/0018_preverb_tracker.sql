-- ===========================================================================
--  0018 · PREVERB · the tracker. Phase 2's remaining data layer.
--
--  Run once in Supabase → SQL Editor. Requires 0011 and 0015.
--
--  ── THIS IS THE PILOT'S PRIMARY INSTRUMENT ────────────────────────────────
--  The activity is what the parent DOES. The tracker is what we LEARN. Spec
--  §1.1's question — "do parents complete the daily loop consistently?" — is a
--  question about THIS table, not about the script.
--
--  Three tables, because they answer three different questions and have three
--  different privacy postures:
--
--    tracker_record   — one row per ANSWERED QUESTION. Clinical. Enums only.
--    milestone_event  — the first time a thing ever happened. Clinical. Dated.
--    identity_vault.word_bank_entry — free text the parent typed. NOT clinical.
--
--  ── WHY THE FREE TEXT IS NOT IN THE CLINICAL STORE ────────────────────────
--  "Kata/bunyi/isyarat BARU hari ini" is a text box. A parent will type her
--  child's actual first word into it — and, sooner or later, his name, her
--  worries, a diagnosis, a family member. Free text is identifying by nature.
--
--  So it goes to `identity_vault`, which is unreachable via PostgREST and has NO
--  admin SELECT policy: reachable only through SECURITY DEFINER functions that
--  check auth.uid(). The clinical store keys on child_id and holds enums. That
--  separation is the whole point of the vault (spec §3.1) and it must not be
--  eroded the first time a text box shows up.
-- ===========================================================================

-- ── 1. tracker_record ─────────────────────────────────────────────────────
create table if not exists public.tracker_record (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  session_id  uuid references public.preverb_day_session (id) on delete cascade,

  day_number  int  not null check (day_number between 1 and 14),
  -- Key on question_id, NEVER on category: a single day may ask about the same
  -- KP twice (Day 4 has KP6 twice), so category is not unique within a day.
  question_id text not null,
  role        text not null
    check (role in ('parent_indicator','child_observation','ccs','ja','new_words','routine_ran')),
  -- Snapshotted so a re-versioned day cannot silently re-interpret old rows.
  category    text,

  -- ONE of these is set, per the question's scale. Enums, never prose.
  bmk   text check (bmk   in ('belum','muncul','konsisten')),
  ccs   text check (ccs   in ('CCS1','CCS2','CCS3','CCS4','CCS5')),
  ja    text check (ja    in ('JA1','JA2','JA3','JA4','JA5')),
  rutin text check (rutin in ('penuh','separuh','tidak_sempat')),
  -- new_words answers do NOT land here. See identity_vault.word_bank_entry.
  -- `true` = she said there WAS something new; the text itself is in the vault.
  has_new_words boolean,

  answered_at timestamptz not null default now(),

  -- Re-answering a question updates it. A day has one answer per question.
  unique (child_id, day_number, question_id)
);

create index if not exists tracker_record_child_day_idx
  on public.tracker_record (child_id, day_number);

alter table public.tracker_record enable row level security;

drop policy if exists tracker_owner_all on public.tracker_record;
create policy tracker_owner_all on public.tracker_record
  for all using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());

drop policy if exists tracker_member_all on public.tracker_record;
create policy tracker_member_all on public.tracker_record
  for all using (public.is_child_guardian(child_id))
  with check (public.is_child_guardian(child_id));

drop policy if exists tracker_select_admin on public.tracker_record;
create policy tracker_select_admin on public.tracker_record
  for select using (public.is_admin());


-- ── 2. milestone_event ────────────────────────────────────────────────────
--  A FIRST. "Proto-declarative pertama kali: [tarikh: ____]" appears on nearly
--  every tracker sheet, and the date is the point — an SLT reads the date, not
--  the fact. Only the first occurrence is recorded; later ones change nothing.
create table if not exists public.milestone_event (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references public.children (id) on delete cascade,
  guardian_id  uuid not null references public.profiles (id) on delete cascade,

  milestone_id text not null,   -- 'proto_declarative_awal'
  label        text not null,   -- snapshotted: content is versioned
  day_number   int  not null,
  occurred_on  date not null default current_date,
  created_at   timestamptz not null default now(),

  -- A first can only happen once. The insert is idempotent by construction.
  unique (child_id, milestone_id)
);

alter table public.milestone_event enable row level security;

drop policy if exists milestone_owner_all on public.milestone_event;
create policy milestone_owner_all on public.milestone_event
  for all using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());

drop policy if exists milestone_member_all on public.milestone_event;
create policy milestone_member_all on public.milestone_event
  for all using (public.is_child_guardian(child_id))
  with check (public.is_child_guardian(child_id));

drop policy if exists milestone_select_admin on public.milestone_event;
create policy milestone_select_admin on public.milestone_event
  for select using (public.is_admin());


-- ── 3. identity_vault.word_bank_entry ─────────────────────────────────────
--  The child's actual new words, in the parent's own words. Identifying data.
create table if not exists identity_vault.word_bank_entry (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  day_number  int  not null,
  entry       text not null,
  created_at  timestamptz not null default now(),
  unique (child_id, day_number)
);

alter table identity_vault.word_bank_entry enable row level security;
-- No policies, and none are needed: the schema is not exposed to PostgREST, so
-- the ONLY way in is the SECURITY DEFINER functions below, which check auth.uid().
-- Deliberately NO admin SELECT. Admins get the enums; they do not get the words.

create or replace function public.save_word_bank_entry(
  p_child_id   uuid,
  p_day_number int,
  p_entry      text
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

  insert into identity_vault.word_bank_entry (child_id, guardian_id, day_number, entry)
  values (p_child_id, auth.uid(), p_day_number, p_entry)
  on conflict (child_id, day_number) do update set entry = excluded.entry;
end;
$$;

create or replace function public.get_word_bank(p_child_id uuid)
returns table (day_number int, entry text, created_at timestamptz)
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
    select w.day_number, w.entry, w.created_at
    from identity_vault.word_bank_entry w
    where w.child_id = p_child_id
    order by w.day_number;
end;
$$;

-- Only signed-in users may even attempt these. The functions then check that the
-- caller actually guards THIS child.
revoke execute on function public.save_word_bank_entry(uuid, int, text) from public, anon;
revoke execute on function public.get_word_bank(uuid) from public, anon;
grant  execute on function public.save_word_bank_entry(uuid, int, text) to authenticated;
grant  execute on function public.get_word_bank(uuid) to authenticated;
