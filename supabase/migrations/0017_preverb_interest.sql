-- ===========================================================================
--  0017 · PREVERB · the child's interest, recorded on Day 1.
--
--  Run once in Supabase → SQL Editor. Requires 0011.
--
--  ── WHY THIS IS A COLUMN ON THE CHILD, NOT A FIELD ON DAY 1 ───────────────
--  Day 1's whole purpose is "Kenal Pasti Minat" — lay three toys down, do not
--  suggest, and record which one the child reaches for. That single answer is
--  then the context for the ENTIRE rest of the programme:
--
--    H2  "GUNA MAINAN SAMA seperti Hari 1, konteks yang ANAK pilih."
--    H13 "GUNA KONTEKS MINAT DARI H1 (Barbie/Masak-masak/Lego)."
--    H14 "Guna mainan sama seperti H1. Buat sekali lagi. Perhati beza KUALITI."
--
--  So it is not a property of a session — it is a standing fact about the child,
--  read by thirteen later days. It lives on `children`.
--
--  ── 'lain' IS A REAL ANSWER, NOT AN ESCAPE HATCH ──────────────────────────
--  The tracker offers "[_] Lain: ______". A child who reaches for a saucepan
--  instead of the play kitchen has still made a choice, and the honest record is
--  that we don't have a script for it — not that he chose Barbie.
-- ===========================================================================

alter table public.children
  add column if not exists preverb_interest text
    check (preverb_interest in ('barbie', 'masak_masak', 'lego', 'lain'));

comment on column public.children.preverb_interest is
  'The toy chosen on Preverb Day 1. Contextualises the scripts for Days 2-14.';
