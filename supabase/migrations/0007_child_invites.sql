-- ============================================================================
--  Tutur — child invite codes (v7)   ·   depends on 0006_shared_child
--
--  Run once in Supabase → SQL Editor (or `supabase db push`).
--
--  Lets an existing guardian invite a co-parent to their child with a short
--  code. Codes are minted and redeemed only through SECURITY DEFINER RPCs, so
--  joining is gated on knowing a valid, unexpired code — there is no client
--  path to insert a membership directly (which would let anyone join any child).
-- ============================================================================

create table if not exists public.child_invites (
  code        text primary key,
  child_id    uuid not null references public.children (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '14 days'),
  max_uses    int not null default 5,
  uses        int not null default 0
);
create index if not exists child_invites_child_idx on public.child_invites (child_id);

alter table public.child_invites enable row level security;

-- The owner can read back the codes they created (to display/copy them).
drop policy if exists "child_invites_select_owner" on public.child_invites;
create policy "child_invites_select_owner" on public.child_invites
  for select using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
--  Let a linked guardian see the whole membership list (for the co-parent UI).
--  is_child_guardian is SECURITY DEFINER, so no RLS recursion.
-- ---------------------------------------------------------------------------
drop policy if exists "child_guardians_select_shared" on public.child_guardians;
create policy "child_guardians_select_shared" on public.child_guardians
  for select using (public.is_child_guardian(child_id));

-- ---------------------------------------------------------------------------
--  create_child_invite(cid) → a fresh code, only if the caller is linked to cid
-- ---------------------------------------------------------------------------
create or replace function public.create_child_invite(cid uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  new_code text;
begin
  if not public.is_child_guardian(cid) then
    raise exception 'not a guardian of this child';
  end if;
  -- 8-char code from a uuid (hex, no ambiguous separators).
  new_code := upper(substr(gen_random_uuid()::text, 1, 8));
  insert into public.child_invites (code, child_id, created_by)
  values (new_code, cid, auth.uid());
  return new_code;
end;
$$;

-- ---------------------------------------------------------------------------
--  accept_child_invite(code) → link the caller to the child; returns child_id
-- ---------------------------------------------------------------------------
create or replace function public.accept_child_invite(invite_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  inv public.child_invites;
begin
  select * into inv from public.child_invites
    where code = upper(trim(invite_code));

  if inv.code is null then
    raise exception 'invalid code';
  elsif inv.expires_at < now() then
    raise exception 'code expired';
  elsif inv.uses >= inv.max_uses then
    raise exception 'code already used up';
  end if;

  insert into public.child_guardians (child_id, guardian_id, role)
    values (inv.child_id, auth.uid(), 'parent')
    on conflict (child_id, guardian_id) do nothing;

  update public.child_invites set uses = uses + 1 where code = inv.code;
  return inv.child_id;
end;
$$;

-- ---------------------------------------------------------------------------
--  list_child_guardians(cid) → names + roles of everyone linked to the child.
--  SECURITY DEFINER so it can read co-parents' profile names; still gated on the
--  caller being a member (auth.uid() reflects the caller, not the definer).
-- ---------------------------------------------------------------------------
create or replace function public.list_child_guardians(cid uuid)
returns table (guardian_id uuid, guardian_name text, role text)
language sql
stable
security definer set search_path = public
as $$
  select cg.guardian_id, p.guardian_name, cg.role
  from public.child_guardians cg
  join public.profiles p on p.id = cg.guardian_id
  where cg.child_id = cid
    and public.is_child_guardian(cid);
$$;

grant execute on function public.create_child_invite(uuid)   to authenticated;
grant execute on function public.accept_child_invite(text)   to authenticated;
grant execute on function public.list_child_guardians(uuid)  to authenticated;
