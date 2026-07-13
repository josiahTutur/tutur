-- ===========================================================================
--  0015 · PREVERB · day sessions — what the family actually did, each day.
--
--  Run once in Supabase → SQL Editor. Requires 0011.
--
--  ── WHY THIS IS THE MOST IMPORTANT TABLE IN THE PILOT ─────────────────────
--  The pilot's primary question (spec §1.1) is: "do parents complete the daily
--  loop consistently over 14 days?" Until now NOTHING recorded that. A parent
--  could finish Day 1 and leave no trace. This table is the answer to the
--  question the whole pilot exists to ask.
--
--  ── PREVERB vs GOAL BASE ──────────────────────────────────────────────────
--  Goal Base has `activity_completions` — a row per activity the parent picked
--  from the catalogue. Preverb has THIS: a row per DAY of the programme. They
--  mean different things, so they are different tables with different names.
--  A query against the wrong one silently answers the wrong question.
--
--  ── WHY THE CONTENT IS SNAPSHOTTED, NOT JOINED ────────────────────────────
--  goal_tag / routine / activity are copied INTO the row rather than looked up
--  from day_number at read time. The day content is versioned and will change
--  between cohorts — a v3 Day 4 may be a different routine from a v2 Day 4. If
--  we only stored `day_number`, every historical row would silently re-interpret
--  itself the next time content shipped. Same principle as `kadang_is_flag` on
--  screening_baseline: freeze what was true when it happened.
--
--    Hari 1  "Masa Bermain Bebas : Kenal Pasti Minat"
--            routine_label = "Masa Bermain Bebas"   ← the SETTING
--            activity      = "Kenal Pasti Minat"    ← what you DO
-- ===========================================================================

create table if not exists public.preverb_day_session (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,

  day_number  int  not null check (day_number between 1 and 14),

  -- The CONTENT day (1–14) and the CALENDAR day are different things. A parent
  -- who misses Tuesday does NOT skip Day 2 — they do Day 2 on Wednesday
  -- (spec §2.2). Storing both is what lets us tell adherence from progress.
  calendar_date date not null default current_date,

  -- ── Content snapshot ────────────────────────────────────────────────────
  goal_tag      text not null,   -- 'G1' | 'G2' | 'G3'
  routine       text not null,   -- 'main' | 'mandi' | 'makan' | 'tv' | 'tidur'
  routine_label text not null,   -- 'Masa Bermain Bebas'
  activity      text not null,   -- 'Kenal Pasti Minat'
  focus_skill   text,            -- 'Withhold & Wait' — the ONE graded behaviour

  started_at   timestamptz not null default now(),
  -- NULL = started but not finished. That distinction IS the drop-off metric;
  -- do not collapse it into a boolean.
  completed_at timestamptz,

  -- One session per content day. Re-opening Day 1 updates the row; it does not
  -- create a second Day 1.
  unique (child_id, day_number)
);

create index if not exists preverb_session_child_idx
  on public.preverb_day_session (child_id, day_number);

alter table public.preverb_day_session enable row level security;

drop policy if exists preverb_session_owner_all on public.preverb_day_session;
create policy preverb_session_owner_all on public.preverb_day_session
  for all using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());

-- Co-parents of a shared child can read AND write. A father who does Day 3 while
-- the mother did Day 2 is the normal case, not an edge case.
drop policy if exists preverb_session_member_all on public.preverb_day_session;
create policy preverb_session_member_all on public.preverb_day_session
  for all using (public.is_child_guardian(child_id))
  with check (public.is_child_guardian(child_id));

drop policy if exists preverb_session_select_admin on public.preverb_day_session;
create policy preverb_session_select_admin on public.preverb_day_session
  for select using (public.is_admin());
