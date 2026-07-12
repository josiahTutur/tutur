-- ===========================================================================
--  0014 · Home language — what the CHILD hears, not what the parent prefers.
--
--  Run once in Supabase → SQL Editor. Requires 0011.
--
--  WHY THIS QUESTION EXISTS
--    The 14-day scripts are words the parent SAYS ALOUD to their child. Which
--    language the child hears all day is therefore not a UI preference — it is a
--    clinical input, and it decides which content we should be serving.
--
--    Crucially we ask what the child HEARS ("didengar"), not what the parent
--    speaks. Those routinely differ: parents speak English to each other while
--    grandma speaks Malay to the child all day, and the child's input is Malay.
--
--  WHAT WE CAN SERVE TODAY
--    Malay only. `lain` answers are therefore not a failure — they are the
--    roadmap: they tell us which language to build next, and how many families
--    are waiting for it.
--
--  The free text behind "Lain-lain" goes to identity_vault.other_texts, not here
--  (spec §3.1) — free text may name a person or place.
-- ===========================================================================

alter table public.children
  add column if not exists home_language text
    check (home_language in ('melayu', 'english', 'campur', 'lain'));

comment on column public.children.home_language is
  'Language the CHILD hears most at home (not the parent''s preference). '
  'melayu | english | campur (code-switched) | lain. '
  'campur is expected to be common — Malaysian families code-switch constantly, '
  'and forcing a single language would have produced wrong data.';

create index if not exists children_home_language_idx
  on public.children (home_language);
