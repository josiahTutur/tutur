-- ===========================================================================
--  0016 · PREVERB · activity runs — the TIME the parent actually spent.
--
--  Run once in Supabase → SQL Editor. Requires 0015.
--
--  ── WHY A SECOND TABLE, AND NOT A COLUMN ON preverb_day_session ───────────
--  preverb_day_session is keyed `unique (child_id, day_number)` — one row per
--  CONTENT day. That is correct for the question it answers ("did they get
--  through Day 7?"), and it is structurally unable to answer this one.
--
--  A parent may repeat the same day's activity, and may repeat it on a later
--  date. With one row per content day there is exactly one date and one clock
--  to write to, so the second run would either be lost or would overwrite the
--  first. A run is an EVENT — it needs its own row.
--
--    session : "Day 1 was reached, started 11 Jul, finished 11 Jul"   (1 row)
--    runs    : "played 11 Jul for 12m; played again 13 Jul for 9m"    (n rows)
--
--  ── duration_seconds IS MEASURED, NOT DERIVED ─────────────────────────────
--  It is NOT `ended_at - started_at`. That is wall-clock: a parent who opens
--  the player and puts the phone down for an hour would be credited with an
--  hour with their child. The client clocks only the time the player is open
--  AND the tab is visible, and writes that number here.
--
--  The headline the parent sees — "total time spent with their child" — is a
--  sum of this column. It has to be a number we would be willing to defend.
-- ===========================================================================

create table if not exists public.preverb_activity_run (
  id          uuid primary key default gen_random_uuid(),

  session_id  uuid not null references public.preverb_day_session (id) on delete cascade,
  child_id    uuid not null references public.children (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,

  -- Denormalised from the session so the calendar can render a month without
  -- a join, and so a run still means something if content is re-versioned.
  day_number  int  not null check (day_number between 1 and 14),

  -- The CALENDAR date this run happened on — not the content day. The month
  -- calendar ("Kemajuan Julai") is drawn from this, and only this.
  calendar_date date not null default current_date,

  started_at  timestamptz not null default now(),
  -- NULL = the player is still open, or the parent closed the tab without
  -- exiting. The last heartbeat's duration_seconds still stands.
  ended_at    timestamptz,

  -- Engaged seconds. Written by a heartbeat while the player is open, so a
  -- closed tab loses at most one heartbeat interval rather than the whole run.
  duration_seconds int not null default 0 check (duration_seconds >= 0),

  -- Did this run reach the end of the script? A run can be long and abandoned.
  completed   boolean not null default false
);

-- The calendar's only query: "every run for this child in this month".
create index if not exists preverb_run_child_date_idx
  on public.preverb_activity_run (child_id, calendar_date);

alter table public.preverb_activity_run enable row level security;

drop policy if exists preverb_run_owner_all on public.preverb_activity_run;
create policy preverb_run_owner_all on public.preverb_activity_run
  for all using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());

-- Co-parents share the child's progress. If the father plays Day 3, the mother
-- must see that time on her calendar — it is time spent with the same child.
drop policy if exists preverb_run_member_all on public.preverb_activity_run;
create policy preverb_run_member_all on public.preverb_activity_run
  for all using (public.is_child_guardian(child_id))
  with check (public.is_child_guardian(child_id));

drop policy if exists preverb_run_select_admin on public.preverb_activity_run;
create policy preverb_run_select_admin on public.preverb_activity_run
  for select using (public.is_admin());
