-- ===========================================================================
--  0011 · Pilot onboarding (A1–A14) — screening, confidence, identity vault.
--
--  Run once in Supabase → SQL Editor.
--
--  WHAT THIS ADDS
--    · identity_vault schema  — names and free text, access-restricted
--    · screening_baseline     — A7–A12, re-administered at D7/D14
--    · parent_confidence      — A14 (day 0), re-asked at D7/D14
--    · children.age_bucket / .panggilan / .onboarded_at
--
--  ── ON THE VAULT (spec §3.1, decision §2b#2) ──────────────────────────────
--  Identity lives in its OWN schema, separate from the clinical store, which is
--  keyed by opaque UUIDs. Two things make that real, and both matter:
--
--   1. `identity_vault` is NOT exposed to PostgREST. Supabase only serves the
--      schemas listed under API → Exposed schemas (public by default). We
--      deliberately do NOT add this one — so there is no REST surface on it at
--      all, for anyone, including admins.
--
--   2. All access therefore goes through the SECURITY DEFINER functions at the
--      bottom of this file, which check auth.uid() themselves. A parent can read
--      and write only their own row. There is no admin read path — by design.
--
--  NOTE: the schema is called `identity_vault`, not `vault` — Supabase already
--  reserves `vault` for the supabase_vault extension.
--
--  ⚠ PDPA review (spec §8 item 7) is still OUTSTANDING. This structures the data
--    correctly but is not a substitute for that review. Retention periods are
--    NOT yet implemented.
-- ===========================================================================

-- ── 1. Clinical store additions ───────────────────────────────────────────

alter table public.children
  add column if not exists age_bucket   text,        -- A3: bawah_12m | 1_2 | 2_3 | 3_4 | lain
  add column if not exists panggilan    text,        -- A5: what the child calls the parent
  add column if not exists onboarded_at timestamptz; -- set when A1–A14 completes

comment on column public.children.panggilan is
  '{panggilan} — interpolated into every activity script line. Not identifying.';
comment on column public.children.onboarded_at is
  'Non-null = the parent finished A1–A14. This is the gate that routes to the hub.';

-- ── 2. Screening (A7–A12) ─────────────────────────────────────────────────
-- One row PER ADMINISTRATION. The baseline is day_number 0; the weekly
-- re-screens (spec §5.12) append day 7 and day 14 rows. Never updated in place —
-- the whole point is to see the trajectory.

create table if not exists public.screening_baseline (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references public.children (id) on delete cascade,
  guardian_id   uuid not null references public.profiles (id) on delete cascade,

  -- A7–A11. Fixed 3-point scale; no free text, ever.
  q1 text not null check (q1 in ('kerap','kadang','jarang')),
  q2 text not null check (q2 in ('kerap','kadang','jarang')),
  q3 text not null check (q3 in ('kerap','kadang','jarang')),
  q4 text not null check (q4 in ('kerap','kadang','jarang')),
  -- NULL is meaningful: the child is under 12 months, so A11 was never asked
  -- (spec §5.2). This is NOT the same as "unanswered" — do not coalesce it.
  q5 text check (q5 in ('kerap','kadang','jarang')),

  -- A12. `q6_other` free text goes to the vault, not here.
  q6_diagnosis text not null
    check (q6_diagnosis in ('tiada','pendengaran','pertuturan','aac','lain')),

  flags   text[] not null default '{}',
  variant text   not null check (variant in ('A','B','C')),

  -- Snapshot of the threshold in force when this was scored. If the SLT later
  -- flips "Kadang-kadang" to a flag (spec §8 item 1), old rows stay
  -- interpretable and can be rescored honestly.
  kadang_is_flag boolean not null default false,

  day_number int not null default 0,  -- 0 = baseline, 7 / 14 = re-screens
  taken_at   timestamptz not null default now()
);

create index if not exists screening_child_idx
  on public.screening_baseline (child_id, day_number);

-- ── 3. Parent confidence (A14) ────────────────────────────────────────────
-- Leading indicator. D0 is the baseline; D7 and D14 show the delta.

create table if not exists public.parent_confidence (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  day_number  int  not null default 0,
  score       int  not null check (score between 1 and 5),
  recorded_at timestamptz not null default now(),
  unique (child_id, day_number)
);

-- ── 4. RLS on the clinical tables ─────────────────────────────────────────

alter table public.screening_baseline enable row level security;
alter table public.parent_confidence  enable row level security;

drop policy if exists screening_owner_all on public.screening_baseline;
create policy screening_owner_all on public.screening_baseline
  for all using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());

