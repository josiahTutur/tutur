-- ============================================================================
--  Tutur — shared child / co-parent support (v6)
--
--  Run once in Supabase → SQL Editor (or `supabase db push`).
--
--  Lets TWO (or more) guardians share ONE child, so either parent's account can
--  run activities and everyone sees a single, unified progress picture.
--
--  Model change: guardians ⇄ children becomes many-to-many via a join table,
--  and the shared PLAN (goal / routines / activities) moves onto the child so
--  both parents share it. Activity completions stay per-child (shared progress)
--  while keeping guardian_id (attribution: which parent did each one).
--
--  SAFETY: this migration is ADDITIVE + BACKFILL only. It does NOT drop the old
--  profiles.primary_goal/routines/activities or children.guardian_id columns, so
--  the current app keeps working unchanged. Those are removed in a later
--  migration once the app reads/writes the new shared columns. No data is lost.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1) Join table — the sharing link (many guardians ⇄ one child)
-- ---------------------------------------------------------------------------
create table if not exists public.child_guardians (
  child_id    uuid not null references public.children (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  role        text not null default 'parent',   -- 'owner' | 'parent' | 'caregiver'
  created_at  timestamptz not null default now(),
  primary key (child_id, guardian_id)
);
create index if not exists child_guardians_guardian_idx
  on public.child_guardians (guardian_id);

-- ---------------------------------------------------------------------------
--  2) Shared plan lives on the child (was per-guardian on profiles)
-- ---------------------------------------------------------------------------
alter table public.children
  add column if not exists primary_goal text,
  add column if not exists routines     text[] not null default '{}',
  add column if not exists activities   text[] not null default '{}',
  add column if not exists created_by   uuid references public.profiles (id);

-- ---------------------------------------------------------------------------
--  3) Backfill from the existing single-guardian data (no data lost)
-- ---------------------------------------------------------------------------
-- 3a. Every existing child's current guardian becomes its 'owner' member.
insert into public.child_guardians (child_id, guardian_id, role)
  select id, guardian_id, 'owner' from public.children
  on conflict (child_id, guardian_id) do nothing;

-- 3b. Record who set the child up.
update public.children
  set created_by = guardian_id
  where created_by is null;

-- 3c. Copy the plan from the owning profile onto the child.
update public.children c
  set primary_goal = p.primary_goal,
      routines     = coalesce(p.routines, '{}'),
      activities   = coalesce(p.activities, '{}')
  from public.profiles p
  where c.guardian_id = p.id;

-- 3d. Anchor any completions that predate child_id to the guardian's child, so
--     historical progress attaches to the shared child record.
update public.activity_completions ac
  set child_id = c.id
  from public.children c
  where ac.child_id is null
    and c.guardian_id = ac.guardian_id;

-- ---------------------------------------------------------------------------
--  4) Auto-link the owner whenever a new child is created (so the current app
--     keeps working with no code change — it just inserts into children).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_child()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.child_guardians (child_id, guardian_id, role)
  values (new.id, new.guardian_id, 'owner')
  on conflict (child_id, guardian_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_child_created on public.children;
create trigger on_child_created
  after insert on public.children
  for each row execute function public.handle_new_child();

-- ---------------------------------------------------------------------------
--  5) Membership check — SECURITY DEFINER so policies on children /
--     activity_completions can look up child_guardians WITHOUT triggering RLS
--     recursion. Returns true if the current user is linked to the child.
-- ---------------------------------------------------------------------------
create or replace function public.is_child_guardian(cid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.child_guardians
    where child_id = cid and guardian_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
--  6) Row-Level Security
--
--  New policies are ADDED alongside the existing owner (guardian_id) policies —
--  RLS policies are OR'd, so this only WIDENS access to linked co-parents and
--  never removes the current owner's access.
-- ---------------------------------------------------------------------------
alter table public.child_guardians enable row level security;

-- child_guardians: a user can see & leave their own memberships. New links are
-- created by the owner-link trigger (4) and, later, a SECURITY DEFINER invite
-- RPC — never by a permissive client insert (which would let anyone join any
-- child), so there is intentionally NO broad insert policy here.
drop policy if exists "child_guardians_select_self" on public.child_guardians;
create policy "child_guardians_select_self" on public.child_guardians
  for select using (guardian_id = auth.uid());

drop policy if exists "child_guardians_delete_self" on public.child_guardians;
create policy "child_guardians_delete_self" on public.child_guardians
  for delete using (guardian_id = auth.uid());

-- children: any linked guardian may read & update the shared record.
drop policy if exists "children_member_select" on public.children;
create policy "children_member_select" on public.children
  for select using (public.is_child_guardian(id));

drop policy if exists "children_member_update" on public.children;
create policy "children_member_update" on public.children
  for update using (public.is_child_guardian(id))
  with check (public.is_child_guardian(id));

-- activity_completions: any linked guardian sees the child's whole log, and may
-- add a completion attributed to themselves.
drop policy if exists "completions_member_select" on public.activity_completions;
create policy "completions_member_select" on public.activity_completions
  for select using (public.is_child_guardian(child_id));

drop policy if exists "completions_member_insert" on public.activity_completions;
create policy "completions_member_insert" on public.activity_completions
  for insert with check (
    public.is_child_guardian(child_id) and guardian_id = auth.uid()
  );
