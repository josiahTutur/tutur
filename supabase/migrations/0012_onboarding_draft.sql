-- ===========================================================================
--  0012 · Onboarding draft — resume-on-refresh, done server-side.
--
--  Run once in Supabase → SQL Editor. Requires 0011.
--
--  WHY NOT localStorage
--    The answers include the child's nickname, the parent's name and the
--    screening responses. localStorage would keep all of that in plaintext on
--    the device FOREVER — long after the session expires — which on a shared
--    family phone is a real leak with no expiry. A server draft is tied to the
--    account, dies with it, and resumes across devices.
--
--  THE SPLIT (spec §3.1)
--    identity_vault.family_identity  ← nickname, parent name, "Lain-lain" texts
--    public.onboarding_draft         ← age buckets, relationship, screening,
--                                       confidence, current step  (no identity)
--
--  This also gives us onboarding drop-off for free: an abandoned draft IS the
--  `onboarding_abandoned{screen_id}` signal the pilot metrics need (spec §6.2).
-- ===========================================================================

-- ── 1. The draft. One row per guardian; overwritten as they progress. ──────
create table if not exists public.onboarding_draft (
  guardian_id uuid primary key references public.profiles (id) on delete cascade,

  -- The screen they were last on, e.g. 'A7'. Resume lands them here.
  step text not null,

  -- Non-identifying answers only. Deliberately jsonb: the A1–A14 shape is still
  -- moving (the CONSENT screen is still to come), and a draft is transient — it
  -- is deleted the moment onboarding completes, so nothing queries into it.
  answers jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.onboarding_draft is
  'Transient. Deleted on completion — screening_baseline is the durable record. '
  'Contains NO identity: nickname/parent name live in identity_vault.';

alter table public.onboarding_draft enable row level security;

drop policy if exists onboarding_draft_self on public.onboarding_draft;
create policy onboarding_draft_self on public.onboarding_draft
  for all using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());

-- No admin policy. A draft is an unfinished thought; the finished record
-- (screening_baseline) is what admins can already read. Drop-off analysis should
-- come from event_log, not from reading half-answered questionnaires.

drop trigger if exists set_onboarding_draft_updated_at on public.onboarding_draft;
create trigger set_onboarding_draft_updated_at
  before update on public.onboarding_draft
  for each row execute function public.set_updated_at();

-- ===========================================================================
--  2. Make the vault upsert PARTIAL-SAFE.
--
--  0011's version overwrites every column on conflict. That was fine when it was
--  only ever called once, with a complete answer set. Now it is called mid-flow:
--  at A2 we know the child's nickname but NOT the parent's name yet, so passing
--  null for parent_name would WIPE a value we already had on a later re-entry.
--
--  coalesce(excluded.x, existing.x) — a null argument now means "leave it
--  alone", not "erase it".
-- ===========================================================================

create or replace function public.save_family_identity(
  p_parent_name    text,
  p_child_nickname text,
  p_other_texts    jsonb default null
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
    set parent_name    = coalesce(excluded.parent_name,    identity_vault.family_identity.parent_name),
        child_nickname = coalesce(excluded.child_nickname, identity_vault.family_identity.child_nickname),
        -- Merge, don't replace: each screen contributes its own "Lain-lain" key.
        other_texts    = identity_vault.family_identity.other_texts
                           || coalesce(excluded.other_texts, '{}'::jsonb),
        updated_at     = now();
end;
$$;

revoke all on function public.save_family_identity(text, text, jsonb) from public, anon;
grant execute on function public.save_family_identity(text, text, jsonb) to authenticated;

-- ── 3. Clearing the vault (used when the parent restarts onboarding). ─────
create or replace function public.clear_family_identity()
returns void
language plpgsql
security definer
set search_path = identity_vault, public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from identity_vault.family_identity where guardian_id = auth.uid();
end;
$$;

revoke all on function public.clear_family_identity() from public, anon;
grant execute on function public.clear_family_identity() to authenticated;