-- Co-parents of a shared child can read AND write — matching how the family
-- actually uses the app. (activity_completions has an UPDATE gap here; we are
-- not repeating it.)
drop policy if exists screening_member_all on public.screening_baseline;
create policy screening_member_all on public.screening_baseline
  for all using (public.is_child_guardian(child_id))
  with check (public.is_child_guardian(child_id));

drop policy if exists screening_select_admin on public.screening_baseline;
create policy screening_select_admin on public.screening_baseline
  for select using (public.is_admin());

drop policy if exists confidence_owner_all on public.parent_confidence;
create policy confidence_owner_all on public.parent_confidence
  for all using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());

drop policy if exists confidence_member_all on public.parent_confidence;
create policy confidence_member_all on public.parent_confidence
  for all using (public.is_child_guardian(child_id))
  with check (public.is_child_guardian(child_id));

drop policy if exists confidence_select_admin on public.parent_confidence;
create policy confidence_select_admin on public.parent_confidence
  for select using (public.is_admin());

-- ===========================================================================
--  5. IDENTITY VAULT
--
--  Everything here can identify a real family. It is deliberately unreachable
--  over the API — no PostgREST exposure, no admin policy, no grants to the
--  `authenticated` role. The only way in is the two functions below.
-- ===========================================================================

create schema if not exists identity_vault;

-- Lock the schema down. Nothing gets in except through SECURITY DEFINER funcs.
revoke all on schema identity_vault from public, anon, authenticated;

create table if not exists identity_vault.family_identity (
  guardian_id    uuid primary key references public.profiles (id) on delete cascade,
  parent_name    text,        -- A4 — the account holder
  child_nickname text,        -- A2 — {anak}, spoken in every script line
  -- Every "Lain-lain" the parent typed. Free text may contain names, so it is
  -- quasi-identifying and belongs here, not in the clinical store (spec §3.1).
  other_texts    jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

alter table identity_vault.family_identity enable row level security;
revoke all on identity_vault.family_identity from public, anon, authenticated;

-- ── Write: upsert my own identity row. ────────────────────────────────────
create or replace function public.save_family_identity(
  p_parent_name    text,
  p_child_nickname text,
  p_other_texts    jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = identity_vault, public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into identity_vault.family_identity
    (guardian_id, parent_name, child_nickname, other_texts, updated_at)
  values (auth.uid(), p_parent_name, p_child_nickname,
          coalesce(p_other_texts, '{}'::jsonb), now())
  on conflict (guardian_id) do update
    set parent_name    = excluded.parent_name,
        child_nickname = excluded.child_nickname,
        other_texts    = excluded.other_texts,
        updated_at     = now();
end;
$$;

-- ── Read: my own identity row, and only ever my own. ──────────────────────
create or replace function public.get_family_identity()
returns table (parent_name text, child_nickname text, other_texts jsonb)
language plpgsql
security definer
set search_path = identity_vault, public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  return query
    select f.parent_name, f.child_nickname, f.other_texts
    from identity_vault.family_identity f
    where f.guardian_id = auth.uid();
end;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC by default, which would
-- put both of these within reach of `anon`. The auth.uid() guard inside would
-- still reject the call — but "unreachable" beats "reachable and then refused",
-- so revoke first and grant back only to `authenticated`.
revoke all on function public.save_family_identity(text, text, jsonb) from public, anon;
revoke all on function public.get_family_identity() from public, anon;

grant execute on function public.save_family_identity(text, text, jsonb) to authenticated;
grant execute on function public.get_family_identity() to authenticated;

-- There is deliberately NO admin variant. An admin who needs a real name must go
-- to the database directly, which is auditable — not through the app.
