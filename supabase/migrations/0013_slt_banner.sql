-- ===========================================================================
--  0013 · SLT recommendation banner — dismissal state.
--
--  Run once in Supabase → SQL Editor. Requires 0011.
--
--  WHAT THIS IS FOR (spec §5.1)
--    A parent whose screening flags a concern (variant B) is recommended an
--    SLT assessment. That recommendation must SURVIVE onboarding — a single
--    screen, read once at the most overwhelming moment of sign-up, is not a
--    safety net. So it also lives on the dashboard.
--
--  BUT IT MUST NOT NAG.
--    She already knows something might be wrong — that is why she downloaded a
--    speech app. Re-asserting it every single morning would make the dashboard
--    a place she dreads. So: she can dismiss it, and it STAYS dismissed.
--
--  THE ONE EXCEPTION — a re-screen.
--    At D7 and D14 the screening is re-administered (spec §5.12), writing a NEW
--    screening_baseline row. If the flags are still there, the recommendation is
--    no longer the same claim — it is a fresh one, made with new evidence, and
--    it has earned the right to be seen again.
--
--    We get that for free by comparing timestamps rather than storing a boolean:
--
--        show = latest_screening.variant = 'B'
--               AND (dismissed_at IS NULL OR dismissed_at < latest_screening.taken_at)
--
--    A dismissal only silences the screening it was dismissed against. And if a
--    re-screen comes back CLEAR (variant A), the banner disappears for good —
--    which is a moment worth building for.
-- ===========================================================================

alter table public.children
  add column if not exists slt_banner_dismissed_at timestamptz;

comment on column public.children.slt_banner_dismissed_at is
  'When the parent dismissed the SLT recommendation. Compared against the LATEST '
  'screening_baseline.taken_at — so a D7/D14 re-screen that still flags will '
  'surface the banner again, but a dismissal is otherwise permanent. Never a boolean.';
